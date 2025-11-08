import { pool } from "../../db.js";
import { avengersQueries } from "../../helpers/queries.js";

export const handleDepositsScreen = async (userId) => {
  try {
    // 1️⃣ Fetch walletNetworks from master table
    const result = await pool.query(avengersQueries.getMasterWalletNetworks);
    const master = result.rows[0];

    if (!master || !master.walletNetworks) {
      throw new Error("Master data not found");
    }

    // 2️⃣ Build response
    return {
      statusCode: 200,
      message: "success",
      data: {
        transactionAccounts: master.walletNetworks,
      },
    };
  } catch (error) {
    console.error("Deposits Screen Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
