import { useEffect, useState, useCallback } from 'react';
import api from '../api';

export default function AdminLeavesPanel() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get('/leaves');
    setLeaves(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(leave, status) {
    await api.put(`/leaves/${leave.id}/status`, { status });
    load();
  }

  if (loading) return <div className="empty-state">Loading leave requests…</div>;

  const pending = leaves.filter((l) => l.status === 'pending');
  const decided = leaves.filter((l) => l.status !== 'pending');

  return (
    <div>
      <div className="panel">
        <div className="panel-head"><h3>Pending leave requests</h3></div>
        <div className="panel-body">
          {pending.length === 0 ? (
            <div className="empty-state"><div className="glyph">✓</div>Nothing waiting on you.</div>
          ) : (
            <table>
              <thead><tr><th>Employee</th><th>Dates</th><th>Type</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {pending.map((l) => (
                  <tr key={l.id}>
                    <td>{l.employeeName}</td>
                    <td>{l.startDate} → {l.endDate}</td>
                    <td style={{ textTransform: 'capitalize' }}>{l.type}</td>
                    <td>{l.reason}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => decide(l, 'rejected')}>Reject</button>{' '}
                      <button className="btn btn-primary btn-sm" onClick={() => decide(l, 'approved')}>Approve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {decided.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Leave history</h3></div>
          <div className="panel-body">
            <table>
              <thead><tr><th>Employee</th><th>Dates</th><th>Status</th></tr></thead>
              <tbody>
                {decided.map((l) => (
                  <tr key={l.id}>
                    <td>{l.employeeName}</td>
                    <td>{l.startDate} → {l.endDate}</td>
                    <td><span className={`pill pill-${l.status}`}>{l.status}</span></td>
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
