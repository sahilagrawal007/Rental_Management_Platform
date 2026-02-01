import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { quotationAPI } from '../../services/api';

export default function VendorQuotations() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedQuote, setExpandedQuote] = useState(null);
    const [processing, setProcessing] = useState(null);
    const [toast, setToast] = useState(null);

    const fetchQuotations = async () => {
        try {
            const res = await quotationAPI.getVendorPending();
            setQuotations(res.data || []);
        } catch (err) {
            setError('Failed to load quotations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotations();
    }, []);

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleApprove = async (quoteId) => {
        setProcessing(quoteId);
        setError('');
        try {
            const res = await quotationAPI.approve(quoteId, {});
            setToast({
                type: 'success',
                message: res.data.message || 'Quotation approved! Rental order created.'
            });
            fetchQuotations();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to approve quotation');
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (quoteId) => {
        if (!window.confirm('Are you sure you want to reject this quotation?')) return;

        setProcessing(quoteId);
        setError('');
        try {
            await quotationAPI.reject(quoteId, { reason: 'Vendor rejected' });
            setToast({
                type: 'success',
                message: 'Quotation rejected successfully.'
            });
            fetchQuotations();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reject quotation');
        } finally {
            setProcessing(null);
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
                        {toast.type === 'success' ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            )}

            <main className="flex-1 pt-16 pb-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Quotations</h1>
                            <p className="text-gray-500">Review and approve customer quote requests</p>
                        </div>
                        <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-medium">
                            {quotations.length} Pending
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {quotations.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No pending quotations</h2>
                            <p className="text-gray-500">Customer quote requests will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {quotations.map((quote) => (
                                <div key={quote.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                    <div className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div
                                                className="flex items-center gap-4 cursor-pointer flex-1"
                                                onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                                            >
                                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                                                    ⏳
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        Quote #{quote.id.slice(-6).toUpperCase()}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        From: <span className="font-medium text-gray-700">{quote.customer?.name || 'Customer'}</span>
                                                        {quote.customer?.companyName && (
                                                            <span className="text-gray-400"> ({quote.customer.companyName})</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {format(new Date(quote.createdAt), 'MMM dd, yyyy HH:mm')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right mr-4">
                                                    <p className="text-sm text-gray-500">{quote.quotationLines?.length || 0} items</p>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        ₹{quote.totalAmount?.toLocaleString()}
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReject(quote.id); }}
                                                    disabled={processing === quote.id}
                                                    className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50 font-medium text-sm"
                                                >
                                                    {processing === quote.id ? '...' : '✗ Reject'}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleApprove(quote.id); }}
                                                    disabled={processing === quote.id}
                                                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 font-medium text-sm"
                                                >
                                                    {processing === quote.id ? '...' : '✓ Approve'}
                                                </button>

                                                <button
                                                    onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                                >
                                                    <svg
                                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedQuote === quote.id ? 'rotate-180' : ''
                                                            }`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {expandedQuote === quote.id && (
                                        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                                            {/* Customer Details */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Customer Details</h4>
                                                    <p className="font-medium text-gray-900">{quote.customer?.name}</p>
                                                    <p className="text-gray-600">{quote.customer?.email}</p>
                                                    {quote.customer?.companyName && (
                                                        <p className="text-gray-500 text-sm mt-1">{quote.customer.companyName}</p>
                                                    )}
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <h4 className="text-sm font-medium text-gray-500 mb-2">Quote Summary</h4>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Subtotal</span>
                                                            <span className="font-medium">₹{quote.totalAmount?.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">GST (18%)</span>
                                                            <span className="font-medium">₹{Math.round(quote.totalAmount * 0.18).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between pt-1 border-t border-gray-200">
                                                            <span className="font-semibold text-gray-900">Total</span>
                                                            <span className="font-bold text-gray-900">₹{Math.round(quote.totalAmount * 1.18).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <h4 className="text-sm font-medium text-gray-500 mb-3">Requested Items</h4>
                                            <div className="space-y-2">
                                                {quote.quotationLines?.map((line) => (
                                                    <div key={line.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 bg-gray-200 rounded-lg overflow-hidden">
                                                                {line.product?.imageUrl ? (
                                                                    <img src={line.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{line.product?.name}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    📅 {format(new Date(line.rentalStart), 'MMM dd, yyyy')} → {format(new Date(line.rentalEnd), 'MMM dd, yyyy')}
                                                                </p>
                                                                <p className="text-xs text-gray-400">
                                                                    ₹{line.unitPrice?.toLocaleString()} per rental period
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-gray-500">Qty: <span className="font-medium">{line.quantity}</span></p>
                                                            <p className="font-semibold text-gray-900">₹{line.subtotal?.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Action Bar */}
                                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                                                <button
                                                    onClick={() => handleReject(quote.id)}
                                                    disabled={processing === quote.id}
                                                    className="px-6 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50 font-medium"
                                                >
                                                    {processing === quote.id ? 'Processing...' : '✗ Reject Quote'}
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(quote.id)}
                                                    disabled={processing === quote.id}
                                                    className="px-6 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 font-medium"
                                                >
                                                    {processing === quote.id ? 'Processing...' : '✓ Approve & Create Order'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
