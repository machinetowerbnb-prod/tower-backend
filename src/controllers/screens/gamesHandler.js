import { pool } from "../../db.js";

export const gamesHandler = async (userId) => {
  try {
    if (!userId) {
      return {
        statusCode: 400,
        message: "userId is required",
        data: null,
      };
    }

    // Fetch wallet data
    const walletQuery = `
      SELECT 
        "isFreeMoney",
        "userLevel",
        "deposits",
        "lastActivatedAt"
      FROM users.wallets 
      WHERE "userId" = $1
      LIMIT 1;
    `;

    const result = await pool.query(walletQuery, [userId]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        message: "Wallet not found",
        data: null,
      };
    }

    const wallet = result.rows[0];

    // Extract values
    const isFreeTrailSubcraibed = wallet.isFreeMoney || false;
    const currectLevel = wallet.userLevel || null;
    const deposits = Number(wallet.deposits || 0);
    const activationTime = wallet.lastActivatedAt ? Number(wallet.lastActivatedAt) : null;

    // Level ranges
    const levelRanges = {
      Level1: { min: 60, max: 500 },
      Level2: { min: 501, max: 900 },
      Level3: { min: 901, max: 1500 },
      Level4: { min: 1501}
    };

    // Determine eligible level
    let elegibleLevel = null;

    for (const level in levelRanges) {
      const range = levelRanges[level];

      if (deposits >= range.min) {
        // If user already has this level, do NOT show eligible level
        elegibleLevel = level;
      }
    }
    const getData = await pool.query(
      `SELECT "isGameEnabled" FROM admin.master LIMIT 1`
    );

    const isGameEnabled = getData.rows[0]?.isGameEnabled;

    return {
      statusCode: 200,
      message: "success",
      data: {
        isFreeTrailSubcraibed,
        currectLevel,
        elegibleLevel,
        activationTime,
        isGameEnabled
      },
    };

  } catch (error) {
    console.error("Games Handler Error:", error);
    return {
      statusCode: 500,
      message: "failed",
      data: null,
    };
  }
};
