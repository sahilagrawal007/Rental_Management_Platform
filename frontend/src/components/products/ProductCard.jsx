import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
    return (
        <Link to={`/products/${product.id}`} className="product-card block">
            {/* Image */}
            <div className="aspect-[4/3] bg-gray-100 relative">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* New badge */}
                {product.isNew && (
                    <span className="absolute top-3 left-3 badge badge-new">New</span>
                )}

                {/* Favorite button */}
                <button
                    onClick={(e) => { e.preventDefault(); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Category tag */}
                <span className="badge badge-category mb-2">Electronics</span>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{product.name}</h3>

                {/* Vendor */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {product.vendor?.name?.charAt(0) || 'V'}
                    </div>
                    <span className="text-sm text-gray-500">{product.vendor?.name || 'Vendor'}</span>
                    <div className="flex items-center ml-auto">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm text-gray-500 ml-1">4.8</span>
                    </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">₹{product.pricePerDay?.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">/ day</span>
                </div>
            </div>
        </Link>
    );
}
