import { Router } from "express";
import {
  adminLogin,
  googleLogin,
  me,
  updateMe,
  refreshToken,
  switchMode,
} from "@controllers/auth/auth.controller";
import { authenticate, rateLimit } from "@middleware";
import { asyncHandler } from "@utils/asyncHandler";

const router = Router();
router.post("/login", rateLimit("auth:login", 5, 60), asyncHandler(adminLogin));
router.post("/google", rateLimit("auth:google", 5, 60), asyncHandler(googleLogin));
router.post("/refresh", rateLimit("auth:refresh", 10, 60), asyncHandler(refreshToken));
router.get("/me", authenticate, asyncHandler(me));
router.post(
  "/switch-mode",
  authenticate,
  rateLimit("auth:switch-mode", 20, 60),
  asyncHandler(switchMode),
);
router.put("/me", authenticate, asyncHandler(updateMe));
export { router };
