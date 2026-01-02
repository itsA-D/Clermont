import { useState, useEffect } from 'react';
import { plansAPI } from '../api/client';

function PlanForm({ plan, onClose }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        duration_days: '',
        total_capacity: '',
        is_active: true,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (plan) {
            setFormData({
                name: plan.name,
                description: plan.description || '',
                price: plan.price,
                duration_days: plan.duration_days,
                total_capacity: plan.total_capacity,
                is_active: plan.is_active,
            });
        }
    }, [plan]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = {
                ...formData,
                price: parseFloat(formData.price),
                duration_days: parseInt(formData.duration_days),
                total_capacity: parseInt(formData.total_capacity),
            };

            if (plan) {
                await plansAPI.update(plan.id, data);
            } else {
                await plansAPI.create(data);
            }

            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>{plan ? 'Edit Plan' : 'Create New Plan'}</h3>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="name">Plan Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="price">Price ($) *</label>
                            <input
                                type="number"
                                id="price"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="duration_days">Duration (days) *</label>
                            <input
                                type="number"
                                id="duration_days"
                                name="duration_days"
                                value={formData.duration_days}
                                onChange={handleChange}
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="total_capacity">Total Capacity *</label>
                        <input
                            type="number"
                            id="total_capacity"
                            name="total_capacity"
                            value={formData.total_capacity}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                        {plan && (
                            <small className="help-text">
                                Current subscriptions: {plan.total_capacity - plan.remaining_capacity}
                            </small>
                        )}
                    </div>

                    {plan && (
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                />
                                <span>Inactive</span>
                            </label>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PlanForm;
