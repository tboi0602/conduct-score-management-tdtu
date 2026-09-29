import { Router } from "express";
import { validate } from "@middleware/validate.middleware";
import {
  notificationIdParamsSchema,
  notificationListQuerySchema,
} from "@modules/notifications/notification.schemas";

import * as controller from "@controllers/notifications/notification.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate, requirePermission("notification.read-own"));
router.get("/me", validate({ query: notificationListQuerySchema }), asyncHandler(controller.mine));
router.patch("/me/read-all", asyncHandler(controller.markAllRead));
router.patch(
  "/me/:id/read",
  validate({ params: notificationIdParamsSchema }),
  asyncHandler(controller.markRead),
);

export { router as notificationRoutes };
