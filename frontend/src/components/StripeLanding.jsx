import { useState, useEffect } from 'react';
import CheckoutWidget from './CheckoutWidget';
import FeaturesSection from './features/FeaturesSection';
import './StripeLanding.css';

function StripeLanding({ onRequestInvite }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-wrapper">
      {/* Hero Section with Spotlight Effect */}
      <section className="hero-section">
        <div className="hero-spotlight" style={{
          transform: `translateY(${scrollY * 0.5}px)`
        }} />
        <div className="hero-gradient-overlay" />

        <div className="hero-content">
          <div className="hero-left">
            <span className="preview-badge">Preview</span>
            <h1 className="hero-heading">
              Financial infrastructure
              <br />
              to grow your
              <br />
              <span className="gradient-text">revenue</span>
            </h1>
            <p className="hero-description">
              Join the millions of companies that use Stripe to accept payments online
              and in person, embed financial services, power custom revenue models,
              and build a more profitable business.
            </p>
            <div className="hero-cta">
              <button className="cta-button-primary" onClick={onRequestInvite}>Request an invite</button>
              <button className="cta-button-secondary">Contact sales</button>
            </div>
          </div>

          <div className="hero-right">
            <div className="floating-card" style={{
              transform: `translateY(${-scrollY * 0.2}px)`
            }}>
              <CheckoutWidget />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">135M+</div>
            <div className="stat-label">API requests per day</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">99.99%</div>
            <div className="stat-label">Uptime SLA</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">46</div>
            <div className="stat-label">Countries supported</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">$640B+</div>
            <div className="stat-label">Payments processed</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-heading">Ready to get started?</h2>
          <p className="cta-description">
            Explore our platform and see how we can help you grow your business.
          </p>
          <div className="cta-buttons">
            <button className="cta-button-primary" onClick={onRequestInvite}>Start now</button>
            <button className="cta-button-secondary">Contact sales</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default StripeLanding;
