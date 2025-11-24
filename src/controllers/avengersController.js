import { pool } from '../db.js';
import { handleDepositsScreen } from "./screens/depositsHandler.js";
import { gamesHandler } from "./screens/gamesHandler.js";
import { handleHistoryScreen } from "./screens/historyHandler.js";
import { handleHomeScreen } from "./screens/homeHandler.js";
import { handleWithdrawScreen } from "./screens/withdrawHandler.js";
import { handlePositionScreen } from "./screens/positionHandler.js";
import { handleMemberScreen } from "./screens/membersHandler.js";
import { getTeamsData } from "./screens/teamsHandler.js";
import { userQueries } from "../helpers/queries.js";
import { Dashboard } from './screens/dashboardHandler.js';
import { commissionHandler } from './screens/commissionHandler.js';
import { profileHandler } from './screens/profileHandler.js';
export const avengersController = async (req, res) => {
  const { userId, screen , isAdmin = false } = req.body;

  try {
    if (!userId || !screen) {
      return res.status(400).json({
        statusCode: 400,
        message: "userId and screen are required",
        data: null,
      });
    }

    let response;

    switch (screen) {
      case "game":
        response = await gamesHandler(userId);
        break;
      case "home":
        response = await handleHomeScreen(userId);
        break;
      case "deposits":
        response = await handleDepositsScreen(userId);
        break;
      case "withdrawal":
        response = await handleWithdrawScreen(userId);
        break;
      case "history":
        response = await handleHistoryScreen(userId);
        break;
      case "position":
        response = await handlePositionScreen(userId);
        break;
      case "profile":
        response = await profileHandler(userId);
        break;
      case "genOne":
      case "genTwo":
      case "genThree":
        response = await handleMemberScreen(userId, screen);
        break;
      case "teams":
        response = await getTeamsData(userId,isAdmin);
        break;
      case "commission":
        response = await commissionHandler(userId);
        break;
      case "gameCurrentPlan": 
        const userResult = await pool.query(userQueries.getUserLevelById, [userId]);
        if (userResult.rows.length === 0) {
          return res.status(404).json({
            statusCode: 404,
            message: "User not found",
            data: null,
          });
        }

        const { userlevel } = userResult.rows[0];

        response = {
          statusCode: 200,
          message: "success",
          data: {
            currentPlan: userlevel || "Free",
          },
        }
        break ;
      case "Dashboard":
        response = await Dashboard();
        break;
      default:
        response = {
          statusCode: 400,
          message: "Invalid screen type",
          data: null,
        };
    }

    res.status(response.statusCode).json(response);
  } catch (error) {
    console.error("Avengers Controller Error:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
