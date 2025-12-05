import { pool } from '../db.js';
import { roundToTwoDecimals } from "../utils/math.js";

export const adminTransactionAvengers = async (req, res) => {
  const { screen, action, email, amount } = req.body;

  if (!screen || !action || !email || !amount) {
    return res.status(400).json({
      statusCode: 400,
      message: "screen, action, email, and amount are required.",
    });
  }

  if (!["Deposit", "Withdraw"].includes(screen)) {
    return res.status(400).json({ statusCode: 400, message: "Invalid screen type." });
  }
  if (!["Credit", "Debit"].includes(action)) {
    return res.status(400).json({ statusCode: 400, message: "Invalid action type." });
  }

  const truncatedAmt = roundToTwoDecimals(Number(amount));
  if (isNaN(truncatedAmt) || truncatedAmt <= 0) {
    return res.status(400).json({ statusCode: 400, message: "Invalid amount value." });
  }

  try {
    // 1️⃣ Fetch user + wallet
    const userWallet = await pool.query(`
      SELECT wd."userId", w.deposits, w.earnings
      FROM users.userDetails wd
      JOIN users.wallets w ON wd."userId" = w."userId"
      WHERE wd."email" = $1
    `, [email]);

    if (userWallet.rows.length === 0) {
      return res.status(404).json({ statusCode: 404, message: "User or wallet not found." });
    }

    const user = userWallet.rows[0];
    const column = screen === "Deposit" ? "deposits" : "earnings";

    // 2️⃣ Atomic Wallet Update
    let updateSql = "";
    let params = [];

    if (action === "Credit") {
      updateSql = `UPDATE users.wallets 
                   SET "${column}" = "${column}" + $1 
                   WHERE "userId" = $2 RETURNING *`;
      params = [truncatedAmt, user.userId];
    } else {
      updateSql = `UPDATE users.wallets
                   SET "${column}" = "${column}" - $1
                   WHERE "userId" = $2 AND "${column}" >= $1
                   RETURNING *`;
      params = [truncatedAmt, user.userId];
    }

    const updateRes = await pool.query(updateSql, params);

    if (updateRes.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Amount is insufficient for Debit",
      });
    }

    // 3️⃣ Insert Reward record for admin activity
    // await pool.query(
    //   `INSERT INTO users.rewards 
    //   ("adminUserId", "adminEmail", "userId", "transactionType", "screen", "amount", "created_at")
    //   VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    //   [
    //     "1234567890",            // fixed admin userId
    //     "admin@gmail.com",       // fixed admin email
    //     user.userId,             // affected user
    //     action,                  // Credit / Debit
    //     screen,                  // Deposit / Withdraw
    //     truncatedAmt
    //   ]
    // );

    await pool.query(
          `INSERT INTO users.rewards
           ("receiverUserId","receiverEmail","senderUserId","commission","senderEmail")
           VALUES ($1,$2,$3,$4,$5)`,
          [user.userId, email, "1234567890", truncatedAmt, "admin@gmail.com"]
        )

    return res.status(200).json({
      statusCode: 200,
      message: `${action} Successfully & reward logged.`,
    });

  } catch (error) {
    console.error("Admin Transaction API Error:", error);
    res.status(500).json({ statusCode: 500, message: "Internal Server Error" });
  }
};
