      import { pool } from "../../db.js";
      import { userQueries } from "../../helpers/queries.js";
      
      export const handleMemberScreen = async (userId,screen) => {
        try {
         const genResult = await pool.query(userQueries.getGenerationMembers, [userId]);

        if (genResult.rows.length === 0) {
          return res.status(404).json({
            statusCode: 404,
            message: "User not found",
            data: null,
          });
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
          }
        }

        // 4️⃣ Fetch member details
        let memberRes;
          try {
            memberRes = await pool.query(userQueries.getMemberDetailsByIds, [selectedGen]);
          } catch (walletErr) {
            if (walletErr.message.includes(`relation "users.wallet" does not exist`)) {
              console.error("Wallet table missing:", walletErr);
              return {
                statusCode: 500,
                message: "Wallet not found for these user",
                data: null,
              }
            }
            throw walletErr;
          }

          if (memberRes.rows.length === 0) {
            return {
              statusCode: 404,
              message: "Wallet not found for these user",
              data: null,
            }
          }

        const members = memberRes.rows.map((m) => ({
          email: m.email,
          createdAt: m.createdAt,
          balance: Number(m.balance),
          inviteCode: m.inviteCode,
        }));

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