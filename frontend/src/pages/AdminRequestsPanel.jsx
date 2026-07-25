import { useEffect, useState, useCallback } from 'react';
import api from '../api';

export default function AdminRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(req, action) {
    try {
      await api.post(`/requests/${req.id}/${action}`);
      setNotice(action === 'approve' ? `${req.name}'s account was created.` : `${req.name}'s request was rejected.`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed.');
    }
  }

  async function handleDelete(req) {
    if (!confirm(`Are you sure you want to permanently delete "${req.name}"? This will remove the account request and employee record.`)) {
      return;
    }
    try {
      await api.delete(`/requests/${req.id}`);
      setNotice(`"${req.name}" was successfully deleted.`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete request or employee.');
    }
  }

  if (loading) return <div className="empty-state">Loading requests…</div>;

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  return (
    <div>
      {notice && <div className="success-banner">{notice}</div>}
      <div className="panel">
        <div className="panel-head"><h3>Pending account requests</h3></div>
        <div className="panel-body">
          {pending.length === 0 ? (
            <div className="empty-state"><div className="glyph">✓</div>No pending requests.</div>
          ) : (
            pending.map((r) => (
              <div className="employee-list-item" key={r.id}>
                <div className="employee-info">
                  <div className="avatar">{r.name ? r.name[0] : 'U'}</div>
                  <div className="meta">
                    <strong>{r.name}</strong>
                    <span>{r.email} · @{r.username} · {r.department}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn btn-danger btn-sm" onClick={() => decide(r, 'reject')}>Reject</button>
                  <button className="btn btn-primary btn-sm" onClick={() => decide(r, 'approve')}>Approve</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDelete(r)} title="Delete Request">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {decided.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Past requests & Deactivated employees</h3></div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((r) => {
                  const isDeactivated = r.userStatus === 'inactive' || r.status === 'deactivated';
                  const isApproved = r.status === 'approved' && !isDeactivated;
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td>@{r.username}</td>
                      <td>{r.department}</td>
                      <td>
                        {isDeactivated ? (
                          <span className="pill" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontWeight: 600 }}>
                            🚫 Deactivated
                          </span>
                        ) : isApproved ? (
                          <span className="pill pill-completed">
                            Approved (Active)
                          </span>
                        ) : (
                          <span className={`pill pill-${r.status}`}>{r.status}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

