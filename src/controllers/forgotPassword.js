import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";
import { sendMail } from '../utils/email.js';

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Basic validation
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

    const resetLink = `${process.env.CLIENT_URL}/reset-password`;

    // 3️⃣ Compose email HTML
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Hello <b>${user.userName || "User"}</b>,</p>
        <p>We received a request to reset your password. Please click the link below to reset it:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>This link will expire in 15 minutes. If you didn’t request this, please ignore this email.</p>
        <br/>
        <p>Regards,<br/>Your App Team</p>
      </div>
    `;

    // 4️⃣ Send email via utils
    await sendMail({
      to: email,
      subject: "Reset your password",
      html,
    });

    return res.status(200).json({
      statusCode: 200,
      message: "success",
      data: html,
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
