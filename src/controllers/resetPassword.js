import { pool } from '../db.js';
import bcrypt from 'bcryptjs';
import { userQueries } from "../helpers/queries.js";

export const resetPassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    // 1️⃣ Basic validation
    if (!email || !password || !otp) {
      return res.status(400).json({
        statusCode: 400,
        message: "Email, password, and OTP are required",
        data: null,
      });
    }

    // 2️⃣ Check if user exists
    const userResult = await pool.query(userQueries.getUserByEmail, [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "User not found",
        data: null,
      });
    }

    // 3️⃣ Verify OTP
    const otpResult = await pool.query(userQueries.getOtpRecord, [email]);

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid or expired OTP",
        data: null,
      });
    }

    const { otp: storedOtp, expires_at } = otpResult.rows[0];

    // Check OTP match
    if (storedOtp !== otp) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid OTP",
        data: null,
      });
    }

    // Check OTP expiry
    const now = new Date();
    const expiryTime = new Date(expires_at);

    if (now > expiryTime) {
      await pool.query(userQueries.deleteOldOtp, [email]);
      return res.status(400).json({
        statusCode: 400,
        message: "OTP expired",
        data: null,
      });
    }

    // 4️⃣ Strong password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
        data: null,
      });
    }

    // 5️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6️⃣ Update password in DB
    await pool.query(userQueries.updateUserPassword, [hashedPassword, email]);

    // 7️⃣ Delete OTP record (used successfully)
    await pool.query(userQueries.deleteOldOtp, [email]);

    return res.status(200).json({
      statusCode: 200,
      message: "Password Changed Successfully",
      data: null,
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Basic validation
    if (!email || !password) {
      return res.status(400).json({
        statusCode: 400,
        message: "Email, password, and OTP are required",
        data: null,
      });
    }

    // 2️⃣ Check if user exists
    const userResult = await pool.query(userQueries.getUserByEmail, [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "User not found",
        data: null,
      });
    }
    // 4️⃣ Strong password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character.",
        data: null,
      });
    }

    // 5️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6️⃣ Update password in DB
    await pool.query(userQueries.updateUserPassword, [hashedPassword, email]);
    
    return res.status(200).json({
      statusCode: 200,
      message: "Password Changed Successfully",
      data: null,
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};