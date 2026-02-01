import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { orderAPI } from '../../services/api';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedOrder, setExpandedOrder] = useState(null);

    const fetchOrders = async () => {
        try {
            const res = await orderAPI.getAll();
            setOrders(res.data);
        } catch (err) {
            setError('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {orders.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
                            <p className="text-gray-500">Start shopping to see your orders here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <div key={order.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                    <div
                                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-gray-900">Order #{order.id.slice(-8).toUpperCase()}</h3>
                                                    <span className={`badge status-${order.status.toLowerCase()}`}>{order.status}</span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {format(new Date(order.createdAt), 'MMM dd, yyyy')} · {order.orderLines?.length || 0} items
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="text-xl font-bold text-gray-900">₹{order.totalAmount?.toLocaleString()}</p>
                                                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {expandedOrder === order.id && (
                                        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                                            {/* Delivery Address */}
                                            <div className="bg-blue-50 rounded-xl p-4 mb-4">
                                                <p className="text-sm font-medium text-blue-700 mb-1">📍 Delivery Address</p>
                                                <p className="text-blue-900">{order.deliveryAddress || 'Not specified'}</p>
                                            </div>

                                            {/* Order Items */}
                                            <h4 className="text-sm font-medium text-gray-500 mb-3">Order Items</h4>
                                            <div className="space-y-2 mb-4">
                                                {order.orderLines?.map((line) => (
                                                    <div key={line.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden">
                                                                {line.product?.imageUrl ? (
                                                                    <img src={line.product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{line.product?.name}</p>
                                                                <p className="text-xs text-gray-500">Qty: {line.quantity}</p>
                                                            </div>
                                                        </div>
                                                        <p className="font-medium text-gray-900">₹{line.subtotal?.toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Price Breakdown */}
                                            <div className="bg-gray-50 rounded-xl p-4">
                                                <h4 className="text-sm font-medium text-gray-700 mb-3">Price Breakdown</h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Subtotal</span>
                                                        <span className="font-medium text-gray-900">₹{order.totalAmount?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm text-green-600">
                                                        <span>GST (18%)</span>
                                                        <span className="font-medium">₹{Math.round((order.totalAmount || 0) * 0.18).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                                                        <span>Grand Total</span>
                                                        <span className="text-lg">₹{Math.round((order.totalAmount || 0) * 1.18).toLocaleString()}</span>
                                                    </div>
                                                </div>
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
