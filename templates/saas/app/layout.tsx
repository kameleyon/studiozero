import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio Zero SaaS",
  description: "Production-ready SaaS template",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
