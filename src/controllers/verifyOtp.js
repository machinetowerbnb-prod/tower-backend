import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        statusCode: 400,
        message: "Email and OTP are required",
        data: null,
      });
    }

    // 1️⃣ Get OTP record from DB
    const otpResult = await pool.query(userQueries.getOtpRecord, [email]);

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid or expired OTP",
        data: null,
      });
    }

    const { otp: storedOtp, expires_at } = otpResult.rows[0];

    // 2️⃣ Check if OTP matches
    if (storedOtp !== otp) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid OTP",
        data: null,
      });
    }

    // 3️⃣ Check expiry
    const now = new Date();
    const expiryTime = new Date(expires_at);

    if (now > expiryTime) {
      // Delete expired OTP
      await pool.query(userQueries.deleteOldOtp, [email]);
      return res.status(400).json({
        statusCode: 400,
        message: "OTP expired",
        data: null,
      });
    }

    // 4️⃣ Mark user as verified
    await pool.query(userQueries.verifyUserEmail, [email]);

    // 5️⃣ Delete OTP record
    await pool.query(userQueries.deleteOldOtp, [email]);

    const userResult = await pool.query(userQueries.getUserByEmail, [email]);
    const user = userResult.rows[0];

    // ✅ Success
    return res.status(200).json({
      statusCode: 200,
      message: "Email Verified Successfully",
      data: {
        userId: user.userId,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("verifyOtp Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "failed",
      data: null,
    });
  }
};
