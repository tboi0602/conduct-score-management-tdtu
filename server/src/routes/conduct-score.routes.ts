import { Router } from "express";

import * as controller from "@controllers/conduct-score/conduct-score.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/me", requirePermission("conduct-score.read-own"), asyncHandler(controller.mine));
router.get("/", requirePermission("conduct-score.read"), asyncHandler(controller.list));
router.post(
  "/finalize-bulk",
  requirePermission("conduct-score.finalize"),
  asyncHandler(controller.bulkFinalize),
);
router.post(
  "/adjustments-bulk",
  requirePermission("conduct-score.manage"),
  asyncHandler(controller.bulkAdjustment),
);
router.get("/:studentId", requirePermission("conduct-score.read"), asyncHandler(controller.detail));
router.post(
  "/:studentId/adjustments",
  requirePermission("conduct-score.manage"),
  asyncHandler(controller.adjustment),
);
router.post(
  "/:studentId/finalize",
  requirePermission("conduct-score.finalize"),
  asyncHandler(controller.finalize),
);
router.post(
  "/:studentId/reopen",
  requirePermission("conduct-score.reopen"),
  asyncHandler(controller.reopen),
);

export { router as conductScoreRoutes };
