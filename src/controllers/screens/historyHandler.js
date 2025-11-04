import { pool } from "../../db.js";
import { historyQueries }  from "../../helpers/queries.js";

export const handleHistoryScreen = async (userId) => {
  try {
    // 🟢 Fetch deposits using helper query
    const depositsResult = await pool.query(historyQueries.getDepositsByUser, [userId]);

    // 🟢 Fetch withdrawals using helper query
    const withdrawalsResult = await pool.query(historyQueries.getWithdrawalsByUser, [userId]);

    // 🧩 Combine and sort
    const transactions = [...depositsResult.rows, ...withdrawalsResult.rows].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return {
      statusCode: 200,
      message: "success",
      data: { transactions },
    };
  } catch (error) {
    console.error("History Screen Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
