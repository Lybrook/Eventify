import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "igyoafdermvrjxsciqoa.supabase.co" },
    ],
  },
};

export default nextConfig;
