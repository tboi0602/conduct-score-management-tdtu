import { Router } from "express";

import { getAcademicOptions } from "@controllers/academic.controller";
import * as management from "@controllers/academic-management.controller";
import * as facultyClasses from "@controllers/faculty-class.controller";
import { authenticate, requirePermission } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.use(authenticate);
router.get(
  "/options",
  requirePermission("academic.read"),
  asyncHandler(getAcademicOptions),
);
router.get("/faculty-classes", requirePermission("academic.read"), asyncHandler(facultyClasses.list));
router.post("/faculty-classes", requirePermission("academic.class.create"), asyncHandler(facultyClasses.create));
router.put("/faculty-classes/:id", requirePermission("academic.class.update"), asyncHandler(facultyClasses.update));
router.get("/:kind", requirePermission("academic.read"), asyncHandler(management.list));
router.post("/:kind", requirePermission("academic.create"), asyncHandler(management.create));
router.put("/:kind/:id", requirePermission("academic.update"), asyncHandler(management.update));
router.delete("/:kind/:id", requirePermission("academic.delete"), asyncHandler(management.remove));

export { router as academicRoutes };
