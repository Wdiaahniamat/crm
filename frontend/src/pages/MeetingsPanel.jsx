import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function MeetingsPanel({ isEmployeeView }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [meetings, setMeetings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '', date: '', time: '', type: 'employee',
    department: '', scope: '', client: '', description: '', agenda: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meetRes, deptRes] = await Promise.all([
        api.get('/meetings'),
        api.get('/departments'),
      ]);
      setMeetings(meetRes.data);
      setDepartments(deptRes.data);
    } catch {
      setError('Could not load meetings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.post('/meetings', form);
      setNotice('Meeting scheduled successfully.');
      setForm({ title: '', date: '', time: '', type: 'employee', department: '', scope: '', client: '', description: '', agenda: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not schedule meeting.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this meeting?')) return;
    try {
      await api.delete(`/meetings/${id}`);
      setNotice('Meeting deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete meeting.');
    }
  }

  if (loading) return <div className="empty-state">Loading meetings…</div>;

  const clientMeetings = meetings.filter((m) => m.type === 'client');
  const employeeMeetings = meetings.filter((m) => m.type === 'employee');

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = employeeMeetings.filter((m) => m.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = employeeMeetings.filter((m) => m.date < today).sort((a, b) => b.date.localeCompare(a.date));

  function MeetingCard({ meeting }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isClient = meeting.type === 'client';
    const borderColor = isClient ? 'var(--amber)' : 'var(--teal)';
    const badgeClass = isClient ? 'pill-pending' : 'pill-completed';
    const isPast = meeting.date < today;

    return (
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        borderLeft: `4px solid ${borderColor}`,
        padding: '18px 20px',
        background: isPast ? '#fafafb' : 'var(--surface)',
        opacity: isPast ? 0.7 : 1,
        transition: 'var(--transition)',
      }}>
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
        >
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {meeting.title}
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {meeting.date}
            </span>
          </div>
          <span className={`pill ${badgeClass}`} style={{ fontSize: '10px', flexShrink: 0 }}>
            {isClient ? 'Client' : 'Employee'}
          </span>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
              {meeting.time && <div><strong>Timing:</strong> {meeting.time}</div>}
              {meeting.description && <div><strong>Description:</strong> {meeting.description}</div>}
              {!meeting.description && !meeting.time && <div><em>No additional details.</em></div>}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              {isClient && meeting.client && (
                <span style={{ background: 'var(--amber-soft)', color: 'var(--amber)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                  🤝 {meeting.client}
                </span>
              )}
              {!isClient && meeting.scope === 'company-wide' && (
                <span style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                  🏢 Company-wide
                </span>
              )}
              {!isClient && meeting.department && meeting.scope !== 'company-wide' && (
                <span style={{ background: 'var(--teal-soft)', color: 'var(--teal)', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                  🏷️ {meeting.department}
                </span>
              )}
              {meeting.agenda && (
                <span>📋 {meeting.agenda}</span>
              )}
            </div>

            {isAdmin && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(meeting.id); }} style={{ fontSize: '12px', padding: '4px 10px' }}>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="error-banner">{error}</div>}

      {/* Schedule Meeting Form (Admin Only) */}
      {isAdmin && (
        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panel-head">
            <h3>Schedule a meeting</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New meeting'}
            </button>
          </div>
          {showForm && (
            <div className="panel-body">
              <form onSubmit={handleCreate}>
                <div className="field">
                  <label>Meeting title</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q3 Planning Sync" />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Date</label>
                    <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Time (optional)</label>
                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Meeting type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, department: '', scope: '', client: '' })}>
                      <option value="employee">Employee / Departmental</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                  {form.type === 'client' && (
                    <div className="field">
                      <label>Client name</label>
                      <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="e.g. Acme Corp" />
                    </div>
                  )}
                  {form.type === 'employee' && (
                    <div className="field">
                      <label>Scope</label>
                      <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                        <option value="">Department-specific</option>
                        <option value="company-wide">Company-wide</option>
                      </select>
                    </div>
                  )}
                </div>
                {form.type === 'employee' && form.scope !== 'company-wide' && (
                  <div className="field">
                    <label>Department</label>
                    <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                      <option value="">— Select department —</option>
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Description</label>
                  <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the meeting…" />
                </div>
                <div className="field">
                  <label>Agenda (optional)</label>
                  <input value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} placeholder="e.g. Sprint review, Budget discussion" />
                </div>
                <button className="btn btn-primary" type="submit">Schedule meeting</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Meetings */}
      <div className="panel">
        <div className="panel-head">
          <h3>Upcoming meetings</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{upcoming.length} scheduled</span>
        </div>
        <div className="panel-body">
          {upcoming.length === 0 ? (
            <div className="empty-state"><div className="glyph">📅</div>No upcoming meetings scheduled.</div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {upcoming.map((m) => <MeetingCard key={m.id} meeting={m} />)}
            </div>
          )}
        </div>
      </div>

      {/* Admin: Separate views */}
      {isAdmin && !isEmployeeView && clientMeetings.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3>🤝 Client meetings</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{clientMeetings.length} total</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gap: '12px' }}>
              {clientMeetings.map((m) => <MeetingCard key={m.id} meeting={m} />)}
            </div>
          </div>
        </div>
      )}

      {/* Past Meetings */}
      {past.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3>Past meetings</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{past.length} completed</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gap: '12px' }}>
              {past.map((m) => <MeetingCard key={m.id} meeting={m} />)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
