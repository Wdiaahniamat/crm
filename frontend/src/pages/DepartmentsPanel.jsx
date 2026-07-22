import { useEffect, useState, useCallback } from 'react';
import api from '../api';

export default function DepartmentsPanel() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch {
      setError('Could not load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await api.post('/departments', { name: newName.trim() });
      setDepartments(res.data);
      setNewName('');
      setNotice(`"${newName.trim()}" added successfully.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add department.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(name) {
    if (!confirm(`Remove "${name}" from departments?`)) return;
    setError('');
    setNotice('');
    try {
      const res = await api.delete(`/departments/${encodeURIComponent(name)}`);
      setDepartments(res.data);
      setNotice(`"${name}" removed.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove department.');
    }
  }

  if (loading) return <div className="empty-state">Loading departments…</div>;

  const colors = [
    'var(--teal)', 'var(--indigo)', 'var(--amber)', 'var(--green)', 'var(--red)',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1',
  ];

  return (
    <>
      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <div className="panel-head">
          <h3>Company departments</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{departments.length} registered</span>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Add or remove departments below. These departments are available as selection options when
            creating employee profiles and during account registration.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginBottom: '28px' }}>
            {departments.map((dept, i) => (
              <div
                key={dept}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: `4px solid ${colors[i % colors.length]}`,
                  transition: 'var(--transition)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: `${colors[i % colors.length]}15`,
                    color: colors[i % colors.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700,
                  }}>
                    {dept.charAt(0).toUpperCase()}
                  </span>
                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{dept}</strong>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(dept)}
                  title={`Remove ${dept}`}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label>New department name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Marketing"
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving} style={{ height: '44px' }}>
              {saving ? 'Adding…' : '+ Add department'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
