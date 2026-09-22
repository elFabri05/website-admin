import type { NextConfig } from "next";

// Static export: `next build` writes a plain static site to out/, like the old index.html.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
