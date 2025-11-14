import { pool } from "../../db.js";
export const Dashboard = async () => {
  try {
    // 1️⃣ Total Depositors — users with isDeposited = true
    const totalDepositorsResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users.userDetails WHERE "isDeposited" = true`
    );
    const totalDepositors = Number(totalDepositorsResult.rows[0].count) || 0;

    // 2️⃣ Total Amount — sum of all deposits from wallets
    const totalAmountResult = await pool.query(
      `SELECT COALESCE(SUM("deposits"), 0) AS total FROM users."wallets"`
    );
    const totalAmount = Number(totalAmountResult.rows[0].total) || 0;

    // 3️⃣ Total Withdraw — sum of all withdrawals
    const totalWithdrawResult = await pool.query(
      `SELECT COALESCE(SUM("amount"), 0) AS total FROM users.withdrawals`
    );
    const totalWithdraw = Number(totalWithdrawResult.rows[0].total) || 0;

    // 4️⃣ Total Users — count of all registered users
    const totalUsersResult = await pool.query(
      `SELECT COUNT(*) AS count FROM users.userDetails`
    );
    const totalUsers = Number(totalUsersResult.rows[0].count) || 0;

    // ✅ Final Response
    return {
      statusCode: 200,
      message: "success",
      data: {
        totalDepositors,
        totalAmount,
        totalWithdraw,
        totalUsers,
      },
    };
  } catch (error) {
    console.error("Admin Avengers API Error:", error);
    return {
      statusCode: 500,
      message: "Internal Server Error"
    }
  }
};
