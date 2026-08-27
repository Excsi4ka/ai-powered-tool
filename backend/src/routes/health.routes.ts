import { Router } from "express";

export const createHealthRouter = (): Router => {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      success: true,
      status: "ok",
    });
  });

  return router;
};
