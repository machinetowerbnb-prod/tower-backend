import { pool } from "../../db.js";
import { userQueries } from "../../helpers/queries.js";

export const getTeamsData = async (userId, isAdmin) => {
  try {
    // 1️⃣ Get user generations
    const genRes = await pool.query(userQueries.getUserGenerations, [userId]);
    if (genRes.rows.length === 0) return { message: "User not found" };

    const { firstGen, secondGen, thirdGen, userName } = genRes.rows[0];
    const allGenUserIds = [
      ...(firstGen || []),
      ...(secondGen || []),
      ...(thirdGen || []),
    ];

    if (allGenUserIds.length === 0) {
      return {
        statusCode: 200,
        message: "success",
        data: {
          username: userName,
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

    // 2️⃣ Fetch generation users
    const genUsersRes = await pool.query(userQueries.getUsersByIds, [allGenUserIds]);
    const genUsers = genUsersRes.rows;

    // 3️⃣ Fetch wallets
    const walletRes = await pool.query(userQueries.getWalletsByUserIds, [allGenUserIds]);
    const wallets = walletRes.rows;

    // 4️⃣ Fetch withdrawals
    const withdrawRes = await pool.query(userQueries.getWithdrawalsByUserIds, [allGenUserIds]);
    const withdrawals = withdrawRes.rows;

    // 🔥 Rule updates start here

    // ➤ totalDownlines = only FIRST GENERATION users who deposited
     const totalDownlines = Number((firstGen || []).length) + Number((secondGen || []).length) + Number((thirdGen || []).length)

    // ➤ Sum commissions safely
    const totalPromationComission = wallets.reduce(
      (acc, w) => acc + Number(w.totalCommission || 0),
      0
    );

// ➤ teamRecharge (exclude free money)
    const teamRecharge = wallets.reduce((acc, w) => {
      let amount = Number(w.deposits || 0);
      if (w.isFreeMoney) amount -= 8;        // remove free claimed amount
      return acc + (amount > 0 ? amount : 0);
    }, 0);


    // ➤ teamWithdrawals
    const teamWitdrawls = withdrawals.reduce(
      (acc, w) => acc + Number(w.amount || 0),
      0
    );

    // 🔹 Individual generation counts
    const getGenStats = (genArray) => {
      const reffered = genArray?.length || 0;
      const valid = genArray?.filter(id => {
        const u = genUsers.find(g => g.userId === id);
        return u?.isDeposited === true;
      }).length || 0;
      return { reffered, valid };
    };

    const genOne = getGenStats(firstGen);
    const genTwo = getGenStats(secondGen);
    const genThree = getGenStats(thirdGen);

    // 🔥 Admin view
    if (isAdmin) {
      const genUsersDetails = await pool.query(userQueries.getUsersDetailsByIds, [allGenUserIds]);
      const details = genUsersDetails.rows;

      return {
        statusCode: 200,
        message: "success",
        data: {
          username: userName,
          totalDownlines,
          totalPromationComission,
          teamRecharge,
          teamWitdrawls,
          genOne: {
            ...genOne,
            users: details
              .filter(u => firstGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          },
          genTwo: {
            ...genTwo,
            users: details
              .filter(u => secondGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          },
          genThree: {
            ...genThree,
            users: details
              .filter(u => thirdGen.includes(u.userId))
              .map(u => ({
                ...u,
                wallet: wallets.find(w => w.userId === u.userId)?.deposits || 0,
                earnings: wallets.find(w => w.userId === u.userId)?.totalCommission || 0,
              }))
          }
        }
      };
    }

    // 🔥 Normal user response
    return {
      statusCode: 200,
      message: "success",
      data: {
        username: userName,
        totalDownlines,
        totalPromationComission,
        teamRecharge,
        teamWitdrawls,
        genOne,
        genTwo,
        genThree,
      },
    };
  } catch (err) {
    console.error("Teams Handler Error:", err);
    return { statusCode: 400, message: "failed", data: null };
  }
};
