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

    const handleDownloadPdf = (invoiceId, invoiceNumber) => {
        const token = localStorage.getItem('token');
        const url = `/api/invoices/${invoiceId}/pdf`;

        fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `${invoiceNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch(() => {
                alert('Failed to download PDF');
            });
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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">My Invoices</h1>
                    <p className="text-gray-500 mb-8">View your rental invoices and payment status</p>

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
                            <p className="text-gray-500">Invoices will appear here after your orders are approved</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                        invoice.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' :
                                                            invoice.status === 'SENT' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                                            </p>
                                            {invoice.order?.vendor && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Vendor: {invoice.order.vendor.companyName || invoice.order.vendor.name}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500">Total</p>
                                                <p className="font-bold text-gray-900">₹{invoice.totalAmount?.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500">Paid</p>
                                                <p className="font-bold text-green-600">₹{invoice.amountPaid?.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500">Balance</p>
                                                <p className={`font-bold ${invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    ₹{invoice.balance?.toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                {/* Download PDF Button */}
                                                <button
                                                    onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                                                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                                                    title="Download PDF"
                                                >
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-gray-700">PDF</span>
                                                </button>

                                                {/* Status Badge */}
                                                {invoice.status === 'PAID' ? (
                                                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Paid
                                                    </span>
                                                ) : invoice.status === 'PARTIAL' ? (
                                                    <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                                        Partially Paid
                                                    </span>
                                                ) : invoice.status === 'DRAFT' ? (
                                                    <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                                                        Awaiting Vendor
                                                    </span>
                                                ) : (
                                                    <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                                                        Pending Payment
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment History (Read Only) */}
                                    {invoice.payments?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Payment History</p>
                                            <div className="space-y-1">
                                                {invoice.payments.map((p) => (
                                                    <div key={p.id} className="flex justify-between text-sm">
                                                        <span className="text-gray-500">
                                                            {format(new Date(p.paidAt), 'MMM dd, yyyy HH:mm')} - {p.paymentMethod}
                                                            {p.transactionId && <span className="text-gray-400 ml-2">({p.transactionId})</span>}
                                                        </span>
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
