import type { Metadata, Viewport } from "next";
import { Antonio, Gloock, Hanken_Grotesk } from "next/font/google";

const gloock = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock", display: "swap" });
const antonio = Antonio({ subsets: ["latin"], weight: ["700"], variable: "--font-antonio", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  icons: { icon: "/brand/icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${gloock.variable} ${antonio.variable} ${hanken.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
