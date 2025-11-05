import { pool } from '../db.js';

export const purchaseNow = async (req, res) => {
  const { userId, Level } = req.body;

  if (!userId || !Level) {
    return res.status(400).json({
      statusCode: 400,
      message: "userId and Level are required."
    });
  }

  try {
    // 1️⃣ Check if wallet exists
    const walletResult = await pool.query(
      `SELECT * FROM users.wallets WHERE "userId" = $1`,
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Wallet not found for this user."
      });
    }

    const wallet = walletResult.rows[0];
    const deposits = Number(wallet.deposits || 0);

    // 2️⃣ Handle "free" level
    if (Level === "free") {
      const bonus = 8;
      await pool.query(
        `UPDATE users.wallets
         SET "deposits" = "deposits" + $1,
             "userLevel" = $2,
             "purchaseAmount" = $1
         WHERE "userId" = $3`,
        [bonus, Level, userId]
      );

      return res.status(200).json({
        statusCode: 200,
        message: "Free level purchased successfully!",
        data: { userId, Level, purchaseAmount: bonus }
      });
    }

    // 3️⃣ Define level ranges
    const levelRanges = {
      Level1: { min: 60, max: 500 },
      Level2: { min: 501, max: 900 },
      Level3: { min: 901, max: 1500 },
      Level4: { min: 1501, max: 3500 }
    };

    const range = levelRanges[Level];

    if (!range) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid level provided."
      });
    }

    // 4️⃣ Check deposit eligibility
    if (deposits < range.min || deposits > range.max) {
      return res.status(400).json({
        statusCode: 400,
        message: `Deposit amount for ${Level} should between ${range.min}–${range.max}`
      });
    }

    // 5️⃣ Update wallet with userLevel and purchaseAmount
    await pool.query(
      `UPDATE users."wallets"
       SET "userLevel" = $1,
           "purchaseAmount" = $2
       WHERE "userId" = $3`,
      [Level, deposits, userId]
    );

    res.status(200).json({
      statusCode: 200,
      message: `${Level} purchased successfully!`,
      data: {
        userId,
        Level,
        purchaseAmount: deposits
      }
    });

  } catch (error) {
    console.error("PurchaseNow API Error:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};
