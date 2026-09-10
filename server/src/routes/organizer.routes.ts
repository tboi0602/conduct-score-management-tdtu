import { Router } from "express";
import * as controller from "@controllers/organizer.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get("/", requirePermission("organizer.read"), asyncHandler(controller.listOrganizers));
router.post("/", requirePermission("organizer.create"), asyncHandler(controller.createOrganizer));
router.put("/:id", requirePermission("organizer.update"), asyncHandler(controller.updateOrganizer));
router.delete("/:id", requirePermission("organizer.delete"), asyncHandler(controller.deleteOrganizer));
export { router as organizerRoutes };
