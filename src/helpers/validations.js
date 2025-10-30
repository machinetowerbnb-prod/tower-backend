// ✅ Email validation (basic RFC 5322)
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ✅ MPIN must be exactly 4 digits
export function isValidMpin(mpin) {
  const regex = /^\d{4}$/;
  return regex.test(mpin);
}

// ✅ Password strength validation
export function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(password);
}
