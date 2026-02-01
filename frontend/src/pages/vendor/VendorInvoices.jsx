import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { invoiceAPI } from '../../services/api';

const paymentMethods = [
    { id: 'UPI', label: 'UPI', icon: '📱' },
    { id: 'CARD', label: 'Credit/Debit Card', icon: '💳' },
    { id: 'NETBANKING', label: 'Net Banking', icon: '🏦' },
    { id: 'CASH', label: 'Cash', icon: '💵' },
    { id: 'CHEQUE', label: 'Cheque', icon: '📝' },
];

export default function VendorInvoices() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toast, setToast] = useState(null);

    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [transactionId, setTransactionId] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    // Send invoice modal
    const [sendingInvoice, setSendingInvoice] = useState(null);

    const fetchInvoices = async () => {
        try {
            const res = await invoiceAPI.getAll();
            setInvoices(res.data);
        } catch (err) {
            setError('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const openPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentAmount(invoice.balance?.toString() || '');
        setPaymentMethod('UPI');
        setTransactionId('');
        setShowPaymentModal(true);
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        setPaymentAmount('');
        setTransactionId('');
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();

        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setToast({ type: 'error', message: 'Please enter a valid amount' });
            return;
        }

        if (parseFloat(paymentAmount) > (selectedInvoice.balance || 0)) {
            setToast({ type: 'error', message: 'Amount exceeds balance due' });
            return;
        }

        setProcessingPayment(true);
        try {
            await invoiceAPI.makePayment(selectedInvoice.id, {
                amount: parseFloat(paymentAmount),
                paymentMethod,
                transactionId: transactionId || null,
            });

            setToast({ type: 'success', message: 'Payment recorded successfully!' });
            closePaymentModal();
            fetchInvoices(); // Refresh invoices
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.error || 'Failed to record payment'
            });
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleSendInvoice = async (invoice) => {
        setSendingInvoice(invoice.id);
        try {
            await invoiceAPI.send(invoice.id);
            setToast({ type: 'success', message: 'Invoice sent to customer!' });
            fetchInvoices();
        } catch (err) {
            setToast({
                type: 'error',
                message: err.response?.data?.error || 'Failed to send invoice'
            });
        } finally {
            setSendingInvoice(null);
        }
    };

    const handleDownloadPdf = (invoiceId, invoiceNumber) => {
        const token = localStorage.getItem('token');
        const url = `/api/invoices/${invoiceId}/pdf`;

        fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${invoiceNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch(() => {
                setToast({ type: 'error', message: 'Failed to download PDF' });
            });
    };

    const setQuickPayment = (type) => {
        if (!selectedInvoice) return;

        switch (type) {
            case 'full':
                setPaymentAmount(selectedInvoice.balance?.toString() || '');
                break;
            case 'deposit':
                // 30% security deposit
                setPaymentAmount((selectedInvoice.balance * 0.3).toFixed(2));
                break;
            case 'half':
                setPaymentAmount((selectedInvoice.balance * 0.5).toFixed(2));
                break;
            default:
                break;
        }
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

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-xl shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    <div className="flex items-center gap-3">
                        {toast.type === 'success' ? '✓' : '✗'}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            )}

            <main className="flex-1 pt-16 pb-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Invoices</h1>
                            <p className="text-gray-500">Manage invoices and record customer payments</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                                <span className="text-gray-600">Draft</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                <span className="text-gray-600">Sent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span className="text-gray-600">Partial</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span className="text-gray-600">Paid</span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {invoices.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No invoices yet</h2>
                            <p className="text-gray-500">Invoices will appear here when you approve customer quotations</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-lg text-gray-900">{invoice.invoiceNumber}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                        invoice.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' :
                                                            invoice.status === 'SENT' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                Created: {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            {/* Send Invoice Button (for DRAFT only) */}
                                            {invoice.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleSendInvoice(invoice)}
                                                    disabled={sendingInvoice === invoice.id}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                                                >
                                                    {sendingInvoice === invoice.id ? 'Sending...' : 'Send to Customer'}
                                                </button>
                                            )}

                                            {/* Record Payment Button (for SENT or PARTIAL) */}
                                            {(invoice.status === 'SENT' || invoice.status === 'PARTIAL') && (
                                                <button
                                                    onClick={() => openPaymentModal(invoice)}
                                                    className="px-4 py-2 bg-[#e86a45] text-white rounded-lg hover:bg-[#d85a35] transition-colors text-sm font-medium"
                                                >
                                                    Record Payment
                                                </button>
                                            )}

                                            {/* Download PDF */}
                                            <button
                                                onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                                title="Download PDF"
                                            >
                                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    {invoice.order?.customer && (
                                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                            <p className="text-xs text-gray-500 mb-1">Customer</p>
                                            <p className="font-medium text-gray-900">
                                                {invoice.order.customer.companyName || invoice.order.customer.name}
                                            </p>
                                            <p className="text-sm text-gray-500">{invoice.order.customer.email}</p>
                                        </div>
                                    )}

                                    {/* Amount Summary */}
                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <p className="text-xs text-gray-500 mb-1">Subtotal</p>
                                            <p className="font-bold text-gray-900">₹{invoice.subtotal?.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <p className="text-xs text-gray-500 mb-1">GST (18%)</p>
                                            <p className="font-bold text-gray-900">₹{invoice.taxAmount?.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <p className="text-xs text-gray-500 mb-1">Total</p>
                                            <p className="font-bold text-gray-900">₹{invoice.totalAmount?.toLocaleString()}</p>
                                        </div>
                                        <div className={`rounded-lg p-3 text-center ${invoice.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                            <p className="text-xs text-gray-500 mb-1">Balance Due</p>
                                            <p className={`font-bold ${invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ₹{invoice.balance?.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Amount Paid */}
                                    {invoice.amountPaid > 0 && (
                                        <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 mb-4">
                                            <span className="text-green-700 font-medium">Amount Received</span>
                                            <span className="text-green-700 font-bold text-lg">₹{invoice.amountPaid?.toLocaleString()}</span>
                                        </div>
                                    )}

                                    {/* Payment History */}
                                    {invoice.payments?.length > 0 && (
                                        <div className="border-t border-gray-100 pt-4">
                                            <p className="text-sm font-semibold text-gray-700 mb-3">Payment History</p>
                                            <div className="space-y-2">
                                                {invoice.payments.map((p) => (
                                                    <div key={p.id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2">
                                                        <div>
                                                            <span className="text-gray-700 font-medium">{p.paymentMethod}</span>
                                                            <span className="text-gray-400 mx-2">•</span>
                                                            <span className="text-gray-500">{format(new Date(p.paidAt), 'MMM dd, yyyy HH:mm')}</span>
                                                            {p.transactionId && (
                                                                <span className="text-gray-400 text-xs ml-2">ID: {p.transactionId}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-green-600 font-bold">₹{p.amount?.toLocaleString()}</span>
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

            {/* Record Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                            <button onClick={closePaymentModal} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Invoice Info */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-sm text-gray-500">Invoice</p>
                                    <p className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedInvoice.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {selectedInvoice.status}
                                </span>
                            </div>
                            <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
                                <span className="text-sm text-gray-500">Balance Due:</span>
                                <span className="font-bold text-red-600 text-lg">₹{selectedInvoice.balance?.toLocaleString()}</span>
                            </div>
                        </div>

                        <form onSubmit={handleRecordPayment}>
                            {/* Quick Payment Options */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setQuickPayment('deposit')}
                                        className="flex-1 py-2 px-3 border border-gray-200 rounded-lg text-sm hover:border-[#e86a45] hover:text-[#e86a45] transition-colors"
                                    >
                                        30% Deposit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQuickPayment('half')}
                                        className="flex-1 py-2 px-3 border border-gray-200 rounded-lg text-sm hover:border-[#e86a45] hover:text-[#e86a45] transition-colors"
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQuickPayment('full')}
                                        className="flex-1 py-2 px-3 border border-gray-200 rounded-lg text-sm hover:border-[#e86a45] hover:text-[#e86a45] transition-colors"
                                    >
                                        Full Payment
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received (₹)</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e86a45] focus:border-transparent text-lg font-bold"
                                    placeholder="Enter amount"
                                    min="1"
                                    max={selectedInvoice.balance}
                                    step="0.01"
                                    required
                                />
                            </div>

                            {/* Payment Method */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {paymentMethods.map((method) => (
                                        <button
                                            key={method.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(method.id)}
                                            className={`p-3 border rounded-lg text-center transition-colors ${paymentMethod === method.id
                                                    ? 'border-[#e86a45] bg-orange-50 text-[#e86a45]'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <span className="text-lg block mb-1">{method.icon}</span>
                                            <span className="text-xs font-medium">{method.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Transaction ID */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction/Reference ID (Optional)</label>
                                <input
                                    type="text"
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#e86a45] focus:border-transparent"
                                    placeholder="e.g., UPI Ref Number, Cheque No."
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={processingPayment}
                                className="w-full bg-[#e86a45] text-white py-3 rounded-lg font-semibold hover:bg-[#d85a35] transition-colors disabled:opacity-50"
                            >
                                {processingPayment ? 'Recording...' : `Record ₹${parseFloat(paymentAmount || 0).toLocaleString()} Payment`}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
