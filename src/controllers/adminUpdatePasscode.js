import { pool } from "../db.js";

export const adminUpdatePasscode = async (req, res) => {
  const { email, passcode } = req.body;

  // 1️⃣ Validate input
  if (!email || !passcode) {
    return res.status(400).json({
      statusCode: 400,
      message: "email and passcode are required.",
    });
  }

  try {
    // 2️⃣ Check if user exists
    const userResult = await pool.query(
      `SELECT email FROM users.userDetails WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found.",
      });
    }

    // 3️⃣ Update user active status
    await pool.query(
      `UPDATE users.userDetails
       SET passcode = $1
       WHERE "email" = $2`,
      [passcode, email]
    );

    // 4️⃣ Send response
    return res.status(200).json({
      statusCode: 200,
      message: "Passcode updated Successfully",
      data: null,
    });
  } catch (error) {
    console.error("Admin Update Passcode Status Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
