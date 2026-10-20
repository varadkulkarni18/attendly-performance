
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  // Import the database only after loading environment variables.
  const { pool } = await import("../lib/db");

  const started = Date.now();

  try {
    const result = await pool.query("SELECT NOW() AS server_time");

    console.log("Database connected:", result.rows[0]);
    console.log("Query duration:", `${Date.now() - started} ms`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
