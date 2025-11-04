import { pool } from "../../db.js";
import { positionQueries } from "../../helpers/queries.js";

export const handlePositionScreen = async (userId) => {
  try {
    // 1️⃣ Fetch all users ordered by earnings
    const result = await pool.query(positionQueries.getAllPositions);
    const positions = result.rows;

    if (positions.length === 0) {
      return {
        statusCode: 200,
        message: "success",
        data: {
          currentPosition: null,
          allPositions: [],
        },
      };
    }

    // 2️⃣ Rank users
    const rankedPositions = positions.map((user, index) => ({
      pid: index + 1,
      name: user.name,
      points: Number(user.points) || 0,
      userId: user.userId,
    }));

    // 3️⃣ Find current user
    const currentUser = rankedPositions.find((u) => u.userId == userId);

    // 4️⃣ Exclude current user from allPositions
    const otherPositions = rankedPositions
      .filter((u) => u.userId != userId)
      .map(({ pid, name, points }) => ({ pid, name, points }));

    return {
      statusCode: 200,
      message: "success",
      data: {
        currentPosition: currentUser
          ? {
              pid: currentUser.pid,
              name: currentUser.name,
              points: currentUser.points,
            }
          : null,
        allPositions: otherPositions,
      },
    };
  } catch (error) {
    console.error("Position Screen Handler Error:", error);
    return {
      statusCode: 400,
      message: "failed",
      data: null,
    };
  }
};
