import { Router } from "express";
import * as controller from "@controllers/semesters/semester.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("semester.read"), asyncHandler(controller.list));
router.post("/", requirePermission("semester.create"), asyncHandler(controller.create));
router.put("/:id", requirePermission("semester.update"), asyncHandler(controller.update));
router.delete("/:id", requirePermission("semester.delete"), asyncHandler(controller.remove));

export { router as semesterRoutes };
