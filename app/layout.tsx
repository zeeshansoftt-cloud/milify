import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Milify — Rutiner, uppföljning och föräldrakommunikation för förskolan",
    template: "%s · Milify",
  },
  description:
    "Milify gör förskolans rutiner till ett enkelt QR-flöde. Checklistor med ansvar och tidsstämpel, uppföljning för ledningen och föräldrameddelanden översatta till deras språk.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Milify",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
