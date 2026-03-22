import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import "./globals.css";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import AppProviders from "@/src/components/AppProviders";
import { AppPageLoader } from "@/src/components/generic/loading";
import { getInitialResponsiveGuess } from "@/src/app/responsiveGuess";

export const metadata: Metadata = {
  title: {
    default: "Shortbox",
    template: "%s | Shortbox",
  },
  description: "Shortbox listet deutsche und US-Marvel-Veröffentlichungen serverseitig und detailreich auf.",
  applicationName: "Shortbox",
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const initialResponsiveGuess = getInitialResponsiveGuess(headerStore.get("user-agent"));

  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript
          attribute="data-theme"
          defaultMode="light"
          modeStorageKey="shortbox_theme_mode"
          colorSchemeStorageKey="shortbox_color_scheme"
        />
        <AppProviders initialResponsiveGuess={initialResponsiveGuess}>
          <Suspense fallback={<AppPageLoader />}>{children}</Suspense>
        </AppProviders>
      </body>
    </html>
  );
}
