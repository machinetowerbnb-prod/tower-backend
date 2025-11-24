import {pool} from "../db.js";
export const adminGetDeposits = async (req, res) => {
  try {
    const depositsResult = await pool.query(
      `SELECT ud."userName", d.amount, d.status, d."transactionId", to_char(d."timestamp", 'YYYY-MM-DD HH12:MI AM') as time
       FROM users.deposits d
       JOIN users.userDetails ud ON d."userId" = ud."userId"
       ORDER BY d."timestamp" DESC`
    );

    const deposits = depositsResult.rows.map(row => ({
      username: row.userName,
      amount: parseFloat(row.amount),
      status: row.status,
      transactionId: row.transactionId,
      time: row.time
    }));

    return res.status(200).json({
      statusCode: 200,
      message: "success",
      data: { deposits }
    });
  } catch (error) {
    console.error("Admin Get Deposits Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
}