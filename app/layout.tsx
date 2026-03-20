import type { Metadata } from "next";
import "./globals.css";
import App from "@/src/components/App";

export const metadata: Metadata = {
  title: "Shortbox",
  description: "Shortbox"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <App>{children}</App>
      </body>
    </html>
  );
}
