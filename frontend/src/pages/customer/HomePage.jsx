import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProductCard from '../../components/products/ProductCard';
import { productAPI } from '../../services/api';

const categories = [
    { name: 'Cameras', icon: '📷', color: 'bg-orange-50' },
    { name: 'Furniture', icon: '🛋️', color: 'bg-blue-50' },
    { name: 'Electronics', icon: '💻', color: 'bg-purple-50' },
    { name: 'Events', icon: '🎪', color: 'bg-pink-50' },
    { name: 'Tools', icon: '🔧', color: 'bg-green-50' },
    { name: 'Sports', icon: '⚽', color: 'bg-yellow-50' },
    { name: 'Audio', icon: '🎧', color: 'bg-red-50' },
    { name: 'Gaming', icon: '🎮', color: 'bg-indigo-50' },
];

const steps = [
    { step: '01', title: 'Discover', desc: 'Browse through our wide selection of rental products' },
    { step: '02', title: 'Book', desc: 'Select your dates and complete your booking' },
    { step: '03', title: 'Receive', desc: 'Get your items delivered or pick them up' },
    { step: '04', title: 'Return', desc: 'Return items when done, hassle-free' },
];

export default function HomePage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await productAPI.getAll();
                setProducts(res.data?.slice(0, 8) || []);
            } catch (err) {
                console.error('Failed to fetch products');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate('/explore');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />

            <main className="flex-1 pt-16">
                {/* Hero Section - Dark with camera background */}
                <section className="relative bg-[#1a1a1a] text-white overflow-hidden">
                    {/* Background image */}
                    <div className="absolute inset-0">
                        <img
                            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1920&q=80"
                            alt="Camera"
                            className="w-full h-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a]/80 to-[#1a1a1a]/40"></div>
                    </div>

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
                        <div className="max-w-2xl">
                            <p className="text-[#e86a45] font-medium mb-4 uppercase tracking-wide text-sm">Premium Rental Marketplace</p>
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                Rent anything,<br />anytime
                            </h1>
                            <p className="text-gray-300 text-lg mb-8 max-w-lg">
                                Discover thousands of products available for rent from verified vendors. From cameras to furniture, find what you need.
                            </p>

                            {/* Search Bar */}
                            <form onSubmit={handleSearch} className="flex bg-white rounded-lg p-1.5 max-w-xl">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products to rent..."
                                    className="flex-1 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none rounded-l-md"
                                />
                                <button type="submit" className="btn-primary rounded-md px-6">
                                    Search
                                </button>
                            </form>
                        </div>
                    </div>
                </section>

                {/* Categories Section - White background */}
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse Categories</h2>
                        <p className="text-gray-500 mb-8">Find exactly what you need</p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                            {categories.map((cat) => (
                                <Link
                                    key={cat.name}
                                    to={`/explore?category=${cat.name}`}
                                    className={`${cat.color} rounded-2xl p-4 text-center hover:shadow-md transition-shadow`}
                                >
                                    <span className="text-3xl block mb-2">{cat.icon}</span>
                                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Featured Products - White background */}
                <section className="py-16 bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Products</h2>
                                <p className="text-gray-500">Popular items from our vendors</p>
                            </div>
                            <Link to="/explore" className="text-[#e86a45] hover:underline font-medium">
                                View All →
                            </Link>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl animate-pulse">
                                        <div className="aspect-[4/3] bg-gray-200"></div>
                                        <div className="p-4 space-y-3">
                                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl">
                                <p className="text-gray-500">No products available yet</p>
                                <Link to="/signup?role=vendor" className="text-[#e86a45] hover:underline mt-2 inline-block">
                                    Become a vendor and list products →
                                </Link>
                            </div>
                        )}
                    </div>
                </section>

                {/* How It Works - White background */}
                <section className="py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">How It Works</h2>
                            <p className="text-gray-500">Simple steps to start renting</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            {steps.map((item, idx) => (
                                <div key={idx} className="text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-[#e86a45] mx-auto mb-4">
                                        {item.step}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Vendor CTA - Dark background */}
                <section className="bg-[#1a1a1a] text-white py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h2 className="text-3xl font-bold mb-4">Start Earning Today</h2>
                                <p className="text-gray-400 max-w-lg">
                                    List your equipment on Rentic and start earning. Join thousands of vendors already making money from their rentals.
                                </p>
                            </div>
                            <Link to="/signup?role=vendor" className="btn-primary whitespace-nowrap">
                                Become a Vendor →
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
