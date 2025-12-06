import { pool } from '../db.js';
import { adminQueries } from "../helpers/queries.js";

export const checkMaintenance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "isUnderMaintainance" FROM admin.master LIMIT 1`
    );

    const isUnderMaintainance = result.rows[0]?.isUnderMaintainance;

    if (isUnderMaintainance) {
      return res.status(403).json({
        statusCode: 403,
        message: "Under Maintainance",
        data: null,
      });
    }

    next(); // continue if not under maintenance
  } catch (err) {
    console.error("Maintenance middleware error:", err);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
