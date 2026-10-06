import { Router } from "express";

import { studentReport } from "@controllers/reports/report.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate, requirePermission("dashboard.read"));
router.get("/students", asyncHandler(studentReport));

export { router as reportRoutes };
