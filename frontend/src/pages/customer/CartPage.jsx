import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { quotationAPI } from '../../services/api';

export default function CartPage() {
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingItem, setUpdatingItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');

    const fetchCart = async () => {
        try {
            const res = await quotationAPI.getAll();
            // Find a DRAFT quotation (cart)
            const draft = res.data?.find(q => q.status === 'DRAFT');
            if (draft) {
                const details = await quotationAPI.getById(draft.id);
                setQuotation(details.data);
            } else {
                setQuotation(null);
            }
        } catch (err) {
            setError('Failed to load cart');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const updateQuantity = async (lineId, newQty) => {
        if (newQty < 1) return;
        setUpdatingItem(lineId);
        try {
            await quotationAPI.updateItem(quotation.id, lineId, { quantity: newQty });
            await fetchCart();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update');
        } finally {
            setUpdatingItem(null);
        }
    };

    const removeItem = async (lineId) => {
        setUpdatingItem(lineId);
        try {
            await quotationAPI.removeItem(quotation.id, lineId);
            await fetchCart();
        } catch (err) {
            setError('Failed to remove item');
        } finally {
            setUpdatingItem(null);
        }
    };

    const handleRequestQuote = () => {
        if (!quotation?.id) {
            setError('No quotation found. Please add items to your cart first.');
            return;
        }
        setShowAddressModal(true);
    };

    const submitQuote = async () => {
        if (!deliveryAddress.trim()) {
            setError('Please enter a delivery address');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            console.log('Submitting quotation:', quotation.id);
            const res = await quotationAPI.submit(quotation.id, { deliveryAddress });
            console.log('Submit response:', res.data);

            // Handle multi-vendor response
            const vendorCount = res.data.vendorCount || 1;
            const message = res.data.message || `Quote${vendorCount > 1 ? 's' : ''} sent to ${vendorCount} vendor${vendorCount > 1 ? 's' : ''}!`;

            setShowAddressModal(false);
            setDeliveryAddress('');
            setToast({
                type: 'success',
                message: message
            });
            // Refresh cart (should now show SENT status or empty)
            await fetchCart();
            // Navigate to quotations page after 2 seconds
            setTimeout(() => {
                navigate('/quotations');
            }, 2000);
        } catch (err) {
            console.error('Submit error:', err);
            console.error('Error response:', err.response?.data);
            setError(err.response?.data?.error || err.message || 'Failed to submit quote');
        } finally {
            setSubmitting(false);
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

    const hasItems = quotation?.quotationLines?.length > 0;

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

            {/* Delivery Address Modal */}
            {showAddressModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Address</h2>
                        <p className="text-gray-500 mb-6">Where should the rental items be delivered?</p>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                                {error}
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Address *
                            </label>
                            <textarea
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                placeholder="Enter your complete delivery address including city, state, and pincode"
                                rows={4}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#e86a45] focus:border-transparent resize-none"
                            />
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Items</span>
                                <span className="font-medium">{quotation?.quotationLines?.length || 0} products</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">₹{quotation?.totalAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2 text-green-600">
                                <span>GST (18%)</span>
                                <span className="font-medium">₹{Math.round((quotation?.totalAmount || 0) * 0.18).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                                <span>Total Amount</span>
                                <span>₹{Math.round((quotation?.totalAmount || 0) * 1.18).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddressModal(false);
                                    setError('');
                                }}
                                className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitQuote}
                                disabled={submitting || !deliveryAddress.trim()}
                                className="flex-1 btn-primary justify-center disabled:opacity-50"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </span>
                                ) : (
                                    '📨 Submit Quote'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 pt-16 pb-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

                    {error && !showAddressModal && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {!hasItems ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
                            <p className="text-gray-500 mb-6">Browse our products and add items to get started</p>
                            <button onClick={() => navigate('/explore')} className="btn-primary">
                                Explore Products
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Cart Items */}
                            <div className="lg:col-span-2 space-y-4">
                                {quotation.quotationLines.map((line) => (
                                    <div key={line.id} className="bg-white rounded-2xl p-6 flex gap-4 border border-gray-100">
                                        <div className="w-24 h-24 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                                            {line.product?.imageUrl ? (
                                                <img src={line.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">📦</div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{line.product?.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {format(new Date(line.rentalStart), 'MMM dd, yyyy')} → {format(new Date(line.rentalEnd), 'MMM dd, yyyy')}
                                            </p>
                                            <p className="text-sm text-gray-400">₹{line.unitPrice}/rental period</p>
                                            {line.product?.vendor && (
                                                <p className="text-xs text-[#e86a45] mt-1">by {line.product.vendor.name}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(line.id, line.quantity - 1)}
                                                disabled={updatingItem === line.id || line.quantity <= 1}
                                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-medium">{line.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(line.id, line.quantity + 1)}
                                                disabled={updatingItem === line.id}
                                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">₹{line.subtotal?.toLocaleString()}</p>
                                            <button
                                                onClick={() => removeItem(line.id)}
                                                disabled={updatingItem === line.id}
                                                className="text-sm text-red-500 hover:text-red-600 mt-2"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Order Summary */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-2xl p-6 sticky top-24 border border-gray-100">
                                    <h3 className="font-semibold text-gray-900 mb-4">Quote Summary</h3>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span className="font-medium">₹{quotation.totalAmount?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600">
                                            <span>GST (18%)</span>
                                            <span className="font-medium">₹{Math.round(quotation.totalAmount * 0.18).toLocaleString()}</span>
                                        </div>
                                        <hr className="border-gray-100" />
                                        <div className="flex justify-between text-lg font-bold text-gray-900">
                                            <span>Total Amount</span>
                                            <span>₹{Math.round(quotation.totalAmount * 1.18).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 rounded-xl p-4 mb-4">
                                        <p className="text-sm text-amber-700">
                                            <strong>Note:</strong> This is a quote request. The vendor will review and approve your order.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleRequestQuote}
                                        disabled={submitting}
                                        className="w-full btn-primary justify-center text-center"
                                    >
                                        📨 Request Quote
                                    </button>
                                    <p className="text-xs text-gray-500 text-center mt-3">
                                        Quote will be sent to vendor for approval
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
