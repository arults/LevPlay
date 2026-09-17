import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LevPlay — Leveraged Tokenized Stocks",
  description: "Explore LevPlay 2x, 3x and 5x leveraged stock and commodity tokens on Solana with no holder margin calls. Token NAV can approach zero.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
