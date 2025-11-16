import { pool } from "../db.js";
import { userQueries } from "../helpers/queries.js";
import { sendMail } from "../utils/email.js";

export const emailVerify = async (email) => {
  try {
    if (!email) {
      return {
        statusCode: 400,
        message: "failed",
        data: null,
      };
    }

    // 2️⃣ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3️⃣ Set expiry time (2 minutes)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 mins

    // 4️⃣ Clear any old OTP for this email
    await pool.query(userQueries.deleteOldOtp, [email]);

    // 5️⃣ Insert new OTP into DB
    await pool.query(userQueries.insertOtp, [email, otp, expiresAt]);
   const verifyLink = `${process.env.FRONTEND_URL}/email-confirm?email=${email}?otp=${otp}`;
   console.log("Verify Link:", verifyLink);
    // 6️⃣ Build HTML email
    const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
  </head>

  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
    <table align="center" cellpadding="0" cellspacing="0" width="100%" 
      style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      
      <tr>
        <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #007BFF, #00B4DB); border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Verify your email address for TowerBNB</h1>
        </td>
      </tr>

      <tr>
        <td style="padding: 30px 40px;">

          <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
            Hello Towerians,
          </p>

          <p style="font-size: 15px; color: #555; line-height: 1.7; margin-bottom: 20px;">
            Welcome to <b>TowerBNB</b>!<br/>
            We’re excited to have you join us. To complete your registration and activate your account, please verify your email address by clicking the button below:
          </p>

          <!-- Verify Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" 
              style="background-color: #007BFF; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify My Email
            </a>
          </div>
          <a href="${verifyLink}">
              Verify My Email
            </a>

          <p style="font-size: 15px; color: #555; line-height: 1.7;">
            Once verified, you'll have full access to your account.  
            This helps us ensure your account belongs to you.
          </p>

          <p style="font-size: 15px; color: #555; line-height: 1.7;">
            If you didn't sign up, you can safely ignore this email or contact our Support team for assistance.
          </p>

          <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />

          <p style="font-size: 14px; color: #888; text-align: center;">
            Thank you for being part of our community!<br/><br/>
            Warm regards,<br/>
            <b>The TowerBNB Team</b>
          </p>

        </td>
      </tr>
    </table>
  </body>
</html>
`;

    // 7️⃣ Send Email via Resend API
    await sendMail({
      to: email,
      subject: "Verify your email address for TowerBNB",
      html,
    });

    // ✅ Success Response
    return {
      statusCode: 200,
      message: "Email Sent Successfully",
      data: null,
    };
  } catch (error) {
    console.error("Email Verify Error:", error);
    return {
      statusCode: 500,
      message: "failed",
      data: null,
    };
  }
};
