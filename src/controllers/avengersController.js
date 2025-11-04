import { handleDepositsScreen } from "./screens/depositsHandler.js";
import { gamesHandler } from "./screens/gamesHandler.js";
import { handleHistoryScreen } from "./screens/historyHandler.js";
import { handleHomeScreen } from "./screens/homeHandler.js";
import { handleWithdrawScreen } from "./screens/withdrawHandler.js";
import { handlePositionScreen } from "./screens/positionHandler.js";
import { handleMemberScreen } from "./screens/membersHandler.js";

export const avengersController = async (req, res) => {
  const { userId, screen } = req.body;

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
      case "games":
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
      case "genOne":
      case "genTwo":
      case "genThree":
        response = await handleMemberScreen(userId, screen);
        break;
      case "commission":
      case "teams":
      case "gameCurrentPlan":
        response = {
          statusCode: 200,
          message: `Coming soon for screen: ${screen}`,
          data: null,
        };
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
