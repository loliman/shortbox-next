import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppProviders from "@/src/components/AppProviders";
import { AppPageLoader } from "@/src/components/generic/loading";

export const metadata: Metadata = {
  title: {
    default: "Shortbox",
    template: "%s | Shortbox",
  },
  description: "Shortbox listet deutsche und US-Marvel-Veröffentlichungen serverseitig und detailreich auf.",
  applicationName: "Shortbox",
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <AppProviders>
          <Suspense fallback={<AppPageLoader />}>{children}</Suspense>
        </AppProviders>
      </body>
    </html>
  );
}
