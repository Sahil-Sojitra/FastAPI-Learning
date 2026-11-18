import type { NextConfig } from "next";

const apiOrigin = (
  process.env.TASK_BOARD_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return ["auth", "tasks", "ai"].map((group) => ({
      source: `/api/${group}/:path*`,
      destination: `${apiOrigin}/${group}/:path*`,
    }));
  },
};

export default nextConfig;
