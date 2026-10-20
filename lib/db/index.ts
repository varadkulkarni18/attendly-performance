
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalForDb = globalThis as typeof globalThis & {
  attendlyPool?: Pool;
};

export const pool =
  globalForDb.attendlyPool ??
  new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.attendlyPool = pool;
}

pool.on("error", (error) => {
  console.error("[Database] Unexpected idle connection error:", error);
});

export const db = drizzle(pool, { schema });
