"use client";

/**
 * Studio Zero — Cookie consent banner
 *
 * Minimal GDPR-friendly banner: explicit accept/reject, no pre-ticked boxes,
 * no "by using this site you agree" dark patterns. Stores choice in localStorage.
 *
 * For full compliance you typically need a categorized banner (necessary vs.
 * analytics vs. marketing) — this is the floor, not the ceiling.
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "sz_cookie_consent_v1";

export type ConsentChoice = "accepted" | "rejected" | null;

export function getStoredConsent(): ConsentChoice {
  if (typeof window === "undefined") return null;
  return (window.localStorage.getItem(STORAGE_KEY) as ConsentChoice) ?? null;
}

export function setStoredConsent(choice: Exclude<ConsentChoice, null>) {
  window.localStorage.setItem(STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: choice }));
}

export function CookieBanner({ privacyHref = "/privacy" }: { privacyHref?: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(getStoredConsent() === null);
  }, []);

  if (!shown) return null;

  const choose = (c: Exclude<ConsentChoice, null>) => {
    setStoredConsent(c);
    setShown(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-lg border border-zinc-200 bg-white p-4 shadow-lg"
    >
      <h2 id="cookie-banner-title" className="text-sm font-semibold">
        We use cookies
      </h2>
      <p id="cookie-banner-body" className="mt-1 text-sm text-zinc-600">
        Strictly necessary cookies keep you signed in. Optional analytics cookies help us improve.
        See our <a href={privacyHref} className="underline">privacy policy</a>.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => choose("accepted")}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Accept all
        </button>
        <button
          onClick={() => choose("rejected")}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Reject optional
        </button>
      </div>
    </div>
  );
}
