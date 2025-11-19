import { pool } from "../../db.js";
import { userQueries } from "../../helpers/queries.js";

export const getTeamsData = async (userId) => {

  try {
    // 1️⃣ Fetch the user's generations
    const genRes = await pool.query(userQueries.getUserGenerations, [userId]);
    if (genRes.rows.length === 0) {
      return { message: "User not found" };
    }

    const { firstGen, secondGen, thirdGen } = genRes.rows[0];

    const allGenUserIds = [...(firstGen || []), ...(secondGen || []), ...(thirdGen || [])];


    if (allGenUserIds.length === 0) {
      return {
        statusCode: 200,
        message: "success",
        data: {
          totalDownlines: 0,
          totalPromationComission: 0,
          teamRecharge: 0,
          teamWitdrawls: 0,
          genOne: { reffered: 0, valid: 0 },
          genTwo: { reffered: 0, valid: 0 },
          genThree: { reffered: 0, valid: 0 },
        },
      };
    }

    // 2️⃣ Fetch generation user details
    const genDataRes = await pool.query(userQueries.getUsersByIds, [allGenUserIds]);
    const genUsers = genDataRes.rows;

    // 3️⃣ Fetch wallets for all generations
    const walletRes = await pool.query(userQueries.getWalletsByUserIds, [allGenUserIds]);
    const wallets = walletRes.rows;

    // 4️⃣ Fetch withdrawals for all generations
    const withdrawRes = await pool.query(userQueries.getWithdrawalsByUserIds, [allGenUserIds]);
    const withdrawals = withdrawRes.rows;

    // 5️⃣ Aggregate values
    const totalDownlines = genUsers.filter((u) => u.isDeposited === true).length;
    const totalPromationComission = wallets.reduce((acc, w) => acc + Number(w.totalCommission || 0), 0);
    const teamRecharge = wallets.reduce((acc, w) => acc + Number(w.deposits || 0), 0);
    const teamWitdrawls = withdrawals.reduce((acc, w) => acc + Number(w.amount || 0), 0);

    // 🔹 For individual gens
    const getGenStats = (genArray) => {
      const reffered = genArray?.length || 0;
      const valid = genArray?.filter((uId) => {
        const user = genUsers.find((g) => g.userId === uId);
        return user?.isDeposited === true;
      }).length || 0;
      return { reffered, valid };
    };

    const genOne = getGenStats(firstGen);
    const genTwo = getGenStats(secondGen);
    const genThree = getGenStats(thirdGen);

    // ✅ Response
    return {
      statusCode: 200,
      message: "success",
      data: {
        totalDownlines,
        totalPromationComission,
        teamRecharge,
        teamWitdrawls,
        genOne,
        genTwo,
        genThree,
      },
    };
  } catch (error) {
    console.error("Teams Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
