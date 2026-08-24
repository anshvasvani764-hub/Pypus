import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Hides the dev-only "Compiling..." build-activity pill so it doesn't
  // overlap fixed bottom UI (e.g. the mobile chat input) during local dev.
  // Compile/runtime errors still surface via the error overlay regardless.
  devIndicators: false,
};

export default nextConfig;
