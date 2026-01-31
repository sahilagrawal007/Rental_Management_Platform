// utils/invoiceGenerator.js
// Handles invoice generation and calculations

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Generate unique invoice number
 * Format: INV-YYYY-NNNN (e.g., INV-2025-0001)
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Get last invoice number for current year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let nextNumber = 1;

  if (lastInvoice) {
    // Extract number from last invoice (e.g., "INV-2025-0042" -> 42)
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  // Pad with zeros (0001, 0002, etc.)
  const paddedNumber = String(nextNumber).padStart(4, "0");

  return `${prefix}${paddedNumber}`;
}

/**
 * Calculate GST (Goods and Services Tax)
 * Standard GST rate in India: 18%
 *
 * @param {Number} subtotal - Amount before tax
 * @param {Number} gstRate - GST percentage (default 18%)
 * @returns {Object} - Tax breakdown
 */
function calculateGST(subtotal, gstRate = 18) {
  const taxAmount = (subtotal * gstRate) / 100;
  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
    taxRate: gstRate,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

/**
 * Create invoice for a rental order
 * This is called automatically when order is confirmed
 *
 * @param {String} orderId - Rental Order UUID
 * @param {Object} options - Additional options (securityDeposit, etc.)
 * @returns {Object} - Created invoice
 */
async function createInvoiceForOrder(orderId, options = {}) {
  try {
    console.log("Creating invoice for order:", orderId);

    // Get order details
    const order = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      include: {
        orderLines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { orderId: orderId },
    });

    if (existingInvoice) {
      console.log("Invoice already exists:", existingInvoice.invoiceNumber);
      return existingInvoice;
    }

    // Calculate amounts
    const subtotal = order.totalAmount;
    const gstCalculation = calculateGST(subtotal);
    const securityDeposit = options.securityDeposit || 0;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    console.log("Invoice calculation:", {
      subtotal,
      taxAmount: gstCalculation.taxAmount,
      totalAmount: gstCalculation.totalAmount,
      invoiceNumber,
    });

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        orderId: orderId,
        invoiceNumber: invoiceNumber,
        status: "DRAFT",
        subtotal: gstCalculation.subtotal,
        taxAmount: gstCalculation.taxAmount,
        totalAmount: gstCalculation.totalAmount,
        amountPaid: 0,
        securityDeposit: securityDeposit,
        lateFee: 0,
      },
    });

    console.log("Invoice created:", invoice.invoiceNumber);

    return invoice;
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error;
  }
}

/**
 * Update invoice with late fee
 * Called when product is returned late
 *
 * @param {String} invoiceId - Invoice UUID
 * @param {Number} lateFee - Late fee amount
 * @returns {Object} - Updated invoice
 */
async function addLateFeeToInvoice(invoiceId, lateFee) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Calculate new total with late fee
    const newTotalAmount = invoice.totalAmount + lateFee;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        lateFee: lateFee,
        totalAmount: newTotalAmount,
        // If was fully paid, change to partial
        status: invoice.status === "PAID" ? "PARTIAL" : invoice.status,
      },
    });

    return updatedInvoice;
  } catch (error) {
    console.error("Error adding late fee:", error);
    throw error;
  }
}

/**
 * Calculate invoice balance (remaining amount to pay)
 *
 * @param {Object} invoice - Invoice object
 * @returns {Number} - Balance amount
 */
function calculateInvoiceBalance(invoice) {
  const balance = invoice.totalAmount - invoice.amountPaid;
  return parseFloat(balance.toFixed(2));
}

module.exports = {
  generateInvoiceNumber,
  calculateGST,
  createInvoiceForOrder,
  addLateFeeToInvoice,
  calculateInvoiceBalance,
};
