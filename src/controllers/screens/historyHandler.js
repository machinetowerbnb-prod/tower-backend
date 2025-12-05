import { pool } from "../../db.js";
import { historyQueries }  from "../../helpers/queries.js";

export const handleHistoryScreen = async (userId) => {
  try {
    const depositsResult = await pool.query(historyQueries.getDepositsByUser, [userId]);
    const withdrawalsResult = await pool.query(historyQueries.getWithdrawalsByUser, [userId]);
    const rewardsResult = await pool.query(historyQueries.getRewardsByUser, [userId]);

    // combine
    const allTransactions = [
      ...depositsResult.rows,
      ...withdrawalsResult.rows,
      ...rewardsResult.rows,
    ];

    // inject adminReward tag
    const formatted = allTransactions.map((t) => {
      if (t.type === "reward") {
        const isAdmin = t.senderEmail === "admin@gmail.com";
        return {
          ...t,
          ...(isAdmin && { adminReward: true }) // adds field only when true
        };
      }
      return t;
    });

    // sort desc by timestamp
    formatted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      statusCode: 200,
      message: "success",
      data: { transactions: formatted },
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
