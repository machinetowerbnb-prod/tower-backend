import { pool } from '../db.js';
import crypto from "crypto";

export const convertEarningsToDeposit = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      statusCode: 400,
      message: "userId is required",
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

    // ❌ Nothing to convert
    if (earnings <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "No earnings available to convert",
        data: null,
      });
    }

    // 2️⃣ Atomic wallet update (reset earnings + add to deposits)
    const walletUpdate = await pool.query(
      `
      UPDATE users.wallets
      SET 
        "deposits" = "deposits" + $1,
        "earnings" = 0
      WHERE "userId" = $2
        AND "earnings" = $1
      RETURNING *;
      `,
      [earnings, userId]
    );

    // ❌ Prevent double conversion
    if (walletUpdate.rowCount === 0) {
      return res.status(409).json({
        statusCode: 409,
        message: "Conversion already processed",
        data: null,
      });
    }

    // 3️⃣ Create deposit transaction
    const transactionId = `CNV-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    await pool.query(
      `
      INSERT INTO users.deposits
        ("userId", "amount", "transactionId", "status", "isConverted")
      VALUES
        ($1, $2, $3, 'paid', true)
      `,
      [userId, earnings, transactionId]
    );

    return res.status(200).json({
      statusCode: 200,
      message: "Earnings converted to deposit successfully",
      data: {
        convertedAmount: earnings,
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
