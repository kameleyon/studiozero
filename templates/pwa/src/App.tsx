import { useEffect, useState } from "react";

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches,
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const installListener = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener("change", installListener);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      mql.removeEventListener("change", installListener);
    };
  }, []);

  return (
    <div
      className="mx-auto max-w-md px-4 pb-12"
      style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}
    >
      <h1 className="text-3xl font-bold tracking-tight">Studio Zero PWA</h1>
      <p className="mt-3 text-zinc-600">
        Vite + React 19 + Workbox via vite-plugin-pwa. Replace this scaffold with your real app.
      </p>
      <dl className="mt-8 space-y-2 text-sm">
        <div className="flex justify-between"><dt>Network</dt><dd>{isOnline ? "online" : "offline"}</dd></div>
        <div className="flex justify-between"><dt>Installed</dt><dd>{isInstalled ? "yes (standalone)" : "no (browser)"}</dd></div>
      </dl>
    </div>
  );
}
