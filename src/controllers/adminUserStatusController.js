import { pool } from "../db.js";

export const adminUpdateUserStatus = async (req, res) => {
  const { email, status } = req.body;

  // 1️⃣ Validate input
  if (!email || typeof status !== "boolean") {
    return res.status(400).json({
      statusCode: 400,
      message: "email and status (true/false) are required.",
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
       SET "isActiveUser" = $1
       WHERE "email" = $2`,
      [status, email]
    );

    // 4️⃣ Send response
    return res.status(200).json({
      statusCode: 200,
      message: status
        ? "Active the user Successfully"
        : "inActive the user Successfully",
      data: null,
    });
  } catch (error) {
    console.error("Admin Update User Status Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
