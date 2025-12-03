import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { generateReferralCode, generateUserId } from "../helpers/generateReferralCode.js";
import { isValidEmail, isValidPasscode, isStrongPassword } from "../helpers/validations.js";
import { userQueries } from "../helpers/queries.js";
import { emailVerify } from './emailVerify.js';
export const registerUser = async (req, res) => {
  const { userName, email, password, refferedCode, passcode } = req.body;

  // validations (same as you had)
  if (!userName || !email || !password || !passcode) {
    return res.status(400).json({ message: "All required fields must be provided." });
  }
  if (!isValidEmail(email)) return res.status(400).json({ message: "Invalid email format." });
  if (!isValidPasscode(passcode)) return res.status(400).json({ message: "Passcode must be exactly 6 digits." });
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long, include alphanumeric."
    });
  }

  const client = await pool.connect();
  try {
    // Use a transaction to keep consistent updates
    await client.query('BEGIN');

    // 1. Check if user exists
    const existingUser = await client.query(userQueries.checkUserExists, [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "User already exists." });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Generate userId and refferalCode (user's own code)
    const userId = generateUserId();
    const refferalCode = generateReferralCode();

    // 4. Insert new user
    const values = [userId, userName, email, hashedPassword, refferedCode || null, passcode, refferalCode];
    const insertRes = await client.query(userQueries.insertUser, values);
    // get inserted user if needed: insertRes.rows[0]

    // 5. If referral code provided, walk up to 3 generations
    if (refferedCode) {
      // currentReferralCode starts as the code provided in payload (the immediate referrer's code)
      let currentReferralCode = refferedCode;

      // array of append queries indexed by generation: 0 -> firstGen, 1 -> secondGen, 2 -> thirdGen
      const appendQueries = [
        userQueries.appendFirstGen,
        userQueries.appendSecondGen,
        userQueries.appendThirdGen,
      ];

      for (let gen = 0; gen < 3; gen++) {
        if (!currentReferralCode) break;

        // fetch the user who owns this referral code, alias returns lowercase keys
        const refRes = await client.query(userQueries.getUserByReferralCode, [currentReferralCode]);

        if (!refRes.rows.length) break; // no more ancestors

        const refRow = refRes.rows[0]; // has keys: userid, refferedcode, refferalcode

        // Append new userId to appropriate generation column of the ancestor (use text version)
        await client.query(appendQueries[gen], [String(userId), refRow.userid]);

        // prepare for next iteration: walk up one level using this ancestor's refferedcode
        currentReferralCode = refRow.refferedcode || null;
      }
    }
    let emailSucess = await emailVerify(email);
    if(emailSucess.statusCode !== 200){
      await client.query('ROLLBACK');
      return  res.status(500).json({ statusCode: 500, message: "Failed" });
    }

    // Commit transaction
    await client.query('COMMIT');
    return res.status(201).json({
      statusCode: 201,
      message: "User registered successfully!",
      data: {
        userId,
        userName,
        email,
        refferalCode: refferalCode,
        refferedCode: refferedCode || null,
      },
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error registering user:", err);
    return res.status(500).json({ statusCode: 500, message: "Internal Server Error" });
  } finally {
    client.release();
  }
};
