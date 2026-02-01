// routes/invoices.js
// Invoice viewing and payment processing

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, checkRole } = require('../middleware/auth');
const { calculateInvoiceBalance } = require('../utils/invoiceGenerator');
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

/**
 * GET /api/invoices
 * Get all invoices based on user role
 * - Customer: their invoices
 * - Vendor: invoices for their orders
 * - Admin: all invoices
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    let whereCondition = {};

    if (req.userRole === 'CUSTOMER') {
      // Get invoices for orders placed by this customer
      whereCondition = {
        order: {
          customerId: req.userId
        }
      };
    } else if (req.userRole === 'VENDOR') {
      // Get invoices for orders received by this vendor
      whereCondition = {
        order: {
          vendorId: req.userId
        }
      };
    }
    // Admin sees all invoices (no filter)

    const invoices = await prisma.invoice.findMany({
      where: whereCondition,
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
              }
            },
            vendor: {
              select: {
                id: true,
                name: true,
                companyName: true,
              }
            },
            orderLines: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add balance calculation to each invoice
    const invoicesWithBalance = invoices.map(invoice => ({
      ...invoice,
      balance: calculateInvoiceBalance(invoice)
    }));

    res.json(invoicesWithBalance);

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * GET /api/invoices/:id
 * Get single invoice details
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
                gstin: true,
              }
            },
            vendor: {
              select: {
                id: true,
                name: true,
                companyName: true,
                gstin: true,
              }
            },
            orderLines: {
              include: {
                product: true
              }
            }
          }
        },
        payments: {
          orderBy: {
            paidAt: 'desc'
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access rights
    if (req.userRole === 'CUSTOMER' && invoice.order.customerId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.userRole === 'VENDOR' && invoice.order.vendorId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add balance calculation
    const invoiceWithBalance = {
      ...invoice,
      balance: calculateInvoiceBalance(invoice)
    };

    res.json(invoiceWithBalance);

  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

/**
 * POST /api/invoices/:id/payments
 * Record a payment against an invoice
 * VENDOR records payments when customer pays them
 */
router.post('/:id/payments', authMiddleware, checkRole('VENDOR', 'ADMIN'), async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { amount, paymentMethod, transactionId } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if vendor owns this invoice (through order)
    if (req.userRole === 'VENDOR' && invoice.order.vendorId !== req.userId) {
      return res.status(403).json({ error: 'Access denied - not your invoice' });
    }

    // Calculate balance
    const currentBalance = calculateInvoiceBalance(invoice);

    if (amount > currentBalance) {
      return res.status(400).json({
        error: 'Payment amount exceeds invoice balance',
        balance: currentBalance
      });
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx) => {

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoiceId,
          amount: parseFloat(amount),
          paymentMethod: paymentMethod,
          transactionId: transactionId || null,
          status: 'COMPLETED', // In real app, this would be PENDING until gateway confirms
        }
      });

      // Update invoice
      const newAmountPaid = invoice.amountPaid + parseFloat(amount);
      const newBalance = invoice.totalAmount - newAmountPaid;

      // Determine new invoice status
      let newStatus = invoice.status;
      if (newBalance === 0) {
        newStatus = 'PAID'; // Fully paid
      } else if (newAmountPaid > 0 && newBalance > 0) {
        newStatus = 'PARTIAL'; // Partially paid
      } else if (newAmountPaid === 0) {
        newStatus = 'SENT'; // No payment yet
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
        }
      });

      return { payment, updatedInvoice };
    });

    console.log('Payment processed:', {
      invoiceNumber: invoice.invoiceNumber,
      paymentAmount: amount,
      newStatus: result.updatedInvoice.status
    });

    // Fetch updated invoice with all details
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true,
        payments: {
          orderBy: { paidAt: 'desc' }
        }
      }
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: result.payment,
      invoice: {
        ...updatedInvoice,
        balance: calculateInvoiceBalance(updatedInvoice)
      }
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

/**
 * GET /api/invoices/:id/payments
 * Get all payments for an invoice
 */
