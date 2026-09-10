import { Router } from "express";
import { summary } from "@controllers/dashboard.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("dashboard.read"), asyncHandler(summary));
export { router as dashboardRoutes };
