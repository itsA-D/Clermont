function FeaturesSection() {
  const features = [
    {
      icon: '📦',
      title: 'Subscriptions',
      description: 'Plans, products, and prices with capacity enforcement and idempotent checkout.'
    },
    {
      icon: '🔒',
      title: 'Security',
      description: 'JWT auth, password hashing, audit logs, and optional admin protections.'
    },
    {
      icon: '⚙️',
      title: 'Operations',
      description: 'Automated expiration job, concurrency-safe purchases, and comprehensive APIs.'
    }
  ];

  return (
    <section className="features-section-wrapper">
      <div className="features-section-header">
        <h2 className="features-main-title">Everything you need to scale</h2>
        <p className="features-main-subtitle">Use our APIs and components to build and grow recurring revenue.</p>
      </div>

      <div className="features-grid-container">
        {features.map((feature, index) => (
          <div key={index} className="feature-card-enhanced">
            <div className="landing-feature-icon">{feature.icon}</div>
            <h3 className="feature-card-title">{feature.title}</h3>
            <p className="feature-card-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeaturesSection;
