import { pool } from "../db.js";
import { userQueries } from "../helpers/queries.js";
import { roundToTwoDecimals } from "../utils/math.js";
export const purchaseNow = async (req, res) => {
  const { userId, Level } = req.body;

  if (!userId || !Level) {
    return res.status(400).json({
      statusCode: 400,
      message: "userId and Level are required.",
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
        message: "Wallet not found for this user.",
      });
    }

    const wallet = walletResult.rows[0];
    const deposits = Number(wallet.deposits || 0);
    const userLevel = wallet.userLevel || null;
    const isFreeMoney = wallet.isFreeMoney || false;

    // 2️⃣ Handle "free" level
    if (Level === "free") {
      // ✅ Check if free money already claimed
      if (isFreeMoney) {
        return res.status(400).json({
          statusCode: 400,
          message: "Free money has already been claimed.",
        });
      }

      const bonus = roundToTwoDecimals(8);

      await pool.query(
        `UPDATE users.wallets
         SET "deposits" = "deposits" + $1,
             "userLevel" = $2,
             "purchaseAmount" = $1,
             "isFreeMoney" = true
         WHERE "userId" = $3`,
        [bonus, Level, userId]
      );
      const userResult = await pool.query(userQueries.getUserById, [userId]);
      const userEmail = userResult.rows[0].email;
      await pool.query(
      `INSERT INTO users.rewards
       ("receiverUserId","receiverEmail","senderUserId","commission","senderEmail")
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, userEmail, userId, bonus, userEmail]
     );

      return res.status(200).json({
        statusCode: 200,
        message: "Free level claimed successfully!",
        data: { userId, Level, purchaseAmount: bonus },
      });
    }
    // 3️⃣ If user already purchased this level, block duplicate purchase
    if (userLevel && userLevel === Level) {
      return res.status(400).json({
        statusCode: 400,
        message: `You have already purchased ${Level}.`,
      });
    }

    // 4️⃣ Define level ranges
    const levelRanges = {
      Level1: { min: 60, max: 500 },
      Level2: { min: 501, max: 900 },
      Level3: { min: 901, max: 1500 },
      Level4: { min: 1501, max: 3500 },
    };

    const range = levelRanges[Level];

    if (!range) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid level provided.",
      });
    }

    // 5️⃣ Check deposit eligibility
    if (deposits < range.min) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Insufficent Banlance!',
      });
    }
    let purchaseAmount = roundToTwoDecimals(deposits);
     if (deposits > range.max) {
      purchaseAmount = roundToTwoDecimals(range.max);
    }
    // 6️⃣ Update wallet for level purchase
    await pool.query(
      `UPDATE users.wallets
   SET "userLevel" = $1,
       "purchaseAmount" = $2,
       "lastActivatedAt" = NULL,
       "levelPurchasedAt" = $4
   WHERE "userId" = $3`,
      [Level, purchaseAmount, userId, Date.now()]
    );

    res.status(200).json({
      statusCode: 200,
      message: `${Level} purchased successfully!`,
      data: {
        userId,
        Level,
        purchaseAmount: purchaseAmount
      },
    });
  } catch (error) {
    console.error("PurchaseNow API Error:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
