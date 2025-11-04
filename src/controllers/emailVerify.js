import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";
import { sendMail } from '../utils/email.js';

export const emailVerify = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        statusCode: 400,
        message: "failed",
        data: null,
      });
    }

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

    // 3️⃣ Set expiry time (2 minutes)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 mins

    // 4️⃣ Clear any old OTP for this email
    await pool.query(userQueries.deleteOldOtp, [email]);

    // 5️⃣ Insert new OTP into DB
    await pool.query(userQueries.insertOtp, [email, otp, expiresAt]);

    // 6️⃣ Build HTML email
    const html = `
      <div style="font-family: 'Segoe UI', sans-serif; background-color: #f8f9fa; padding: 30px;">
        <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 25px;">
          <h2 style="color: #2a4365; text-align: center;">🔐 Email Verification</h2>
          <p style="font-size: 16px; color: #333;">Hello <b>${user.username}</b>,</p>
          <p style="font-size: 15px; color: #555;">Use the following One-Time Password (OTP) to verify your email address:</p>
          <h1 style="letter-spacing: 6px; color: #1a73e8; text-align: center;">${otp}</h1>
          <p style="font-size: 14px; color: #777; text-align: center;">This OTP is valid for <b>2 minutes</b>. Please do not share it with anyone.</p>
          <hr style="margin: 25px 0;">
          <p style="font-size: 13px; color: #aaa; text-align: center;">© ${new Date().getFullYear()} Tower App — Secure Verification System</p>
        </div>
      </div>
    `;

    // 7️⃣ Send Email via Resend API
    await sendMail({
      to: email,
      subject: "Verify your email address - Tower App",
      html,
    });

    // ✅ Success Response
    return res.status(200).json({
      statusCode: 200,
      message: "Email Sent Successfully",
      data: null,
    });
  } catch (error) {
    console.error("Email Verify Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "failed",
      data: null,
    });
  }
};
