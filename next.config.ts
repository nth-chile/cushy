import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The invoice PDF routes read bundled Lato TTFs at runtime; make sure the
  // file tracer ships them with the serverless functions.
  outputFileTracingIncludes: {
    "/api/invoices/**": ["./lib/pdf/fonts/**"],
  },
};

export default nextConfig;
