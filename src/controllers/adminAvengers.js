import { adminWithdrawals } from './screens/adminWithdrawals.js';
import { Dashboard } from './screens/dashboardHandler.js';
import { Users } from './screens/usersHandler.js';
export const adminAveners = async (req, res) => {
  const { screen } = req.body;

  try {
    if (!screen) {
      return res.status(400).json({
        statusCode: 400,
        message: "screen are required",
        data: null,
      });
    }

    let response;

    switch (screen) {
      case "Dashboard":
        response = await Dashboard();
        break;
      case "Users":
        response = await Users();
        break;
       case "Withdrawals":
        response = await adminWithdrawals();
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
    console.error("Admin Avengers Controller Error:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
      data: null,
    });
  }
};
