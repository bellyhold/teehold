import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth cookies + Stripe webhooks need classic dynamic routes.
  // cacheComponents conflicts with `dynamic` / `runtime` segment config.
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
