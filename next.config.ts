import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Explicit workspace root so Turbopack resolves packages from the worktree
    root: __dirname
  },
};

export default nextConfig;