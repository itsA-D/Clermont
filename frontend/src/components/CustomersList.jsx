import { useState, useEffect } from 'react';
import { customersAPI, subscriptionsAPI } from '../api/client';

function CustomersList() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await customersAPI.getAll();
            setCustomers(response.data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async (subscriptionId) => {
        if (!window.confirm('Are you sure you want to deactivate this subscription?')) return;

        try {
            setCancellingId(subscriptionId);
            await subscriptionsAPI.cancel(subscriptionId);
            await fetchCustomers(); // Refresh list
        } catch (err) {
            alert(err.message);
        } finally {
            setCancellingId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    if (error) return (
        <div style={{
            padding: '1.5rem',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            margin: '2rem'
        }}>
            Error: {error}
        </div>
    );

    return (
        <div className="customers-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div className="header" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#111827' }}>Customers & Subscriptions</h2>
            </div>

            {customers.map((customer) => (
                <div key={customer.id} className="customer-card" style={{
                    background: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    marginBottom: '2rem',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                }}>
                    <div className="customer-header" style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f9fafb'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '1.25rem'
                            }}>
                                {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', color: '#1f2937' }}>{customer.name}</h3>
                                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>{customer.email}</p>
                            </div>
                        </div>
                        <div className="customer-meta" style={{ textAlign: 'right' }}>
                            <small style={{ color: '#9ca3af', fontSize: '0.8rem', display: 'block' }}>Joined {formatDate(customer.created_at)}</small>
                            <small style={{ color: '#6b7280', fontWeight: '500' }}>ID: ...{customer.id.slice(-6)}</small>
                        </div>
                    </div>

                    {customer.subscriptions.length > 0 ? (
                        <div className="subscriptions-section">
                            <table className="subscriptions-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Plan</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Price</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Duration</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Status</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Date</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customer.subscriptions.map((sub) => (
                                        <tr key={sub.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#374151' }}>{sub.plan_name || 'Deleted Plan'}</td>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>${parseFloat(sub.plan_price || 0).toFixed(2)}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>{sub.duration_days} days</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    background: sub.status === 'active' ? '#def7ec' : '#f3f4f6',
                                                    color: sub.status === 'active' ? '#03543f' : '#6b7280'
                                                }}>
                                                    {sub.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                                <div>Purchased: {formatDate(sub.purchased_at).split(',')[0]}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                                    {sub.status === 'active' ? `Expires: ${formatDate(sub.expires_at).split(',')[0]}` : `Ended: ${formatDate(sub.cancelled_at).split(',')[0]}`}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                {sub.status === 'active' && (
                                                    <button
                                                        onClick={() => handleCancelSubscription(sub.id)}
                                                        disabled={cancellingId === sub.id}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            background: '#fff',
                                                            border: '1px solid #fca5a5',
                                                            color: '#dc2626',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            marginLeft: 'auto'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            if (!cancellingId) {
                                                                e.target.style.background = '#fef2f2';
                                                                e.target.style.borderColor = '#dc2626';
                                                            }
                                                        }}
                                                        onMouseOut={(e) => {
                                                            if (!cancellingId) {
                                                                e.target.style.background = '#fff';
                                                                e.target.style.borderColor = '#fca5a5';
                                                            }
                                                        }}
                                                    >
                                                        {cancellingId === sub.id ? 'Processing...' : 'Deactivate'}
                                                    </button>
                                                )}
                                                {sub.status !== 'active' && (
                                                    <span style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>Inactive</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="no-subscriptions" style={{
                            padding: '3rem',
                            textAlign: 'center',
                            color: '#9ca3af',
                            fontStyle: 'italic',
                            background: '#fff'
                        }}>
                            No subscriptions found for this customer.
                        </div>
                    )}
                </div>
            ))}

            {customers.length === 0 && (
                <div className="empty-state" style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
                    No customers found.
                </div>
            )}
        </div>
    );
}

export default CustomersList;
