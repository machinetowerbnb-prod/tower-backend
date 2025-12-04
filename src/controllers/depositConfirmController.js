// src/controllers/depositConfirmController.js
import { pool } from '../db.js';
import { depositQueries } from "../helpers/queries.js";
import { v4 as uuidv4 } from "uuid";
import { createPayin } from './payment.js';
import { roundToTwoDecimals } from "../utils/math.js";
export const depositConfirmController = async (req, res) => {
  const { userId, amount, transactionAccount } = req.body;
  const truncatedAmount = roundToTwoDecimals(amount);

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
   //Integrate createPayin function here if needed 
   const payload = {
       order_id: transactionId,
       amount: truncatedAmount,
       to_currency:transactionAccount?.name == "USDT-TRC20" ? "USDT" : transactionAccount?.name == "USDT-BEP20" ? 'USDT' : transactionAccount?.name,
       network: transactionAccount?.accountId || "BSC",
     };
    const getResponse =  await createPayin(payload);
    if (!getResponse || !getResponse.success) {
      // console.error("💥 Payin Creation Failed:", getResponse?.error || "Something Went wrong");
      await client.query("ROLLBACK");
      return res.status(406).json({
      statusCode: 406,
      message: "Payment Transcation Failed",
      data: null,
    })
    }
    const track_id = getResponse.data.track_id;
// 2️⃣ Insert deposit record
    await client.query(depositQueries.insertDeposit, [
      userId,
      truncatedAmount,
      "pending",
      transactionId,
      transactionAccount,
      track_id
    ]);
    // 5️⃣ Create or update wallet
    if (truncatedAmount <= 0) {
      throw new Error("Deposit amount must be greater than zero");
   }

    if (walletResult.rows.length === 0) {
      // No wallet — create one
      await client.query(depositQueries.createWallet, [userId, truncatedAmount,track_id]);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "Deposit confirmed successfully",
      data: getResponse.data,
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
