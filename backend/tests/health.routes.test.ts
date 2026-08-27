import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("health routes", () => {
  it("serves the quick tester at GET /", async () => {
    const app = createApp();

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("HireLens AI");
    expect(response.headers["content-type"]).toContain("text/html");
  });

  it("serves the quick tester for non-API paths", async () => {
    const app = createApp();

    const response = await request(app).get("/scanner");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Job Scanner");
    expect(response.headers["content-type"]).toContain("text/html");
  });

  it("returns ok for GET /api/health", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      status: "ok",
    });
  });

  it("returns an API index for GET /api", async () => {
    const app = createApp();

    const response = await request(app).get("/api");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      app: "HireLens AI Backend",
      tester: "/scanner",
    });
  });
});
