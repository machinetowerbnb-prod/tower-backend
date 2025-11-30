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
    const resetLink = `${process.env.FRONTEND_URL}/change-password?email=${email}&otp=${otp}`;

    // 7️⃣ Compose clean email HTML
 const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset</title>
  </head>

  <body style="margin:0; padding:0; background-color:#f5f7fa; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    
    <table align="center" cellpadding="0" cellspacing="0" width="100%"
      style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:14px;
      box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <tr>
        <td style="padding:30px 40px; text-align:center;
          background:linear-gradient(135deg, #007BFF, #00B4DB);
          border-radius:14px 14px 0 0;">
          <h1 style="margin:0; font-size:24px; color:#fff;">
            🔐 Reset Your Password
          </h1>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:35px 40px;">

          <p style="font-size:16px; color:#333; margin-bottom:15px;">
            Hello <b>${user.userName || "User"}</b>,
          </p>

          <p style="font-size:15px; color:#555; line-height:1.6; margin-bottom:25px;">
            We received a request to reset your password.  
            To proceed, please click the button below:
          </p>
          <p style="font-size:14px; color:#666; line-height:1.6;">
            For your protection, this link will expire in <b>10 minutes</b>.  
            If you did not request a password reset, please ignore this email.
          </p>

                   <!-- Reset Button -->
          <div style="text-align:center; margin:35px 0;">
            <a href="${resetLink}"
              style="
                background:#007BFF;
                color:#ffffff;
                padding:12px 26px;
                border-radius:8px;
                text-decoration:none;
                font-weight:600;
                display:inline-block;
              ">
              Reset Password
            </a>
          </div>
          <hr style="margin:30px 0; border:0; border-top:1px solid #eee;" />
          <!-- Footer -->
          <p style="text-align:center; font-size:14px; color:#888; margin:0;">
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
