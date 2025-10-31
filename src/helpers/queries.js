// ✅ Centralized SQL queries for user operations (with userId column)
export const userQueries = {
  //  Check if user already exists
  checkUserExists: `
    SELECT * FROM users.userDetails WHERE email = $1
  `,

  // Insert new user
  insertUser: `
    INSERT INTO users.userDetails 
      ("userId", "userName", email, password, "refferedCode", mpin, "refferalCode", "isVerified", "isActiveUser")
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, false, true)
    RETURNING id, "userId", "userName", email, "refferalCode";
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
};
