import { Router } from "express";
import * as controller from "@controllers/academic/faculty-user.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("student.read"), asyncHandler(controller.list));
router.post("/", requirePermission("student.create"), asyncHandler(controller.create));
router.delete(
  "/students/bulk",
  requirePermission("student.delete"),
  asyncHandler(controller.removeStudents),
);
router.patch(
  "/staff/bulk-status",
  requirePermission("faculty-staff.disable"),
  asyncHandler(controller.statuses),
);
router.put("/:id", requirePermission("student.update"), asyncHandler(controller.update));
router.patch(
  "/:id/status",
  requirePermission("faculty-staff.disable"),
  asyncHandler(controller.status),
);
router.delete("/:id", requirePermission("student.delete"), asyncHandler(controller.removeStudent));
export { router as facultyUserRoutes };
