import { Router } from "express";

import * as controller from "@controllers/notifications/notification.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate, requirePermission("appeal.read-own"));
router.get("/me", asyncHandler(controller.mine));
router.patch("/me/read-all", asyncHandler(controller.markAllRead));
router.patch("/me/:id/read", asyncHandler(controller.markRead));

export { router as notificationRoutes };
