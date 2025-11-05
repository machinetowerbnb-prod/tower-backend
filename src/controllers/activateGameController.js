// src/controllers/activateGameController.js
import { pool } from '../db.js';
export const activateGame = async (req, res) => {
  const { userId } = req.body;
  if (!userId)
    return res.status(400).json({ statusCode: 400, message: "userId is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 🧱 1. Fetch user wallet
    const walletRes = await client.query(
      `SELECT "purchaseAmount","userLevel","lastActivatedAt"
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

    if (!purchaseAmount || !userLevel) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "User has not purchased any level" });
    }

    // 🕒 2. 24-hour cooldown
    if (wallet.lastActivatedAt) {
      const last = new Date(wallet.lastActivatedAt);
      const now = new Date();
      const diff = (now - last) / (1000 * 60 * 60);
      if (diff < 24) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Please wait ${(24 - diff).toFixed(1)} more hours before next activation.`,
        });
      }
    }

    // 💰 3. Level-based commission %
    const levelRates = { free: 0, Level1: 1.6, Level2: 1.9, Level3: 2.3, Level4: 2.5 };
    const levelRate = levelRates[userLevel];
    if (levelRate === undefined) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid userLevel" });
    }

    const totalCommission = (purchaseAmount * levelRate) / 100;

    // 🔗 4. Walk referral chain
    const me = await client.query(
      `SELECT "refferedCode" FROM users.userDetails WHERE "userId" = $1`,
      [userId]
    );
    let currentCode = me.rows[0]?.refferedCode || null;
    const uplines = [];

    const getUserByRefCode = `
      SELECT "userId","email","refferedCode","refferalCode"
      FROM users.userDetails
      WHERE "refferalCode" = $1
      LIMIT 1;
    `;

    for (let gen = 1; gen <= 3; gen++) {
      if (!currentCode) break;
      const refRes = await client.query(getUserByRefCode, [currentCode]);
      if (refRes.rowCount === 0) break;
      const ref = refRes.rows[0];
      uplines.push({ gen, userId: Number(ref.userId), email: ref.email });
      currentCode = ref.refferedCode || null;
    }

    // ⚖️ 5. Calculate generation commissions
    const genPercents = { 1: 5, 2: 3, 3: 2 };
    const availableGens = uplines.length;
    let totalGenPercent = 0;
    uplines.forEach(up => (totalGenPercent += genPercents[up.gen]));

    const userPercent = 100 - totalGenPercent;
    const genBonuses = {};
    uplines.forEach(up => {
      genBonuses[up.gen] = (totalCommission * genPercents[up.gen]) / 100;
    });
    const userShare = (totalCommission * userPercent) / 100;

    // 💾 6. Update user's wallet (earnings, totalCommission, timestamp)
    await client.query(
      `UPDATE users.wallets
       SET "earnings" = COALESCE("earnings",0) + $1,
           "totalCommission" = COALESCE("totalCommission",0) + $1,
           "lastActivatedAt" = NOW()
       WHERE "userId" = $2`,
      [userShare, userId]
    );

    // 💸 7. Distribute to generations + record in rewards
    for (const up of uplines) {
      const bonus = genBonuses[up.gen];
      if (bonus <= 0) continue;

      const walletUpdate = await client.query(
        `UPDATE users.wallets
         SET "earnings" = COALESCE("earnings",0) + $1,
             "totalCommission" = COALESCE("totalCommission",0) + $1
         WHERE "userId" = $2 RETURNING "userId"`,
        [bonus, up.userId]
      );

      if (walletUpdate.rowCount > 0) {
        await client.query(
          `INSERT INTO users.rewards
           ("receiverUserId","receiverEmail","senderUserId","commission")
           VALUES ($1,$2,$3,$4)`,
          [up.userId, up.email, userId, bonus]
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
