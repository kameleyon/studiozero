/**
 * Studio Zero — path-traversal guard.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Implements Shield's TB-5 + TB-9
 * mitigation: every customer-supplied path that the runner is asked to
 * read goes through `safeOpen(rel)` which:
 *
 *   1. Rejects pre-resolve if the path contains a NUL byte. (PT-009..011)
 *   2. Rejects pre-resolve if the path contains a Win32 long-path or
 *      device-namespace prefix (\\?\, \\.\). (PT-023..024)
 *   3. URL-decodes ONCE at ingest (paths inside a cloned repo should
 *      never be URL-encoded — encoded form is suspicious). Bad
 *      percent-encodings throw. (PT-005, PT-010, PT-012..013)
 *   4. Rejects non-shortest-form UTF-8 sequences via strict TextDecoder.
 *   5. Unicode-NFKC normalizes to collapse confusable slashes and
 *      fullwidth-dots into ASCII. (PT-014..015)
 *   6. Normalizes Windows backslash to forward slash so realpath can
 *      operate on a single canonical form. (PT-006..008)
 *   7. Calls fs.realpathSync to resolve symlinks AND .. ascents to the
 *      OS-level canonical path. (PT-001..004, PT-016..019, PT-020..022)
 *   8. startsWith(WORKDIR + sep) — the load-bearing assertion.
 *   9. Directory-walk-time lstat check: any entry whose
 *      isSymbolicLink() === true is skipped AND emits a
 *      'symlink_rejected' finding. (PT-016..019; covered by walkDir().)
 *
 * Test coverage: `tests/path-traversal-guard.test.ts` walks
 * `runner/fixtures/path-traversal-corpus/index.json`. The fixture writer
 * has 'block' as the expected_action for every pattern at M1; adding a
 * new pattern is a new test row.
 *
 * NOTE: this module does NOT touch the filesystem unless safeOpen is
 * called. `validatePath()` is pure (no I/O) for fast pre-checks in
 * test code; safeOpen does the I/O via fs.realpathSync.
 */
import { realpathSync, lstatSync } from "node:fs";
import { sep as pathSep, resolve as pathResolve } from "node:path";

export type PathBlockReason =
  | "null_byte"
  | "win32_long_path_prefix"
  | "url_decode_error"
  | "non_shortest_utf8"
  | "absolute_outside_workdir"
  | "escapes_workdir"
  | "symlink_rejected"
  | "nonexistent_path"
  | "io_error";

export interface PathValidationOk {
  ok: true;
  /** Normalized relative-form path. May still escape WORKDIR on resolve. */
  normalized: string;
}

export interface PathValidationBlock {
  ok: false;
  reason: PathBlockReason;
  detail: string;
}

export type PathValidationResult = PathValidationOk | PathValidationBlock;

const WIN32_PREFIXES = ["\\\\?\\", "\\\\.\\"];

/**
 * Pre-realpath path validation. Pure — no I/O. Use this from tests and
 * from any path-handling code that wants a fast rejection before
 * resolving.
 */
