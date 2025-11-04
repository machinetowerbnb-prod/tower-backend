import express from "express";
import { registerUser } from "../controllers/createUser.js";
import { loginUser } from "../controllers/loginUser.js";
import { forgotPassword } from "../controllers/forgotPassword.js";
import { checkMaintenance } from "../controllers/maintenanceCheck.js";
import { checkActiveUser } from "../middleware/checkActiveUser.js";
import { emailVerify } from "../controllers/emailVerify.js";
import { verifyOtp } from "../controllers/verifyOtp.js";
import { avengersController } from "../controllers/avengersController.js";
import { resetPassword } from "../controllers/resetPassword.js";
import { depositConfirmController } from "../controllers/depositConfirmController.js";
import { withdrawController } from "../controllers/withdrawController.js";
import { adminUpdateController } from "../controllers/adminUpdateController.js";
import { adminWithdrawApprovalController } from "../controllers/adminWithdrawApprovalController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", checkActiveUser ,loginUser);
router.post("/forgot-password", forgotPassword);
router.get("/maintenance-check", checkMaintenance);
router.post("/email-verify", checkActiveUser, emailVerify);
router.post("/verify-otp", checkActiveUser, verifyOtp);
router.post("/reset-password",checkActiveUser, resetPassword);
router.post("/avengers", checkActiveUser , avengersController);
router.post("/confirm", checkActiveUser ,depositConfirmController);
router.post("/withdraw",checkActiveUser, withdrawController);
router.post("/adminUpdate", adminUpdateController);
router.post("/withdraw-approval", adminWithdrawApprovalController);

export default router;
