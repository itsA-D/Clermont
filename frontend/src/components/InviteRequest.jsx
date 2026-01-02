import { useState } from 'react';
import './InviteRequest.css';

function InviteRequest({ onBack }) {
    const [formData, setFormData] = useState({
        email: '',
        country: 'India',
        company: '',
        name: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setLoading(false);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="invite-request-wrapper">
                <div className="invite-request-container">
                    <div className="success-animation">
                        <div className="success-checkmark">
                            <div className="check-icon">
                                <span className="icon-line line-tip"></span>
                                <span className="icon-line line-long"></span>
                                <div className="icon-circle"></div>
                                <div className="icon-fix"></div>
                            </div>
                        </div>
                    </div>

                    <h1 className="success-title">Thank you for your interest!</h1>
                    <p className="success-message">
                        We've received your request and will reach out to you if we're able to support you.
                        If not, we'll be in touch when we're ready to open up access more broadly soon.
                    </p>

                    <button onClick={onBack} className="back-home-btn">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="invite-request-wrapper">
            <div className="invite-request-container">
                <button onClick={onBack} className="back-link">
                    ← Back
                </button>

                <div className="invite-header">
                    <h1 className="invite-title">Let's get you to the right place</h1>
                    <p className="invite-subtitle">We just need a few quick details.</p>
                </div>

                <form onSubmit={handleSubmit} className="invite-form">
                    <div className="form-field">
                        <label htmlFor="name" className="field-label">Full name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            className="field-input"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="email" className="field-label">Work email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="jane@example.com"
                            className="field-input"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="company" className="field-label">Company name</label>
                        <input
                            type="text"
                            id="company"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            placeholder="Acme Inc."
                            className="field-input"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="country" className="field-label">Country/Region</label>
                        <select
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="field-select"
                            required
                        >
                            <option value="India">India</option>
                            <option value="United States">United States</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                            <option value="Germany">Germany</option>
                            <option value="France">France</option>
                            <option value="Singapore">Singapore</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="info-box">
                        <p className="info-text">
                            We're now available by invite only in India, and currently only supporting
                            businesses with a focus on international expansion.
                        </p>
                        <p className="info-text">
                            Please fill out this form, and we'll reach out to you if we're able to support you.
                            If not, we'll be in touch when we're ready to open up access more broadly soon.
                        </p>
                    </div>

                    <button type="submit" className="continue-btn" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                Continue
                                <span className="arrow">→</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default InviteRequest;
