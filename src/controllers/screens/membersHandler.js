import { pool } from "../../db.js";
import { userQueries } from "../../helpers/queries.js";

export const handleMemberScreen = async (userId, screen) => {
  try {
    const genResult = await pool.query(userQueries.getGenerationMembers, [userId]);

    if (genResult.rows.length === 0) {
      return {
        statusCode: 404,
        message: "User not found",
        data: null,
      };
    }

    const gens = genResult.rows[0];

    // 2️⃣ Select the correct generation array
    let selectedGen = [];
    if (screen === "genOne") selectedGen = gens.firstGen || [];
    else if (screen === "genTwo") selectedGen = gens.secondGen || [];
    else if (screen === "genThree") selectedGen = gens.thirdGen || [];

    // 3️⃣ Handle empty generation
    if (!selectedGen || selectedGen.length === 0) {
      return {
        statusCode: 200,
        message: "success",
        data: { memberDetails: [] },
      };
    }

    // 4️⃣ Fetch member details AND gen counts in one query
    let memberRes;
    try {
      memberRes = await pool.query(userQueries.getMemberDetailsWithGenCounts, [selectedGen]);
    } catch (walletErr) {
      console.error("Fetching member details error:", walletErr);
      return {
        statusCode: 500,
        message: "Error fetching member details",
        data: null,
      };
    }

    if (memberRes.rows.length === 0) {
      return {
        statusCode: 200,
        message: "success",
        data: { memberDetails: [] },
      };
    }

    // 5️⃣ Map rows — pick the correct count depending on screen
    const members = memberRes.rows.map((m) => {
      let count = 0;
      if (screen === "genOne") count = Number(m.gen1_count || 0);
      else if (screen === "genTwo") count = Number(m.gen2_count || 0);
      else if (screen === "genThree") count = Number(m.gen3_count || 0);

      return {
        email: m.email,
        timestamp: m.created_at,
        balance: Number(m.balance || 0),
        inviteCode : count,
      };
    });

    return {
      statusCode: 200,
      message: "success",
      data: { memberDetails: members },
    };
  } catch (error) {
    console.error("Member Screen Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
