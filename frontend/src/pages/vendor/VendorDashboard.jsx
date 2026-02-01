import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { productAPI, orderAPI, quotationAPI } from '../../services/api';
import { getUser } from '../../utils/auth';

export default function VendorDashboard() {
    const user = getUser();
    const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, pendingQuotes: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, ordersRes, quotesRes] = await Promise.all([
                    productAPI.getMyProducts(),
                    orderAPI.getAll(),
                    quotationAPI.getVendorPending()
                ]);

                const products = productsRes.data || [];
                const orders = ordersRes.data || [];
                const pendingQuotes = quotesRes.data || [];
                const revenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

                setStats({
                    products: products.length,
                    orders: orders.length,
                    revenue,
                    pendingQuotes: pendingQuotes.length
                });

                setRecentOrders(orders.slice(0, 5));
            } catch (err) {
                console.error('Dashboard load failed:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}!</h1>
                        <p className="text-gray-500">Here's what's happening with your rentals today</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#e86a45]/10 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#e86a45]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-900">{stats.products}</p>
                                    <p className="text-gray-500">Products Listed</p>
                                </div>
                            </div>
                        </div>

                        <Link to="/vendor/quotations" className="bg-amber-50 rounded-2xl p-6 border border-amber-200 hover:shadow-lg transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                                    📨
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-amber-700">{stats.pendingQuotes}</p>
                                    <p className="text-amber-600">Pending Quotes</p>
                                </div>
                            </div>
                        </Link>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-900">{stats.orders}</p>
                                    <p className="text-gray-500">Total Orders</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-900">₹{stats.revenue.toLocaleString()}</p>
                                    <p className="text-gray-500">Total Revenue</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <Link to="/vendor/products" className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow flex items-center gap-4 border border-gray-100">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Add Product</p>
                                <p className="text-sm text-gray-500">List new item</p>
                            </div>
                        </Link>

                        <Link to="/vendor/quotations" className="bg-amber-50 rounded-2xl p-6 hover:shadow-lg transition-shadow flex items-center gap-4 border border-amber-200">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">📨</div>
                            <div>
                                <p className="font-semibold text-amber-700">Review Quotes</p>
                                <p className="text-sm text-amber-600">{stats.pendingQuotes} pending</p>
                            </div>
                        </Link>

                        <Link to="/vendor/products" className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow flex items-center gap-4 border border-gray-100">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">📦</div>
                            <div>
                                <p className="font-semibold text-gray-900">Manage Products</p>
                                <p className="text-sm text-gray-500">Edit listings</p>
                            </div>
                        </Link>

                        <Link to="/vendor/orders" className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow flex items-center gap-4 border border-gray-100">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">📋</div>
                            <div>
                                <p className="font-semibold text-gray-900">View Orders</p>
                                <p className="text-sm text-gray-500">See rentals</p>
                            </div>
                        </Link>
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                            <Link to="/vendor/orders" className="text-[#e86a45] hover:underline text-sm font-medium">
                                View All →
                            </Link>
                        </div>

                        {recentOrders.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No orders yet</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map((order) => (
                                            <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="py-4 px-4 font-medium text-gray-900">#{order.id.slice(-8).toUpperCase()}</td>
                                                <td className="py-4 px-4 text-gray-600">{order.customer?.name || 'Customer'}</td>
                                                <td className="py-4 px-4 text-gray-500">{format(new Date(order.createdAt), 'MMM dd')}</td>
                                                <td className="py-4 px-4">
                                                    <span className={`badge status-${order.status.toLowerCase()}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-right font-semibold text-gray-900">₹{order.totalAmount?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
