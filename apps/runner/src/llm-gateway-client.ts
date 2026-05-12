/**
 * Studio Zero — LLM gateway client.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Per ARCH-D7 + architecture/llm-gateway.md
 * + Cipher Fix-2: the runner NEVER holds a raw Anthropic API key. Every
 * LLM call goes through this client, which sends an HTTPS POST to
 * Cipher's gateway (`LLM_GATEWAY_URL`) carrying the runner-JWT.
 *
 * The gateway is the trust boundary that:
 *   - terminates auth (verifies the runner-JWT against runner_token_mints)
 *   - swaps in the real Anthropic key for the upstream call
 *   - runs prompt-injection redaction (Shield's PI corpus) on the
 *     responses BEFORE returning them
 *   - meters token spend and writes to `llm_usage` by tenant
 *
 * The runner only sees: (a) a request shape, (b) a streamed response.
 *
 * M1 default: MOCK_LLM_GATEWAY=true. We return canned mock responses
 * locally so the runner can be deployed and exercised end-to-end
 * BEFORE Cipher's real gateway is plumbed. M1+1 flips the env flag
 * to consume the real gateway.
 *
 * Egress safety:
 *   - the gateway URL is run through `assertSafeUrl` (SSRF guard) at
 *     client construction time AND on every redirect-hop
 *   - the underlying fetch is AbortSignal-aware (per-run cancel)
 */
import { assertSafeUrl } from "./ssrf-guard.js";
import type { TokenRefresher } from "./jwt-refresh.js";

/** Shape of an LLM call request — minimal at M1; expands at M1+1. */
export interface GatewayMessageRequest {
  /** Which reviewer is calling — used for logging + per-reviewer budgets. */
  reviewerId:
    | "optic"
    | "halo"
    | "proof"
    | "compass"
    | "trace"
    | "canon"
    | "jury";
  /** System prompt (constructed by reviewer). */
  system: string;
  /** Conversation. M1 supports a single user turn; M1+1 expands. */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Max output tokens hint — gateway may clamp per tenant policy. */
  maxTokens?: number;
  /** Model class — gateway maps to an exact model id. */
  modelClass?: "fast" | "thoughtful" | "long-context";
}

export interface GatewayMessageResponse {
  /** Final assembled text. */
  text: string;
  /** Token usage as reported by the gateway. */
  usage: { input: number; output: number };
  /** Which model class actually served the request. */
  modelClass: string;
  /** Gateway request id — pasted into agent_log events for forensics. */
  requestId: string;
}

export interface LlmGatewayClient {
  /** Send a request and await the full response. */
  message(
    req: GatewayMessageRequest,
    signal: AbortSignal,
  ): Promise<GatewayMessageResponse>;
}

export interface LlmGatewayClientOptions {
  gatewayUrl: string;
  refresher: TokenRefresher;
  /** When true, return canned mock responses; do NOT hit the network. */
  mock: boolean;
}

class RealGatewayClient implements LlmGatewayClient {
  private readonly url: string;
  private readonly refresher: TokenRefresher;

  constructor(opts: { gatewayUrl: string; refresher: TokenRefresher }) {
    this.url = assertSafeUrl(opts.gatewayUrl);
    this.refresher = opts.refresher;
  }

  async message(
    req: GatewayMessageRequest,
    signal: AbortSignal,
  ): Promise<GatewayMessageResponse> {
    const token = this.refresher.getToken().token;
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-AI-Generated": "studio-zero",
      },
      body: JSON.stringify(req),
      signal,
      // We do NOT follow redirects automatically — see redirect-chain
      // commentary in ssrf-guard.ts. If the gateway redirects, that's
      // a misconfiguration; reject.
      redirect: "error",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[runner] gateway: ${res.status} ${body}`);
    }
    const json = (await res.json()) as GatewayMessageResponse;
    return json;
  }
}

class MockGatewayClient implements LlmGatewayClient {
  async message(
    req: GatewayMessageRequest,
    signal: AbortSignal,
  ): Promise<GatewayMessageResponse> {
    // Yield a tick so callers can observe abort before mock returns.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 5);
      if (signal.aborted) {
        clearTimeout(t);
        reject(new Error("aborted"));
        return;
      }
      const onAbort = (): void => {
        clearTimeout(t);
        signal.removeEventListener("abort", onAbort);
        reject(new Error("aborted"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
    return {
      text: `[mock ${req.reviewerId}] ack ${req.messages.length} message(s)`,
      usage: { input: 50, output: 80 },
      modelClass: req.modelClass ?? "fast",
      requestId: `mock-${req.reviewerId}-${Date.now()}`,
    };
  }
}

export function createLlmGatewayClient(
  opts: LlmGatewayClientOptions,
): LlmGatewayClient {
  if (opts.mock) return new MockGatewayClient();
  return new RealGatewayClient({
    gatewayUrl: opts.gatewayUrl,
    refresher: opts.refresher,
  });
}
