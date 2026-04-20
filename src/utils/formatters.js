/**
 * Formats a numeric amount into a currency string.
 * - Adds commas according to en-IN locale.
 * - Shows exactly 2 decimal places if there is a fractional part.
 * - Hides .00 if the amount is an integer.
 * 
 * @param {number|string} amount 
 * @param {string} symbol - e.g. "₹"
 * @returns {string}
 */
export const formatAmount = (amount, symbol = '') => {
  const num = parseFloat(amount) || 0;
  
  // Format with commas
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });

  return symbol ? `${symbol}${formatted}` : formatted;
};

/**
 * Returns a clean string for amount without symbol.
 * Example: 1000 -> "1,000", 1000.5 -> "1,000.50"
 */
export const formatCurrency = (amount) => formatAmount(amount, '');
