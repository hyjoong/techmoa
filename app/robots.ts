import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/scripts/"],
    },
    sitemap: "https://techmoa.dev/sitemap.xml",
  };
}
