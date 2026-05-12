/**
 * Studio Zero — V2.1 scaffold bundle zipper.
 *
 * Phase 9 V2.1 Batch 1 (Forge). Packs the generated scaffold files into a
 * downloadable ZIP. Uses STORE (no compression) — the scaffold is small
 * (~30 files / <100KB) and a pure-Node implementation keeps the dep graph
 * tight per Cipher v0.5 "lockfile-minimalism" rule.
 *
 * Implementation notes:
 *   - PKZIP local file headers + central directory + end-of-central-directory.
 *   - Compression method = 0 (STORE). The customer's `unzip`, `tar -xf
 *     archive.zip`, GitHub's "Download ZIP", and 7-Zip all decode STORE.
 *   - UTF-8 file names (general-purpose bit 11 set). No DOS/zip64.
 *   - CRC-32 computed per file (table-driven, IEEE-802.3 polynomial).
 *   - DOS timestamps fixed to 2026-05-12 12:00:00 — deterministic builds.
 *
 * NOT a general-purpose zip lib. Scope: STORE-only, no symlinks, no
 * directory entries (most readers infer dirs from file paths).
 */
import type { ScaffoldFile } from "./types.js";

/** Deterministic timestamp baked into every entry — 2026-05-12 12:00:00. */
const FIXED_DOS_DATE = packDate(2026, 5, 12);
const FIXED_DOS_TIME = packTime(12, 0, 0);

/** Pack a Date into DOS date format: bits 9-15 year-1980, 5-8 month, 0-4 day. */
function packDate(year: number, month: number, day: number): number {
  return ((year - 1980) << 9) | (month << 5) | day;
}
/** Pack a Date into DOS time: bits 11-15 hour, 5-10 min, 0-4 second/2. */
function packTime(hour: number, min: number, sec: number): number {
  return (hour << 11) | (min << 5) | (sec >>> 1);
}

/* -------------------------------------------------------------------- */
/* CRC-32 (IEEE 802.3, polynomial 0xEDB88320) — table-driven             */
/* -------------------------------------------------------------------- */

const CRC32_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ (buf[i] ?? 0)) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/* -------------------------------------------------------------------- */
/* Helpers — little-endian writes                                       */
/* -------------------------------------------------------------------- */

function u16(view: DataView, off: number, val: number): void {
  view.setUint16(off, val & 0xffff, /* littleEndian */ true);
}
function u32(view: DataView, off: number, val: number): void {
  view.setUint32(off, val >>> 0, /* littleEndian */ true);
}

/* -------------------------------------------------------------------- */
/* Local file header + central directory entries                        */
/* -------------------------------------------------------------------- */

interface EntryMeta {
  pathBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  localOffset: number;
}

const LOCAL_SIG = 0x04034b50;
const CDIR_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** Produce a STORE-method ZIP from the given files. */
export function zipFiles(files: ScaffoldFile[]): Buffer {
  const entries: EntryMeta[] = [];
  const chunks: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const pathBytes = new TextEncoder().encode(f.path);
    const data = new TextEncoder().encode(f.contents);
    const c = crc32(data);

    // Local file header — 30 bytes + filename.
    const hdr = new ArrayBuffer(30);
    const hv = new DataView(hdr);
    u32(hv, 0, LOCAL_SIG);
    u16(hv, 4, 20); // version needed: 2.0
    u16(hv, 6, 0x0800); // general purpose: UTF-8 filename (bit 11)
    u16(hv, 8, 0); // method: STORE
    u16(hv, 10, FIXED_DOS_TIME);
    u16(hv, 12, FIXED_DOS_DATE);
    u32(hv, 14, c);
    u32(hv, 18, data.length);
    u32(hv, 22, data.length);
    u16(hv, 26, pathBytes.length);
    u16(hv, 28, 0); // extra field length

    const hdrBytes = new Uint8Array(hdr);
    chunks.push(hdrBytes, pathBytes, data);
    entries.push({
      pathBytes,
      data,
      crc: c,
      localOffset: offset,
    });
    offset += hdrBytes.length + pathBytes.length + data.length;
  }

  // Central directory.
  const cdirStart = offset;
  for (const e of entries) {
    const cdir = new ArrayBuffer(46);
    const cv = new DataView(cdir);
    u32(cv, 0, CDIR_SIG);
    u16(cv, 4, 20); // version made by (DOS / 2.0)
    u16(cv, 6, 20); // version needed
    u16(cv, 8, 0x0800); // UTF-8
    u16(cv, 10, 0); // method: STORE
    u16(cv, 12, FIXED_DOS_TIME);
    u16(cv, 14, FIXED_DOS_DATE);
    u32(cv, 16, e.crc);
    u32(cv, 20, e.data.length);
    u32(cv, 24, e.data.length);
    u16(cv, 28, e.pathBytes.length);
    u16(cv, 30, 0); // extra
    u16(cv, 32, 0); // comment
    u16(cv, 34, 0); // disk number
    u16(cv, 36, 0); // internal attrs
    u32(cv, 38, 0); // external attrs
    u32(cv, 42, e.localOffset);
    const cdirBytes = new Uint8Array(cdir);
    chunks.push(cdirBytes, e.pathBytes);
    offset += cdirBytes.length + e.pathBytes.length;
  }
  const cdirSize = offset - cdirStart;

  // End of central directory record.
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  u32(ev, 0, EOCD_SIG);
  u16(ev, 4, 0); // disk number
  u16(ev, 6, 0); // disk with cdir start
  u16(ev, 8, entries.length);
  u16(ev, 10, entries.length);
  u32(ev, 12, cdirSize);
  u32(ev, 16, cdirStart);
  u16(ev, 20, 0); // comment length
  chunks.push(new Uint8Array(eocd));

  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/** Compute a manifest of file path + byte size + pinned flag — used by
 *  the Probe verification spec to assert no PII / no leaked secrets. */
export function manifestFor(
  files: ScaffoldFile[],
): Array<{ path: string; bytes: number; pinned: boolean }> {
  return files.map((f) => ({
    path: f.path,
    bytes: new TextEncoder().encode(f.contents).length,
    pinned: f.pinned === true,
  }));
}
