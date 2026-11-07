import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Foto caricate dalla redazione su Vercel Blob (src/lib/product-images.ts).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/products/**" }],
  },
  partialPrefetching: true,
  // Header di sicurezza su tutte le pagine. frame-ancestors / X-Frame-Options: il sito
  // (redazione compresa) non si può caricare dentro il frame di un altro sito.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
