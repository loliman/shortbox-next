import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shortbox.de";

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

