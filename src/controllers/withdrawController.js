import { pool } from '../db.js';
import { walletQueries } from "../helpers/queries.js";
import { v4 as uuidv4 } from "uuid";

export const withdrawController = async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, amount, passcode, withdrawAddress} = req.body;

    if (!userId || !amount || !passcode || !withdrawAddress) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid payload",
        data: null,
      });
    }

 // Verify user passcode
    const userResult = await client.query(
      `SELECT passcode FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "User not found",
        data: null,
      });
    }

    const validPasscode = userResult.rows[0].passcode;
    if (validPasscode !== passcode) {
      return res.status(400).json({
        statusCode: 400,
        message: "Passcode is wrong",
        data: null,
      });
    }

    await client.query("BEGIN");

    // 1️⃣ Get wallet details and lock the row
    const walletResult = await client.query(walletQueries.getWalletForUpdate, [userId]);

    if (walletResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        statusCode: 400,
        message: "Wallet not found",
        data: null,
      });
    }

    const { earnings } = walletResult.rows[0];

    // 2️⃣ Validate balance
    if (Number(earnings) < Number(amount)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        statusCode: 400,
        message: "Insufficient balance",
        data: null,
      });
    }

    // 3️⃣ Deduct from wallet
    const remainingBalance = Number(earnings) - Number(amount);
    await client.query(walletQueries.updateWalletEarnings, [remainingBalance, userId]);

    await client.query(
      `UPDATE users.userDetails
       SET "withdrawAddress" = $1
       WHERE "userId" = $2`,
      [withdrawAddress, userId]
    );

    // 4️⃣ Insert withdrawal record
    const withdrawId = uuidv4();

    await client.query(walletQueries.insertWithdrawal, [userId, amount, withdrawId,withdrawAddress]);

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "Withdraw Successfully",
      data: { remainingBalance }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Withdraw API Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  } finally {
    client.release();
  }
};
