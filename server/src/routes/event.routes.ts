import { Router } from "express";
import * as controller from "@controllers/events/event.controller";
import {
  getCriteriaOptions,
  getSemesterOptions,
} from "@controllers/events/event-options.controller";
import { listOrganizers } from "@controllers/organizers/organizer.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";
import * as registrations from "@controllers/events/event-registration.controller";
import { eventRegistrationRateLimit } from "@middleware/rateLimiter.middleware";
import { getAcademicOptions } from "@controllers/academic/academic.controller";

const router = Router();
router.use(authenticate);

router.get("/discover", requirePermission("event.read"), asyncHandler(registrations.listPublic));
router.get(
  "/recommended",
  requirePermission("event.read"),
  asyncHandler(registrations.listRecommended),
);
router.get(
  "/discover-options/organizers",
  requirePermission("event.read"),
  asyncHandler(registrations.publicOrganizerOptions),
);
router.get(
  "/discover-options/academic",
  requirePermission("event.read"),
  asyncHandler(getAcademicOptions),
);
router.get("/discover/:id", requirePermission("event.read"), asyncHandler(registrations.getPublic));
router.get(
  "/my-registrations",
  requirePermission("event-registration.read"),
  asyncHandler(registrations.listMine),
);
router.post(
  "/:id/register",
  requirePermission("event-registration.create"),
  eventRegistrationRateLimit,
  asyncHandler(registrations.registerSelf),
);
router.delete(
  "/:id/register",
  requirePermission("event-registration.delete"),
  eventRegistrationRateLimit,
  asyncHandler(registrations.cancelSelf),
);
router.get(
  "/:id/registrations",
  requirePermission("event-registration.manage"),
  asyncHandler(registrations.listManaged),
);
router.post(
  "/:id/registrations",
  requirePermission("event-registration.manage"),
  asyncHandler(registrations.registerManaged),
);
router.delete(
  "/:id/registrations/:studentId",
  requirePermission("event-registration.manage"),
  asyncHandler(registrations.cancelManaged),
);
router.get(
  "/:id/registration-students/options",
  requirePermission("event-registration.manage"),
  asyncHandler(registrations.searchStudents),
);

router.get("/options/semesters", requirePermission("event.read"), asyncHandler(getSemesterOptions));
router.get("/options/criteria", requirePermission("event.read"), asyncHandler(getCriteriaOptions));
router.get("/options/organizers", requirePermission("event.read"), asyncHandler(listOrganizers));

router.get("/", requirePermission("event.read"), asyncHandler(controller.listEvents));
router.get("/:id", requirePermission("event.read"), asyncHandler(controller.getEvent));
router.post("/", requirePermission("event.create"), asyncHandler(controller.createEvent));
router.put("/:id", requirePermission("event.update"), asyncHandler(controller.updateEvent));
router.delete("/:id", requirePermission("event.delete"), asyncHandler(controller.deleteEvent));

export { router as eventRoutes };
