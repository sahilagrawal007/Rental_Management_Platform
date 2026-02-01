import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { orderAPI, invoiceAPI } from '../../services/api';

export default function VendorOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [expandedOrder, setExpandedOrder] = useState(null);

    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [processing, setProcessing] = useState(false);
    const [modalError, setModalError] = useState('');

    const fetchOrders = async () => {
        try {
            const res = await orderAPI.getAll();
            setOrders(res.data || []);
        } catch (err) {
            setError('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(order => {
        if (filter === 'ALL') return true;
        return order.status === filter;
    });

    const openPaymentModal = (e, order) => {
        e.stopPropagation();
        if (order.invoice) {
            setSelectedInvoice({
                ...order.invoice,
                orderId: order.id,
                customerName: order.customer?.name,
                totalAmount: order.invoice.totalAmount || 0,
                amountPaid: order.invoice.amountPaid || 0,
                balance: order.invoice.balance || (order.invoice.totalAmount - order.invoice.amountPaid) || 0
            });
            setPaymentAmount(''); // Start with empty, let user select preset
            setPaymentMethod('UPI');
            setModalError('');
            setShowPaymentModal(true);
        }
    };

    const handlePayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setModalError('Please enter a valid amount');
            return;
        }

        if (parseFloat(paymentAmount) > selectedInvoice.balance) {
            setModalError('Amount cannot exceed balance due');
            return;
        }

        setProcessing(true);
        setModalError('');

        try {
            await invoiceAPI.makePayment(selectedInvoice.id, {
                amount: parseFloat(paymentAmount),
                paymentMethod,
                transactionId: `TXN${Date.now()}`
            });
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            setPaymentAmount('');
            fetchOrders();
        } catch (err) {
            setModalError(err.response?.data?.error || 'Payment recording failed');
        } finally {
            setProcessing(false);
        }
    };

    // Generate invoice HTML for printing/export
    const generateInvoiceHTML = (order) => {
        const invoice = order.invoice;
        const vendor = order.vendor;
        const customer = order.customer;

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.invoiceNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
                    .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #e86a45; padding-bottom: 20px; }
                    .logo { font-size: 32px; font-weight: bold; color: #e86a45; }
                    .invoice-title { text-align: right; }
                    .invoice-title h1 { font-size: 28px; color: #333; margin-bottom: 5px; }
                    .invoice-title p { color: #666; }
                    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
                    .party { width: 48%; }
                    .party h3 { color: #e86a45; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                    .party p { color: #666; font-size: 14px; }
                    .party .name { font-weight: bold; color: #333; font-size: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 2px solid #e0e0e0; }
                    td { padding: 15px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
                    .text-right { text-align: right; }
                    .totals { margin-left: auto; width: 300px; }
                    .totals table { margin-bottom: 0; }
                    .totals td { padding: 8px 12px; border: none; }
                    .totals .label { color: #666; }
                    .totals .grand-total { background: #e86a45; color: white; font-size: 18px; font-weight: bold; }
                    .totals .grand-total td { padding: 15px 12px; }
                    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                    .status.DRAFT { background: #fef3c7; color: #92400e; }
                    .status.PARTIAL { background: #dbeafe; color: #1e40af; }
                    .status.PAID { background: #d1fae5; color: #065f46; }
                    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
                    .payment-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
                    .payment-info h4 { margin-bottom: 10px; color: #333; }
                    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="invoice">
                    <div class="header">
                        <div class="logo">Rentic</div>
                        <div class="invoice-title">
                            <h1>INVOICE</h1>
                            <p><strong>${invoice.invoiceNumber}</strong></p>
                            <p>Date: ${format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</p>
                            <p><span class="status ${invoice.status}">${invoice.status}</span></p>
                        </div>
                    </div>
                    
                    <div class="parties">
                        <div class="party">
                            <h3>From (Vendor)</h3>
                            <p class="name">${vendor?.companyName || vendor?.name || 'Vendor'}</p>
                            <p>${vendor?.name || ''}</p>
                            <p>GSTIN: ${vendor?.gstin || 'N/A'}</p>
                        </div>
                        <div class="party">
                            <h3>To (Customer)</h3>
                            <p class="name">${customer?.companyName || customer?.name || 'Customer'}</p>
                            <p>${customer?.email || ''}</p>
                            <p>GSTIN: ${customer?.gstin || 'N/A'}</p>
                            ${order.deliveryAddress ? `<p>Delivery: ${order.deliveryAddress}</p>` : ''}
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Rental Period</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Unit Price</th>
                                <th class="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.orderLines?.map(line => `
                                <tr>
                                    <td><strong>${line.product?.name || 'Product'}</strong></td>
                                    <td>${format(new Date(line.rentalStart), 'MMM dd')} - ${format(new Date(line.rentalEnd), 'MMM dd, yyyy')}</td>
                                    <td class="text-right">${line.quantity}</td>
                                    <td class="text-right">₹${line.unitPrice?.toLocaleString()}</td>
                                    <td class="text-right">₹${line.subtotal?.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <table>
                            <tr>
                                <td class="label">Subtotal</td>
                                <td class="text-right">₹${invoice.subtotal?.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td class="label">GST (18%)</td>
                                <td class="text-right">₹${invoice.taxAmount?.toLocaleString()}</td>
                            </tr>
                            ${invoice.securityDeposit > 0 ? `
                            <tr>
                                <td class="label">Security Deposit</td>
                                <td class="text-right">₹${invoice.securityDeposit?.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            ${invoice.lateFee > 0 ? `
                            <tr>
                                <td class="label">Late Fee</td>
                                <td class="text-right">₹${invoice.lateFee?.toLocaleString()}</td>
                            </tr>
                            ` : ''}
                            <tr class="grand-total">
                                <td>Total Amount</td>
                                <td class="text-right">₹${invoice.totalAmount?.toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="payment-info">
                        <h4>Payment Summary</h4>
                        <p><strong>Amount Paid:</strong> ₹${invoice.amountPaid?.toLocaleString()}</p>
                        <p><strong>Balance Due:</strong> ₹${invoice.balance?.toLocaleString()}</p>
                        ${invoice.payments?.length > 0 ? `
                            <p style="margin-top: 10px; color: #666;"><strong>Payment History:</strong></p>
                            ${invoice.payments.map(p => `
                                <p style="color: #666; font-size: 13px;">• ${format(new Date(p.paidAt), 'MMM dd, yyyy')} - ${p.paymentMethod}: ₹${p.amount?.toLocaleString()}</p>
                            `).join('')}
                        ` : ''}
                    </div>
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                        <p>Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const handlePrintInvoice = (order) => {
        const invoiceHTML = generateInvoiceHTML(order);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    const handleExportInvoice = (order) => {
        const invoiceHTML = generateInvoiceHTML(order);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        // For PDF export, we use the browser's print to PDF functionality
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Navbar />
                <main className="flex-1 flex items-center justify-center pt-16">
                    <div className="spinner"></div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <main className="flex-1 pt-16 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
                            <p className="text-gray-500">Manage your incoming rental orders</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 mb-6">
                        {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === status
                                    ? 'bg-[#e86a45] text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {status === 'ALL' ? 'All Orders' : status}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {filteredOrders.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h2>
                            <p className="text-gray-500">Orders will appear here when customers rent your products</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map((order) => (
                                <div key={order.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                    <div className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div
                                                className="flex items-center gap-4 cursor-pointer flex-1"
                                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                            >
                                                <div className="w-12 h-12 bg-[#e86a45]/10 rounded-xl flex items-center justify-center text-[#e86a45] font-bold">
                                                    #{order.id.slice(-4).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{order.customer?.name || 'Customer'}</h3>
                                                    <p className="text-sm text-gray-500">{format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <span className={`badge status-${order.status.toLowerCase()}`}>{order.status}</span>

                                                <p className="text-xl font-bold text-gray-900">₹{order.invoice?.totalAmount?.toLocaleString() || order.totalAmount?.toLocaleString()}</p>

                                                {/* Payment Button - Visible always for unpaid invoices */}
                                                {order.invoice && order.invoice.status !== 'PAID' && order.invoice.balance > 0 ? (
                                                    <button
                                                        onClick={(e) => openPaymentModal(e, order)}
                                                        className="btn-primary text-sm py-2 px-4"
                                                    >
                                                        Record Payment
                                                    </button>
                                                ) : order.invoice?.status === 'PAID' ? (
                                                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                                        ✓ Paid
                                                    </span>
                                                ) : null}

                                                <button
                                                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                                >
                                                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {expandedOrder === order.id && (
                                        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Customer Details</h4>
                                                    <p className="text-gray-900">{order.customer?.name}</p>
                                                    <p className="text-gray-600">{order.customer?.email}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Delivery Address</h4>
                                                    <p className="text-gray-900">{order.deliveryAddress || 'Not specified'}</p>
                                                </div>
                                            </div>

                                            {/* Invoice/Payment Section */}
                                            {order.invoice && (
                                                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-500 mb-1">Invoice: {order.invoice.invoiceNumber}</h4>
                                                            <div className="flex items-center gap-4 text-sm">
                                                                <span className="text-gray-600">Total: <strong>₹{order.invoice.totalAmount?.toLocaleString()}</strong></span>
                                                                <span className="text-green-600">Paid: <strong>₹{order.invoice.amountPaid?.toLocaleString()}</strong></span>
                                                                <span className="text-amber-600">Balance: <strong>₹{order.invoice.balance?.toLocaleString()}</strong></span>
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${order.invoice.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {order.invoice.status}
                                                        </span>
                                                    </div>

                                                    {/* Print/Export Invoice Buttons */}
                                                    <div className="flex gap-2 mb-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePrintInvoice(order);
                                                            }}
                                                            className="btn-secondary text-sm py-2 px-4"
                                                        >
                                                            🖨️ Print Invoice
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportInvoice(order);
                                                            }}
                                                            className="btn-secondary text-sm py-2 px-4"
                                                        >
                                                            📄 Export PDF
                                                        </button>
                                                    </div>

                                                    {/* Payment history */}
                                                    {order.invoice.payments?.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                                            <p className="text-xs font-medium text-gray-500 mb-2">Payment History</p>
                                                            <div className="space-y-1">
                                                                {order.invoice.payments.map((p) => (
                                                                    <div key={p.id} className="flex justify-between text-sm">
                                                                        <span className="text-gray-500">{format(new Date(p.paidAt), 'MMM dd, yyyy HH:mm')} - {p.paymentMethod}</span>
                                                                        <span className="text-green-600 font-medium">₹{p.amount?.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <h4 className="text-sm font-medium text-gray-500 mb-3">Order Items</h4>
                                            <div className="space-y-2">
                                                {order.orderLines?.map((line) => (
                                                    <div key={line.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                                                                {line.product?.imageUrl ? (
                                                                    <img src={line.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">📦</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{line.product?.name}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    {format(new Date(line.rentalStart), 'MMM dd')} - {format(new Date(line.rentalEnd), 'MMM dd')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-gray-500">Qty: {line.quantity}</p>
                                                            <p className="font-semibold text-gray-900">₹{line.subtotal?.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Record Payment</h2>
                        <p className="text-gray-500 mb-6">
                            {selectedInvoice.invoiceNumber} • {selectedInvoice.customerName}
                        </p>

                        <div className="space-y-4">
                            {/* Invoice Summary */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-xs text-gray-500">Total</p>
                                        <p className="font-bold text-gray-900">₹{selectedInvoice.totalAmount?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Paid</p>
                                        <p className="font-bold text-green-600">₹{selectedInvoice.amountPaid?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Balance</p>
                                        <p className="font-bold text-amber-600">₹{selectedInvoice.balance?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Payment Options */}
                            <div>
                                <label className="input-label mb-2">Quick Options</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentAmount(Math.round(selectedInvoice.balance * 0.3).toString())}
                                        className={`p-3 rounded-xl border-2 text-center transition-all ${parseFloat(paymentAmount) === Math.round(selectedInvoice.balance * 0.3)
                                            ? 'border-[#e86a45] bg-[#e86a45]/10'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-gray-900">Security Deposit</p>
                                        <p className="text-xs text-gray-500">30% • ₹{Math.round(selectedInvoice.balance * 0.3).toLocaleString()}</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentAmount(selectedInvoice.balance.toString())}
                                        className={`p-3 rounded-xl border-2 text-center transition-all ${parseFloat(paymentAmount) === selectedInvoice.balance
                                            ? 'border-[#e86a45] bg-[#e86a45]/10'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <p className="text-sm font-medium text-gray-900">Full Payment</p>
                                        <p className="text-xs text-gray-500">100% • ₹{selectedInvoice.balance?.toLocaleString()}</p>
                                    </button>
                                </div>
                            </div>

                            {/* Custom Amount */}
                            <div>
                                <label className="input-label">Or Enter Custom Amount *</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="input-field"
                                    max={selectedInvoice.balance}
                                    min="1"
                                    placeholder="Enter amount"
                                />
                                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        After this payment: ₹{Math.max(0, selectedInvoice.balance - parseFloat(paymentAmount)).toLocaleString()} remaining
                                    </p>
                                )}
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="input-label">Payment Method *</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="UPI">UPI</option>
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Credit/Debit Card</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>

                            {modalError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                    {modalError}
                                </div>
                            )}

                            {/* Status Preview */}
                            {paymentAmount && parseFloat(paymentAmount) > 0 && (
                                <div className={`p-3 rounded-lg text-sm ${parseFloat(paymentAmount) >= selectedInvoice.balance
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-blue-50 text-blue-700'
                                    }`}>
                                    {parseFloat(paymentAmount) >= selectedInvoice.balance
                                        ? '✓ This will mark the invoice as FULLY PAID'
                                        : '↳ This will mark the invoice as PARTIAL payment'}
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => { setShowPaymentModal(false); setModalError(''); }}
                                    className="flex-1 btn-secondary justify-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePayment}
                                    disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
                                    className="flex-1 btn-primary justify-center disabled:opacity-50"
                                >
                                    {processing ? 'Recording...' : `Record ₹${parseFloat(paymentAmount || 0).toLocaleString()}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
