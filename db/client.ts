import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  throw new Error(
    "No Postgres connection string set. Expected DATABASE_URL (or POSTGRES_URL) in the environment."
  );
}

type PgClient = ReturnType<typeof postgres>;
const globalForDb = globalThis as unknown as { __pgClient?: PgClient };

const client: PgClient =
  globalForDb.__pgClient ??
  postgres(url, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
