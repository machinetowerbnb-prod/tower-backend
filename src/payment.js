// oxapay.controller.js
import axios from "axios";
import { pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

// CONFIG
const OXAPAY_API_KEY = process.env.OXAPAY_API_KEY;
const OXAPAY_API_BASE = process.env.OXAPAY_API_BASE || "https://api.oxapay.com/v1/payment";
const USE_SANDBOX = (process.env.USE_SANDBOX || "false").toLowerCase() === "true";

/* ---------------------------------------------------------
   DB UPSERT HELPER
--------------------------------------------------------- */
const upsertPayment = async (trackId, data) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO users.payments (
         track_id, amount, currency, status, oxa_response,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (track_id) DO UPDATE SET
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         status = EXCLUDED.status,
         oxa_response = EXCLUDED.oxa_response,
         updated_at = NOW()
       RETURNING *`,
      [trackId, data.amount ?? null, data.currency ?? null, data.status ?? null, data.oxa_response ?? data]
    );
    return res.rows[0];
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   CREATE INVOICE API  (POST /create-invoice)
--------------------------------------------------------- */
export const invoice = async (req, res) => {
  try {
    const { amount, currency = "USD", callback_url, description = "Payment" } = req.body;

    if (!amount) return res.status(400).json({ success: false, error: "amount is required" });
    if (!callback_url) return res.status(400).json({ success: false, error: "callback_url is required" });

     // We create a combined return url with user-defined success & failure routes
    const return_url = `${process.env.FRONTEND_URL}/success/?trackId={track_id}`;

    const payload = {
      amount: amount.toString(),
      currency,
      lifetime: 30,
      callback_url,
      return_url: return_url || callback_url,
      description,
      ...(USE_SANDBOX || req.body.sandbox ? { sandbox: true } : {})
    };

    const headers = {
      "Content-Type": "application/json",
      "merchant_api_key": OXAPAY_API_KEY,
    };

    const apiResp = await axios.post(`${OXAPAY_API_BASE}/invoice`, payload, { headers });
    const data = apiResp.data;

    const trackId =
      data?.data?.track_id ||
      data?.trackId ||
      data?.track_id;

    if (trackId) {
      await upsertPayment(trackId, {
        amount: payload.amount,
        currency,
        status: "created",
        oxa_response: data
      });
    }

    return res.json({ success: true, invoice: data });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
};

/* ---------------------------------------------------------
   WEBHOOK (POST /oxapay/webhook)
--------------------------------------------------------- */
export const payment = async (req, res) => {
  try {
    const body = req.body || {};

    const trackId =
      body.track_id ||
      body.trackId ||
      body.data?.track_id;

    if (!trackId) return res.status(400).send("missing trackId");

    const headers = {
      "Content-Type": "application/json",
      "merchant_api_key": OXAPAY_API_KEY,
    };

    let verify = await axios.post(
      `${OXAPAY_API_BASE}/invoice/check`,
      { trackId },
      { headers }
    );

    const verifyData = verify.data;

    const status =
      verifyData?.data?.status ||
      verifyData?.status ||
      verifyData?.payment_status;

    const normalizedStatus = (status || "").toLowerCase();

    await upsertPayment(trackId, {
      amount: verifyData?.data?.amount || null,
      currency: verifyData?.data?.currency || null,
      status: normalizedStatus,
      oxa_response: verifyData
    });

    if (normalizedStatus === "paid" || normalizedStatus === "success") {
      await pool.query(
        "UPDATE orders SET status = 'paid' WHERE track_id = $1",
        [trackId]
      );
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    return res.status(500).send("webhook processing error");
  }
};


/* ---------------------------------------------------------
   PAYMENT STATUS (GET /payment/status/:trackId)
   Frontend will poll this after return_url
--------------------------------------------------------- */
export const paymentStatus = async (req, res) => {
  try {
    const { trackId } = req.params;

    if (!trackId) return res.status(400).json({ success: false, error: "trackId required" });

    // 1️⃣ Check DB first
    const dbRes = await pool.query("SELECT * FROM users.payments WHERE track_id = $1", [trackId]);

    let existing = dbRes.rows[0];

    // If DB says PAID → immediately return
    if (existing && existing.status === "paid") {
      return res.json({ success: true, status: "paid", data: existing });
    }

    // 2️⃣ Not paid? → Check with OxaPay
    const headers = {
      "Content-Type": "application/json",
      "merchant_api_key": OXAPAY_API_KEY,
    };

    let apiResp = await axios.post(
      `${OXAPAY_API_BASE}/invoice/check`,
      { trackId },
      { headers }
    );

    const data = apiResp.data;

    const status =
      data?.data?.status ||
      data?.status ||
      data?.payment_status;

    const normalizedStatus = (status || "").toLowerCase();

    // 3️⃣ Update DB
    await upsertPayment(trackId, {
      amount: data?.data?.amount || existing?.amount,
      currency: data?.data?.currency || existing?.currency,
      status: normalizedStatus,
      oxa_response: data
    });

    // Mark order paid if success
    if (normalizedStatus === "paid" || normalizedStatus === "success") {
      await pool.query(
        "UPDATE orders SET status = 'paid' WHERE track_id = $1",
        [trackId]
      );
    }

    return res.json({
      success: true,
      status: normalizedStatus,
      data
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
};
