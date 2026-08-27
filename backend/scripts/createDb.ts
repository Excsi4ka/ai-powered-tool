import pg from "pg";
import { env } from "../src/config/env.js";

const databaseUrl = new URL(env.DATABASE_URL);
const databaseName = databaseUrl.pathname.replace(/^\//, "");

if (!databaseName) {
  console.error("Database creation failed. DATABASE_URL must include a database name.");
  process.exit(1);
}

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
  console.error("Database creation failed. Database name must be a simple PostgreSQL identifier.");
  process.exit(1);
}

databaseUrl.pathname = "/postgres";

const client = new pg.Client({
  connectionString: databaseUrl.toString(),
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

try {
  await client.connect();

  const existingDatabase = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);

  if ((existingDatabase.rowCount ?? 0) > 0) {
    console.log(`Database '${databaseName}' already exists.`);
  } else {
    await client.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`Database '${databaseName}' created.`);
  }
} catch (error) {
  console.error("Database creation failed. Check DATABASE_URL and confirm PostgreSQL is running.");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exitCode = 1;
} finally {
  await client.end();
}
