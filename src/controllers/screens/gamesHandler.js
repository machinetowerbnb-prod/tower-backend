import { adminQueries } from "../../helpers/queries.js";
import { pool } from "../../db.js";
export const gamesHandler = async (userId) => {
  try {
    const result = await pool.query(adminQueries.getPlans);
    const plans = result.rows[0]?.plans || [];

    return {
      statusCode: 200,
      message: "success",
      data: { plans },
    };
  } catch (error) {
    console.error("Games Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
