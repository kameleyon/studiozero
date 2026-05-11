import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio Zero — Storefront",
  description: "E-commerce template — Next.js 15 + Shopify Hydrogen + Stripe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
