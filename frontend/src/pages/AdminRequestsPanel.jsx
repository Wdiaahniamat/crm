import { useEffect, useState, useCallback } from 'react';
import api from '../api';

export default function AdminRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/requests');
    setRequests(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(req, action) {
    await api.post(`/requests/${req.id}/${action}`);
    setNotice(action === 'approve' ? `${req.name}'s account was created.` : `${req.name}'s request was rejected.`);
    load();
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
                  <div className="avatar">{r.name[0]}</div>
                  <div className="meta">
                    <strong>{r.name}</strong>
                    <span>{r.email} · @{r.username} · {r.department}</span>
                  </div>
                </div>
                <div>
                  <button className="btn btn-danger btn-sm" onClick={() => decide(r, 'reject')}>Reject</button>{' '}
                  <button className="btn btn-primary btn-sm" onClick={() => decide(r, 'approve')}>Approve</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {decided.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Past requests</h3></div>
          <div className="panel-body">
            <table>
              <thead><tr><th>Name</th><th>Username</th><th>Department</th><th>Status</th></tr></thead>
              <tbody>
                {decided.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>@{r.username}</td>
                    <td>{r.department}</td>
                    <td><span className={`pill pill-${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
