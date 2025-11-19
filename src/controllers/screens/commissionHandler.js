import { pool } from "../../db.js";

export const commissionHandler = async (userId) => {
  try {
      if (!userId) {
        return res.status(400).json({
          statusCode: 400,
          message: "userId is required for commission screen.",
        });
      }

      // Fetch all commission details for that user from rewards table
      const rewardsResult = await pool.query(
        `SELECT "senderUserId", "senderEmail", "commission", "createdAt"
         FROM users.rewards
         WHERE "receiverUserId" = $1
         ORDER BY "createdAt" DESC`,
        [userId]
      );

      const commissionDetails = rewardsResult.rows
        .filter((row) => row.senderUserId !== userId) // Exclude if sender and receiver are the same user
        .map((row) => {
          // Mask email like m******ms@gmail.com
          const [name, domain] = row.senderEmail.split("@");
          const maskedName =
            name.length > 2
              ? `${name[0]}${"*".repeat(name.length - 2)}${name.slice(-1)}`
              : name;
          const maskedEmail = `${maskedName}@${domain}`;

          return {
            email: maskedEmail,
            timestamp: row.createdAt,
            commission: parseFloat(row.commission) || 0,
          };
        });

      return {
        statusCode: 200,
        message: "success",
        data: { commissionDetails },
      }
  } catch (error) {
    console.error("Commission API Error:", error);
    return {
      statusCode: 500,
      message: "Internal Server Error",
    }
  }
};
