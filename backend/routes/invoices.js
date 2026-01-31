// routes/invoices.js
// Invoice viewing and payment processing

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, checkRole } = require('../middleware/auth');
const { calculateInvoiceBalance } = require('../utils/invoiceGenerator');

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
 */
router.post('/:id/payments', authMiddleware, checkRole('CUSTOMER'), async (req, res) => {
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
    
    // Check if customer owns this invoice
    if (invoice.order.customerId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
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

module.exports = router;