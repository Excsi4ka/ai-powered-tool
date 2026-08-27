import { env } from "./config/env.js";
import { closePool, initializeDatabase } from "./config/database.js";
import { createApp } from "./app.js";

await initializeDatabase();

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`HireLens AI backend listening on http://localhost:${env.PORT}`);
});

const shutdown = async (): Promise<void> => {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
