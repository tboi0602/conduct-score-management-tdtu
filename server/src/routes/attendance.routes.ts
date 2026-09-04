import { Router } from "express";
import { rateLimitByStudent } from "../middleware/rateLimiter.middleware";

const router = Router();

/**
 * POST /api/v1/attendance/scan
 * Producer: validates payload, acquires idempotency lock via Redis,
 * then publishes an "attendance.scanned" event to RabbitMQ.
 */
router.post(
  "/attendance/scan",
  rateLimitByStudent,
  async (req, res, next) => {
    // Contract: producer logic will be added in next phase
    res.status(202).json({ ok: true, idempotencyKey: "" });
  },
);

export { router as attendanceRoutes };