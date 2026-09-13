import { Router } from "express";
import * as controller from "@controllers/attendance/attendance.controller";
import { authenticate, requirePermission } from "@middleware";
import { rateLimitByStudent } from "@middleware/rateLimiter.middleware";
import { asyncHandler } from "@utils/asyncHandler";
import { attendanceScanHttpDuration } from "@metrics";

const router = Router();
router.use((req, res, next) => {
  if (!req.path.includes("/scan")) return next();
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const source = req.path.endsWith("/qr") ? "STUDENT_QR" : "MANAGED";
    attendanceScanHttpDuration.observe(
      { source, result: res.statusCode < 400 ? "accepted" : "rejected" },
      Number(process.hrtime.bigint() - started) / 1_000_000_000,
    );
  });
  next();
});
router.get("/stream", asyncHandler(controller.stream));
router.use(authenticate);
router.post(
  "/me/sse-ticket",
  requirePermission("attendance.create"),
  asyncHandler(controller.studentTicket),
);
router.get(
  "/requests/:requestId",
  requirePermission("attendance.create"),
  asyncHandler(controller.myRequest),
);
router.post(
  "/scan/qr",
  requirePermission("attendance.create"),
  rateLimitByStudent,
  asyncHandler(controller.studentQr),
);
router.post(
  "/events/:eventId/sse-ticket",
  requirePermission("attendance.read"),
  asyncHandler(controller.eventTicket),
);
router.get(
  "/events/:eventId/session",
  requirePermission("attendance.read"),
  asyncHandler(controller.activeSession),
);
router.post(
  "/events/:eventId/session",
  requirePermission("attendance.session.manage"),
  asyncHandler(controller.openSession),
);
router.delete(
  "/events/:eventId/session",
  requirePermission("attendance.session.manage"),
  asyncHandler(controller.closeSession),
);
router.get(
  "/events/:eventId/qr",
  requirePermission("attendance.read"),
  asyncHandler(controller.qr),
);
router.post(
  "/events/:eventId/scan",
  requirePermission("attendance.manage"),
  asyncHandler(controller.managedScan),
);
router.get(
  "/events/:eventId/requests",
  requirePermission("attendance.read"),
  asyncHandler(controller.requests),
);
router.patch(
  "/events/:eventId/records/:recordId",
  requirePermission("attendance.manage"),
  asyncHandler(controller.adjustStatus),
);
export { router as attendanceRoutes };
