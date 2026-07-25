import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { TaskDetailsModal } from './AdminTasksPanel';

const VFILTERS = [
  { key: 'all', label: 'All Tasks', color: '#475569', bg: '#f1f5f9' },
  { key: 'Verified', label: '✓ Verified', color: '#16a34a', bg: '#f0fdf4' },
  { key: 'Rejected', label: '✕ Rejected', color: '#dc2626', bg: '#fef2f2' },
  { key: 'Pending Verification', label: '⏳ Pending Review', color: '#4f46e5', bg: '#eef2ff' },
  { key: 'Submitted', label: '📤 Submitted', color: '#d97706', bg: '#fffbeb' },
  { key: 'none', label: '○ No Proof Yet', color: '#94a3b8', bg: '#f8fafc' },
];

const VSTATUS_STYLE = {
  Verified: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'Pending Verification': { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
  Submitted: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  default: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
};

export default function AdminTaskVerificationPanel() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verFilter, setVerFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewingTaskId, setViewingTaskId] = useState(null);

  const viewingTask = tasks.find((t) => t.id === viewingTaskId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    const [taskRes, empRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/users'),
    ]);
    setTasks(taskRes.data);
    setEmployees(empRes.data.filter((e) => e.status === 'active'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(task, status, pmedStatus) {
    const payload = { status };
    if (pmedStatus !== undefined) payload.pmedStatus = pmedStatus;
    await api.put(`/tasks/${task.id}/status`, payload);
    load();
  }

  function employeeName(id) {
    const e = employees.find((emp) => emp.id === id);
    return e ? e.name : 'Unknown';
  }

  function employeeDept(id) {
    const e = employees.find((emp) => emp.id === id);
    return e ? e.department : '';
  }

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();

  const filtered = tasks.filter((t) => {
    const matchVer = (() => {
      if (verFilter === 'all') return true;
      if (verFilter === 'none') return !t.pmedStatus && !t.pmedData;
      return t.pmedStatus === verFilter;
    })();
    const matchDept = deptFilter ? employeeDept(t.assignedTo) === deptFilter : true;
    return matchVer && matchDept;
  });

  const counts = {
    all: tasks.length,
    Verified: tasks.filter(t => t.pmedStatus === 'Verified').length,
    Rejected: tasks.filter(t => t.pmedStatus === 'Rejected').length,
    'Pending Verification': tasks.filter(t => t.pmedStatus === 'Pending Verification').length,
    Submitted: tasks.filter(t => t.pmedStatus === 'Submitted').length,
    none: tasks.filter(t => !t.pmedStatus && !t.pmedData).length,
  };

  // Highlight tasks needing admin action (have pmedData but not yet Verified/Rejected)
  const needsAction = tasks.filter(t => t.pmedData && t.pmedStatus !== 'Verified' && t.pmedStatus !== 'Rejected').length;

  if (loading) return <div className="empty-state">Loading verification data…</div>;

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Tasks', count: tasks.length, color: '#475569', icon: '📋', bg: '#f1f5f9' },
          { label: 'Verified', count: counts.Verified, color: '#16a34a', icon: '✅', bg: '#f0fdf4' },
          { label: 'Rejected', count: counts.Rejected, color: '#dc2626', icon: '❌', bg: '#fef2f2' },
          { label: 'Pending Review', count: counts['Pending Verification'], color: '#4f46e5', icon: '⏳', bg: '#eef2ff' },
          { label: 'Submitted', count: counts.Submitted, color: '#d97706', icon: '📤', bg: '#fffbeb' },
          { label: 'Action Needed', count: needsAction, color: '#800020', icon: '🔔', bg: '#fdf2f4' },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg,
            borderRadius: '10px',
            padding: '14px',
            border: `1px solid ${s.color}22`,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {needsAction > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)',
          border: '1px solid #fde68a',
          borderLeft: '4px solid #d97706',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '22px' }}>🔔</span>
          <div>
            <strong style={{ fontSize: '14px', color: '#92400e' }}>{needsAction} task{needsAction !== 1 ? 's' : ''} awaiting your verification review</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#b45309' }}>
              Employees have uploaded proof files. Click &ldquo;Pending Review&rdquo; filter to action them.
            </p>
          </div>
          <button
            className="btn btn-sm"
            style={{ background: '#d97706', color: '#fff', border: 'none', marginLeft: 'auto', whiteSpace: 'nowrap' }}
            onClick={() => setVerFilter('Pending Verification')}
          >
            Review Now →
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h3>Task Verification Management</h3>
          {deptFilter && (
            <button className="btn btn-ghost btn-sm" onClick={() => setDeptFilter('')}>
              ✕ Clear dept filter
            </button>
          )}
        </div>
        <div className="panel-body">
          {/* Verification Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {VFILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setVerFilter(f.key)}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: '999px',
                  border: `1px solid ${verFilter === f.key ? f.color : '#e2e8f0'}`,
                  background: verFilter === f.key ? f.bg : '#fff',
                  color: verFilter === f.key ? f.color : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
                <span style={{
                  background: verFilter === f.key ? f.color : '#e2e8f0',
                  color: verFilter === f.key ? '#fff' : '#64748b',
                  borderRadius: '999px',
                  padding: '0 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: '2px',
                }}>
                  {counts[f.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Filter by dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#334155', cursor: 'pointer' }}
            >
              <option value="">— All Departments —</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Showing {filtered.length} of {tasks.length} tasks
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">📋</div>
              No tasks match this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...filtered].reverse().map((t) => {
                const vstyle = VSTATUS_STYLE[t.pmedStatus] || VSTATUS_STYLE.default;
                const vLabel = t.pmedStatus || ((t.pmedData || (t.pmedFiles && t.pmedFiles.length > 0)) ? 'Submitted' : 'No Proof');
                const empName = employeeName(t.assignedTo);
                const empDept = employeeDept(t.assignedTo);
                const awaitingAction = (t.pmedData || (t.pmedFiles && t.pmedFiles.length > 0)) && t.pmedStatus !== 'Verified' && t.pmedStatus !== 'Rejected';

                return (
                  <div
                    key={t.id}
                    style={{
                      background: awaitingAction ? '#fffdf0' : '#fff',
                      border: `1px solid ${awaitingAction ? '#fde68a' : vstyle.border}`,
                      borderLeft: `4px solid ${awaitingAction ? '#d97706' : vstyle.color}`,
                      borderRadius: '10px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                      boxShadow: awaitingAction ? '0 2px 8px rgba(217,119,6,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Task Info */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>{t.title}</strong>
                        {awaitingAction && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                            ACTION NEEDED
                          </span>
                        )}
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                          background: vstyle.bg, color: vstyle.color, border: `1px solid ${vstyle.border}`,
                        }}>
                          {vLabel}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          👤 <strong>{empName}</strong>
                          {empDept && <span style={{ color: '#94a3b8' }}> · {empDept}</span>}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Status: <strong style={{ color: '#475569' }}>{t.status}</strong></span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Priority: <strong style={{ color: '#475569' }}>{t.priority}</strong></span>
                        {t.dueDate && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Due: <strong style={{ color: '#475569' }}>{t.dueDate}</strong></span>}
                        {t.projectName && <span style={{ fontSize: '11px', color: '#94a3b8' }}>📂 {t.projectName}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                      {(t.pmedData || (t.pmedFiles && t.pmedFiles.length > 0)) && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 12px', fontSize: '12px' }}
                            onClick={async (e) => { e.stopPropagation(); await updateStatus(t, t.status, 'Verified'); }}
                          >
                            ✓ Verify
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            style={{ padding: '5px 12px', fontSize: '12px' }}
                            onClick={async (e) => { e.stopPropagation(); await updateStatus(t, t.status, 'Rejected'); }}
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => setViewingTaskId(t.id)}
                      >
                        👁 Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {viewingTask && (
        <TaskDetailsModal
          task={viewingTask}
          employees={employees}
          onClose={() => setViewingTaskId(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
}
