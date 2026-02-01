import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { quotationAPI } from '../../services/api';

const statusConfig = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: '📝' },
    SENT: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
    CONFIRMED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: '✓' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: '✗' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: '⊘' },
};

export default function QuotationsPage() {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [expandedQuote, setExpandedQuote] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [toast, setToast] = useState(null);

    const fetchQuotations = async () => {
        try {
            const res = await quotationAPI.getAll();
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

    const cancelQuotation = async (quoteId) => {
        if (!confirm('Are you sure you want to cancel this quotation?')) return;

        setCancelling(quoteId);
        try {
            await quotationAPI.cancel(quoteId);
            setToast({ type: 'success', message: 'Quotation cancelled successfully' });
            await fetchQuotations();
        } catch (err) {
            setToast({ type: 'error', message: err.response?.data?.error || 'Failed to cancel quotation' });
        } finally {
            setCancelling(null);
        }
    };

    const filteredQuotations = quotations.filter(q => {
        if (filter === 'ALL') return true;
        return q.status === filter;
    });

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
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Quotations</h1>
                        <p className="text-gray-500">Track your quote requests and their approval status</p>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {['ALL', 'DRAFT', 'SENT', 'CONFIRMED', 'REJECTED', 'CANCELLED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === status
                                    ? 'bg-[#e86a45] text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {status === 'ALL' ? 'All' : statusConfig[status]?.label || status}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {filteredQuotations.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No quotations found</h2>
                            <p className="text-gray-500 mb-6">Start by adding products to your cart</p>
                            <button onClick={() => navigate('/explore')} className="btn-primary">
                                Browse Products
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredQuotations.map((quote) => {
                                const config = statusConfig[quote.status] || statusConfig.DRAFT;
                                return (
                                    <div key={quote.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                        <div
                                            className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#e86a45]/10 rounded-xl flex items-center justify-center text-2xl">
                                                        {config.icon}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">
                                                            Quote #{quote.id.slice(-6).toUpperCase()}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">
                                                            {format(new Date(quote.createdAt), 'MMM dd, yyyy HH:mm')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                                                        {config.label}
                                                    </span>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        ₹{quote.totalAmount?.toLocaleString()}
                                                    </p>
                                                    <svg
                                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedQuote === quote.id ? 'rotate-180' : ''
                                                            }`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {expandedQuote === quote.id && (
                                            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                                                {/* Status message */}
                                                {quote.status === 'SENT' && (
                                                    <div className="bg-amber-50 rounded-xl p-4 mb-4 flex justify-between items-start">
                                                        <div>
                                                            <p className="text-amber-700 text-sm">
                                                                ⏳ Your quote is pending vendor approval. You'll be notified once they respond.
                                                            </p>
                                                            <p className="text-amber-600 text-xs mt-1">
                                                                You can cancel this quote if you change your mind.
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                cancelQuotation(quote.id);
                                                            }}
                                                            disabled={cancelling === quote.id}
                                                            className="ml-4 px-4 py-2 text-sm bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
                                                        >
                                                            {cancelling === quote.id ? 'Cancelling...' : '❌ Cancel Quote'}
                                                        </button>
                                                    </div>
                                                )}
                                                {quote.status === 'CANCELLED' && (
                                                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                                        <p className="text-gray-600 text-sm">
                                                            ⊘ You cancelled this quotation.
                                                        </p>
                                                    </div>
                                                )}
                                                {quote.status === 'CONFIRMED' && (
                                                    <div className="bg-green-50 rounded-xl p-4 mb-4">
                                                        <p className="text-green-700 text-sm">
                                                            ✓ Your quote has been approved! Check your orders for details.
                                                        </p>
                                                        <button
                                                            onClick={() => navigate('/orders')}
                                                            className="mt-2 text-green-700 font-medium hover:underline text-sm"
                                                        >
                                                            View Order →
                                                        </button>
                                                    </div>
                                                )}
                                                {quote.status === 'REJECTED' && (
                                                    <div className="bg-red-50 rounded-xl p-4 mb-4">
                                                        <p className="text-red-700 text-sm">
                                                            ✗ Unfortunately, your quote was rejected by the vendor.
                                                        </p>
                                                    </div>
                                                )}
                                                {quote.status === 'DRAFT' && (
                                                    <div className="bg-gray-50 rounded-xl p-4 mb-4 flex justify-between items-center">
                                                        <p className="text-gray-700 text-sm">
                                                            📝 This quote is still in your cart. Submit it to request vendor approval.
                                                        </p>
                                                        <button
                                                            onClick={() => navigate('/cart')}
                                                            className="btn-primary text-sm py-2"
                                                        >
                                                            Go to Cart
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Items */}
                                                <h4 className="text-sm font-medium text-gray-500 mb-3">Items ({quote.quotationLines?.length || 0})</h4>
                                                <div className="space-y-2">
                                                    {quote.quotationLines?.map((line) => (
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
                                                                        {format(new Date(line.rentalStart), 'MMM dd')} - {format(new Date(line.rentalEnd), 'MMM dd, yyyy')}
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

                                                {/* Price Breakdown */}
                                                <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 rounded-xl p-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600">Subtotal</span>
                                                            <span className="font-medium text-gray-900">₹{quote.totalAmount?.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-sm text-green-600">
                                                            <span>GST (18%)</span>
                                                            <span className="font-medium">₹{Math.round((quote.totalAmount || 0) * 0.18).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                            <span>Total Amount</span>
                                                            <span className="text-lg">₹{Math.round((quote.totalAmount || 0) * 1.18).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
