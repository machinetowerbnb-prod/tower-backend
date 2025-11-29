import { pool } from "../../db.js";

export const Users = async () => {
  try {
    // 1️⃣ Fetch user details joined with wallet info
    const result = await pool.query(`
      SELECT 
        u."id",
        u."userId",
        u."userName" AS name,
        u."email",
        u."refferalCode" AS "referralId",
        u."firstGen",
        u."isActiveUser" AS status,
        w."deposits" AS wallet,
        w."earnings",
        u.passcode
      FROM users.userDetails u
      LEFT JOIN users.wallets w ON u."userId" = w."userId"
      ORDER BY u."id" ASC
    `);

    // 2️⃣ Format response data
    const users = result.rows.map((user, index) => {
      // Handle firstGen safely (can be null or array)
      let referralCount = 0;
      try {
        if (Array.isArray(user.firstGen)) {
          referralCount = user.firstGen.length;
        } else if (typeof user.firstGen === "string") {
          // In case it's stored as JSON string in DB
          referralCount = JSON.parse(user.firstGen || "[]").length;
        }
      } catch (err) {
        referralCount = 0;
      }

      return {
        id: index + 1,
        userId: user.userId || "N/A",
        name: user.name || "N/A",
        email: user.email || "N/A",
        referralId: user.referralId || "N/A",
        wallet: Number(Number(user.wallet || 0).toFixed(2)),
        earnings: Number(Number(user.earnings || 0).toFixed(2)),
        referrals: referralCount,
        status: user.status === true,
        passcode:user.passcode
      };
    });

    // 3️⃣ Return API response
    return {
      statusCode: 200,
      message: "success",
      data: users
    }

  } catch (error) {
    console.error("Admin Users Avengers API Error:", error);
    return {
      statusCode: 500,
      message: "Internal Server Error"
    }
  }
};
