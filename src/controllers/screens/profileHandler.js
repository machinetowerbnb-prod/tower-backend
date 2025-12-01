import { pool } from "../../db.js";
import { avengersQueries,userQueries } from "../../helpers/queries.js";

export const profileHandler = async (userId) => {
  try {
    // 1️⃣ Wallet summary
    const walletResult = await pool.query(avengersQueries.getWalletSummary, [userId]);
    const wallet = walletResult.rows[0] || {};
    const userResult = await pool.query(userQueries.getUserById, [userId]);
    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        message: "User not found",
        data: null,
      };
    }
    const user = userResult.rows[0];
    // 2️⃣ Team daily commission (only today's rewards)
    const teamResult = await pool.query(avengersQueries.getTeamDailyCommission, [userId]);
    const teamDailyCommission = teamResult.rows[0]?.teamDailyCommission || 0;

    // 3️⃣ Total withdrawals (sum of all withdrawals for user)
const withdrawalResult = await pool.query(avengersQueries.getTotalWithdrawals, [userId]);
const totalWithdrawals = withdrawalResult.rows[0]?.totalWithdrawals || 0;

   // 4️⃣ Fetch master data
    const masterResult = await pool.query(avengersQueries.getMasterDataForHome);
    const master = masterResult.rows[0];
    if (!master) throw new Error("Master data not found");

    // Final Response
    return {
      statusCode: 200,
      message: "success",
      data: {
        name: user.userName || "",
        email: user.email || "",
        totalDeposits: wallet.totalDeposits,
        totalEarnings: wallet.totalEarnings,
        usersTodaysCommission: wallet.usersTodaysCommission,
        teamDailyCommission,
        grandTotalCommission: wallet.grandTotalCommission,
        flexibleDeposite: wallet.totalDeposits,
        totalWithdrawals:totalWithdrawals|| 0,
        telegramLinkTwo:master.telegramLinkTwo

      },
    };

  } catch (error) {
    console.error("Profile API Error:", error);
    return{
      statusCode: 500,
      message: "Internal server error",
      data: null,
    };
  }
};
