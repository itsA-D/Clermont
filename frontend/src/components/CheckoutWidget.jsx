import './CheckoutWidget.css';

function CheckoutWidget() {
  return (
    <>
      {/* Dashboard Background */}
      <div className="dashboard-background">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <span>🚀</span> ROCKET RIDES
          </div>
          <input
            type="text"
            placeholder="Search"
            className="dashboard-search"
          />
        </div>

        <div className="dashboard-content">
          <div className="dashboard-stats">
            <h3 className="stats-header">Today</h3>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">
                  Net volume
                  <svg viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L3 5h6z" />
                  </svg>
                </div>
                <div className="stat-value">₹35,28,198.72</div>
                <div className="stat-time">14:00</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  Yesterday
                  <svg viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 8L3 5h6z" />
                  </svg>
                </div>
                <div className="stat-value">₹29,31,556.34</div>
              </div>
            </div>

            {/* Graph with Grid Lines */}
            <div className="chart-container">
              <svg className="chart-svg" viewBox="0 0 500 140" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#635bff" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#635bff" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="0" x2="500" y2="0" className="chart-grid-line" />
                <line x1="0" y1="35" x2="500" y2="35" className="chart-grid-line" />
                <line x1="0" y1="70" x2="500" y2="70" className="chart-grid-line" />
                <line x1="0" y1="105" x2="500" y2="105" className="chart-grid-line" />
                <line x1="0" y1="140" x2="500" y2="140" className="chart-grid-line" />

                {/* Area under the curve */}
                <path
                  className="chart-area"
                  d="M 0,100 L 0,100 L 80,95 L 160,90 L 240,85 L 320,60 L 400,50 L 500,35 L 500,140 L 0,140 Z"
                />

                {/* Line chart */}
                <path
                  className="chart-line"
                  d="M 0,100 L 80,95 L 160,90 L 240,85 L 320,60 L 400,50 L 500,35"
                />
              </svg>
              <div className="chart-labels">
                <span>00:00</span>
                <span className="chart-label-now">Now, 14:00</span>
              </div>
            </div>

            {/* Bottom Stats with Mini Charts */}
            <div className="bottom-stats">
              <div className="bottom-stat-card">
                <div className="bottom-stat-header">
                  <div className="bottom-stat-label">Net volume from sales</div>
                </div>
                <div className="bottom-stat-meta">
                  <div className="bottom-stat-value">₹39,274.29</div>
                  <div className="bottom-stat-change">+32.8%</div>
                  <div className="bottom-stat-previous">₹29,573.54</div>
                </div>
                <div className="bottom-stat-chart">
                  <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="miniGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#635bff" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#635bff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#miniGradient1)"
                      d="M 0,50 L 0,50 L 40,45 L 80,35 L 120,30 L 160,20 L 200,15 L 200,60 L 0,60 Z"
                    />
                    <path
                      fill="none"
                      stroke="#635bff"
                      strokeWidth="2"
                      d="M 0,50 L 40,45 L 80,35 L 120,30 L 160,20 L 200,15"
                    />
                  </svg>
                </div>
                <div className="bottom-stat-footer">
                  <span>20 Apr</span>
                  <span>Today</span>
                </div>
              </div>

              <div className="bottom-stat-card">
                <div className="bottom-stat-header">
                  <div className="bottom-stat-label">New customers</div>
                </div>
                <div className="bottom-stat-meta">
                  <div className="bottom-stat-value">37</div>
                  <div className="bottom-stat-previous">28</div>
                </div>
                <div className="bottom-stat-chart">
                  <svg viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="miniGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#635bff" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#635bff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#miniGradient2)"
                      d="M 0,45 L 0,45 L 40,40 L 80,42 L 120,35 L 160,25 L 200,10 L 200,60 L 0,60 Z"
                    />
                    <path
                      fill="none"
                      stroke="#635bff"
                      strokeWidth="2"
                      d="M 0,45 L 40,40 L 80,42 L 120,35 L 160,25 L 200,10"
                    />
                  </svg>
                </div>
                <div className="bottom-stat-footer">
                  <span>20 Apr</span>
                  <span>Updated today 07:50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Card */}
      <div className="checkout-card">
        <div className="checkout-product">
          <div className="product-image">
            <div className="magazine-cover">
              <div className="magazine-title">Issue 001</div>
              <div className="magazine-graphic">
                <div className="graphic-shape shape-1"></div>
                <div className="graphic-shape shape-2"></div>
                <div className="graphic-shape shape-3"></div>
              </div>
            </div>
          </div>
          <div className="product-info">
            <div className="product-name">Abstraction Magazine</div>
            <div className="product-price">₹19 per month</div>
          </div>
        </div>

        <button className="apple-pay-btn" type="button">
          <span className="apple-icon">🍎</span> Pay
        </button>

        <div className="or">Or pay with card</div>

        <form className="checkout-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              placeholder="jane@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Card information</label>
            <div className="card-input-group">
              <input
                type="text"
                placeholder="1234 1234 1234 1234"
                className="form-input card-number"
              />
              <div className="card-icons">
                <span className="card-icon">💳</span>
              </div>
            </div>
            <div className="card-row">
              <input
                type="text"
                placeholder="MM / YY"
                className="form-input card-expiry"
              />
              <input
                type="text"
                placeholder="CVC"
                className="form-input card-cvc"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Country or region</label>
            <select className="form-input form-select">
              <option>India</option>
              <option>United States</option>
              <option>United Kingdom</option>
            </select>
          </div>

          <div className="form-group">
            <input
              type="text"
              placeholder="Postcode"
              className="form-input"
            />
          </div>

          <button type="button" className="pay-btn-demo">
            Pay
          </button>
        </form>
      </div>
    </>
  );
}

export default CheckoutWidget;
