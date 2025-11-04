import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";
import { sendMail } from "../utils/email.js";

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      statusCode: 400,
      message: "failed",
      data: null,
    });
  }

  try {
    // 1️⃣ Check if user exists
    const userResult = await pool.query(userQueries.getUserByEmail, [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "failed",
        data: null,
      });
    }

    const user = userResult.rows[0];

    // 2️⃣ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3️⃣ Set expiry time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 4️⃣ Clear any old OTP for this email
    await pool.query(userQueries.deleteOldOtp, [email]);

    // 5️⃣ Insert new OTP into otpVerify table
    await pool.query(userQueries.insertOtp, [email, otp, expiresAt]);

    // 6️⃣ Generate reset link (with otp as query param)
    const resetLink = `${process.env.CLIENT_URL}/reset-password?email=${encodeURIComponent(
      email
    )}&otp=${otp}`;

    // 7️⃣ Compose clean email HTML
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Hello <b>${user.username || "User"}</b>,</p>
        <p>We received a request to reset your password. Click the link to continue</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>This OTP will expire in <b>10 minutes</b>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br/>
        <p>Regards,<br/>Your App Team</p>
      </div>
    `;

    // 8️⃣ Send the email
    await sendMail({
      to: email,
      subject: "Password Reset OTP",
      html,
    });

    // 9️⃣ Send response
    return res.status(200).json({
      statusCode: 200,
      message: "success",
      data: {
        otpSent: true,
        expiryTime: expiresAt,
      },
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
