import { Router } from "express";
import * as controller from "@controllers/warnings/warning.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate, requirePermission("conduct-score.read-own"));
router.get("/me", asyncHandler(controller.mine));
export { router as warningRoutes };
