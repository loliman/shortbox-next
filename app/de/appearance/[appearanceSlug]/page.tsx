import type { Metadata } from "next";
import {
  generateSeoFilterPageMetadata,
  renderSeoFilterHomePage,
} from "@/src/components/pages/seo-filter-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  return generateSeoFilterPageMetadata({
    us: false,
    kind: "appearance",
    slug: resolvedParams.appearanceSlug || "",
    searchParams: resolvedSearchParams,
  });
}

export default async function DeAppearanceFilterLandingPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const resolvedParams = await params;
  return renderSeoFilterHomePage({
    us: false,
    kind: "appearance",
    slug: resolvedParams.appearanceSlug || "",
    searchParams,
  });
}

