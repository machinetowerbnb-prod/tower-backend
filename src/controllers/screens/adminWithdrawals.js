import { pool } from "../../db.js";

export const adminWithdrawals = async () => {
  try {
    // 1️⃣ Fetch all withdrawals with user info
    const result = await pool.query(`
      SELECT 
        w."userId",
        w."withdrawId",
        w."amount",
        w."withdrawAddress" AS wallet,
        w."status",
        u."userName" AS user
      FROM users.withdrawals w
      LEFT JOIN users.userDetails u ON w."userId" = u."userId"
    `);

    // 2️⃣ Apply charge and total calculation (2%)
    const data = result.rows.map((row) => {
      const amount = Number(row.amount || 0);
      const chargePercent = 8;
      const charge = Number(((amount * chargePercent) / 100).toFixed(2));
      const total = Number((amount - charge).toFixed(2));

      return {
        user: row.user || "Unknown",
        amount,
        charge,
        total,
        wallet: row.wallet || "N/A",
        withdrawId: row.withdrawId,
        status: row.status || "processing"
      };
    });

    return {
      statusCode: 200,
      message: "success",
      data
    };

  } catch (error) {
    console.error("Admin Withdraw Request API Error:", error);
    return {
      statusCode: 500,
      message: "Internal Server Error"
    }
  }
};
