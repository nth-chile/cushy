import type { Config } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
