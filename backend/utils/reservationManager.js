// utils/reservationManager.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createReservation(orderId, productId, quantity, startDate, endDate) {
  try {
    console.log("Creating reservation with:", {
      orderId,
      productId,
      quantity,
      startDate,
      endDate,
    });

    const reservation = await prisma.inventoryReservation.create({
      data: {
        orderId: orderId,
        productId: productId,
        quantity: quantity,
        reservedFrom: new Date(startDate),
        reservedUntil: new Date(endDate),
        status: "RESERVED",
      },
    });

    console.log("Reservation created successfully:", reservation.id);
    return reservation;
  } catch (error) {
    console.error("DETAILED Error creating reservation:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    throw error;
  }
}

async function updateReservationStatus(reservationId, newStatus) {
  try {
    const reservation = await prisma.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: newStatus },
    });

    return reservation;
  } catch (error) {
    console.error("Error updating reservation:", error);
    throw error;
  }
}

async function releaseOrderReservations(orderId) {
  try {
    const result = await prisma.inventoryReservation.updateMany({
      where: { orderId: orderId },
      data: { status: "RELEASED" },
    });

    return result;
  } catch (error) {
    console.error("Error releasing reservations:", error);
    throw error;
  }
}

async function getOrderReservations(orderId) {
  try {
    const reservations = await prisma.inventoryReservation.findMany({
      where: { orderId: orderId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reservations;
  } catch (error) {
    console.error("Error fetching reservations:", error);
    throw error;
  }
}

module.exports = {
  createReservation,
  updateReservationStatus,
  releaseOrderReservations,
  getOrderReservations,
};
