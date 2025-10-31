import { gamesHandler } from "./screens/gamesHandler.js";

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

      // future cases (we’ll add step-by-step later)
      case "home":
      case "members":
      case "commission":
      case "teams":
      case "position":
      case "withdrawal":
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
