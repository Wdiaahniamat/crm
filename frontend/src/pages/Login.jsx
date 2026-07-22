import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Modal from '../components/Modal';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(user.role === 'admin' ? '/admin' : '/employee');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not log in. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <main className="auth-card">
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '20px' }}>
          <img 
            src="/logo.png" 
            alt="Xebrightech Logo" 
            style={{ 
              height: '60px', 
              width: '60px', 
              objectFit: 'contain',
              borderRadius: '8px',
              marginBottom: '16px'
            }} 
          />
          <h1>Welcome back</h1>
          <p className="sub">Please enter your credentials to access your desk.</p>
        </header>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input 
              id="username" 
              type="text"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="e.g. admin"
              autoFocus 
              required 
            />
          </div>
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              <button 
                type="button"
                className="btn-link"
                style={{ background: 'none', border: 'none', color: 'var(--maroon)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0 }}
                onClick={() => setShowForgot(true)}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                id="password" 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#64748b',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁' : '🙈'}
              </button>
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in to dashboard'}
          </button>
        </form>

        <div className="auth-switch">
          New employee? <Link to="/request-account">Submit account request</Link>
        </div>

      </main>

      {showForgot && (
        <ForgotPasswordModal onClose={() => setShowForgot(false)} />
      )}
    </div>
  );
}

function ForgotPasswordModal({ onClose }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { username, email, newPassword });
      setSuccess(res.data?.message || 'Password has been reset successfully!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Reset Password" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="forgot-username">Username</label>
          <input
            id="forgot-username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>
        <div className="field">
          <label htmlFor="forgot-email">Registered Email</label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
          />
        </div>
        <div className="field">
          <label htmlFor="forgot-password">New Password</label>
          <input
            id="forgot-password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="field">
          <label htmlFor="forgot-confirm">Confirm New Password</label>
          <input
            id="forgot-confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
