import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/_next/", "/scripts/"],
    },
    sitemap: "https://techgom.vercel.app/sitemap.xml",
    host: "https://techgom.vercel.app",
  };
}
