import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

function NavBar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <>
      <div className="nav">
        <div className="nav-left">
          <div className="brand" aria-label="Clermont">
            <span className="logo-dot" aria-hidden="true"></span>
            <span className="brand-text">Clermont</span>
          </div>
          <button className={`nav-link ${activeTab === 'home' ? 'active' : ''}`} onClick={() => onTabChange('home')}>Overview</button>
          <button className={`nav-link ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => onTabChange('pricing')}>Pricing</button>
          <button className={`nav-link ${activeTab === 'plans' ? 'active' : ''}`} onClick={() => onTabChange('plans')}>Plans</button>
          <button className={`nav-link ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => onTabChange('customers')}>Customers</button>
        </div>
        <div className="nav-right">
          {!user && (
            <>
              <button className="nav-cta" onClick={() => setAuthOpen(true)}>Sign in</button>
            </>
          )}
          {user && (
            <div className="account">
              <span className="account-name">{user.name || user.email}</span>
              <button className="nav-cta" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}

export default NavBar;
