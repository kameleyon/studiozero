// Shared CORS headers for Studio Zero Edge Functions.
// Owner: Forge (Phase 9 M1 Batch 2).
//
// The runner pool (Railway us-east) calls these functions over the public
// internet, not the Supabase internal network, so CORS preflight needs to
// be answered. We allow Authorization (Bearer JWT) + Content-Type only.
// The runner is the only legitimate caller for mint/refresh/llm-gateway;
// the byok-validate function is called from the web app browser bundle
// (origin = studiozero.dev / vercel preview).

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, X-Studio-Zero-Run, X-Studio-Zero-Heartbeat",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function corsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  return null;
}
