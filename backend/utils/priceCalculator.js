function calculateRentalPrice(product, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Calculate duration in different units
  const durationMs = end - start;
  const hours = durationMs / (1000 * 60 * 60);
  const days = hours / 24;
  const weeks = days / 7;

  let price = 0;
  let pricingType = "";

  // Pricing priority: Week > Day > Hour (choose most economical)
  if (weeks >= 1 && product.pricePerWeek) {
    // Example: 10 days = 1 week + 3 days
    const fullWeeks = Math.floor(weeks);
    const remainingDays = Math.ceil((weeks - fullWeeks) * 7);

    price = fullWeeks * product.pricePerWeek + remainingDays * (product.pricePerDay || 0);
    pricingType = "WEEKLY";
  } else if (days >= 1 && product.pricePerDay) {
    price = Math.ceil(days) * product.pricePerDay;
    pricingType = "DAILY";
  } else if (product.pricePerHour) {
    price = Math.ceil(hours) * product.pricePerHour;
    pricingType = "HOURLY";
  }

  return {
    price: parseFloat(price.toFixed(2)),
    duration: {
      hours: parseFloat(hours.toFixed(2)),
      days: parseFloat(days.toFixed(2)),
      weeks: parseFloat(weeks.toFixed(2)),
    },
    pricingType,
  };
}

/**
 * Calculate late fee if product returned late
 * @param {Date} expectedReturnDate - When product should be returned
 * @param {Date} actualReturnDate - When product was actually returned
 * @param {Number} dailyRate - Daily rental rate
 * @param {Number} lateFeeRate - Late fee percentage (default 10%)
 * @returns {Number} - Late fee amount
 */
function calculateLateFee(expectedReturnDate, actualReturnDate, dailyRate, lateFeeRate = 0.1) {
  const expected = new Date(expectedReturnDate);
  const actual = new Date(actualReturnDate);

  // No late fee if returned on time
  if (actual <= expected) {
    return 0;
  }

  // Calculate delay in days
  const delayMs = actual - expected;
  const delayDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));

  // Late fee = delay days × daily rate × late fee rate
  const lateFee = delayDays * dailyRate * lateFeeRate;

  return parseFloat(lateFee.toFixed(2));
}

module.exports = { calculateRentalPrice, calculateLateFee };
