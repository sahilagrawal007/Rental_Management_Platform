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

/**
 * GET /api/quotations/vendor/pending
 * Get all pending quotations for a vendor's products
 * NOTE: This route MUST be before /:id to avoid matching "vendor" as an id
 */
router.get("/vendor/pending", authMiddleware, checkRole("VENDOR", "ADMIN"), async (req, res) => {
  try {
    // Find all quotations that have products from this vendor and are in SENT status
    const quotations = await prisma.quotation.findMany({
      where: {
        status: "SENT",
        quotationLines: {
          some: {
            product: {
              vendorId: req.userId,
            },
          },
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quotationLines: {
          where: {
            product: {
              vendorId: req.userId,
            },
          },
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(quotations);
  } catch (error) {
    console.error("Error fetching vendor pending quotations:", error);
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
 * PATCH /api/quotations/:id/submit
 * Submit quotation for vendor review
 * Calculates and saves GST (18%) in the total amount
 */
router.patch("/:id/submit", authMiddleware, checkRole("CUSTOMER"), async (req, res) => {
  try {
    const quotationId = req.params.id;
    const { deliveryAddress } = req.body;

    // Check ownership
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        quotationLines: {
          include: {
            product: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    if (quotation.customerId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (quotation.status !== "DRAFT") {
      return res.status(400).json({ error: "Quotation already submitted" });
    }

    if (quotation.quotationLines.length === 0) {
      return res.status(400).json({ error: "Cannot submit an empty quotation" });
    }

    // Calculate subtotal (without GST)
    const subtotal = quotation.quotationLines.reduce((sum, line) => sum + line.subtotal, 0);

    // Calculate GST (18%)
    const gstAmount = subtotal * 0.18;

    // Calculate final total amount including GST
    const finalTotalAmount = Math.round(subtotal + gstAmount);

    // Count unique vendors
    const vendorIds = [...new Set(quotation.quotationLines.map((line) => line.product.vendorId))];
    const vendorCount = vendorIds.length;

    // Update quotation status and save the final amount with GST
    const updatedQuotation = await prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: "SENT",
        totalAmount: finalTotalAmount,
      },
    });

    res.json({
      message: `Quote sent to ${vendorCount} vendor${vendorCount > 1 ? "s" : ""}`,
      quotation: updatedQuotation,
      vendorCount,
      breakdown: {
        subtotal,
        gstAmount: Math.round(gstAmount),
        finalTotal: finalTotalAmount,
      },
    });
  } catch (error) {
    console.error("Error submitting quotation:", error);
    res.status(500).json({ error: "Failed to submit quotation" });
  }
});

/**
 * PATCH /api/quotations/:id/cancel
 * Cancel a sent quotation
 */
router.patch("/:id/cancel", authMiddleware, checkRole("CUSTOMER"), async (req, res) => {
  try {
    const quotationId = req.params.id;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    if (quotation.customerId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (quotation.status !== "SENT") {
      return res.status(400).json({ error: "Only sent quotations can be cancelled" });
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "CANCELLED" },
    });

    res.json({
      message: "Quotation cancelled",
      quotation: updatedQuotation,
    });
  } catch (error) {
    console.error("Error cancelling quotation:", error);
    res.status(500).json({ error: "Failed to cancel quotation" });
  }
});

/**
 * PATCH /api/quotations/:id/approve
 * Approve a quotation (vendor) - Creates RentalOrder and DRAFT Invoice
 * For multi-vendor quotations, creates separate orders per vendor
 */
router.patch("/:id/approve", authMiddleware, checkRole("VENDOR", "ADMIN"), async (req, res) => {
  try {
    const quotationId = req.params.id;
    const { deliveryAddress } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quotationLines: {
          include: {
            product: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    // Get lines that belong to this vendor
    const vendorLines = quotation.quotationLines.filter(
      (line) => line.product.vendorId === req.userId
    );

    if (vendorLines.length === 0 && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "No products from your catalog in this quotation" });
    }

    if (quotation.status !== "SENT") {
      return res.status(400).json({ error: "Only sent quotations can be approved" });
    }

    // Calculate vendor-specific totals (GST-inclusive since totalAmount already has GST)
    const vendorSubtotal = vendorLines.reduce((sum, line) => sum + line.subtotal, 0);
    const vendorGST = vendorSubtotal * 0.18;
    const vendorTotal = Math.round(vendorSubtotal + vendorGST);

    // Create order and invoice in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create RentalOrder for this vendor
      const rentalOrder = await tx.rentalOrder.create({
        data: {
          quotationId: quotationId,
          customerId: quotation.customerId,
          vendorId: req.userId,
          status: "CONFIRMED",
          totalAmount: vendorTotal,
          deliveryAddress: deliveryAddress || null,
        },
      });

      // Create OrderLines
      const orderLines = [];
      for (const qLine of vendorLines) {
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
      for (const line of orderLines) {
        await tx.inventoryReservation.create({
          data: {
            orderId: rentalOrder.id,
            productId: line.productId,
            quantity: line.quantity,
            reservedFrom: line.rentalStart,
            reservedUntil: line.rentalEnd,
            status: "RESERVED",
          },
        });
      }

      // Generate invoice number
      const year = new Date().getFullYear();
      const prefix = `INV-${year}-`;
      const lastInvoice = await tx.invoice.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { createdAt: "desc" },
      });
      let nextNumber = 1;
      if (lastInvoice) {
        nextNumber = parseInt(lastInvoice.invoiceNumber.split("-")[2]) + 1;
      }
      const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

      // Calculate invoice amounts (GST is 18%)
      const invoiceSubtotal = vendorSubtotal;
      const invoiceTax = invoiceSubtotal * 0.18;
      const invoiceTotal = invoiceSubtotal + invoiceTax;

      // Create DRAFT Invoice
      const invoice = await tx.invoice.create({
        data: {
          orderId: rentalOrder.id,
          invoiceNumber: invoiceNumber,
          status: "DRAFT", // Draft until sent to customer
          subtotal: parseFloat(invoiceSubtotal.toFixed(2)),
          taxAmount: parseFloat(invoiceTax.toFixed(2)),
          totalAmount: parseFloat(invoiceTotal.toFixed(2)),
          amountPaid: 0,
          securityDeposit: 0,
          lateFee: 0,
        },
      });

      return { rentalOrder, orderLines, invoice };
    });

    // Update quotation status to CONFIRMED (or APPROVED if partial)
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "CONFIRMED" },
    });

    res.json({
      message: "Quotation approved! Order and draft invoice created.",
      order: result.rentalOrder,
      invoice: result.invoice,
      orderLinesCount: result.orderLines.length,
    });
  } catch (error) {
    console.error("Error approving quotation:", error);

    // Handle unique constraint error (order already exists for this quotation)
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: "An order has already been created for this quotation"
      });
    }

    res.status(500).json({ error: "Failed to approve quotation" });
  }
});

/**
 * PATCH /api/quotations/:id/reject
 * Reject a quotation (vendor)
 */
router.patch("/:id/reject", authMiddleware, checkRole("VENDOR", "ADMIN"), async (req, res) => {
  try {
    const quotationId = req.params.id;
    const { reason } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        quotationLines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({ error: "Quotation not found" });
    }

    // Check if vendor has products in this quotation
    const hasVendorProducts = quotation.quotationLines.some(
      (line) => line.product.vendorId === req.userId
    );

    if (!hasVendorProducts && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    if (quotation.status !== "SENT") {
      return res.status(400).json({ error: "Only sent quotations can be rejected" });
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "REJECTED" },
    });

    res.json({
      message: "Quotation rejected",
      quotation: updatedQuotation,
      reason,
    });
  } catch (error) {
    console.error("Error rejecting quotation:", error);
    res.status(500).json({ error: "Failed to reject quotation" });
  }
});

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
