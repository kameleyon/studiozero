/**
 * Studio Zero — score engine client.
 *
 * Phase 9 M1 Batch 2 (Forge-2). Per ARCH-D7: the score engine is the
 * SINGLE SOURCE OF TRUTH for the readiness score. The runner NEVER
 * computes the score locally — it sends the final findings array to
 * the score-engine Edge Function and consumes the deterministic
 * AuditOutput result.
 *
 * Why a centralized engine: PRD §10 + score_engine.v1.json lock the
 * weights, thresholds, rounding mode, and verdict priority. Local
 * impl would drift; lint rule blocks any local copy.
 */
import { assertSafeUrl } from "./ssrf-guard.js";
import type { TokenRefresher } from "./jwt-refresh.js";

export interface ScoreEngineRequest {
  run_id: string;
  tenant_id: string;
  audience: string;
  findings: Array<{
    id: string;
    severity: "Blocker" | "Critical" | "Major" | "Minor" | "Polish";
    reviewer:
      | "jury"
      | "optic"
      | "proof"
      | "halo"
      | "compass"
      | "trace"
      | "canon";
    layer: string;
  }>;
  partial: boolean;
}

export interface ScoreEngineResult {
  verdict: "PASS" | "PASS WITH FIXES" | "FAIL";
  score: number;
  score_engine_version: string;
  score_breakdown: {
    ux: number;
    accessibility: number;
    copy: number;
    brand: number;
    flow: number;
    audience: number;
  };
  score_engine_provenance?: { sha256: string };
}

export interface ScoreEngineClient {
  compute(
    req: ScoreEngineRequest,
    signal: AbortSignal,
  ): Promise<ScoreEngineResult>;
}

export interface ScoreEngineClientOptions {
  scoreEngineUrl: string;
  refresher: TokenRefresher;
}

class HttpScoreEngineClient implements ScoreEngineClient {
  private readonly url: string;
  private readonly refresher: TokenRefresher;

  constructor(opts: ScoreEngineClientOptions) {
    this.url = assertSafeUrl(opts.scoreEngineUrl);
    this.refresher = opts.refresher;
  }

  async compute(
    req: ScoreEngineRequest,
    signal: AbortSignal,
  ): Promise<ScoreEngineResult> {
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
      redirect: "error",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`[runner] score-engine: ${res.status} ${body}`);
    }
    return (await res.json()) as ScoreEngineResult;
  }
}

export function createScoreEngineClient(
  opts: ScoreEngineClientOptions,
): ScoreEngineClient {
  return new HttpScoreEngineClient(opts);
}
