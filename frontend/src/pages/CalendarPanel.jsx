import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function CalendarPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Calendar navigation
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Add event modal
  const [selectedDate, setSelectedDate] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', date: '', description: '', type: 'company' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const promises = [api.get('/events'), api.get('/leaves')];
      if (isAdmin) {
        promises.push(api.get('/projects'));
      }
      const results = await Promise.all(promises);
      setEvents(results[0].data);
      setLeaves(results[1].data);
      if (isAdmin && results[2]) {
        setProjects(results[2].data);
      }
    } catch {
      setError('Could not load calendar data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  // Calendar math
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function dateStr(day) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Get items for a specific date
  function getDateItems(day) {
    const ds = dateStr(day);
    const items = [];

    // Events
    events.forEach((ev) => {
      if (ev.date === ds) {
        items.push({ type: 'event', label: ev.title, color: 'var(--indigo)', id: ev.id });
      }
    });

    // Approved leaves (date range)
    leaves.forEach((lv) => {
      if (lv.status === 'approved' && ds >= lv.startDate && ds <= lv.endDate) {
        items.push({ type: 'leave', label: `🏖️ ${lv.employeeName || 'Leave'}`, color: 'var(--amber)' });
      }
    });

    // Projects (deadline markers)
    projects.forEach((proj) => {
      if (proj.deadline === ds) {
        items.push({ type: 'project', label: `📦 ${proj.name}`, color: 'var(--teal)' });
      }
    });

    return items;
  }

  function handleDateClick(day) {
    const ds = dateStr(day);
    setSelectedDate(ds);
    setEventForm({ title: '', date: ds, description: '', type: 'company' });
    setShowAddEvent(true);
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/events', eventForm);
      setShowAddEvent(false);
      setNotice('Event added to calendar.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add event.');
    }
  }

  async function handleDeleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      setNotice('Event deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete event.');
    }
  }

  if (loading) return <div className="empty-state">Loading calendar…</div>;

  // Build calendar grid cells
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <>
      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◂</button>
            <h3 style={{ minWidth: '180px', textAlign: 'center' }}>{monthNames[viewMonth]} {viewYear}</h3>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▸</button>
          </div>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => {
              setSelectedDate(todayStr);
              setEventForm({ title: '', date: todayStr, description: '', type: 'company' });
              setShowAddEvent(true);
            }}>
              + Add event
            </button>
          )}
        </div>
        <div className="panel-body" style={{ padding: '16px' }}>
          {/* Day header */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px',
            marginBottom: '4px',
          }}>
            {dayNames.map((d) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--text-muted)', padding: '8px 0',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px',
            background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} style={{ background: '#fafafb', minHeight: '100px' }} />;
              }
              const items = getDateItems(day);
              const isToday = dateStr(day) === todayStr;
              return (
                <div
                  key={day}
                  onClick={() => isAdmin && handleDateClick(day)}
                  style={{
                    background: isToday ? 'var(--teal-soft)' : 'var(--surface)',
                    minHeight: '100px',
                    padding: '6px 8px',
                    cursor: isAdmin ? 'pointer' : 'default',
                    transition: 'var(--transition)',
                    position: 'relative',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', borderRadius: '50%',
                    fontSize: '12px', fontWeight: isToday ? 800 : 500,
                    color: isToday ? '#fff' : 'var(--ink)',
                    background: isToday ? 'var(--teal)' : 'transparent',
                  }}>
                    {day}
                  </span>
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {items.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: item.color,
                          background: `${item.color}12`,
                          padding: '1px 4px',
                          borderRadius: '3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.label}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        +{items.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-head"><h3>Calendar legend</h3></div>
        <div className="panel-body" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--indigo)' }} />
            Company events
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--amber)' }} />
            Approved vacations / leaves
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--teal)' }} />
            Project deadlines
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="panel" style={{ marginTop: '16px' }}>
        <div className="panel-head">
          <h3>All company events</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{events.length} registered</span>
        </div>
        <div className="panel-body">
          {events.length === 0 ? (
            <div className="empty-state"><div className="glyph">🎉</div>No company events yet. {isAdmin ? 'Click a date on the calendar to add one.' : ''}</div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {[...events].sort((a, b) => a.date.localeCompare(b.date)).map((ev) => (
                <div key={ev.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  borderLeft: '4px solid var(--indigo)',
                }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{ev.title}</strong>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {ev.date}{ev.description ? ` — ${ev.description}` : ''}
                    </span>
                  </div>
                  {isAdmin && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEvent(ev.id)} style={{ fontSize: '12px', padding: '4px 10px' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEvent && (
        <Modal title="Add company event" onClose={() => setShowAddEvent(false)}>
          <form onSubmit={handleAddEvent}>
            <div className="field">
              <label>Event title</label>
              <input required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g. Annual Company Retreat" />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" required value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <textarea rows={2} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Brief description…" />
            </div>
            <div className="field">
              <label>Event type</label>
              <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
                <option value="company">Company Event</option>
                <option value="holiday">Public Holiday</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddEvent(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add event</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
