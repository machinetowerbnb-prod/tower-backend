// src/controllers/depositConfirmController.js
import { pool } from '../db.js';
import { depositQueries } from "../helpers/queries.js";
import { v4 as uuidv4 } from "uuid";

export const depositConfirmController = async (req, res) => {
  const { userId, amount, transactionAccount } = req.body;

  if (!userId || !amount || !transactionAccount) {
    return res.status(400).json({
      statusCode: 400,
      message: "Invalid payload",
      data: null,
    });
  }

  const client = await pool.connect();

  try {

    //no payment
    await client.query("BEGIN");

    // 1️⃣ Generate transaction ID
    const transactionId = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;

    // 2️⃣ Insert deposit record
    await client.query(depositQueries.insertDeposit, [
      userId,
      amount,
      "success",
      transactionId,
      transactionAccount,
    ]);

    // 3️⃣ Check if wallet exists
    const walletResult = await client.query(depositQueries.getWalletByUserId, [userId]);
    const userCheck = await client.query(
      `SELECT "isDeposited" FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );

    // 4️⃣ If false, update to true
    if (userCheck.rows.length && !userCheck.rows[0].isDeposited) {
      await client.query(
        `UPDATE users.userDetails SET "isDeposited" = true WHERE "userId" = $1`,
        [userId]
      );
    }

    if (walletResult.rows.length === 0) {
      // No wallet — create one
      await client.query(depositQueries.createWallet, [userId, amount]);
    } else {
      // Wallet exists — update deposits
      await client.query(depositQueries.updateWalletDeposit, [amount, userId]);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "Deposit Successfully",
      data: null,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("💥 Deposit Confirm Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  } finally {
    client.release();
  }
};
