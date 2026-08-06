// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pypus.in"),
  title: "Pypus — Where Your Business Runs Itself",
  description: "Pypus is a Management software that automates daily operations. AI agents recover fees, enforce attendance, and onboard members automatically.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Pypus — Where Your Business Runs Itself",
    description: "Business management software. AI agents that act, not just store data.",
    url: "https://www.pypus.in",
    siteName: "Pypus",
    type: "website",
  },
  verification: {
    google: "KipPmRUpH3h1YGdpAJBPxmBaEnkBNeQ_bKnquzJWvEw",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
