import { Router } from "express";
import * as controller from "@controllers/schedules/schedule.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/me", requirePermission("schedule.read-own"), asyncHandler(controller.getMine));
router.put("/me", requirePermission("schedule.update-own"), asyncHandler(controller.replaceMine));
router.get("/me/week", requirePermission("schedule.read-own"), asyncHandler(controller.getWeek));
router.put(
  "/me/week",
  requirePermission("schedule.update-own"),
  asyncHandler(controller.replaceWeek),
);

export { router as scheduleRoutes };
