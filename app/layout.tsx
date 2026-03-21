import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppProviders from "@/src/components/AppProviders";
import { AppPageLoader } from "@/src/components/generic/loading";
import { countChangeRequests } from "@/src/lib/read/issue-read";

export const metadata: Metadata = {
  title: "Shortbox",
  description: "Shortbox"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const changeRequestsCount = await countChangeRequests().catch(() => 0);

  return (
    <html lang="de" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders changeRequestsCount={changeRequestsCount}>
          <Suspense fallback={<AppPageLoader />}>{children}</Suspense>
        </AppProviders>
      </body>
    </html>
  );
}
