import { pool } from "../db.js";
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
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?email=${email}`;

    // 7️⃣ Compose clean email HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
    <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      <tr>
        <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #007BFF, #00B4DB); border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🔐 Password Reset Request</h1>
        </td>
      </tr>

      <tr>
        <td style="padding: 30px 40px;">
          <p style="font-size: 16px; color: #333; margin-bottom: 15px;">Hello <b>${
            user.username || "User"
          }</b>,</p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            We received a request to reset your password. Please use the following One-Time Password (OTP) to continue:
          </p>

          <!-- OTP Block -->
          <div style="text-align: center; margin: 25px 0;">
            <div style="display: inline-block; background-color: #f0f4ff; border: 2px dashed #007BFF; border-radius: 8px; padding: 15px 25px;">
              <p style="font-size: 28px; letter-spacing: 4px; color: #007BFF; margin: 0; font-weight: bold;">
                ${otp}
              </p>
            </div>
          </div>

          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            you can click the button below to go directly to the reset page:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007BFF; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset your password for TowerBNB 
            </a>
          </div>

          <p style="font-size: 14px; color: #666; line-height: 1.6;">
            This OTP and link will expire in <b>10 minutes</b>. If you didn’t request a password reset, you can safely ignore this email.
          </p>

          <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />

          <p style="font-size: 14px; color: #888; text-align: center;">
            Regards, <br/>
            <b>Machine Tower Team</b>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
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
