import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from './utils/auth';

// Pages
import HomePage from './pages/customer/HomePage';
import ExplorePage from './pages/customer/ExplorePage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import CartPage from './pages/customer/CartPage';
import OrdersPage from './pages/customer/OrdersPage';
import InvoicesPage from './pages/customer/InvoicesPage';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorQuotations from './pages/vendor/VendorQuotations';
import VendorInvoices from './pages/vendor/VendorInvoices';
import QuotationsPage from './pages/customer/QuotationsPage';

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }) {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    const role = getUserRole();
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

// Auth Route - redirect if already logged in
function AuthRoute({ children }) {
    if (isAuthenticated()) {
        const role = getUserRole();
        if (role === 'VENDOR') {
            return <Navigate to="/vendor/dashboard" replace />;
        }
        return <Navigate to="/" replace />;
    }
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/categories" element={<ExplorePage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/become-vendor" element={<SignupPage />} />

                {/* Auth Routes */}
                <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
                <Route path="/signup" element={<AuthRoute><SignupPage /></AuthRoute>} />

                {/* Customer Routes */}
                <Route path="/cart" element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                        <CartPage />
                    </ProtectedRoute>
                } />
                <Route path="/orders" element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                        <OrdersPage />
                    </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                        <InvoicesPage />
                    </ProtectedRoute>
                } />
                <Route path="/quotations" element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                        <QuotationsPage />
                    </ProtectedRoute>
                } />

                {/* Vendor Routes */}
                <Route path="/vendor/dashboard" element={
                    <ProtectedRoute allowedRoles={['VENDOR']}>
                        <VendorDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/vendor/products" element={
                    <ProtectedRoute allowedRoles={['VENDOR']}>
                        <VendorProducts />
                    </ProtectedRoute>
                } />
                <Route path="/vendor/orders" element={
                    <ProtectedRoute allowedRoles={['VENDOR']}>
                        <VendorOrders />
                    </ProtectedRoute>
                } />
                <Route path="/vendor/quotations" element={
                    <ProtectedRoute allowedRoles={['VENDOR']}>
                        <VendorQuotations />
                    </ProtectedRoute>
                } />
                <Route path="/vendor/invoices" element={
                    <ProtectedRoute allowedRoles={['VENDOR']}>
                        <VendorInvoices />
                    </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
