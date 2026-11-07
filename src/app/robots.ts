import type { MetadataRoute } from "next";

/** Niente indicizzazione finché SITE_INDEXING non è "on"; la redazione resta sempre fuori. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_INDEXING !== "on") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/redazione/", "/api/"] } };
}
