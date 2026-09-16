import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../auth/useAdminAuth';
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export const AdminLogin = () => {
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get the redirect path from location state, or default to admin dashboard
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Email/Mobile and Password are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await adminLogin(identifier.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{ADMIN_LOGIN_STYLES}</style>
      <div className="admin-login-wrapper">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-login-icon">
              <ShieldCheck size={32} />
            </div>
            <h2>MeriSamaj Admin Panel</h2>
            <p>Enter your credentials to manage the platform</p>
          </div>

          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="admin-login-group">
              <label>Email or Mobile Number</label>
              <input
                type="text"
                placeholder="admin@gmail.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="admin-login-input"
                disabled={loading}
              />
            </div>

            <div className="admin-login-group">
              <label>Password</label>
              <div className="admin-password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-login-input"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-password-toggle-btn"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="admin-login-error">⚠️ {error}</div>}

            <button type="submit" className="admin-login-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" /> Loggen in...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <div className="admin-login-footer">
            <p>© {new Date().getFullYear()} MeriSamaj Platform Admin</p>
          </div>
        </div>
      </div>
    </>
  );
};

const ADMIN_LOGIN_STYLES = `
  .admin-login-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at top left, #1e1b4b, #0f172a 70%);
    font-family: 'Sora', sans-serif;
    padding: 20px;
    box-sizing: border-box;
  }
  .admin-login-card {
    background: rgba(30, 41, 59, 0.45);
    border: 1px solid rgba(148, 163, 184, 0.1);
    backdrop-filter: blur(16px);
    width: 100%;
    max-width: 420px;
    border-radius: 24px;
    padding: 40px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    box-sizing: border-box;
  }
  .admin-login-header {
    text-align: center;
    margin-bottom: 32px;
  }
  .admin-login-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    margin-bottom: 16px;
    box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
  }
  .admin-login-header h2 {
    color: #f8fafc;
    font-size: 1.5rem;
    font-weight: 800;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
  }
  .admin-login-header p {
    color: #94a3b8;
    font-size: 0.88rem;
    margin: 0;
  }
  .admin-login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .admin-login-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .admin-login-group label {
    color: #cbd5e1;
    font-size: 0.82rem;
    font-weight: 600;
  }
  .admin-login-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.15);
    border-radius: 12px;
    color: #f8fafc;
    font-size: 0.92rem;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
  }
  .admin-login-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
  .admin-password-input-wrapper {
    position: relative;
    width: 100%;
  }
  .admin-password-toggle-btn {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
  }
  .admin-password-toggle-btn:hover {
    color: #f8fafc;
  }
  .admin-login-error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    font-size: 0.82rem;
    padding: 10px 14px;
    border-radius: 10px;
    font-weight: 500;
  }
  .admin-login-submit {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    border: none;
    border-radius: 12px;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .admin-login-submit:hover {
    opacity: 0.95;
  }
  .admin-login-submit:active {
    transform: scale(0.98);
  }
  .admin-login-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .admin-login-footer {
    text-align: center;
    margin-top: 32px;
  }
  .admin-login-footer p {
    color: #64748b;
    font-size: 0.78rem;
    margin: 0;
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default AdminLogin;
