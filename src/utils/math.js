/**
 * Rounds a number to two decimal places.
 * E.g., 1.2399 becomes 1.24.
 * This is used for financial calculations where correct arithmetic precision is needed.
 *
 * @param {number|string} value The number to round.
 * @returns {number} The rounded number.
 */
export const roundToTwoDecimals = (value) => {
    // Ensure the value is a number
    let num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
        return 0;
    }

    // Multiply by 100, round the result, and then divide by 100
    // This performs correct mathematical rounding to two decimals.
    return Math.round(num * 100) / 100;
};
