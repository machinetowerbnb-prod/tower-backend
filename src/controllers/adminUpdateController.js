import { pool } from '../db.js';
import { adminQueries } from "../helpers/queries.js";

export const adminUpdateController = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid payload format",
        data: null,
      });
    }

    const query = adminQueries.updateMasterData(updates);

    const { rows } = await pool.query(query.text, query.values);

    if (rows.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "No record updated",
        data:null,
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "Admin Data Updated Successfully",
      data: null,
    });
  } catch (error) {
    console.error("Admin Update Error:", error);
    return res.status(400).json({
      statusCode: 400,
      message:error.message ,
      data: null,
    });
  }
};
