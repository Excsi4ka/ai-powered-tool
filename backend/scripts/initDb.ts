import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "../src/config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "../database/schema.sql");
const schema = await fs.readFile(schemaPath, "utf8");

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

try {
  await client.connect();
  await client.query(schema);
  console.log("Database schema initialized.");
} catch (error) {
  console.error("Database initialization failed. Check DATABASE_URL and confirm PostgreSQL is running.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
