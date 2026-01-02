import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function AuthModal({ onClose }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-tabs">
            <button className={`modal-tab ${mode==='signin'?'active':''}`} onClick={() => setMode('signin')}>Sign in</button>
            <button className={`modal-tab ${mode==='signup'?'active':''}`} onClick={() => setMode('signup')}>Sign up</button>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="modal-body">
          {mode==='signup' && (
            <div className="form-row">
              <input className="input" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}
          <div className="form-row">
            <input className="input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-row">
            <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="pay-btn" type="submit" disabled={loading}>{loading ? 'Please wait...' : (mode==='signin' ? 'Sign in' : 'Create account')}</button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
