import { Router } from "express";

import { getAcademicOptions } from "@controllers/academic.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get(
  "/options",
  requirePermission("user.read"),
  asyncHandler(getAcademicOptions),
);

export { router as academicRoutes };
