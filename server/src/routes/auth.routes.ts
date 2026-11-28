import { Router } from "express";
import {
  adminLogin,
  studentLogin,
  me,
  updateMe,
  refreshToken,
  switchMode,
  logout,
} from "@controllers/auth/auth.controller";
import { authenticate, rateLimit } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.post("/login", rateLimit("auth:login", 5, 60), asyncHandler(adminLogin));
router.post("/student/login", rateLimit("auth:student-login", 5, 60), asyncHandler(studentLogin));
router.post("/refresh", rateLimit("auth:refresh", 10, 60), asyncHandler(refreshToken));
router.post("/logout", rateLimit("auth:logout", 20, 60), asyncHandler(logout));
router.get("/me", authenticate, asyncHandler(me));
router.post(
  "/switch-mode",
  authenticate,
  rateLimit("auth:switch-mode", 20, 60),
  asyncHandler(switchMode),
);
router.put("/me", authenticate, asyncHandler(updateMe));
export { router };
