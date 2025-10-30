import { pool } from '../db.js';
import { adminQueries } from "../helpers/queries.js";

export const checkMaintenance = async (req, res) => {
  try {
    // 1️⃣ Fetch maintenance info
    const result = await pool.query(adminQueries.getMaintenanceStatus);

    // 2️⃣ If no data found
    if (result.rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "failed",
        data: null,
      });
    }

    const { isUnderMaintainance, maintainanceImageLocation } = result.rows[0];

    // 3️⃣ Respond success
    return res.status(200).json({
      statusCode: 200,
      message: "success",
      data: {
        isUnderMaintainance: isUnderMaintainance,
        maintainanceImageLocation: maintainanceImageLocation,
      },
    });
  } catch (error) {
    console.error("Maintenance Check Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
