import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { setAuthData } from '../../utils/auth';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

export default function SignupPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const defaultRole = searchParams.get('role')?.toUpperCase() === 'VENDOR' ? 'VENDOR' : 'CUSTOMER';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        gstin: '',
        role: defaultRole
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (formData.role === 'VENDOR' && !formData.gstin) {
            setError('GSTIN is required for vendors');
            return;
        }

        setLoading(true);

        try {
            const res = await authAPI.signup({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                companyName: formData.companyName,
                gstin: formData.gstin,
                role: formData.role
            });

            setAuthData(res.data.token, res.data.user);

            if (res.data.user.role === 'VENDOR') {
                navigate('/vendor/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            <main className="flex-1 flex items-center justify-center pt-16 pb-16 px-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
                            <p className="text-gray-500">Join Rentic and start renting today</p>
                        </div>

                        {/* Role Toggle */}
                        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, role: 'CUSTOMER' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${formData.role === 'CUSTOMER'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Rent Products
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, role: 'VENDOR' }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${formData.role === 'VENDOR'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                List Products
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="input-label">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="John Doe"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="input-label">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                    className="input-field"
                                />
                            </div>

                            {formData.role === 'VENDOR' && (
                                <>
                                    <div>
                                        <label className="input-label">Company Name</label>
                                        <input
                                            type="text"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            placeholder="Your Company Ltd."
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">GSTIN <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="gstin"
                                            value={formData.gstin}
                                            onChange={handleChange}
                                            required={formData.role === 'VENDOR'}
                                            placeholder="22AAAAA0000A1Z5"
                                            className="input-field"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="input-label">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="input-label">Confirm Password</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="input-field"
                                />
                            </div>

                            <div className="flex items-start gap-2">
                                <input type="checkbox" required className="mt-1 rounded border-gray-300 text-[#e86a45] focus:ring-[#e86a45]" />
                                <span className="text-sm text-gray-600">
                                    I agree to the{' '}
                                    <Link to="/terms" className="text-[#e86a45] hover:underline">Terms of Service</Link>
                                    {' '}and{' '}
                                    <Link to="/privacy" className="text-[#e86a45] hover:underline">Privacy Policy</Link>
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary justify-center py-3"
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-gray-600">
                                Already have an account?{' '}
                                <Link to="/login" className="text-[#e86a45] hover:underline font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
