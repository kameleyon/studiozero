import "server-only";

import * as fs from "node:fs";
import * as path from "node:path";

import * as React from "react";

/**
 * Minimal server-only Markdown → React renderer for the legal pages.
 *
 * Phase 9 M1 Batch 3 (Comply). The four legal routes — /terms,
 * /privacy, /aup, /subprocessors — and /system-card render content
 * authored in `legal/*.md`. Bringing in `react-markdown` + `remark-gfm`
 * would add three production deps (react-markdown, remark, remark-gfm
 * + their micromark transitive tree) for what is, in practice, a static
 * Markdown→HTML transform we control end-to-end.
 *
 * Instead we render a small, audited subset of CommonMark + GFM:
 *  - ATX headings (#, ##, ### …)
 *  - paragraphs (blank-line separated)
 *  - unordered lists (-, *) and ordered lists (1.)
 *  - blockquotes (>)
 *  - thematic breaks (---)
 *  - GFM tables (| col | col |)
 *  - fenced code blocks (```) and inline code (`)
 *  - emphasis (*, _) and strong (**, __)
 *  - links [text](url) — relative + absolute, with external-link safety
 *  - HTML entities are passed through as plain text (no HTML allowed in
 *    legal source; this is a constraint we accept — keeps the renderer
 *    XSS-free by construction, since we never use dangerouslySetInnerHTML).
 *
 * The renderer is server-only — it runs at build/request time on the
 * Next.js server, never in the browser, so the file-system read is fine
 * and the resulting HTML is static for the CDN.
 *
 * Owner: Comply (the policy this serves) + Forge (the renderer code).
 */

/**
 * Read a legal markdown file from `legal/` at repo root and render it.
 * The path is RELATIVE to the repo root, not to apps/web.
 *
 * In production on Vercel, the repo root is the project root passed to
 * `outputFileTracingRoot`. The legal/ tree is included automatically by
 * Next's file-tracing because we read it explicitly here.
 */
export function readLegalDoc(relativePath: string): string {
  // process.cwd() at runtime = apps/web (Vercel build invocation). The
  // legal/ tree is two levels up.
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const fullPath = path.join(repoRoot, relativePath);
  return fs.readFileSync(fullPath, "utf-8");
}

interface InlineNode {
  type: "text" | "code" | "em" | "strong" | "link";
  content?: string;
  href?: string;
  children?: InlineNode[];
}

/**
 * Parse inline markdown (within a paragraph/heading/list-item/cell).
 * Order of operations is load-bearing: code spans before emphasis
 * before links — emphasis inside a link is parsed when we recurse on
 * the link's text.
 */
function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code: `code`
    const codeMatch = /^`([^`]+)`/.exec(remaining);
    if (codeMatch) {
      nodes.push({ type: "code", content: codeMatch[1] ?? "" });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Link: [text](url)
    const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(remaining);
    if (linkMatch) {
      nodes.push({
        type: "link",
        href: linkMatch[2] ?? "#",
        children: parseInline(linkMatch[1] ?? ""),
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Strong: **text** or __text__
    const strongMatch =
      /^\*\*([^*]+)\*\*/.exec(remaining) || /^__([^_]+)__/.exec(remaining);
    if (strongMatch) {
      nodes.push({
        type: "strong",
        children: parseInline(strongMatch[1] ?? ""),
      });
      remaining = remaining.slice(strongMatch[0].length);
      continue;
    }

    // Emphasis: *text* or _text_
    const emMatch =
      /^\*([^*]+)\*/.exec(remaining) || /^_([^_]+)_/.exec(remaining);
    if (emMatch) {
      nodes.push({ type: "em", children: parseInline(emMatch[1] ?? "") });
      remaining = remaining.slice(emMatch[0].length);
      continue;
    }

    // Plain text until the next inline marker. Eat one char at minimum
    // to guarantee progress.
    const nextSpecial = remaining
      .slice(1)
      .search(/[`*_\[]/);
    const eatLen = nextSpecial === -1 ? remaining.length : nextSpecial + 1;
    nodes.push({ type: "text", content: remaining.slice(0, eatLen) });
    remaining = remaining.slice(eatLen);
  }

  return nodes;
}

function renderInline(nodes: InlineNode[], keyPrefix: string): React.ReactNode {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.type === "text") return <React.Fragment key={key}>{node.content}</React.Fragment>;
    if (node.type === "code") return <code key={key}>{node.content}</code>;
    if (node.type === "em") return <em key={key}>{renderInline(node.children ?? [], key)}</em>;
    if (node.type === "strong")
      return <strong key={key}>{renderInline(node.children ?? [], key)}</strong>;
    if (node.type === "link") {
      const href = node.href ?? "#";
      const isExternal = /^https?:\/\//.test(href);
      const isMailto = href.startsWith("mailto:");
      const rel = isExternal ? "noopener noreferrer" : undefined;
      const target = isExternal ? "_blank" : undefined;
      return (
        <a key={key} href={href} rel={rel} target={target}>
          {renderInline(node.children ?? [], key)}
          {isExternal ? " ↗" : isMailto ? "" : ""}
        </a>
      );
    }
    return null;
  });
}

