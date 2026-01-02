import { useState } from 'react';
import PlansList from './components/PlansList';
import CustomersList from './components/CustomersList';
import StripeLanding from './components/StripeLanding';
import PricingGrid from './components/PricingGrid';
import NavBar from './components/NavBar';
import LoginRegister from './components/LoginRegister';
import InviteRequest from './components/InviteRequest';
import { useAuth } from './context/AuthContext';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showInvitePage, setShowInvitePage] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="app">Loading...</div>;
  }

  // If there is no user, show the LoginRegister page
  if (!user) {
    return <LoginRegister />;
  }

  // Show invite request page
  if (showInvitePage) {
    return <InviteRequest onBack={() => setShowInvitePage(false)} />;
  }

  return (
    <div className="app">
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        {activeTab === 'home' && <StripeLanding onRequestInvite={() => setShowInvitePage(true)} />}
        {activeTab === 'pricing' && <PricingGrid />}
        {activeTab === 'plans' && <PlansList />}
        {activeTab === 'customers' && <CustomersList />}
      </main>
    </div>
  );
}

export default App;
