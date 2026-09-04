import { Router } from "express";

import * as controller from "@controllers/user.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("user.read"), asyncHandler(controller.listUsers));
router.get("/:id", requirePermission("user.read"), asyncHandler(controller.getUser));
router.post("/", requirePermission("user.create"), asyncHandler(controller.createUser));
router.put("/:id", requirePermission("user.update"), asyncHandler(controller.updateUser));
router.delete("/:id", requirePermission("user.delete"), asyncHandler(controller.deleteUser));

export { router as userRoutes };
