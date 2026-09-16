import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage build — generates a standalone server.js
  // that runs without node_modules in the final image
  output: "standalone",
};

export default nextConfig;
