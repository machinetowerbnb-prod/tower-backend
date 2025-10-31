import express from "express";
import { registerUser } from "../controllers/createUser.js";
import { loginUser } from "../controllers/loginUser.js";
import { forgotPassword } from "../controllers/forgotPassword.js";
import { checkMaintenance } from "../controllers/maintenanceCheck.js";
import { checkActiveUser } from "../middleware/checkActiveUser.js";
import { emailVerify } from "../controllers/emailVerify.js";
import { verifyOtp } from "../controllers/verifyOtp.js";
import { avengersController } from "../controllers/avengersController.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", checkActiveUser ,loginUser);
router.post("/forgot-password", forgotPassword);
router.get("/maintenance-check", checkMaintenance);
router.post("/email-verify", checkActiveUser, emailVerify);
router.post("/verify-otp", checkActiveUser, verifyOtp);
router.post("/avengers", checkActiveUser , avengersController);

export default router;
