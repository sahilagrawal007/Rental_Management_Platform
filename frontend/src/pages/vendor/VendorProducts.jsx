import { useState, useEffect } from 'react';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { productAPI } from '../../services/api';

export default function VendorProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        quantityOnHand: 1,
        pricePerHour: '',
        pricePerDay: '',
        pricePerWeek: '',
        imageUrl: ''
    });

    const fetchProducts = async () => {
        try {
            const res = await productAPI.getMyProducts();
            setProducts(res.data || []);
        } catch (err) {
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const resetForm = () => {
        setForm({
            name: '',
            description: '',
            quantityOnHand: 1,
            pricePerHour: '',
            pricePerDay: '',
            pricePerWeek: '',
            imageUrl: ''
        });
        setEditingProduct(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name,
            description: product.description || '',
            quantityOnHand: product.quantityOnHand,
            pricePerHour: product.pricePerHour || '',
            pricePerDay: product.pricePerDay || '',
            pricePerWeek: product.pricePerWeek || '',
            imageUrl: product.imageUrl || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            if (editingProduct) {
                await productAPI.update(editingProduct.id, form);
            } else {
                await productAPI.create(form);
            }
            setShowModal(false);
            resetForm();
            fetchProducts();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const togglePublish = async (product) => {
        try {
            await productAPI.togglePublish(product.id, !product.isPublished);
            fetchProducts();
        } catch (err) {
            setError('Failed to update');
        }
    };

    const deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await productAPI.delete(id);
            fetchProducts();
        } catch (err) {
            setError('Failed to delete');
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

            <main className="flex-1 pt-16 pb-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Products</h1>
                            <p className="text-gray-500">{products.length} products listed</p>
                        </div>
                        <button onClick={openAddModal} className="btn-primary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Product
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {products.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h2>
                            <p className="text-gray-500 mb-6">Start by adding your first product</p>
                            <button onClick={openAddModal} className="btn-primary">
                                Add Your First Product
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                    <div className="aspect-video bg-gray-100 relative">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                                        )}
                                        <span className={`absolute top-3 right-3 badge ${product.isPublished ? 'status-confirmed' : 'bg-gray-100 text-gray-600'}`}>
                                            {product.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                                        <p className="text-sm text-gray-500 mb-3">{product.quantityOnHand} available</p>
                                        <div className="flex gap-2 text-sm mb-4">
                                            {product.pricePerDay && <span className="bg-[#e86a45]/10 text-[#e86a45] px-2 py-1 rounded">₹{product.pricePerDay}/day</span>}
                                            {product.pricePerWeek && <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">₹{product.pricePerWeek}/week</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditModal(product)} className="flex-1 btn-secondary py-2 justify-center text-sm">Edit</button>
                                            <button
                                                onClick={() => togglePublish(product)}
                                                className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${product.isPublished ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                            >
                                                {product.isPublished ? 'Unpublish' : 'Publish'}
                                            </button>
                                            <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full my-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="input-label">Product Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    className="input-field"
                                    placeholder="Sony A7 IV Camera"
                                />
                            </div>

                            <div>
                                <label className="input-label">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="input-field h-24 resize-none"
                                    placeholder="Describe your product..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">Quantity *</label>
                                    <input
                                        type="number"
                                        value={form.quantityOnHand}
                                        onChange={(e) => setForm(prev => ({ ...prev, quantityOnHand: parseInt(e.target.value) || 1 }))}
                                        min="1"
                                        required
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="input-label">Image URL</label>
                                    <input
                                        type="url"
                                        value={form.imageUrl}
                                        onChange={(e) => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                                        className="input-field"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="input-label">Price/Hour</label>
                                    <input
                                        type="number"
                                        value={form.pricePerHour}
                                        onChange={(e) => setForm(prev => ({ ...prev, pricePerHour: e.target.value }))}
                                        className="input-field"
                                        placeholder="₹500"
                                    />
                                </div>
                                <div>
                                    <label className="input-label">Price/Day</label>
                                    <input
                                        type="number"
                                        value={form.pricePerDay}
                                        onChange={(e) => setForm(prev => ({ ...prev, pricePerDay: e.target.value }))}
                                        className="input-field"
                                        placeholder="₹2000"
                                    />
                                </div>
                                <div>
                                    <label className="input-label">Price/Week</label>
                                    <input
                                        type="number"
                                        value={form.pricePerWeek}
                                        onChange={(e) => setForm(prev => ({ ...prev, pricePerWeek: e.target.value }))}
                                        className="input-field"
                                        placeholder="₹10000"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); setError(''); }}
                                    className="flex-1 btn-secondary justify-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 btn-primary justify-center"
                                >
                                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
