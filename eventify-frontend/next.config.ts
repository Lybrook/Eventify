import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "igyoafdermvrjxsciqoa.supabase.co" },
    ],
  },
};

export default nextConfig;
