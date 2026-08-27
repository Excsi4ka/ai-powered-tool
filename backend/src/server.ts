import { env } from "./config/env.js";
import { closePool } from "./config/database.js";
import { createApp } from "./app.js";

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
