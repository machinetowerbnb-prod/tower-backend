import { pool } from "../../db.js";
import { avengersQueries, userQueries } from "../../helpers/queries.js";

export const profileHandler = async (userId) => {
  try {
    // 1️⃣ Wallet summary
    const walletResult = await pool.query(
      avengersQueries.getWalletSummary,
      [userId]
    );
    const wallet = walletResult.rows[0] || {};

    // 2️⃣ User details
    const userResult = await pool.query(
      userQueries.getUserById,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        message: "User not found",
        data: null,
      };
    }

    const user = userResult.rows[0];

    // 3️⃣ Resolve levelPurchasedAt (STRICT RULES)
    let levelPurchasedAt = null;

    // ✅ Only if user purchased a PAID level
    if (wallet.userLevel && wallet.userLevel !== "free") {

      // Case 1: New users (already stored in wallet)
      if (wallet.levelPurchasedAt) {
        levelPurchasedAt = Number(wallet.levelPurchasedAt);

      } else {
        // Case 2: Old users → fallback to first SUCCESS deposit
        const depositRes = await pool.query(
          avengersQueries.getFirstDepositTime,
          [userId]
        );

        if (depositRes.rows.length > 0 && depositRes.rows[0].timestamp) {
          levelPurchasedAt = new Date(
            depositRes.rows[0].timestamp
          ).getTime();
        }
      }
    }

    // 4️⃣ Team daily commission (TODAY only)
    const teamResult = await pool.query(
      avengersQueries.getTeamDailyCommission,
      [userId]
    );
    const teamDailyCommission =
      teamResult.rows[0]?.teamDailyCommission || 0;

    // 5️⃣ Total withdrawals
    const withdrawalResult = await pool.query(
      avengersQueries.getTotalWithdrawals,
      [userId]
    );
    const totalWithdrawals =
      withdrawalResult.rows[0]?.totalWithdrawals || 0;

    // 6️⃣ Master data
    const masterResult = await pool.query(
      avengersQueries.getMasterDataForHome
    );
    const master = masterResult.rows[0];
    if (!master) throw new Error("Master data not found");

    // ✅ FINAL RESPONSE
    return {
      statusCode: 200,
      message: "success",
      data: {
        name: user.userName || "",
        email: user.email || "",
        totalDeposits: wallet.totalDeposits || 0,
        totalEarnings: wallet.totalEarnings || 0,
        usersTodaysCommission: wallet.usersTodaysCommission || 0,
        teamDailyCommission,
        grandTotalCommission: wallet.grandTotalCommission || 0,
        flexibleDeposite: wallet.totalDeposits || 0,
        totalWithdrawals,
        levelPurchasedAt, // ✅ CORRECT & SAFE
        telegramLinkTwo: master.telegramLinkTwo,
        telegramLinkThree: master.telegramLinkThree,
      },
    };

  } catch (error) {
    console.error("Profile API Error:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: null,
    };
  }
};
