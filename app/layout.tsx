import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shortbox Next",
  description: "Next.js migration workspace for Shortbox"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
