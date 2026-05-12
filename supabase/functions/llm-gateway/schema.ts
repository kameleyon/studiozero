// Minimal agent-output schema validator for the gateway.
//
// Owner: Forge (Phase 9 M1 Batch 2). Reviewers: Verify (will replace this
// with the canonical `runner/schemas/agent-output.v1.json` Ajv-compiled
// validator at M1+1; Atlas to author the schema).
//
// At M1 we ship a SHAPE check (response is an object, has `content` array
// with at least one block, no top-level `error`) — the contract-level
// validation lands when Atlas's `runner/schemas/agent-output.v1.json` is
// in HEAD. The shape check is enough to reject the named adversarial
// failure modes (free-form prose, raw HTML, empty body) per
// llm-gateway.md §6.

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateAgentOutput(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (body == null || typeof body !== "object") {
    errors.push("response_not_object");
    return { ok: false, errors };
  }
  const b = body as Record<string, unknown>;

  if ("error" in b) {
    errors.push(`upstream_error: ${String((b.error as { type?: string } | undefined)?.type ?? "unknown")}`);
  }

  if (!Array.isArray(b.content)) {
    errors.push("missing_content_array");
    return { ok: errors.length === 0, errors };
  }
  if (b.content.length === 0) {
    errors.push("empty_content_array");
  } else {
    for (const block of b.content as unknown[]) {
      if (!block || typeof block !== "object") {
        errors.push("content_block_not_object");
        break;
      }
      const blk = block as Record<string, unknown>;
      if (typeof blk.type !== "string") {
        errors.push("content_block_missing_type");
        break;
      }
    }
  }

  if (b.usage && typeof b.usage === "object") {
    const usage = b.usage as Record<string, unknown>;
    if (typeof usage.input_tokens !== "number" || typeof usage.output_tokens !== "number") {
      errors.push("usage_token_counts_missing");
    }
  }

  return { ok: errors.length === 0, errors };
}
