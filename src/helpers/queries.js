// ✅ Centralized SQL queries for user operations (with userId column)
export const userQueries = {
  //  Check if user already exists
  checkUserExists: `
    SELECT * FROM users.userDetails WHERE email = $1
  `,

  // Insert new user
  insertUser: `
    INSERT INTO users.userDetails
      ("userId", "userName", "email", "password", "refferedCode", "passcode", "refferalCode")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `,

  //  Optional: Update password
  updatePassword: `
    UPDATE users.userDetails 
    SET password = $1 
    WHERE email = $2
  `,
  //  Get user by email (for login)
  getUserById: `
    SELECT "userId", email, password, "isActiveUser"
    FROM users.userDetails
    WHERE "userId" = $1
  `,

    getUserByEmail: `
    SELECT "userId", "userName", email, password, "isActiveUser" , "isVerified"
    FROM users.userDetails
    WHERE email = $1
  `,

  insertOtp: `
    INSERT INTO users.otpVerify (email, otp, expires_at)
    VALUES ($1, $2, $3)
  `,

  deleteOldOtp: `
    DELETE FROM users.otpVerify
    WHERE email = $1
  `,

  getOtpRecord: `
    SELECT otp, expires_at 
    FROM users.otpVerify
    WHERE email = $1
    ORDER BY created_at DESC
    LIMIT 1;
  `,
  verifyUserEmail: `
    UPDATE users.userDetails
    SET "isVerified" = true
    WHERE email = $1;
  `,
   updateUserPassword: `
    UPDATE users.userDetails
    SET password = $1
    WHERE email = $2
  `,
  getUserByReferralCode: `
    SELECT
      "userId"   AS userid,
      "refferedCode" AS refferedcode,
      "refferalCode" AS refferalcode
    FROM users.userDetails
    WHERE "refferalCode" = $1;
  `,

  // Generic jsonb append helper (we'll call one of these by index)
 appendFirstGen: `
    UPDATE users.userDetails
    SET "firstGen" = COALESCE(
      (
        CASE
          WHEN NOT (EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE("firstGen",'[]'::jsonb)) AS elem
            WHERE elem = $1
          ))
          THEN COALESCE("firstGen",'[]'::jsonb) || to_jsonb(ARRAY[$1]::text[])
          ELSE "firstGen"
        END
      ),
      to_jsonb(ARRAY[$1]::text[])
    )
    WHERE "userId" = $2;
  `,

  appendSecondGen: `
    UPDATE users.userDetails
    SET "secondGen" = COALESCE(
      (
        CASE
          WHEN NOT (EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE("secondGen",'[]'::jsonb)) AS elem
            WHERE elem = $1
          ))
          THEN COALESCE("secondGen",'[]'::jsonb) || to_jsonb(ARRAY[$1]::text[])
          ELSE "secondGen"
        END
      ),
      to_jsonb(ARRAY[$1]::text[])
    )
    WHERE "userId" = $2;
  `,

  appendThirdGen: `
    UPDATE users.userDetails
    SET "thirdGen" = COALESCE(
      (
        CASE
          WHEN NOT (EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE("thirdGen",'[]'::jsonb)) AS elem
            WHERE elem = $1
          ))
          THEN COALESCE("thirdGen",'[]'::jsonb) || to_jsonb(ARRAY[$1]::text[])
          ELSE "thirdGen"
        END
      ),
      to_jsonb(ARRAY[$1]::text[])
    )
    WHERE "userId" = $2;
  `,
   getGenerationMembers: `
    SELECT 
      "firstGen",
      "secondGen",
      "thirdGen"
    FROM users.userDetails
    WHERE "userId" = $1;
  `,

  getMemberDetailsByIds: `
    SELECT 
      u."userId",
      u."email",
      u."created_at",
      u."refferalCode" AS "inviteCode",
      COALESCE(w."earnings", 0) AS "balance"
    FROM users.userDetails u
    LEFT JOIN users.wallets w ON u."userId" = w."userId"
    WHERE u."userId" = ANY($1::bigint[]);
  `,

  getUserGenerations: `
    SELECT "firstGen", "secondGen", "thirdGen"
    FROM users.userDetails
    WHERE "userId" = $1;
  `,

  getUsersByIds: `
    SELECT "userId", "email", "isDeposited"
    FROM users.userDetails
    WHERE "userId" = ANY($1::bigint[]);
  `,

  getWalletsByUserIds: `
    SELECT "userId", "deposits", "totalCommission"
    FROM users.wallets
    WHERE "userId" = ANY($1::bigint[]);
  `,

  getWithdrawalsByUserIds: `
    SELECT "userId", SUM("amount") AS "amount"
    FROM users.withdrawals
    WHERE "userId" = ANY($1::bigint[])
    GROUP BY "userId";
  `,
  getUserLevelById: `
  SELECT "userLevel"
  FROM users.wallets
  WHERE "userId" = $1;
`,
};

