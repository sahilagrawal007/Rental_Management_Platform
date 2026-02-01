import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { productAPI, quotationAPI } from '../../services/api';
import { isAuthenticated } from '../../utils/auth';

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [quantity, setQuantity] = useState(1);

    const [availability, setAvailability] = useState(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await productAPI.getById(id);
                setProduct(res.data);
            } catch (err) {
                setError('Product not found');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const checkAvailability = async () => {
        if (!startDate || !endDate) {
            setError('Please select rental dates');
            return;
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            setError('End date must be after start date');
            return;
        }

        if (start < new Date()) {
            setError('Start date cannot be in the past');
            return;
        }

        setCheckingAvailability(true);
        setError('');
        setAvailability(null);

        try {
            const res = await productAPI.checkAvailability(id, {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                quantity
            });
            setAvailability(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to check availability');
        } finally {
            setCheckingAvailability(false);
        }
    };

    const addToCart = async () => {
        if (!isAuthenticated()) {
            navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
            return;
        }

        if (!availability?.isAvailable) {
            setError('Please check availability first');
            return;
        }

        setAddingToCart(true);
        setError('');

        try {
            const quotationsRes = await quotationAPI.getAll();
            let quotation = quotationsRes.data?.find(q => q.status === 'DRAFT');

            if (!quotation) {
                const newQuotation = await quotationAPI.create();
                quotation = newQuotation.data?.quotation || newQuotation.data;
            }

            await quotationAPI.addItem(quotation.id, {
                productId: id,
                quantity,
                rentalStart: new Date(startDate).toISOString(),
                rentalEnd: new Date(endDate).toISOString()
            });

            navigate('/cart');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add to cart');
        } finally {
            setAddingToCart(false);
        }
    };

    // Format duration for display
    const formatDuration = (duration) => {
        if (!duration) return '';
        if (duration.weeks >= 1) {
            return `${duration.weeks.toFixed(1)} week(s)`;
        } else if (duration.days >= 1) {
            return `${Math.ceil(duration.days)} day(s)`;
        } else {
            return `${Math.ceil(duration.hours)} hour(s)`;
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

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Navbar />
                <main className="flex-1 flex items-center justify-center pt-16">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
                        <button onClick={() => navigate('/explore')} className="btn-primary">
                            Browse Products
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />

            <main className="flex-1 pt-16 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Image */}
                        <div>
                            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <div>
                            <span className="badge badge-category mb-3">Electronics</span>
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

                            {/* Vendor */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-[#e86a45]/10 rounded-full flex items-center justify-center">
                                    <span className="text-[#e86a45] font-medium">{product.vendor?.name?.charAt(0) || 'V'}</span>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{product.vendor?.name || 'Vendor'}</p>
                                    <div className="flex items-center gap-1">
                                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="text-sm text-gray-600">4.8 (24 reviews)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Rental Pricing</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {product.pricePerHour && (
                                        <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
                                            <p className="text-2xl font-bold text-gray-900">₹{product.pricePerHour}</p>
                                            <p className="text-sm text-gray-500">per hour</p>
                                        </div>
                                    )}
                                    {product.pricePerDay && (
                                        <div className="text-center p-4 bg-white rounded-xl border-2 border-[#e86a45]">
                                            <p className="text-2xl font-bold text-[#e86a45]">₹{product.pricePerDay}</p>
                                            <p className="text-sm text-[#e86a45]">per day</p>
                                        </div>
                                    )}
                                    {product.pricePerWeek && (
                                        <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
                                            <p className="text-2xl font-bold text-gray-900">₹{product.pricePerWeek}</p>
                                            <p className="text-sm text-gray-500">per week</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rental Form */}
                            <div className="bg-gray-50 rounded-2xl p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Book This Item</h3>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="input-label">Start Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value); setAvailability(null); }}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">End Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={endDate}
                                            onChange={(e) => { setEndDate(e.target.value); setAvailability(null); }}
                                            className="input-field"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="input-label">Quantity</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => { setQuantity(Math.max(1, quantity - 1)); setAvailability(null); }}
                                            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                        >
                                            -
                                        </button>
                                        <span className="text-xl font-medium w-12 text-center">{quantity}</span>
                                        <button
                                            onClick={() => { setQuantity(Math.min(product.quantityOnHand, quantity + 1)); setAvailability(null); }}
                                            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                        >
                                            +
                                        </button>
                                        <span className="text-gray-500 text-sm">{product.quantityOnHand} available</span>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                                        {error}
                                    </div>
                                )}

                                {availability && (
                                    <div className={`p-4 rounded-xl mb-4 ${availability.isAvailable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                        {availability.isAvailable ? (
                                            <div>
                                                <p className="font-medium text-green-700 mb-2">✓ Available for your dates!</p>
                                                <div className="text-sm text-green-600">
                                                    <p>Total: <span className="font-bold text-lg">₹{availability.pricing?.totalPrice?.toLocaleString() || 0}</span></p>
                                                    <p>{formatDuration(availability.pricing?.duration)} × ₹{availability.pricing?.unitPrice || 0} ({availability.pricing?.pricingType || 'N/A'})</p>
                                                    <p className="text-xs mt-1">{availability.availableQuantity} of {availability.totalQuantity} available</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-red-700 font-medium">Not available for selected dates</p>
                                                <p className="text-sm text-red-600">Only {availability.availableQuantity} available, you requested {availability.requestedQuantity}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={checkAvailability}
                                        disabled={checkingAvailability || !startDate || !endDate}
                                        className="flex-1 btn-secondary justify-center disabled:opacity-50"
                                    >
                                        {checkingAvailability ? 'Checking...' : 'Check Availability'}
                                    </button>
                                    <button
                                        onClick={addToCart}
                                        disabled={addingToCart || !availability?.isAvailable}
                                        className="flex-1 btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {addingToCart ? 'Adding...' : 'Add to Cart'}
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mt-6">
                                <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                                <p className="text-gray-600">{product.description || 'No description available.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
