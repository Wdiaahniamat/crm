import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function RequestAccount() {
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', department: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments')
      .then((r) => { if (Array.isArray(r.data)) setDepartments(r.data); })
      .catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/requests', form);
      setSuccess(res.data.message);
      setForm({ name: '', email: '', username: '', password: '', department: '', phone: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <main className="auth-card" style={{ maxWidth: 460 }}>
        <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="auth-mark" aria-hidden="true">C</div>
          <h1>Create an account</h1>
          <p className="sub">Submit your details. An admin will review and activate your access.</p>
        </header>

        {error && <div className="error-banner" role="alert">{error}</div>}
        {success && <div className="success-banner" role="alert">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input 
              id="name" 
              type="text"
              value={form.name} 
              onChange={(e) => update('name', e.target.value)} 
              placeholder="e.g. John Doe"
              required 
            />
          </div>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input 
              id="email" 
              type="email" 
              value={form.email} 
              onChange={(e) => update('email', e.target.value)} 
              placeholder="e.g. john@company.com"
              required 
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                value={form.department}
                onChange={(e) => update('department', e.target.value)}
              >
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input 
                id="phone" 
                type="tel"
                value={form.phone} 
                onChange={(e) => update('phone', e.target.value)} 
                placeholder="e.g. +12345678"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="req-username">Choose a username</label>
            <input 
              id="req-username" 
              type="text"
              value={form.username} 
              onChange={(e) => update('username', e.target.value)} 
              placeholder="e.g. jdoe"
              required 
            />
          </div>
          <div className="field">
            <label htmlFor="req-password">Choose a password</label>
            <input 
              id="req-password" 
              type="password" 
              value={form.password} 
              onChange={(e) => update('password', e.target.value)} 
              placeholder="At least 6 characters"
              required 
              minLength={6} 
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Submitting request…' : 'Submit account request'}
          </button>
        </form>

        <div className="auth-switch">
          Already approved? <Link to="/login">Sign in here</Link>
        </div>
      </main>
    </div>
  );
}
