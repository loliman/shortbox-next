import type { MetadataRoute } from "next";
import { env } from "@/src/lib/env";

const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/de/", "/us/"],
        disallow: [
          "/edit/",
          "/create/",
          "/copy/",
          "/report/",
          "/admin/",
          "/filter/",
          "/login/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

