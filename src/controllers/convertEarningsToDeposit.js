import { pool } from "../db.js";
import crypto from "crypto";

export const convertEarningsToDeposit = async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || amount === undefined) {
    return res.status(400).json({
      statusCode: 400,
      message: "userId and amount are required",
      data: null,
    });
  }

  const convertAmount = Number(amount);

  if (isNaN(convertAmount) || convertAmount <= 0) {
    return res.status(400).json({
      statusCode: 400,
      message: "Invalid amount",
      data: null,
    });
  }

  try {
    // 1️⃣ Fetch wallet
    const walletRes = await pool.query(
      `SELECT "earnings" FROM users.wallets WHERE "userId" = $1`,
      [userId]
    );

    if (walletRes.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Wallet not found",
        data: null,
      });
    }

    const earnings = Number(walletRes.rows[0].earnings || 0);

    // ❌ Insufficient funds
    if (convertAmount > earnings) {
      return res.status(400).json({
        statusCode: 400,
        message: "Insufficient earnings to convert",
        data: null,
      });
    }

    // 2️⃣ Atomic wallet update (partial conversion)
    const walletUpdate = await pool.query(
      `
      UPDATE users.wallets
      SET 
        "earnings" = "earnings" - $1,
        "deposits" = "deposits" + $1
      WHERE "userId" = $2
        AND "earnings" >= $1
      RETURNING "earnings";
      `,
      [convertAmount, userId]
    );

    // ❌ Race condition protection
    if (walletUpdate.rowCount === 0) {
      return res.status(409).json({
        statusCode: 409,
        message: "Conversion failed due to concurrent update",
        data: null,
      });
    }

    const remainingEarnings = Number(walletUpdate.rows[0].earnings);

    // 3️⃣ Create deposit transaction
    const transactionId = `CNV-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    await pool.query(
      `
      INSERT INTO users.deposits
        ("userId", "amount", "transactionId", "status", "isConverted")
      VALUES
        ($1, $2, $3, 'paid', true)
      `,
      [userId, convertAmount, transactionId]
    );

    return res.status(200).json({
      statusCode: 200,
      message: "Earnings converted to deposit successfully",
      data: {
        convertedAmount: convertAmount,
        remainingEarnings,
      },
    });

  } catch (error) {
    console.error("Convert Earnings Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
