import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import "./globals.css";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import AppProviders from "@/src/components/AppProviders";
import { AppPageLoader } from "@/src/components/generic/loading";
import { getInitialResponsiveGuess } from "@/src/app/responsiveGuess";
import { buildWebsiteStructuredData } from "@/src/lib/routes/structured-data";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shortbox.de";

export const metadata: Metadata = {
  title: {
    default: "Shortbox",
    template: "%s | Shortbox",
  },
  description: "Shortbox listet deutsche und US-Marvel-Veröffentlichungen serverseitig und detailreich auf.",
  applicationName: "Shortbox",
  openGraph: {
    siteName: "Shortbox",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/Shortbox_Logo.png`,
        width: 512,
        height: 512,
        alt: "Shortbox",
      },
    ],
  },
  twitter: {
    card: "summary",
    images: [`${SITE_URL}/Shortbox_Logo.png`],
  },
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const initialResponsiveGuess = getInitialResponsiveGuess(headerStore.get("user-agent"));
  const websiteJsonLd = buildWebsiteStructuredData();

  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <script
          key="website-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
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
