// src/controllers/activateGameController.js
import { pool } from '../db.js';
export const activateGame = async (req, res) => {
  const { userId } = req.body;
  if (!userId)
    return res.status(400).json({ statusCode: 400, message: "userId is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1️⃣ Fetch wallet
    const walletRes = await client.query(
      `SELECT "purchaseAmount","userLevel","lastActivatedAt","userTodaysCommission"
       FROM users.wallets WHERE "userId" = $1 FOR UPDATE`,
      [userId]
    );

    if (walletRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Wallet not found" });
    }

    const wallet = walletRes.rows[0];
    const purchaseAmount = Number(wallet.purchaseAmount || 0);
    const userLevel = wallet.userLevel;
    const lastActivatedAt = wallet.lastActivatedAt ? Number(wallet.lastActivatedAt) : null;

    if (!purchaseAmount || !userLevel) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "User has not purchased any level" });
    }

    // 2️⃣ 24 Hour Cooldown
    if (lastActivatedAt) {
      const last = new Date(lastActivatedAt);
      const now = new Date();
      const diff = (now - last) / (1000 * 60 * 60);
      if (diff < 24) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Please wait ${(24 - diff).toFixed(1)} more hours before next activation.`,
        });
      }
    }

    // 3️⃣ Level Commission %
    const levelRates = { free: 0, Level1: 1.6, Level2: 1.9, Level3: 2.3, Level4: 2.5 };
    const levelRate = levelRates[userLevel];
    if (levelRate === undefined) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid userLevel" });
    }

    const totalCommission = (purchaseAmount * levelRate) / 100;

    // 4️⃣ Fetch user → get referral chain
    const meRes = await client.query(
      `SELECT "refferedCode","email" FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );

    const senderEmail = meRes.rows[0]?.email || null;
    let currentCode = meRes.rows[0]?.refferedCode || null;
    const uplines = [];

    const getByReferralCode = `
      SELECT "userId","email","refferedCode","refferalCode"
      FROM users.userDetails
      WHERE "refferalCode" = $1
      LIMIT 1;
    `;

    for (let gen = 1; gen <= 3; gen++) {
      if (!currentCode) break;
      const ref = await client.query(getByReferralCode, [currentCode]);
      if (ref.rowCount === 0) break;

      const user = ref.rows[0];
      uplines.push({ gen, userId: Number(user.userId), email: user.email });
      currentCode = user.refferedCode || null;
    }

    // 5️⃣ Gen commissions
    const genPercents = { 1: 5, 2: 3, 3: 2 };
    const genBonuses = {};

    uplines.forEach(up => {
      genBonuses[up.gen] = (totalCommission * genPercents[up.gen]) / 100;
    });

    // User gets full base commission (only direct game earnings)
    const userShare = totalCommission;

    // 6️⃣ Update user wallet (earnings, totalCommission, today's commission)
    const nowTimestamp = Date.now();

    await client.query(
      `UPDATE users.wallets
       SET 
         "earnings" = ROUND(COALESCE("earnings", 0) + $1::numeric, 1),
         "totalCommission" = ROUND(COALESCE("totalCommission", 0) + $1::numeric, 1),
         "userTodaysCommission" = ROUND($1::numeric, 1),
         "lastActivatedAt" = $3
       WHERE "userId" = $2`,
      [userShare, userId, nowTimestamp]
    );

    // 7️⃣ Insert user’s own commission into rewards table
    await client.query(
      `INSERT INTO users.rewards
       ("receiverUserId","receiverEmail","senderUserId","commission","senderEmail")
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, senderEmail, userId, userShare, senderEmail]
    );

    // 8️⃣ Distribute generation commissions + insert reward history
    for (const up of uplines) {
      const bonus = genBonuses[up.gen];
      if (bonus <= 0) continue;

      // Update wallet of upline
      const update = await client.query(
        `UPDATE users.wallets
         SET "earnings" = ROUND(COALESCE("earnings", 0) + $1::numeric, 1),
             "totalCommission" = ROUND(COALESCE("totalCommission", 0) + $1::numeric, 1)
         WHERE "userId" = $2 RETURNING "userId"`,
        [bonus, up.userId]
      );

      if (update.rowCount > 0) {
        await client.query(
          `INSERT INTO users.rewards
           ("receiverUserId","receiverEmail","senderUserId","commission","senderEmail")
           VALUES ($1,$2,$3,$4,$5)`,
          [up.userId, up.email, userId, bonus, senderEmail]
        );
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      statusCode: 200,
      message: "Game activated successfully",
      data: {
        userId,
        userLevel,
        purchaseAmount,
        totalCommission,
        userShare,
        genBonuses,
        uplines,
        lastActivatedAt: nowTimestamp,
        nextActivation: "After 24 hours",
      },
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ActivateGame Error:", err);
    return res.status(500).json({ statusCode: 500, message: "Internal server error" });
  } finally {
    client.release();
  }
};
