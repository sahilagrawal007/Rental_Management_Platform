// utils/availabilityChecker.js
// This prevents double-booking by checking inventory availability

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Check if product is available for given dates and quantity
 * This is the CORE logic that prevents double-booking
 *
 * @param {String} productId - Product UUID
 * @param {Date} startDate - Rental start date
 * @param {Date} endDate - Rental end date
 * @param {Number} quantity - Requested quantity
 * @returns {Object} - Availability status and details
 */
async function checkProductAvailability(productId, startDate, endDate, quantity) {
  // Step 1: Get product details
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      quantityOnHand: true,
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  // Step 2: Find all overlapping reservations
  // A reservation overlaps if:
  // - It starts before our rental ends, AND
  // - It ends after our rental starts
  const start = new Date(startDate);
  const end = new Date(endDate);

  const overlappingReservations = await prisma.inventoryReservation.findMany({
    where: {
      productId: productId,
      status: { in: ["RESERVED", "ACTIVE"] }, // Only active reservations
      OR: [
        // Case 1: Existing reservation starts during our rental period
        {
          AND: [{ reservedFrom: { lte: start } }, { reservedUntil: { gte: start } }],
        },
        // Case 2: Existing reservation ends during our rental period
        {
          AND: [{ reservedFrom: { lte: end } }, { reservedUntil: { gte: end } }],
        },
        // Case 3: Existing reservation is completely within our rental period
        {
          AND: [{ reservedFrom: { gte: start } }, { reservedUntil: { lte: end } }],
        },
      ],
    },
  });

  // Step 3: Calculate total reserved quantity
  const reservedQuantity = overlappingReservations.reduce(
    (sum, reservation) => sum + reservation.quantity,
    0,
  );

  // Step 4: Calculate available quantity
  const availableQuantity = product.quantityOnHand - reservedQuantity;

  // Step 5: Return availability status
  return {
    isAvailable: availableQuantity >= quantity,
    availableQuantity: availableQuantity,
    requestedQuantity: quantity,
    productName: product.name,
    totalQuantity: product.quantityOnHand,
    reservedQuantity: reservedQuantity,
  };
}

/**
 * Get all reservations for a product (for displaying calendar)
 * @param {String} productId - Product UUID
 * @returns {Array} - List of reservations
 */
async function getProductReservations(productId) {
  const reservations = await prisma.inventoryReservation.findMany({
    where: {
      productId: productId,
      status: { in: ["RESERVED", "ACTIVE"] },
    },
    select: {
      id: true,
      quantity: true,
      reservedFrom: true,
      reservedUntil: true,
      status: true,
      order: {
        select: {
          id: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      reservedFrom: "asc",
    },
  });

  return reservations;
}

module.exports = {
  checkProductAvailability,
  getProductReservations,
};
