import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inventoryalert.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "InventoryAlert",
    template: "%s | InventoryAlert",
  },
  description:
    "Print QR labels, stick them on any shelf or bin, and get an instant email the moment someone scans a low-stock item — no app required.",
  keywords: [
    "inventory management",
    "QR code alerts",
    "stock alerts",
    "restock notifications",
    "inventory tracking",
  ],
  openGraph: {
    type: "website",
    siteName: "InventoryAlert",
    title: "InventoryAlert — Stock alerts, zero friction",
    description:
      "Print QR labels, stick them on any shelf or bin, and get an instant email the moment someone scans a low-stock item — no app required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "InventoryAlert — Stock alerts, zero friction",
    description:
      "Print QR labels, stick them on any shelf or bin, and get an instant email the moment someone scans a low-stock item — no app required.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
