"use client";

/**
 * /app/onboarding/mode — Mode picker (Trace flow S4).
 *
 * Three ModeCard variants per Compass AH-1:
 *   technical eyebrow (BYOK / CLI / Managed) + human heading.
 *
 * Hick's Law check: 3 choices + 1 skip-for-now = 4 surfaces. Under 7.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";
import { isMockMode } from "../../../../lib/env";
import { createBrowserSupabaseClient } from "../../../../lib/supabase-client";

type Mode = "byok" | "cli" | "managed";

export default function ModePickerPage(): React.ReactElement {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Mode | null>(null);
  const [saving, setSaving] = React.useState<boolean>(false);

  const handleContinue = async (): Promise<void> => {
    if (!selected) return;
    setSaving(true);
    // Persist mode_pref to user_metadata so the rest of the app reads
    // a consistent value (the AppShell mode chip + layout key off it).
    if (!isMockMode()) {
      try {
        const supabase = createBrowserSupabaseClient();
        await supabase.auth.updateUser({
          data: { mode_pref: selected },
        });
      } catch {
        // Non-fatal — the user can still proceed; mode_pref is a hint.
      }
    }
    if (selected === "byok") router.push("/app/onboarding/byok");
    else if (selected === "cli")
      router.push("/app/settings/integrations/cli");
    else if (selected === "managed") router.push("/app/projects/new");
  };

  return (
    <>
      <Chip variant="mono-meta" tone="neutral">
        STEP 01 · MODE
      </Chip>
      <h1 id="page-h1">How will you run it?</h1>
      <p className="body-lg">
        Pick the mode that fits how you work. You can change this in
        Settings at any time without losing data.
      </p>

      <div className="sz-mode-grid">
        <Card
          variant="mode"
          eyebrow={<span className="sz-mono-meta">BYOK</span>}
          heading="Paste your Anthropic key"
          body="Your tokens, our infra. Best for technical solo founders."
          mono="SETUP: 1 MIN · TOKENS: YOURS"
          interactive
          onClick={() => setSelected("byok")}
          className={selected === "byok" ? "sz-card--checked" : undefined}
        />
        <Card
          variant="mode"
          eyebrow={<span className="sz-mono-meta">CLI</span>}
          heading="Run on your laptop"
          body="Source never leaves your machine. Watermarked verdict: Private Run · Self-Audited."
          mono="SETUP: 3 MIN · TOKENS: YOURS"
          interactive
          onClick={() => setSelected("cli")}
          className={selected === "cli" ? "sz-card--checked" : undefined}
        />
        <Card
          variant="mode"
          eyebrow={<span className="sz-mono-meta">MANAGED</span>}
          heading="We handle everything"
          body="Easiest setup. Recommended for non-technical founders."
          mono="SETUP: 30 SEC · TOKENS: OURS"
          interactive
          onClick={() => setSelected("managed")}
          className={selected === "managed" ? "sz-card--checked" : undefined}
        />
      </div>

      {selected ? (
        <p className="body-lg" style={{ marginTop: "var(--sp-20)" }}>
          You picked <strong>{selected.toUpperCase()}</strong>. Continue to
          finish setup.
        </p>
      ) : null}

      <div className="sz-intake-actions">
        <Button variant="ghost" size="md" href="/app">
          Skip for now
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={() => void handleContinue()}
          disabled={!selected}
          aria-disabled={!selected}
          loading={saving}
          arrow
        >
          {saving ? "Saving" : "Save and continue"}
        </Button>
      </div>
    </>
  );
}
