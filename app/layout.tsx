import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import AppProviders from "@/src/components/AppProviders";
import { getInitialResponsiveGuess, RESPONSIVE_GUESS_COOKIE_NAME } from "@/src/app/responsiveGuess";
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
  const cookieStore = await cookies();
  const initialResponsiveGuess = getInitialResponsiveGuess({
    userAgent: headerStore.get("user-agent"),
    secChUaMobile: headerStore.get("sec-ch-ua-mobile"),
    storedGuess: cookieStore.get(RESPONSIVE_GUESS_COOKIE_NAME)?.value,
  });
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
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
