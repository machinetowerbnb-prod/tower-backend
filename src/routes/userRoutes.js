import express from "express";
import { registerUser } from "../controllers/createUser.js";
import { loginUser } from "../controllers/loginUser.js";
import { forgotPassword } from "../controllers/forgotPassword.js";
import { checkMaintenance } from "../controllers/maintenanceCheck.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);

router.get("/maintenance-check", checkMaintenance);

export default router;
