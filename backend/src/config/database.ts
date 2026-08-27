import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;
type QueryResultRow = pg.QueryResultRow;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "../../database/schema.sql");

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> =>
  pool.query<T>(text, params);

export const closePool = async (): Promise<void> => {
  await pool.end();
};

export const initializeDatabase = async (): Promise<void> => {
  const schema = await fs.readFile(schemaPath, "utf8");
  await pool.query(schema);
};
