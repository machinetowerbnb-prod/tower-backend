// ✅ Centralized SQL queries for user operations (with userId column)
export const userQueries = {
  // 1️⃣ Check if user already exists
  checkUserExists: `
    SELECT * FROM users.userDetails WHERE email = $1
  `,

  // 2️⃣ Insert new user
  insertUser: `
    INSERT INTO users.userDetails 
      ("userId", "userName", email, password, "refferedCode", mpin, "refferalCode", "isVerified", "isActiveUser")
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, true, true)
    RETURNING id, "userId", "userName", email, "refferalCode";
  `,

  // 3️⃣ Optional: Get user by referral code
  getUserByReferralCode: `
    SELECT * FROM users.userDetails WHERE "refferalCode" = $1
  `,

  // 4️⃣ Optional: Update user status
  updateUserStatus: `
    UPDATE users.userDetails 
    SET "isActiveUser" = $1 
    WHERE id = $2
  `,

  // 5️⃣ Optional: Update password
  updatePassword: `
    UPDATE users.userDetails 
    SET password = $1 
    WHERE email = $2
  `,
  // 6️⃣ Get user by email (for login)
getUserByEmail: `
  SELECT "userId", email, password, "isActiveUser"
  FROM users.userDetails
  WHERE email = $1
`,

};

export const adminQueries = {
  getMaintenanceStatus: `
    SELECT 
      isUnderMaintainance, 
      maintainanceImageLocation 
    FROM admin.master
    LIMIT 1;
  `,
};