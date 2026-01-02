import { useState, useEffect } from 'react';
import { plansAPI } from '../api/client';
import PlanForm from './PlanForm';
import './PlansList.css'; // Import the new styles

function PlansList() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [includeInactive, setIncludeInactive] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, [includeInactive]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await plansAPI.getAll(includeInactive);
            setPlans(response.data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlan = () => {
        setEditingPlan(null);
        setShowForm(true);
    };

    const handleEditPlan = (plan) => {
        setEditingPlan(plan);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingPlan(null);
        fetchPlans();
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    if (error) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            Error: {error}
        </div>
    );

    return (
        <div className="plans-page-container">
            <div className="plans-header">
                <div className="plans-title">
                    <h2>Plans Management</h2>
                    <div className="plans-subtitle">Manage your subscription tiers and pricing</div>
                </div>
                <div className="plans-actions">
                    <label className="toggle-switch" title="Show inactive/cancelled plans">
                        <input
                            type="checkbox"
                            className="toggle-input"
                            checked={includeInactive}
                            onChange={(e) => setIncludeInactive(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Show Inactive</span>
                    </label>
                    <button onClick={handleAddPlan} className="btn-primary-add">
                        <span className="btn-icon">+</span> Add New Plan
                    </button>
                </div>
            </div>

            {showForm && (
                <PlanForm
                    plan={editingPlan}
                    onClose={handleFormClose}
                />
            )}

            <div className="plans-table-card">
                <div className="table-responsive">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Price</th>
                                <th>Duration</th>
                                <th>Capacity</th>
                                <th>Remaining</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.map((plan) => (
                                <tr key={plan.id}>
                                    <td className="plan-name-cell">{plan.name}</td>
                                    <td>
                                        <div className="description-text" title={plan.description}>
                                            {plan.description || '-'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="price-text">${parseFloat(plan.price).toFixed(2)}</div>
                                    </td>
                                    <td>{plan.duration_days} days</td>
                                    <td>{plan.total_capacity}</td>
                                    <td>
                                        <span className={`capacity-badge ${plan.remaining_capacity === 0 ? 'critical' :
                                                plan.remaining_capacity < 5 ? 'low' : 'good'
                                            }`}>
                                            {plan.remaining_capacity}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${plan.is_active ? 'active' : 'inactive'}`}>
                                            {plan.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => handleEditPlan(plan)}
                                            className="btn-edit"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {plans.length === 0 && (
                    <div className="empty-state">
                        <p style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 500 }}>No plans found</p>
                        <p>Click "Add New Plan" to create your first subscription tier.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PlansList;
