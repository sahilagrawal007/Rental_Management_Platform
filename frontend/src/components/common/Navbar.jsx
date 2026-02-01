import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser, logout, getUserRole } from '../../utils/auth';

export default function Navbar() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated()) {
            setUser(getUser());
        }
    }, []);

    const handleLogout = () => {
        logout();
    };

    const role = getUserRole();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="text-xl font-bold text-gray-900">
                        Rentic
                    </Link>

                    {/* Center Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/explore" className="text-gray-600 hover:text-gray-900 font-medium">
                            Explore
                        </Link>
                        <Link to="/categories" className="text-gray-600 hover:text-gray-900 font-medium">
                            Categories
                        </Link>
                        <Link to="/become-vendor" className="text-gray-600 hover:text-gray-900 font-medium">
                            Become a Vendor
                        </Link>
                    </div>

                    {/* Right Icons */}
                    <div className="hidden md:flex items-center gap-3">
                        <button className="p-2 text-gray-500 hover:text-gray-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                        <button className="p-2 text-gray-500 hover:text-gray-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>

                        {role === 'CUSTOMER' && (
                            <Link to="/cart" className="relative p-2 text-gray-500 hover:text-gray-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#e86a45] rounded-full text-white text-[10px] flex items-center justify-center">2</span>
                            </Link>
                        )}

                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-2 text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        {role === 'VENDOR' && (
                                            <>
                                                <Link to="/vendor/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">Dashboard</Link>
                                                <Link to="/vendor/products" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">My Products</Link>
                                                <Link to="/vendor/quotations" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">📨 Quotations</Link>
                                                <Link to="/vendor/orders" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">Orders</Link>
                                                <Link to="/vendor/invoices" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">💰 Invoices</Link>
                                            </>
                                        )}
                                        {role === 'CUSTOMER' && (
                                            <>
                                                <Link to="/quotations" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">📨 My Quotations</Link>
                                                <Link to="/orders" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">My Orders</Link>
                                                <Link to="/invoices" className="block px-4 py-2 text-gray-700 hover:bg-gray-50">Invoices</Link>
                                            </>
                                        )}
                                        <hr className="my-2" />
                                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login" className="p-2 text-gray-500 hover:text-gray-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-gray-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </nav>
    );
}
