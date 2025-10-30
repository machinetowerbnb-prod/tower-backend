import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

import { generateReferralCode,generateUserId } from "../helpers/generateReferralCode.js";
import { isValidEmail, isValidMpin, isStrongPassword } from "../helpers/validations.js";
import { userQueries } from "../helpers/queries.js";

export const registerUser = async (req, res) => {
  const { userName, email, password, refferedCode, mpin } = req.body;

  // ✅ Validate input
  if (!userName || !email || !password || !mpin) {
    return res.status(400).json({ message: "All required fields must be provided." });
  }
  if (!isValidEmail(email)) return res.status(400).json({ message: "Invalid email format." });
  if (!isValidMpin(mpin)) return res.status(400).json({ message: "MPIN must be exactly 4 digits." });
  if (!isStrongPassword(password))
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
    });

  try {
    // 1️⃣ Check if user already exists
    const existingUser = await pool.query(userQueries.checkUserExists, [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists." });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Generate referral code
    const userId = generateUserId();
    const referralCode = generateReferralCode();

    // 4️⃣ Insert user into DB
    const values = [userId,userName, email, hashedPassword, refferedCode || null, mpin, referralCode];
    const result = await pool.query(userQueries.insertUser, values);

    // ✅ Success
    res.status(201).json({
      message: "User registered successfully!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