/** Strip alignment cells from a GFM table separator row. */
function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

/**
 * Parse a Markdown document into a React node tree. Block-level parser.
 */
export function renderLegalMarkdown(source: string): React.ReactElement {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;
  const k = (): string => `b${blockKey++}`;
  // `noUncheckedIndexedAccess` types `lines[i]` as `string | undefined`.
  // Every read goes through `at()` which falls back to "" past EOF; the
  // `while (i < lines.length …)` guard already prevents that, so `at` is
  // typing-safety, not logic.
  const at = (idx: number): string => lines[idx] ?? "";

  while (i < lines.length) {
    const line = at(i);

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Thematic break
    if (/^-{3,}\s*$/.test(line.trim())) {
      blocks.push(<hr key={k()} />);
      i++;
      continue;
    }

    // Heading (ATX)
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const hashes = headingMatch[1] ?? "";
      const rawText = headingMatch[2] ?? "";
      const level = hashes.length;
      const text = rawText.replace(/\s+#+\s*$/, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      // We never emit an <h1> from a legal doc — the page sets the
      // <h1>. Demote `# Title` from the file to <h2>; subsequent levels
      // shift accordingly so the visual hierarchy is preserved.
      const Tag = (`h${Math.min(level + 1, 6)}` as unknown) as keyof React.JSX.IntrinsicElements;
      const key = k();
      blocks.push(
        React.createElement(
          Tag,
          { key, id },
          renderInline(parseInline(text), key)
        )
      );
      i++;
      continue;
    }

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(at(i).trim())) {
        codeLines.push(at(i));
        i++;
      }
      i++; // skip closing fence
      blocks.push(
        <pre key={k()}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(at(i))) {
        quoteLines.push(at(i).replace(/^>\s?/, ""));
        i++;
      }
      const paragraphs = quoteLines.join("\n").split(/\n\s*\n/);
      const key = k();
      blocks.push(
        <blockquote key={key}>
          {paragraphs.map((p, pi) => (
            <p key={`${key}-q${pi}`}>
              {renderInline(parseInline(p.replace(/\n/g, " ").trim()), `${key}-q${pi}`)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Table (GFM): header line, then separator, then rows
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(at(i + 1))) {
      const headers = parseTableRow(line);
      i += 2; // header + separator
      const rows: string[][] = [];
      while (i < lines.length && at(i).includes("|") && at(i).trim() !== "") {
        rows.push(parseTableRow(at(i)));
        i++;
      }
      const key = k();
      blocks.push(
        <div key={key} className="legal-table-wrap" role="region" aria-label="Table">
          <table>
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th key={`${key}-th${hi}`} scope="col">
                    {renderInline(parseInline(h), `${key}-th${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={`${key}-tr${ri}`}>
                  {row.map((cell, ci) => (
                    <td key={`${key}-tr${ri}-td${ci}`}>
                      {renderInline(parseInline(cell), `${key}-tr${ri}-td${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(at(i))) {
        items.push(at(i).replace(/^[-*]\s+/, ""));
        i++;
      }
      const key = k();
      blocks.push(
        <ul key={key}>
          {items.map((it, ii) => (
            <li key={`${key}-li${ii}`}>{renderInline(parseInline(it), `${key}-li${ii}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(at(i))) {
        items.push(at(i).replace(/^\d+\.\s+/, ""));
        i++;
      }
      const key = k();
      blocks.push(
        <ol key={key}>
          {items.map((it, ii) => (
            <li key={`${key}-li${ii}`}>{renderInline(parseInline(it), `${key}-li${ii}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph — collect until blank line
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      at(i).trim() !== "" &&
      !/^#{1,6}\s+/.test(at(i)) &&
      !/^-{3,}\s*$/.test(at(i).trim()) &&
      !/^>\s?/.test(at(i)) &&
      !/^[-*]\s+/.test(at(i)) &&
      !/^\d+\.\s+/.test(at(i)) &&
      !/^```/.test(at(i).trim())
    ) {
      paraLines.push(at(i));
      i++;
    }
    const para = paraLines.join(" ").trim();
    if (para) {
      const key = k();
      blocks.push(<p key={key}>{renderInline(parseInline(para), key)}</p>);
    }
  }

  return <>{blocks}</>;
}
