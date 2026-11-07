import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Foto caricate dalla redazione su Vercel Blob (src/lib/product-images.ts).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/products/**" }],
  },
  partialPrefetching: true,
  experimental: {
    authInterrupts: true,
    // Foto prodotto caricate dalla redazione (max 4 MB + margine multipart).
    // Su Vercel vale comunque il limite di piattaforma di 4,5 MB per richiesta.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
