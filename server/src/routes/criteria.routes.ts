import { Router } from "express";
import * as controller from "@controllers/criteria.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("criteria.read"),
  asyncHandler(controller.listCriteria),
);
router.get(
  "/:id",
  requirePermission("criteria.read"),
  asyncHandler(controller.getCriteria),
);
router.post(
  "/",
  requirePermission("criteria.create"),
  asyncHandler(controller.createCriteria),
);
router.put(
  "/:id",
  requirePermission("criteria.update"),
  asyncHandler(controller.updateCriteria),
);
router.delete(
  "/:id",
  requirePermission("criteria.delete"),
  asyncHandler(controller.deleteCriteria),
);

export { router as criteriaRoutes };
