import { useEffect, useState } from 'react';
import { pricesAPI, checkoutAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './PricingGrid.css';

function PricingGrid() {
  const { user, customer } = useAuth();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await pricesAPI.list();
        setPrices(res.data || []);
      } catch (e) {
        setMessage(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChoosePlan(price) {
    if (!user) {
      setMessage('Please sign in to purchase.');
      return;
    }
    setSelectedPrice(price);
    setShowCheckout(true);
  }

  async function handleConfirmPurchase() {
    if (!customer || !selectedPrice) return;

    try {
      setProcessing(true);
      setMessage('');
      const sessionRes = await checkoutAPI.createSession(customer.id, selectedPrice.id);
      const session = sessionRes.data;
      await checkoutAPI.completeSession(session.id, session.id);
      setMessage('🎉 Subscription activated successfully!');
      setTimeout(() => {
        setShowCheckout(false);
        setSelectedPrice(null);
      }, 2000);
    } catch (e) {
      console.error("Purchase error:", e);
      // Check for 409 status OR if the message content matches what the backend sends
      if ((e.response && e.response.status === 409) || (e.message && e.message.includes('already subscribed'))) {
        setMessage('You already subscribed to this plan :)');
      } else if (e.response && e.response.data && e.response.data.message) {
        setMessage(e.response.data.message);
      } else {
        setMessage(e.message || 'An unexpected error occurred.');
      }
    } finally {
      setProcessing(false);
    }
  }

  function handleCancelCheckout() {
    setShowCheckout(false);
    setSelectedPrice(null);
    setMessage('');
  }

  if (loading) {
    return (
      <div className="pricing-loading">
        <div className="loading-spinner"></div>
        <p>Loading pricing options...</p>
      </div>
    );
  }

  if (showCheckout && selectedPrice) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <button className="back-button" onClick={handleCancelCheckout}>
            ← Back to pricing
          </button>

          <div className="checkout-header">
            <h2>Confirm your subscription</h2>
            <p>Review your selection and complete your purchase</p>
          </div>

          <div className="checkout-summary">
            <div className="summary-card">
              <div className="summary-header">
                <h3>Order Summary</h3>
              </div>

              <div className="summary-details">
                <div className="summary-row">
                  <span className="summary-label">Plan</span>
                  <span className="summary-value">
                    {selectedPrice.recurring_interval || 'period'} subscription
                  </span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Duration</span>
                  <span className="summary-value">
                    {selectedPrice.interval_count} {selectedPrice.recurring_interval}(s)
                  </span>
                </div>

                <div className="summary-row">
                  <span className="summary-label">Billing</span>
                  <span className="summary-value">
                    {selectedPrice.recurring_interval === 'month' ? 'Monthly' :
                      selectedPrice.recurring_interval === 'year' ? 'Yearly' :
                        selectedPrice.recurring_interval === 'day' ? 'Daily' : 'One-time'}
                  </span>
                </div>

                <div className="summary-divider"></div>

                <div className="summary-row summary-total">
                  <span className="summary-label">Total</span>
                  <span className="summary-value">
                    {selectedPrice.currency?.toUpperCase()} {(selectedPrice.unit_amount / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="summary-features">
                <h4>What's included:</h4>
                <ul>
                  <li>✓ Full access to all features</li>
                  <li>✓ Priority customer support</li>
                  <li>✓ Cancel anytime, no questions asked</li>
                  <li>✓ Automatic renewal</li>
                </ul>
              </div>

              {message && (
                <div className={`checkout-message ${message.includes('🎉') ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}

              <button
                className="confirm-button"
                onClick={handleConfirmPurchase}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="button-spinner"></span>
                    Processing...
                  </>
                ) : (
                  `Confirm & Subscribe`
                )}
              </button>

              <p className="checkout-disclaimer">
                By confirming, you agree to our terms of service. You can cancel your subscription at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>Simple, transparent pricing</h1>
        <p>Choose the plan that fits your business. Cancel anytime.</p>
      </div>

      {message && !showCheckout && (
        <div className="pricing-message">
          {message}
        </div>
      )}

      <div className="pricing-grid-container">
        {prices.map((price, index) => (
          <div
            className={`pricing-card ${index === 1 ? 'featured' : ''}`}
            key={price.id}
          >
            {index === 1 && <div className="featured-badge">Most Popular</div>}

            <div className="pricing-card-header">
              <div className="pricing-amount">
                <span className="currency">{price.currency?.toUpperCase()}</span>
                <span className="amount">{(price.unit_amount / 100).toFixed(2)}</span>
              </div>
              <div className="pricing-interval">
                / {price.recurring_interval || 'period'}
              </div>
            </div>

            <div className="pricing-features">
              <ul>
                <li>
                  <span className="feature-icon">✓</span>
                  Full access for {price.interval_count} {price.recurring_interval}(s)
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  Priority support
                </li>
                <li>
                  <span className="feature-icon">✓</span>
                  Cancel anytime
                </li>
              </ul>
            </div>

            <button
              className={`pricing-button ${index === 1 ? 'featured-button' : ''}`}
              onClick={() => handleChoosePlan(price)}
              disabled={!user}
            >
              {user ? 'Choose plan' : 'Sign in to purchase'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PricingGrid;
