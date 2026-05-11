import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "Studio Zero PWA",
        short_name: "SZ PWA",
        description: "Studio Zero PWA template",
        theme_color: "#000000",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/api\..*/,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 5, expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 } },
          },
        ],
      },
      devOptions: { enabled: false }, // turn on if you want to test SW in dev
    }),
  ],
});
