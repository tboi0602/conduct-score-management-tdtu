import { Router } from "express";
import * as controller from "@controllers/appeals/appeal.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/me/events", requirePermission("appeal.create-own"), asyncHandler(controller.eligible));
router.post("/me/upload", requirePermission("appeal.create-own"), asyncHandler(controller.upload));
router.post("/me", requirePermission("appeal.create-own"), asyncHandler(controller.create));
router.get("/me", requirePermission("appeal.read-own"), asyncHandler(controller.mine));
router.get(
  "/me/:id/evidence",
  requirePermission("appeal.read-own"),
  asyncHandler(controller.ownEvidence),
);
router.get("/", requirePermission("appeal.read"), asyncHandler(controller.list));
router.get("/:id", requirePermission("appeal.read"), asyncHandler(controller.detail));
router.get("/:id/evidence", requirePermission("appeal.read"), asyncHandler(controller.evidence));
router.patch("/:id/review", requirePermission("appeal.manage"), asyncHandler(controller.review));
export { router as appealRoutes };
