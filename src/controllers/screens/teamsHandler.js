import { pool } from "../../db.js";
import { userQueries } from "../../helpers/queries.js";

export const getTeamsData = async (userId, isAdmin) => {
  try {
    // 1️⃣ Fetch the user's generations
    const genRes = await pool.query(userQueries.getUserGenerations, [userId]);
    if (genRes.rows.length === 0) {
      return { message: "User not found" };
    }

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

    // 2️⃣ Fetch generation user details
    const genDataRes = await pool.query(userQueries.getUsersByIds, [
      allGenUserIds,
    ]);
    const genUsers = genDataRes.rows;

    // 3️⃣ Fetch wallets for all generations
    const walletRes = await pool.query(userQueries.getWalletsByUserIds, [
      allGenUserIds,
    ]);
    const wallets = walletRes.rows;

    // 4️⃣ Fetch withdrawals for all generations
    const withdrawRes = await pool.query(userQueries.getWithdrawalsByUserIds, [
      allGenUserIds,
    ]);
    const withdrawals = withdrawRes.rows;

    // 5️⃣ Aggregate values
    const totalDownlines = genUsers.filter(
      (u) => u.isDeposited === true
    ).length;
    // Sum in integer cents to avoid floating point precision issues
    const totalPromationComissionCents = wallets.reduce(
      (acc, w) => acc + Math.round(Number(w.totalCommission || 0) * 100),
      0
    );
    const totalPromationComission = Number((totalPromationComissionCents / 100).toFixed(2));
    const teamRecharge = wallets.reduce(
      (acc, w) => acc + Number(w.deposits || 0),
      0
    );
    const teamWitdrawls = withdrawals.reduce(
      (acc, w) => acc + Number(w.amount || 0),
      0
    );

    // 🔹 For individual gens
    const getGenStats = (genArray) => {
      const reffered = genArray?.length || 0;
      const valid =
        genArray?.filter((uId) => {
          const user = genUsers.find((g) => g.userId === uId);
          return user?.isDeposited === true;
        }).length || 0;
      return { reffered, valid };
    };

    const genOne = getGenStats(firstGen);
    const genTwo = getGenStats(secondGen);
    const genThree = getGenStats(thirdGen);

    if (isAdmin) {
      const genUsersRes = await pool.query(userQueries.getUsersDetailsByIds, [
        allGenUserIds,
      ]);
      const genUsers = genUsersRes.rows;
      const walletsRes = await pool.query(userQueries.getWalletsByUserIds, [
        allGenUserIds,
      ]);
      const wallets = walletsRes.rows;
      const data = {
        statusCode: 200,
        message: "success",
        data: {
          username: userName,
          totalDownlines: totalDownlines,
          totalPromationComission: totalPromationComission,
          teamRecharge: teamRecharge,
          teamWitdrawls: teamWitdrawls,
          genOne: {
            ...genOne,
            users: genUsers
              .filter((u) => firstGen.includes(u.userId))
              .map((u) => ({
                name: u.userName,
                email: u.email,
                referralId: u.referralId,
                wallet:
                  wallets.find((w) => w.userId === u.userId)?.deposits || 0,
                earnings:
                  wallets.find((w) => w.userId === u.userId)?.totalCommission ||
                  0,
                referrals: u.referralsCount || 0,
                referralId: u.refferalCode,
                status: u.isActiveUser,
              })),
          },
          genTwo: {
            ...genTwo,
            users: genUsers
              .filter((u) => secondGen.includes(u.userId))
              .map((u) => ({
                name: u.userName,
                email: u.email,
                referralId: u.referralId,
                wallet:
                  wallets.find((w) => w.userId === u.userId)?.deposits || 0,
                earnings:
                  wallets.find((w) => w.userId === u.userId)?.totalCommission ||
                  0,
                referrals: u.referralsCount || 0,
                referralId: u.refferalCode,
                status: u.isActiveUser,
              })),
          },
          genThree: {
            ...genThree,
            users: genUsers
              .filter((u) => thirdGen.includes(u.userId))
              .map((u) => ({
                name: u.userName,
                email: u.email,
                referralId: u.referralId,
                wallet:
                  wallets.find((w) => w.userId === u.userId)?.deposits || 0,
                earnings:
                  wallets.find((w) => w.userId === u.userId)?.totalCommission ||
                  0,
                referrals: u.referralsCount || 0,
                referralId: u.refferalCode,
                status: u.isActiveUser,
              })),
          },
        },
      };
      return data;
    }

    // ✅ Response
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
  } catch (error) {
    console.error("Teams Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
