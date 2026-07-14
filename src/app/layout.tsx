import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Cafe Finder",
  description: "Find cafes matched to your vibe, work setup, and friend recs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
