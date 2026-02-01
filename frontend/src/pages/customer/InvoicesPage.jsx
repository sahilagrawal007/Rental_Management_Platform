import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { invoiceAPI } from '../../services/api';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchInvoices = async () => {
        try {
            const res = await invoiceAPI.getAll();
            setInvoices(res.data);
        } catch (err) {
            setError('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">My Invoices</h1>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {invoices.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                            <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">No invoices yet</h2>
                            <p className="text-gray-500">Invoices will appear here after you place orders</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="bg-white rounded-2xl p-6 border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
                                                <span className={`badge ${invoice.status === 'PAID' ? 'status-confirmed' : invoice.status === 'PARTIAL' ? 'status-pending' : 'bg-gray-100 text-gray-700'}`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="text-center">
                                                <p className="text-sm text-gray-500">Total</p>
                                                <p className="font-bold text-gray-900">₹{invoice.totalAmount?.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-gray-500">Paid</p>
                                                <p className="font-bold text-green-600">₹{invoice.amountPaid?.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-gray-500">Balance</p>
                                                <p className={`font-bold ${invoice.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                    ₹{invoice.balance?.toLocaleString()}
                                                </p>
                                            </div>

                                            {/* Status indicator instead of pay button */}
                                            {invoice.status === 'PAID' ? (
                                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                                    ✓ Paid
                                                </span>
                                            ) : (
                                                <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                                                    Pending Payment
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {invoice.payments?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Payment History</p>
                                            <div className="space-y-1">
                                                {invoice.payments.map((p) => (
                                                    <div key={p.id} className="flex justify-between text-sm">
                                                        <span className="text-gray-500">{format(new Date(p.paidAt), 'MMM dd, yyyy')} - {p.paymentMethod}</span>
                                                        <span className="text-green-600 font-medium">₹{p.amount?.toLocaleString()}</span>
                                                    </div>
                                                ))}
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
