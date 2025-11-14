import { pool } from '../db.js';

export const adminWithdrawFilter = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        statusCode: 400,
        message: "Status is required",
      });
    }

    // Fetch withdrawal requests based on status
    const withdrawResult = await pool.query(
      `SELECT w."amount", w."withdrawAddress", w."withdrawId", w."status", 
              u."userName"
       FROM users.withdrawals w
       LEFT JOIN users.userDetails u
       ON w."userId" = u."userId"
       WHERE w."status" = $1
       ORDER BY w.timestamp DESC`,
      [status]
    );

    // Format response
    const withdraws = withdrawResult.rows.map((row) => ({
      user: row.userName || "",
      amount: Number(row.amount) || 0,
      wallet: row.withdrawAddress || "",
      withdrawId: row.withdrawId || "",
      status: row.status,
    }));

    return res.status(200).json({
      statusCode: 200,
      message: "Success",
      data: withdraws,
    });
  } catch (error) {
    console.error("Admin Withdraw Filter Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
