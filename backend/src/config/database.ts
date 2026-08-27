import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;
type QueryResultRow = pg.QueryResultRow;

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
