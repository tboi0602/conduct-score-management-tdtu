import { Router } from "express";

import * as controller from "@controllers/users/user.controller";
import * as roleAssignment from "@controllers/users/role-assignment.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get(
  "/role-assignment",
  requirePermission("faculty-staff.assign-event-organizer"),
  asyncHandler(roleAssignment.list),
);
router.patch(
  "/:id/role-assignment",
  requirePermission("faculty-staff.assign-event-organizer"),
  asyncHandler(roleAssignment.update),
);
router.get("/", requirePermission("user.read"), asyncHandler(controller.listUsers));
router.get("/:id", requirePermission("user.read"), asyncHandler(controller.getUser));
router.post("/", requirePermission("user.create"), asyncHandler(controller.createUser));
router.put("/:id", requirePermission("user.update"), asyncHandler(controller.updateUser));
router.delete("/:id", requirePermission("user.delete"), asyncHandler(controller.deleteUser));

export { router as userRoutes };
