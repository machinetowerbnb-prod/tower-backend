import { pool } from '../db.js';

export const adminTransactionAvengers = async (req, res) => {
  const { screen, action, email, amount } = req.body;

  if (!screen || !action || !email || !amount) {
    return res.status(400).json({
      statusCode: 400,
      message: "screen, action, email, and amount are required.",
    });
  }

  if (!["Deposit", "Withdraw"].includes(screen)) {
    return res.status(400).json({
      statusCode: 400,
      message: "Invalid screen type. Must be Deposit or Withdraw.",
    });
  }

  if (!["Credit", "Debit"].includes(action)) {
    return res.status(400).json({
      statusCode: 400,
      message: "Invalid action. Must be Credit or Debit.",
    });
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({
      statusCode: 400,
      message: "Invalid amount value.",
    });
  }

  try {
    // 1️⃣ Check if wallet exists for the user
    const userRes = await pool.query(
      `SELECT "userId" FROM users.userDetails WHERE "email" = $1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found.",
      });
    }

    const userId = userRes.rows[0].userId;
    const walletRes = await pool.query(
      `SELECT * FROM users.wallets WHERE "userId" = $1`,
      [userId]
    );

    if (walletRes.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "Wallet not found for this user.",
      });
    }

    const wallet = walletRes.rows[0];
    let column = screen === "Deposit" ? "deposits" : "earnings";
    let currentBalance = Number(wallet[column] || 0);

    // 2️⃣ Debit validation
    if (action === "Debit" && currentBalance < amt) {
      return res.status(400).json({
        statusCode: 400,
        message: "Amount is insufficient for Debit",
      });
    }

    // 3️⃣ Compute new balance
    const newBalance =
      action === "Credit" ? currentBalance + amt : currentBalance - amt;

    // 4️⃣ Update wallet
    await pool.query(
      `UPDATE users.wallets SET "${column}" = $1 WHERE "userId" = $2`,
      [newBalance, userId]
    );

    return res.status(200).json({
      statusCode: 200,
      message: `${action} Successfully`,
      data: null,
    });
  } catch (error) {
    console.error("Admin Transaction API Error:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
