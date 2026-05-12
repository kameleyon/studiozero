/**
 * /app/settings/notifications — Email preferences page.
 *
 * Owner: Forge (Phase 9 M4 Batch 1). Voice + copy: Herald §"Manage
 * preferences page" lock. Compliance: CASL Canada — marketing toggle
 * defaults OFF.
 */
"use client";

import * as React from "react";

interface PreferencesState {
  product_updates: boolean;
  marketing: boolean;
  reaudit_reminders: boolean;
}

const DEFAULTS: PreferencesState = {
  product_updates: false,
  marketing: false,
  reaudit_reminders: true,
};

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  required?: boolean;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  required,
}: ToggleRowProps): React.ReactElement {
  const inputId = React.useId();
  return (
    <li
      style={{
        listStyle: "none",
        padding: "16px 0",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <label
          htmlFor={inputId}
          style={{ fontWeight: 600, fontSize: 15, display: "block", marginBottom: 4 }}
        >
          {label}
          {required ? (
            <span
              style={{ marginLeft: 8, fontSize: 12, color: "#6b7280", fontWeight: 400 }}
            >
              (required to use Studio Zero)
            </span>
          ) : null}
        </label>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={required}
        onChange={(e) => onChange(e.currentTarget.checked)}
        style={{ width: 18, height: 18, accentColor: "#111827" }}
      />
    </li>
  );
}

export default function NotificationsSettingsPage(): React.ReactElement {
  const [prefs, setPrefs] = React.useState<PreferencesState>(DEFAULTS);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const update = (patch: Partial<PreferencesState>): void => {
    setPrefs((p) => ({ ...p, ...patch }));
    setStatus("idle");
  };

  const save = async (): Promise<void> => {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/email/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body?.detail ?? "Save failed.");
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Save failed.");
      setStatus("error");
    }
  };

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        color: "#111827",
      }}
    >
      <h1 style={{ fontSize: 24, margin: "0 0 8px 0" }}>Your email preferences</h1>
      <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#6b7280" }}>
        Marketing emails default to off. Transactional emails about your account
        and billing always come through.
      </p>

      <ul style={{ padding: 0, margin: 0, borderTop: "1px solid #e5e7eb" }}>
        <ToggleRow
          label="Product emails (account, billing, audits)"
          description="Required for Studio Zero to function — verdict notifications, billing receipts, security alerts."
          checked={true}
          onChange={() => {}}
          required
        />
        <ToggleRow
          label="Product updates (changelog, releases)"
          description="A short note when we ship a meaningful change. Off by default."
          checked={prefs.product_updates}
          onChange={(v) => update({ product_updates: v })}
        />
        <ToggleRow
          label="Re-audit reminders"
          description="A heads-up three days before a free re-audit window closes."
          checked={prefs.reaudit_reminders}
          onChange={(v) => update({ reaudit_reminders: v })}
        />
        <ToggleRow
          label="Win-back (a single 60-day check-in if you go quiet)"
          description="At most one email, ever. Off by default per CASL Canada confirmed-opt-in."
          checked={prefs.marketing}
          onChange={(v) => update({ marketing: v })}
        />
      </ul>

      <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            void save();
          }}
          disabled={status === "saving"}
          style={{
            padding: "10px 20px",
            backgroundColor: "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: status === "saving" ? "wait" : "pointer",
          }}
        >
          {status === "saving" ? "Saving…" : "Save preferences"}
        </button>
        {status === "saved" ? (
          <span style={{ fontSize: 13, color: "#15803d" }}>Saved.</span>
        ) : null}
        {status === "error" && errorMsg ? (
          <span style={{ fontSize: 13, color: "#b91c1c" }}>{errorMsg}</span>
        ) : null}
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
        Studio Zero is an AI system. See methodology at{" "}
        <a href="/methodology" style={{ color: "#374151", textDecoration: "underline" }}>
          studiozero.dev/methodology
        </a>
        .
      </p>
    </main>
  );
}
