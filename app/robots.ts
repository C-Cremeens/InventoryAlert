import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://inventoryalert.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: ["/dashboard", "/items", "/requests", "/settings", "/api/", "/scan/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
