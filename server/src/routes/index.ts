import { Router } from "express";
import { router as authRoutes } from "@routes/auth.routes";
import { rbacRoutes } from "@routes/rbac.routes";
import { userRoutes } from "@routes/user.routes";
import { academicRoutes } from "@routes/academic.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/rbac", rbacRoutes);
router.use("/users", userRoutes);
router.use("/academic", academicRoutes);

// TODO: khai báo các endpoint nghiệp vụ tại đây, ví dụ:
//   router.use("/attendance", attendanceRoutes);
//   router.use("/events", eventRoutes);
//   router.use("/students", studentRoutes);
// Flow: route -> controller (@controllers/*) -> service (@services/*)

export { router };