export function validatePath(input: string): PathValidationResult {
  if (input.length === 0) {
    return {
      ok: false,
      reason: "io_error",
      detail: "Empty path",
    };
  }

  // (1) NUL byte → reject pre-resolve.
  if (input.includes("\0")) {
    return {
      ok: false,
      reason: "null_byte",
      detail: "Path contains NUL byte",
    };
  }

  // (2) Win32 long-path / device-namespace prefix → reject.
  for (const prefix of WIN32_PREFIXES) {
    if (input.startsWith(prefix)) {
      return {
        ok: false,
        reason: "win32_long_path_prefix",
        detail: `Win32 prefix '${prefix}' not permitted`,
      };
    }
  }

  // (3) URL-decode ONCE at ingest.
  let decoded: string;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    return {
      ok: false,
      reason: "url_decode_error",
      detail: "Path contains malformed percent-encoding",
    };
  }

  // Decoded NUL byte (PT-010).
  if (decoded.includes("\0")) {
    return {
      ok: false,
      reason: "null_byte",
      detail: "URL-decoded path contains NUL byte",
    };
  }

  // (4) Non-shortest-form UTF-8. We attempt a strict decode of the
  // *original* bytes interpreted as UTF-8. The strict TextDecoder
  // rejects overlong forms.
  try {
    const bytes: number[] = [];
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      // If the input is already-decoded JS string with high codepoints
      // (e.g. fullwidth dot), we'll let NFKC handle it below. Only
      // re-validate ascii-range percent-decoded sequences via the byte
      // path. Track raw percent-decoded bytes if present.
      bytes.push(c);
    }
    // The actual overlong-utf8 check happens on the percent-decoded byte
    // sequence. If we percent-decoded above, decodeURIComponent already
    // rejected overlong UTF-8 (the spec says so since 2015). Belt + suspenders:
    // re-validate by round-tripping decoded → utf-8 → strict decode.
    const enc = new TextEncoder();
    const dec = new TextDecoder("utf-8", { fatal: true });
    dec.decode(enc.encode(decoded));
  } catch {
    return {
      ok: false,
      reason: "non_shortest_utf8",
      detail: "Path contains non-shortest-form UTF-8",
    };
  }

  // (5) NFKC normalization — collapse confusable slashes / fullwidth.
  let nfkc: string;
  try {
    nfkc = decoded.normalize("NFKC");
  } catch {
    return {
      ok: false,
      reason: "io_error",
      detail: "NFKC normalization failed",
    };
  }

  // (6) Windows backslash → forward slash.
  const slashed = nfkc.replace(/\\/g, "/");

  return { ok: true, normalized: slashed };
}

/**
 * I/O-attached safe-open. Returns the realpath if and only if:
 *   - pre-resolve validation passes
 *   - realpathSync resolves successfully
 *   - the resolved path starts with WORKDIR + path-separator
 *
 * Throws PathEscapeError otherwise. Callers should handle the error by
 * emitting a `malformed_path` finding (not crashing the run).
 */
export class PathEscapeError extends Error {
  readonly reason: PathBlockReason;
  readonly detail: string;
  constructor(reason: PathBlockReason, detail: string) {
    super(`path_blocked: ${reason} — ${detail}`);
    this.name = "PathEscapeError";
    this.reason = reason;
    this.detail = detail;
  }
}

export function safeOpen(workdir: string, rel: string): string {
  const v = validatePath(rel);
  if (!v.ok) throw new PathEscapeError(v.reason, v.detail);

  // Refuse: absolute paths that fall outside workdir post-resolve.
  // Per POSIX path.resolve(workdir, '/etc/passwd') === '/etc/passwd',
  // so an absolute right-arg overrides the left-arg — which is exactly
  // what we WANT detected: the startsWith below will fail.
  let canonical: string;
  try {
    const candidate = pathResolve(workdir, v.normalized);
    canonical = realpathSync(candidate);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      throw new PathEscapeError("nonexistent_path", v.normalized);
    }
    throw new PathEscapeError("io_error", e.message ?? String(err));
  }

  // (7+8) load-bearing startsWith check.
  const expectedPrefix = workdir.endsWith(pathSep) ? workdir : workdir + pathSep;
  // Workdir realpath itself (in case workdir was passed in non-canonical form).
  let workdirReal: string;
  try {
    workdirReal = realpathSync(workdir);
  } catch {
    workdirReal = workdir;
  }
  const expectedPrefixReal = workdirReal.endsWith(pathSep)
    ? workdirReal
    : workdirReal + pathSep;

  const safe =
    canonical.startsWith(expectedPrefix) ||
    canonical.startsWith(expectedPrefixReal) ||
    canonical === workdir ||
    canonical === workdirReal;

  if (!safe) {
    throw new PathEscapeError(
      "escapes_workdir",
      `Resolved '${canonical}' does not start with '${expectedPrefixReal}'`,
    );
  }
  return canonical;
}

/**
 * Symlink check at directory-walk time. Returns true if the entry is a
 * symlink (caller should skip it AND emit a 'symlink_rejected' finding).
 */
export function isSymlinkEntry(absolutePath: string): boolean {
  try {
    return lstatSync(absolutePath).isSymbolicLink();
  } catch {
    // If lstat fails, treat as not-a-symlink — the read attempt will
    // fail downstream and emit a different error.
    return false;
  }
}
