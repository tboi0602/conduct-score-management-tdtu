import { Router } from "express";
import * as controller from "@controllers/rbac.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);

router.get("/permissions", requirePermission("permission.read"), asyncHandler(controller.listPermissions));
router.post("/permissions", requirePermission("permission.create"), asyncHandler(controller.createPermission));
router.put("/permissions/:id", requirePermission("permission.update"), asyncHandler(controller.updatePermission));
router.delete("/permissions/:id", requirePermission("permission.delete"), asyncHandler(controller.deletePermission));

router.get("/roles", requirePermission("role.read"), asyncHandler(controller.listRoles));
router.post("/roles", requirePermission("role.create"), asyncHandler(controller.createRole));
router.put("/roles/:id", requirePermission("role.update"), asyncHandler(controller.updateRole));
router.delete("/roles/:id", requirePermission("role.delete"), asyncHandler(controller.deleteRole));

export { router as rbacRoutes };
