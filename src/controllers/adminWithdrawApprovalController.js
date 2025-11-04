import { pool } from '../db.js';

export const adminWithdrawApprovalController = async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, status, withdrawId } = req.body;

    // Start transaction
    await client.query("BEGIN");

    // 1️⃣ Check withdraw record exists
    const withdrawRes = await client.query(
      `SELECT * FROM users.withdrawals WHERE "withdrawId" = $1 AND "userId" = $2`,
      [withdrawId, userId]
    );

    if (!withdrawRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        statusCode: 400,
        message: "failed",
        data: { reason: "Withdrawal not found" },
      });
    }

    const withdrawal = withdrawRes.rows[0];

    // 2️⃣ If status is "Approve"
    if (status === "Approve") {
      await client.query(
        `UPDATE users.withdrawals 
         SET status = 'success', timestamp = NOW() 
         WHERE "withdrawId" = $1`,
        [withdrawId]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        statusCode: 200,
        message: "Success",
      });
    }

    // 3️⃣ If status is "Reject"
    if (status === "Reject") {
      // ✅ Update withdrawal status to "Rejected"
      await client.query(
        `UPDATE users.withdrawals 
         SET status = 'Rejected', timestamp = NOW() 
         WHERE "withdrawId" = $1`,
        [withdrawId]
      );

      // ✅ Refund the amount to the user's wallet (earnings)
      await client.query(
        `UPDATE users.wallets
         SET earnings = earnings + $1, updated_at = NOW()
         WHERE "userId" = $2`,
        [withdrawal.amount, userId]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        statusCode: 200,
        message: "Success",
      });
    }

    // 4️⃣ If status invalid
    await client.query("ROLLBACK");
    return res.status(400).json({
      statusCode: 400,
      message: "failed",
      data: { reason: "Invalid status value" },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Admin Withdraw Approval Error:", error);
    return res.status(400).json({
      statusCode: 400,
      message: "failed",
      data: null,
    });
  } finally {
    client.release();
  }
};
