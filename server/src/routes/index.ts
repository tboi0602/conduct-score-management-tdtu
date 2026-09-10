import { Router } from "express";
import { router as authRoutes } from "@routes/auth.routes";
import { rbacRoutes } from "@routes/rbac.routes";
import { userRoutes } from "@routes/user.routes";
import { academicRoutes } from "@routes/academic.routes";
import { eventRoutes } from "@routes/event.routes";
import { criteriaRoutes } from "@routes/criteria.routes";
import { organizerRoutes } from "@routes/organizer.routes";
import { semesterRoutes } from "@routes/semester.routes";
import { attendanceRoutes } from "@routes/attendance.routes";
import { dashboardRoutes } from "@routes/dashboard.routes";
import { facultyUserRoutes } from "@routes/faculty-user.routes";
import { conductScoreRoutes } from "@routes/conduct-score.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/rbac", rbacRoutes);
router.use("/users", userRoutes);
router.use("/academic", academicRoutes);
router.use("/events", eventRoutes);
router.use("/criteria", criteriaRoutes);
router.use("/organizers", organizerRoutes);
router.use("/semesters", semesterRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/faculty-users", facultyUserRoutes);
router.use("/conduct-scores", conductScoreRoutes);

// TODO: khai báo các endpoint nghiệp vụ tại đây, ví dụ:
//   router.use("/attendance", attendanceRoutes);
//   router.use("/students", studentRoutes);
// Flow: route -> controller (@controllers/*) -> service (@services/*)

export { router };
