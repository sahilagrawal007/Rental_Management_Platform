// routes/orders.js
// Convert quotation to order, manage rental lifecycle

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, checkRole } = require("../middleware/auth");
const { checkProductAvailability } = require("../utils/availabilityChecker");
const { createInvoiceForOrder } = require("../utils/invoiceGenerator");

const prisma = new PrismaClient();

/**
 * POST /api/orders/confirm-quotation/:quotationId
 * Convert quotation to confirmed rental order + Generate Invoice
 */
router.post(
  "/confirm-quotation/:quotationId",
  authMiddleware,
  checkRole("CUSTOMER"),
  async (req, res) => {
    try {
      const quotationId = req.params.quotationId;
      const { deliveryAddress, securityDeposit } = req.body;

      console.log("=== Starting Order Confirmation ===");
      console.log("Quotation ID:", quotationId);
      console.log("Customer ID:", req.userId);

      // Get quotation with all items
      const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
        include: {
          quotationLines: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  vendorId: true,
                },
              },
            },
          },
        },
      });

      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }

      console.log("Quotation found:", quotation.id);

      // Check ownership
      if (quotation.customerId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check status
      if (quotation.status !== "DRAFT") {
        return res.status(400).json({ error: "Quotation already confirmed" });
      }

      // Check if quotation has items
      if (quotation.quotationLines.length === 0) {
        return res.status(400).json({ error: "Quotation is empty" });
      }

      // Check availability for ALL items
      console.log("=== Checking Availability ===");
      for (const line of quotation.quotationLines) {
        const availability = await checkProductAvailability(
          line.productId,
          line.rentalStart,
          line.rentalEnd,
          line.quantity,
        );

        if (!availability.isAvailable) {
          return res.status(400).json({
            error: `Product "${line.product.name}" is no longer available for selected dates`,
            product: line.product.name,
            availability,
          });
        }
      }

      console.log("=== Creating Order ===");

      // Create order using transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update quotation status
        await tx.quotation.update({
          where: { id: quotationId },
          data: { status: "CONFIRMED" },
        });

        // Create rental order
        const vendorId = quotation.quotationLines[0].product.vendorId;

        const rentalOrder = await tx.rentalOrder.create({
          data: {
            quotationId: quotationId,
            customerId: req.userId,
            vendorId: vendorId,
            status: "CONFIRMED",
            totalAmount: quotation.totalAmount,
            deliveryAddress: deliveryAddress || "",
          },
        });

        console.log("Order created:", rentalOrder.id);

        // Create order lines
        const orderLines = [];
        for (const qLine of quotation.quotationLines) {
          const orderLine = await tx.orderLine.create({
            data: {
              orderId: rentalOrder.id,
              productId: qLine.productId,
              quantity: qLine.quantity,
              rentalStart: qLine.rentalStart,
              rentalEnd: qLine.rentalEnd,
              unitPrice: qLine.unitPrice,
              subtotal: qLine.subtotal,
            },
          });
          orderLines.push(orderLine);
        }

        // Create inventory reservations
        const reservations = [];
        for (const line of orderLines) {
          const reservation = await tx.inventoryReservation.create({
            data: {
              orderId: rentalOrder.id,
              productId: line.productId,
              quantity: line.quantity,
              reservedFrom: line.rentalStart,
              reservedUntil: line.rentalEnd,
              status: "RESERVED",
            },
          });
          reservations.push(reservation);
        }

        return { rentalOrder, orderLines, reservations };
      });

      console.log("=== Generating Invoice ===");

      // Create invoice (outside transaction)
      const invoice = await createInvoiceForOrder(result.rentalOrder.id, {
        securityDeposit: securityDeposit || 0,
      });

      console.log("Invoice created:", invoice.invoiceNumber);

      // Fetch complete order details with invoice
      const completeOrder = await prisma.rentalOrder.findUnique({
        where: { id: result.rentalOrder.id },
        include: {
          orderLines: {
            include: {
              product: true,
            },
          },
          inventoryReservations: true,
          invoice: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              gstin: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              companyName: true,
              gstin: true,
            },
          },
        },
      });

      console.log("=== Order & Invoice Created Successfully ===");

      res.status(201).json({
        message: "Order confirmed and invoice generated successfully",
        order: completeOrder,
        invoice: invoice,
      });
    } catch (error) {
      console.error("=== ORDER CONFIRMATION FAILED ===");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);

      res.status(500).json({
        error: error.message || "Failed to confirm order",
      });
    }
  },
);

/**
 * GET /api/orders
 * Get orders based on user role
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    let whereCondition = {};

    if (req.userRole === "CUSTOMER") {
      whereCondition = { customerId: req.userId };
    } else if (req.userRole === "VENDOR") {
      whereCondition = { vendorId: req.userId };
    }

    const orders = await prisma.rentalOrder.findMany({
      where: whereCondition,
      include: {
        orderLines: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * GET /api/orders/:id
 * Get single order details
 */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const order = await prisma.rentalOrder.findUnique({
      where: { id: req.params.id },
      include: {
        orderLines: {
          include: {
            product: true,
          },
        },
        inventoryReservations: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            gstin: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            gstin: true,
          },
        },
        quotation: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check access rights
    if (req.userRole === "CUSTOMER" && order.customerId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (req.userRole === "VENDOR" && order.vendorId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

/**
 * PATCH /api/orders/:id/cancel
 * Cancel order (only if not picked up yet)
 */
router.patch("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Only customer can cancel their order
    if (order.customerId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Can only cancel if not picked up
    if (order.status !== "CONFIRMED") {
      return res.status(400).json({ error: "Can only cancel orders that are not picked up yet" });
    }

    // Cancel order and release reservations
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.rentalOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      // Release inventory reservations
      await tx.inventoryReservation.updateMany({
        where: { orderId: orderId },
        data: { status: "RELEASED" },
      });
    });

    res.json({ message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

module.exports = router;
