// oxapay.controller.js
import axios from "axios";
import { pool } from '../db.js';
import dotenv from "dotenv";
import { depositQueries } from "../helpers/queries.js";
dotenv.config();

// CONFIG
const OXAPAY_API_KEY = process.env.OXAPAY_API_KEY;
const OXAPAY_API_BASE = "https://api.oxapay.com/v1/payment";

/**
 * DB UPSERT for Payin
 */
const upsertPayin = async (track_id, data) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
  `INSERT INTO users.payments (
     track_id, address, network, amount, memo, status, oxa_response, created_at, updated_at
   ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
   ON CONFLICT (track_id) DO UPDATE SET
     address = COALESCE(EXCLUDED.address, users.payments.address),
     network = COALESCE(EXCLUDED.network, users.payments.network),
     amount = COALESCE(EXCLUDED.amount, users.payments.amount),
     memo = COALESCE(EXCLUDED.memo, users.payments.memo),
     status = COALESCE(EXCLUDED.status, users.payments.status),
     oxa_response = COALESCE(EXCLUDED.oxa_response, users.payments.oxa_response),
     updated_at = NOW()
   RETURNING *`,
  [
    track_id,
    data.address ?? null,
    data.network ?? null,
    data.amount ?? null,
    data.memo ?? null,
    data.status ?? "created",
    data.oxa_response || data
  ]
);
    return res.rows[0];
  } finally {
    client.release();
  }
};

/**
 * 1️⃣ CREATE PAYIN (User copies details → Pays manually)
 */
export const createPayin = async (depositData) => {
  try {
    const { amount, to_currency = "USDT", network = "TRON", order_id } = depositData;
    // REQUIRED fields from new OxaPay docs
    const payload = {
      amount: amount.toString(),
      to_currency,
      network, // 🔥 REQUIRED
      order_id,
      type: "static"
    };
    console.log("📤 OxaPay Payload:", payload);
    const headers = {
      "Content-Type": "application/json",
      "merchant_api_key": OXAPAY_API_KEY   // 🔥 CORRECT HEADER (according to docs)
    };

    const url = `${OXAPAY_API_BASE}/static-address`; // should be: https://api.oxapay.com/v1/payment
    const apiResp = await axios.post(url, payload, { headers });
    const data = apiResp.data?.data;

    console.log("✅ OxaPay Response:", data);

    // 🔥 DB Store
    await upsertPayin(data?.track_id, {
      address: data.address,
      network: data.network,
      amount: amount,
      memo: data.memo,
      status: "pending",
      oxa_response: data
    });

    return { success: true, data }

  } catch (err) {
    console.error("❌ Payin Create Error", err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message }
  }
};




/**
 * 2️⃣ WEBHOOK HANDLER (OxaPay → your backend)
 */
// export const payinWebhook = async (req, res) => {
//   try {
//     const body = req.body || {};
//     console.log("📩 Webhook Received:", body);

//     const track_id = body.track_id;
//     if (!track_id) return res.status(400).send("missing track_id");

//     const status = (body.status || "").toLowerCase();

//     // update DB
//     await upsertPayin(track_id, {
//       address: null,
//       network: null,
//       amount: body.amount,
//       memo: null,
//       status,
//       oxa_response: body
//     });

//     // If paid → update orders table
//     if (status === "paid") {
//       await pool.query(
//         "UPDATE orders SET status='paid', tx_hash=$2 WHERE order_id=(SELECT order_id FROM users.payments WHERE track_id=$1 LIMIT 1)",
//         [track_id, body.txid || null]
//       );

//       console.log(`💰 Payin ${track_id} marked as PAID`);
//     }

//     return res.status(200).json({ ok: true });

//   } catch (err) {
//     console.error("🔥 Webhook Error:", err);
//     res.status(500).send("webhook error");
//   }
// };

/**
 * 3️⃣ PAYMENT STATUS API (Client polls this)
 */
export const checkPayinStatus = async (req, res) => {
   const client = await pool.connect();
  try {
    let track_id = req.params.track_id;
    // check local DB first
     await client.query("BEGIN");
    const result = await pool.query(
      "SELECT * FROM users.payments WHERE track_id=$1",
      [track_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payin not found" });
    }

    const record = result.rows[0];

    // if paid → return immediately
    if (record.status === "paid") {
      return res.json({ success: true, status: "paid", record });
    }

     const headers = {
      "Content-Type": "application/json",
      "merchant_api_key": OXAPAY_API_KEY   // 🔥 CORRECT HEADER (according to docs)
    };
     track_id = Number(track_id)
    // else call OxaPay status API
    const apiResp = await axios.get(
      `${OXAPAY_API_BASE}/${track_id}`,
      { headers }
    );

    const oxapay = apiResp.data?.data;

    // update DB
    await upsertPayin(track_id, {
      status: oxapay.status,
      oxa_response: oxapay
    });
    if(oxapay.status === "paid") {
    await client.query(depositQueries.updateWalletDeposit, [record.amount, track_id , oxapay.status]);
    }
    await client.query("COMMIT");

    return res.json({ success: true, status: oxapay.status, data: oxapay });

  } catch (err) {
     await client.query("ROLLBACK");
    console.error("❌ Status Check Error", err.response?.data || err.message);
    res.status(500).json({ success: false, statusCode: 500, data:null, error: err.response?.data || err.message });
  }
};
