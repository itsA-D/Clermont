import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const res = await authAPI.me();
        setUser(res.data.user);
        setCustomer(res.data.customer || null);
      } catch (_) {
        localStorage.removeItem('auth_token');
        setUser(null);
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email, password) {
    const res = await authAPI.login(email, password);
    localStorage.setItem('auth_token', res.data.token);
    setUser(res.data.user);
    try {
      const me = await authAPI.me();
      setCustomer(me.data.customer || null);
    } catch (_) {}
    return res.data.user;
  }

  async function signup(email, password, name) {
    const res = await authAPI.signup(email, password, name);
    localStorage.setItem('auth_token', res.data.token);
    setUser(res.data.user);
    try {
      const me = await authAPI.me();
      setCustomer(me.data.customer || null);
    } catch (_) {}
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('auth_token');
    setUser(null);
    setCustomer(null);
  }

  const value = useMemo(() => ({ user, customer, loading, login, signup, logout }), [user, customer, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
