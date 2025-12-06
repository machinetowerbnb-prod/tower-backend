import { pool } from "../db.js";

export const adminDeleteUser = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      statusCode: 400,
      message: "userId is required",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Delete Rewards where user is receiver
    await client.query(
      `DELETE FROM users.rewards WHERE "receiverUserId" = $1`,
      [userId]
    );

    // 2️⃣ Delete Withdrawals
    await client.query(
      `DELETE FROM users.withdrawals WHERE "userId" = $1`,
      [userId]
    );

    // 3️⃣ Delete Deposits
    await client.query(
      `DELETE FROM users.deposits WHERE "userId" = $1`,
      [userId]
    );

    // 4️⃣ Delete Wallet
    await client.query(
      `DELETE FROM users.wallets WHERE "userId" = $1`,
      [userId]
    );

    // 5️⃣ Delete User Details (last)
    const deleteUser = await client.query(
      `DELETE FROM users.userDetails WHERE "userId" = $1 RETURNING *`,
      [userId]
    );

    if (deleteUser.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "User deleted successfully",
      data: { userId },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Admin Delete User Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    client.release();
  }
};