export const adminQueries = {
  getMaintenanceStatus: `
    SELECT 
      "isUnderMaintainance", 
      "maintainanceImageLocation" 
    FROM admin.master
    LIMIT 1;
  `,
  getPlans: `
    SELECT plans
    FROM admin.master
    LIMIT 1;
  `,
  updateMasterData: (columns) => {
    const setClauses = Object.keys(columns)
      .map((key, index) => `"${key}" = $${index + 1}`)
      .join(", ");
    const values = Object.values(columns);
    return {
      text: `UPDATE admin.master SET ${setClauses} WHERE id = 1 RETURNING *;`,
      values,
    };
  }
};

export const avengersQueries = {
  getWalletSummary: `
    SELECT 
      COALESCE(deposits, 0) AS "totalDeposits", 
      COALESCE(earnings, 0) AS "totalEarnings"
    FROM users.wallets 
    WHERE "userId" = $1;
  `,

  createWalletIfNotExists: `
    INSERT INTO users.wallets ("userId", deposits, earnings)
    VALUES ($1, 0, 0)
    ON CONFLICT ("userId") DO NOTHING;
  `,

  getUserReferralCode: `
    SELECT "refferalCode"
    FROM users.userDetails
    WHERE "userId" = $1;
  `,

  getMasterDataForHome: `
    SELECT 
      "bannerLink",
      "gameLink"
    FROM admin.master
    LIMIT 1;
  `,
   getMasterWalletNetworks: `
    SELECT "walletNetworks"
    FROM admin.master
    LIMIT 1;
  `,
};

// src/helpers/queries.js

export const depositQueries = {
  insertDeposit: `
    INSERT INTO users.deposits 
      ("userId", amount, status, "transactionId", "transactionAccount")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `,

  getWalletByUserId: `
    SELECT * FROM users.wallets WHERE "userId" = $1;
  `,

  createWallet: `
    INSERT INTO users.wallets ("userId", deposits, earnings)
    VALUES ($1, $2, 0)
    RETURNING *;
  `,

  updateWalletDeposit: `
    UPDATE users.wallets 
    SET deposits = deposits + $1
    WHERE "userId" = $2
    RETURNING *;
  `,
};

export const walletQueries = {
  // 1️⃣ Fetch wallet for update (lock row during transaction)
  getWalletForUpdate: `
    SELECT earnings
    FROM users.wallets
    WHERE "userId" = $1
    FOR UPDATE;
  `,

  // 2️⃣ Update wallet earnings after withdrawal
  updateWalletEarnings: `
    UPDATE users.wallets
    SET earnings = $1, updated_at = NOW()
    WHERE "userId" = $2;
  `,

  // 3️⃣ Insert into withdrawals table
  insertWithdrawal: `INSERT INTO users.withdrawals
        ("userId", amount, status, "withdrawId", "withdrawAddress", timestamp)
        VALUES ($1, $2, 'pending', $3, $4, NOW())`,
};

export const historyQueries = {
  getDepositsByUser: `
     SELECT 
        'deposit' AS type,
        amount,
        "timestamp",
        "transactionId" AS "transactionId"
      FROM users.deposits
      WHERE "userId" = $1
      ORDER BY "timestamp" DESC;
  `,

  getWithdrawalsByUser: `
    SELECT 
        'withdraw' AS type,
        amount,
        "timestamp",
        "withdrawId" AS "transactionId"
      FROM users.withdrawals
      WHERE "userId" = $1
      ORDER BY "timestamp" DESC;
  `,
};
export const positionQueries = {
  getAllPositions: `
    SELECT 
      w."userId",
      u."userName" AS name,
      w.earnings AS points
    FROM users.wallets w
    JOIN users.userDetails u ON w."userId" = u."userId"
    ORDER BY w.earnings DESC;
  `,
};