router.get('/:id/payments', authMiddleware, async (req, res) => {
  try {
    const invoiceId = req.params.id;

    // Check invoice exists and user has access
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access
    if (req.userRole === 'CUSTOMER' && invoice.order.customerId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.userRole === 'VENDOR' && invoice.order.vendorId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get payments
    const payments = await prisma.payment.findMany({
      where: { invoiceId: invoiceId },
      orderBy: { paidAt: 'desc' }
    });

    res.json(payments);

  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * PATCH /api/invoices/:id/send
 * Mark invoice as sent (DRAFT → SENT)
 * Vendor action
 */
router.patch('/:id/send', authMiddleware, checkRole('VENDOR', 'ADMIN'), async (req, res) => {
  try {
    const invoiceId = req.params.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check ownership
    if (req.userRole === 'VENDOR' && invoice.order.vendorId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only send draft invoices' });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT' }
    });

    res.json({
      message: 'Invoice sent to customer',
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

/**
 * GET /api/invoices/:id/pdf
 * Export invoice as PDF with comprehensive details
 */
router.get('/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
                gstin: true,
              }
            },
            vendor: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
                gstin: true,
              }
            },
            orderLines: {
              include: {
                product: true
              }
            }
          }
        },
        payments: {
          orderBy: { paidAt: 'desc' }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access rights
    if (req.userRole === 'CUSTOMER' && invoice.order.customerId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.userRole === 'VENDOR' && invoice.order.vendorId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);

    // Pipe to response
    doc.pipe(res);

    // ===== HEADER WITH BRANDING =====
    doc.rect(0, 0, 612, 80).fill('#1a1a1a');
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#fff').text('RENTIC', 40, 25);
    doc.fontSize(10).font('Helvetica').fillColor('#e86a45').text('Rental Management Platform', 40, 55);
    doc.fontSize(18).fillColor('#fff').text('TAX INVOICE', 450, 35);

    doc.fillColor('#000');
    doc.y = 100;

    // ===== INVOICE DETAILS BOX =====
    doc.roundedRect(400, 90, 170, 70, 5).fill('#f5f5f5');
    doc.fillColor('#666').fontSize(9).text('Invoice Number:', 410, 100);
    doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text(invoice.invoiceNumber, 410, 112);
    doc.fillColor('#666').fontSize(9).font('Helvetica').text('Invoice Date:', 410, 130);
    doc.fillColor('#000').fontSize(10).text(new Date(invoice.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }), 410, 142);

    // Status badge
    const statusConfig = {
      DRAFT: { color: '#9CA3AF', label: 'DRAFT' },
      SENT: { color: '#F59E0B', label: 'PENDING' },
      PARTIAL: { color: '#3B82F6', label: 'PARTIAL' },
      PAID: { color: '#10B981', label: 'PAID' },
      OVERDUE: { color: '#EF4444', label: 'OVERDUE' }
    };
    const status = statusConfig[invoice.status] || statusConfig.DRAFT;
    doc.roundedRect(490, 90, 70, 22, 3).fill(status.color);
    doc.fontSize(9).fillColor('#fff').text(status.label, 500, 96);

    // ===== VENDOR DETAILS (FROM) =====
    doc.fillColor('#000');
    let yPos = 100;

    doc.fontSize(9).fillColor('#666').text('FROM:', 40, yPos);
    yPos += 12;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
      .text(invoice.order.vendor?.companyName || invoice.order.vendor?.name || 'Vendor', 40, yPos);
    yPos += 14;
    doc.font('Helvetica').fontSize(9).fillColor('#444');
    if (invoice.order.vendor?.email) {
      doc.text(`Email: ${invoice.order.vendor.email}`, 40, yPos);
      yPos += 12;
    }
    if (invoice.order.vendor?.gstin) {
      doc.text(`GSTIN: ${invoice.order.vendor.gstin}`, 40, yPos);
      yPos += 12;
    }

    // ===== CUSTOMER DETAILS (BILL TO) =====
    yPos = 170;
    doc.fontSize(9).fillColor('#666').text('BILL TO:', 40, yPos);
    doc.fontSize(9).fillColor('#666').text('SHIP TO:', 300, yPos);
    yPos += 12;

    // Customer info - left
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000')
      .text(invoice.order.customer?.companyName || invoice.order.customer?.name || 'Customer', 40, yPos);
    doc.text(invoice.order.customer?.name || 'Customer', 300, yPos);
    yPos += 14;

    doc.font('Helvetica').fontSize(9).fillColor('#444');
    if (invoice.order.customer?.email) {
      doc.text(`Email: ${invoice.order.customer.email}`, 40, yPos);
    }
    if (invoice.order.deliveryAddress) {
      doc.text(invoice.order.deliveryAddress, 300, yPos, { width: 220 });
    }
    yPos += 12;

    if (invoice.order.customer?.gstin) {
      doc.text(`GSTIN: ${invoice.order.customer.gstin}`, 40, yPos);
      yPos += 12;
    }

    // ===== ORDER INFO =====
    yPos += 10;
    doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor('#ddd').stroke();
    yPos += 10;
    doc.fontSize(9).fillColor('#666').text(`Order ID: ${invoice.order.id.slice(-8).toUpperCase()}`, 40, yPos);
    doc.text(`Order Date: ${new Date(invoice.order.createdAt).toLocaleDateString('en-IN')}`, 200, yPos);

    // ===== PRODUCT TABLE =====
    yPos += 30;

    // Table header
    doc.rect(40, yPos, 515, 25).fill('#f5f5f5');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#333');
    doc.text('#', 50, yPos + 8);
    doc.text('PRODUCT / RENTAL PERIOD', 70, yPos + 8);
    doc.text('QTY', 290, yPos + 8);
    doc.text('RATE/DAY', 330, yPos + 8);
    doc.text('DAYS', 400, yPos + 8);
    doc.text('AMOUNT', 450, yPos + 8);

    yPos += 30;
    doc.font('Helvetica').fontSize(9).fillColor('#000');

    // Table rows
    let itemIndex = 1;
    for (const line of invoice.order.orderLines) {
      const startDate = new Date(line.rentalStart);
      const endDate = new Date(line.rentalEnd);
      const rentalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

      // Row background for alternating colors
      if (itemIndex % 2 === 0) {
        doc.rect(40, yPos - 5, 515, 35).fill('#fafafa');
        doc.fillColor('#000');
      }

      // Item number
      doc.text(itemIndex.toString(), 50, yPos);

      // Product name
      doc.font('Helvetica-Bold').text(line.product?.name || 'Product', 70, yPos, { width: 200 });

      // Rental period
      doc.font('Helvetica').fontSize(8).fillColor('#666');
      doc.text(`${startDate.toLocaleDateString('en-IN')} - ${endDate.toLocaleDateString('en-IN')}`, 70, yPos + 12);

      // Quantity
      doc.fontSize(9).fillColor('#000').text(line.quantity.toString(), 290, yPos);

      // Rate per day (unit price)
      doc.text(`₹${line.unitPrice.toLocaleString('en-IN')}`, 330, yPos);

      // Days
      doc.text(rentalDays.toString(), 405, yPos);

      // Amount (subtotal)
      doc.font('Helvetica-Bold').text(`₹${line.subtotal.toLocaleString('en-IN')}`, 450, yPos);

      yPos += 35;
      itemIndex++;
      doc.font('Helvetica').fillColor('#000');
    }

    // ===== PRICE SUMMARY BOX =====
    yPos += 10;
    doc.moveTo(40, yPos).lineTo(555, yPos).strokeColor('#ddd').stroke();
    yPos += 15;

    // Summary on right side
    const summaryX = 350;

    // Subtotal
    doc.fontSize(10).fillColor('#666').text('Subtotal:', summaryX, yPos);
    doc.fillColor('#000').text(`₹${invoice.subtotal.toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });
    yPos += 18;

    // CGST (9%)
    doc.fillColor('#666').text('CGST (9%):', summaryX, yPos);
    doc.fillColor('#000').text(`₹${(invoice.taxAmount / 2).toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });
    yPos += 18;

    // SGST (9%)
    doc.fillColor('#666').text('SGST (9%):', summaryX, yPos);
    doc.fillColor('#000').text(`₹${(invoice.taxAmount / 2).toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });
    yPos += 18;

    // Total GST
    doc.fillColor('#666').text('Total GST (18%):', summaryX, yPos);
    doc.fillColor('#000').text(`₹${invoice.taxAmount.toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });
    yPos += 5;

    // Divider
    doc.moveTo(summaryX, yPos + 10).lineTo(555, yPos + 10).strokeColor('#333').lineWidth(1).stroke();
    yPos += 20;

    // Grand Total
    doc.rect(summaryX - 5, yPos - 5, 215, 30).fill('#1a1a1a');
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#fff').text('GRAND TOTAL:', summaryX + 5, yPos + 3);
    doc.fontSize(14).text(`₹${invoice.totalAmount.toLocaleString('en-IN')}`, 480, yPos + 2, { align: 'right', width: 65 });
    yPos += 40;

    // Security Deposit if any
    doc.fillColor('#000');
    if (invoice.securityDeposit > 0) {
      doc.fontSize(9).fillColor('#666').text('Security Deposit:', summaryX, yPos);
      doc.fillColor('#000').text(`₹${invoice.securityDeposit.toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });
      yPos += 18;
    }

    // Late Fee if any
    if (invoice.lateFee > 0) {
      doc.fontSize(9).fillColor('#666').text('Late Fee:', summaryX, yPos);
      doc.fillColor('#EF4444').text(`₹${invoice.lateFee.toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });
      yPos += 18;
    }

    // Amount Paid
    doc.fontSize(10).fillColor('#666').text('Amount Paid:', summaryX, yPos);
    doc.fillColor('#10B981').text(`₹${invoice.amountPaid.toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });
    yPos += 20;

    // Balance Due
    const balance = calculateInvoiceBalance(invoice);
    doc.font('Helvetica-Bold').fontSize(11);
    doc.fillColor(balance > 0 ? '#EF4444' : '#10B981').text('Balance Due:', summaryX, yPos);
    doc.text(`₹${balance.toLocaleString('en-IN')}`, 480, yPos, { align: 'right', width: 75 });

    // ===== PAYMENT HISTORY =====
    if (invoice.payments.length > 0) {
      yPos += 40;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Payment History', 40, yPos);
      yPos += 15;

      // Payment table header
      doc.rect(40, yPos, 300, 20).fill('#f5f5f5');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#333');
      doc.text('DATE', 50, yPos + 6);
      doc.text('METHOD', 120, yPos + 6);
      doc.text('TRANSACTION ID', 190, yPos + 6);
      doc.text('AMOUNT', 280, yPos + 6);
      yPos += 25;

      doc.font('Helvetica').fontSize(8).fillColor('#000');
      for (const payment of invoice.payments) {
        const paidDate = new Date(payment.paidAt).toLocaleDateString('en-IN');
        doc.text(paidDate, 50, yPos);
        doc.text(payment.paymentMethod, 120, yPos);
        doc.text(payment.transactionId || '-', 190, yPos);
        doc.fillColor('#10B981').text(`₹${payment.amount.toLocaleString('en-IN')}`, 280, yPos);
        doc.fillColor('#000');
        yPos += 15;
      }
    }

    // ===== FOOTER =====
    doc.rect(0, 780, 612, 62).fill('#f5f5f5');
    doc.font('Helvetica').fontSize(8).fillColor('#666');
    doc.text('Terms & Conditions:', 40, 792);
    doc.fontSize(7).text('• Items must be returned in original condition. Late returns may incur additional fees.', 40, 804);
    doc.text('• All disputes are subject to local jurisdiction.', 40, 814);

    doc.fontSize(9).fillColor('#e86a45');
    doc.text('Thank you for choosing Rentic!', 450, 800);
    doc.fontSize(7).fillColor('#999').text('Generated on ' + new Date().toLocaleString('en-IN'), 450, 815);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;