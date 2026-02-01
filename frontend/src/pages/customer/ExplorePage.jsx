import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import ProductCard from '../../components/products/ProductCard';
import { productAPI } from '../../services/api';

const categories = [
    { name: 'All', icon: '🏠' },
    { name: 'Cameras', icon: '📷' },
    { name: 'Electronics', icon: '💻' },
    { name: 'Furniture', icon: '🛋️' },
    { name: 'Events', icon: '🎪' },
    { name: 'Tools', icon: '🔧' },
    { name: 'Sports', icon: '⚽' },
    { name: 'Audio', icon: '🎧' },
];

export default function ExplorePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [category, setCategory] = useState(searchParams.get('category') || 'All');
    const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

    const fetchProducts = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (search) params.search = search;
            if (minPrice) params.minPrice = minPrice;
            if (maxPrice) params.maxPrice = maxPrice;

            const res = await productAPI.getAll(params);
            setProducts(res.data || []);
        } catch (err) {
            setError('Failed to load products. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category !== 'All') params.set('category', category);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        setSearchParams(params);
        fetchProducts();
    };

    const clearFilters = () => {
        setSearch('');
        setCategory('All');
        setMinPrice('');
        setMaxPrice('');
        setSearchParams({});
        fetchProducts();
    };

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Navbar />

            <main className="flex-1 pt-16">
                {/* Header */}
                <div className="bg-white border-b border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Products</h1>
                        <p className="text-gray-500">Discover equipment from verified vendors</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
                            {/* Search */}
                            <div className="flex-1 min-w-[200px]">
                                <label className="input-label">Search</label>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search cameras, drones, equipment..."
                                    className="input-field"
                                />
                            </div>

                            {/* Min Price */}
                            <div className="w-32">
                                <label className="input-label">Min Price</label>
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    placeholder="₹0"
                                    className="input-field"
                                />
                            </div>

                            {/* Max Price */}
                            <div className="w-32">
                                <label className="input-label">Max Price</label>
                                <input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    placeholder="₹10000"
                                    className="input-field"
                                />
                            </div>

                            <button type="submit" className="btn-primary">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search
                            </button>

                            <button type="button" onClick={clearFilters} className="btn-secondary">
                                Clear
                            </button>
                        </form>
                    </div>
                </div>

                {/* Categories */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => {
                                    setCategory(cat.name);
                                    if (cat.name !== 'All') {
                                        setSearchParams({ category: cat.name });
                                    } else {
                                        searchParams.delete('category');
                                        setSearchParams(searchParams);
                                    }
                                }}
                                className={`category-pill ${category === cat.name ? 'active' : ''}`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    {error ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                            <p className="text-red-700">{error}</p>
                            <button onClick={fetchProducts} className="btn-primary mt-4">
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-gray-500">
                                    {loading ? 'Loading...' : `${products.length} products found`}
                                </p>
                                <select className="input-field w-auto">
                                    <option>Most Popular</option>
                                    <option>Price: Low to High</option>
                                    <option>Price: High to Low</option>
                                    <option>Newest</option>
                                </select>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="bg-white rounded-2xl border border-gray-100 animate-pulse">
                                            <div className="aspect-[4/3] bg-gray-100"></div>
                                            <div className="p-4 space-y-3">
                                                <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                                                <div className="h-4 bg-gray-100 rounded w-full"></div>
                                                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
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
                                <div className="text-center py-16 bg-gray-50 rounded-2xl">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                                    <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                                    <button onClick={clearFilters} className="btn-primary">
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
