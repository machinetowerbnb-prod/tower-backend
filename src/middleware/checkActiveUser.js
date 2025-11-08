import { pool } from '../db.js';
import { userQueries } from "../helpers/queries.js";

export const checkActiveUser = async (req, res, next) => {
  try {
    const { email, userId } = req.body;

    // 1️⃣ Validate input
    if (!email && !userId) {
      return res.status(400).json({
        statusCode: 400,
        message: "Either email or userId is required to check user status",
        data: null,
      });
    }

    let userResult;

    // 2️⃣ Fetch based on available info
    if (email) {
      userResult = await pool.query(userQueries.getUserByEmail, [email]);
    } else if (userId) {
      userResult = await pool.query(userQueries.getUserById, [userId]);
    }

    // 3️⃣ Handle no user found
    if (!userResult || userResult.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "User not found",
        data: null,
      });
    }

    const user = userResult.rows[0];

    // 4️⃣ Check if active
    if (!user.isActiveUser) {
      return res.status(403).json({
        statusCode: 403,
        message: "User inactive, please contact support",
        data: null,
      });
    }

    // ✅ User active — continue to next middleware/controller
    next();
  } catch (error) {
    console.error("User Active Check Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
