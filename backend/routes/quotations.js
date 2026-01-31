// Shopping cart functionality - customers add products before confirming order

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, checkRole } = require("../middleware/auth");
const { calculateRentalPrice } = require("../utils/priceCalculator");
const { checkProductAvailability } = require("../utils/availabilityChecker");

const prisma = new PrismaClient();

/**
 * GET /api/quotations
 * Get all quotations for logged-in customer
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { customerId: req.userId },
      include: {
        quotationLines: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                pricePerHour: true,
                pricePerDay: true,
                pricePerWeek: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(quotations);
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({ error: "Failed to fetch quotations" });
  }
});


router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: {
        quotationLines: {
          include: {
            product: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    name: true,
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    // Check ownership
    if (quotation.customerId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(quotation);
  } catch (error) {
    console.error("Error fetching quotation:", error);
    res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

/**
 * POST /api/quotations
 * Create new quotation (empty cart)
 */
router.post("/", authMiddleware, checkRole("CUSTOMER"), async (req, res) => {
  try {
    const quotation = await prisma.quotation.create({
      data: {
        customerId: req.userId,
        status: "DRAFT",
        totalAmount: 0,
      },
    });

    res.status(201).json({
      message: "Quotation created successfully",
      quotation,
    });
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({ error: "Failed to create quotation" });
  }
});

/**
 * POST /api/quotations/:id/items
 * Add product to quotation (add to cart)
 */
router.post("/:id/items", authMiddleware, checkRole("CUSTOMER"), async (req, res) => {
  try {
    const quotationId = req.params.id;
    const { productId, quantity, rentalStart, rentalEnd } = req.body;

    if (!productId || !quantity || !rentalStart || !rentalEnd) {
      return res.status(400).json({
        error: "Missing required fields: productId, quantity, rentalStart, rentalEnd",
      });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    if (quotation.customerId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (quotation.status !== "DRAFT") {
      return res.status(400).json({ error: "Cannot modify confirmed quotation" });
    }

    const availability = await checkProductAvailability(
      productId,
      rentalStart,
      rentalEnd,
      quantity,
    );

    if (!availability.isAvailable) {
      return res.status(400).json({
        error: "Product not available for selected dates",
        availability,
      });
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    // Calculate price
    const pricing = calculateRentalPrice(product, rentalStart, rentalEnd);
    const unitPrice = pricing.price;
    const subtotal = unitPrice * quantity;

    // Add item to quotation
    const quotationLine = await prisma.quotationLine.create({
      data: {
        quotationId: quotationId,
        productId: productId,
        quantity: parseInt(quantity),
        rentalStart: new Date(rentalStart),
        rentalEnd: new Date(rentalEnd),
        unitPrice: unitPrice,
        subtotal: subtotal,
      },
      include: {
        product: true,
      },
    });

    // Update quotation total
    const updatedQuotation = await updateQuotationTotal(quotationId);

    res.status(201).json({
      message: "Item added to quotation",
      quotationLine,
      quotation: updatedQuotation,
    });
  } catch (error) {
    console.error("Error adding item to quotation:", error);
    res.status(500).json({ error: error.message || "Failed to add item" });
  }
});

/**
 * PUT /api/quotations/:quotationId/items/:lineId
 * Update quantity of item in quotation
 */
router.put(
  "/:quotationId/items/:lineId",
  authMiddleware,
  checkRole("CUSTOMER"),
  async (req, res) => {
    try {
      const { quotationId, lineId } = req.params;
      const { quantity } = req.body;

      // Check ownership
      const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
      });

      if (!quotation || quotation.customerId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (quotation.status !== "DRAFT") {
        return res.status(400).json({ error: "Cannot modify confirmed quotation" });
      }

      // Get quotation line
      const line = await prisma.quotationLine.findUnique({
        where: { id: lineId },
        include: { product: true },
      });

      if (!line) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Check availability for new quantity
      const availability = await checkProductAvailability(
        line.productId,
        line.rentalStart,
        line.rentalEnd,
        quantity,
      );

      if (!availability.isAvailable) {
        return res.status(400).json({
          error: "Requested quantity not available",
          availability,
        });
      }

      // Update quantity and recalculate
      const newSubtotal = line.unitPrice * quantity;

      const updatedLine = await prisma.quotationLine.update({
        where: { id: lineId },
        data: {
          quantity: parseInt(quantity),
          subtotal: newSubtotal,
        },
        include: { product: true },
      });

      // Update quotation total
      const updatedQuotation = await updateQuotationTotal(quotationId);

      res.json({
        message: "Item updated",
        quotationLine: updatedLine,
        quotation: updatedQuotation,
      });
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: "Failed to update item" });
    }
  },
);

/**
 * DELETE /api/quotations/:quotationId/items/:lineId
 * Remove item from quotation
 */
router.delete(
  "/:quotationId/items/:lineId",
  authMiddleware,
  checkRole("CUSTOMER"),
  async (req, res) => {
    try {
      const { quotationId, lineId } = req.params;

      // Check ownership
      const quotation = await prisma.quotation.findUnique({
        where: { id: quotationId },
      });

      if (!quotation || quotation.customerId !== req.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (quotation.status !== "DRAFT") {
        return res.status(400).json({ error: "Cannot modify confirmed quotation" });
      }

      // Delete item
      await prisma.quotationLine.delete({
        where: { id: lineId },
      });

      // Update quotation total
      const updatedQuotation = await updateQuotationTotal(quotationId);

      res.json({
        message: "Item removed",
        quotation: updatedQuotation,
      });
    } catch (error) {
      console.error("Error removing item:", error);
      res.status(500).json({ error: "Failed to remove item" });
    }
  },
);

/**
 * DELETE /api/quotations/:id
 * Delete entire quotation
 */
router.delete("/:id", authMiddleware, checkRole("CUSTOMER"), async (req, res) => {
  try {
    const quotationId = req.params.id;

    // Check ownership
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation || quotation.customerId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (quotation.status !== "DRAFT") {
      return res.status(400).json({ error: "Cannot delete confirmed quotation" });
    }

    // Delete quotation (cascade will delete lines)
    await prisma.quotation.delete({
      where: { id: quotationId },
    });

    res.json({ message: "Quotation deleted" });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    res.status(500).json({ error: "Failed to delete quotation" });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Recalculate quotation total based on all items
 */
async function updateQuotationTotal(quotationId) {
  const lines = await prisma.quotationLine.findMany({
    where: { quotationId: quotationId },
  });

  const totalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0);

  const updatedQuotation = await prisma.quotation.update({
    where: { id: quotationId },
    data: { totalAmount: totalAmount },
  });

  return updatedQuotation;
}

module.exports = router;
