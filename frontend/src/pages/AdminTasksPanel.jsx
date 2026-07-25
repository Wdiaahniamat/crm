import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';

const STATUS_CLASS = { pending: 'pill-pending', 'in-progress': 'pill-progress', completed: 'pill-completed' };
const PRIORITY_CLASS = { high: 'pill-high', medium: 'pill-medium', low: 'pill-low' };

export default function AdminTasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTaskId, setViewingTaskId] = useState(null);
  const [loading, setLoading] = useState(true);

  const viewingTask = tasks.find((t) => t.id === viewingTaskId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    const [taskRes, empRes, projRes, deptRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/users'),
      api.get('/projects'),
      api.get('/departments'),
    ]);
    setTasks(taskRes.data);
    setEmployees(empRes.data.filter((e) => e.status === 'active'));
    setProjects(projRes.data);
    setDepartments(deptRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function employeeName(id) {
    const e = employees.find((emp) => emp.id === id);
    return e ? e.name : 'Unknown';
  }

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  async function updateStatus(task, status, pmedStatus) {
    const payload = { status };
    if (pmedStatus !== undefined) payload.pmedStatus = pmedStatus;
    await api.put(`/tasks/${task.id}/status`, payload);
    load();
  }

  async function deleteTask(task) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await api.delete(`/tasks/${task.id}`);
    load();
  }

  if (loading) return <div className="empty-state">Loading tasks…</div>;

  return (
    <div>
      <div className="panel">
        <div className="panel-head">
          <h3>Task board</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowForm(true); }}>
            + Assign task
          </button>
        </div>
        <div className="panel-body">
          <div className="select-chip-row" style={{ marginBottom: 16 }}>
            {['all', 'pending', 'in-progress', 'completed'].map((s) => (
              <button key={s} className={`select-chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'all' ? 'All' : s.replace('-', ' ')}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">No tasks in this view yet.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Task</th><th>Assigned to</th><th>Priority</th><th>Due</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {[...filtered].reverse().map((t) => (
                  <tr 
                    key={t.id} 
                    onClick={() => setViewingTaskId(t.id)} 
                    style={{ cursor: 'pointer' }}
                    title="Click row to view task details, proof files, and notes"
                  >
                    <td>
                      <div style={{ color: 'var(--maroon)' }}>
                        <strong>{t.title}</strong>
                      </div>
                      {t.projectName && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          📂 {t.projectName}
                        </div>
                      )}
                    </td>
                    <td>{employeeName(t.assignedTo)}</td>
                    <td><span className={`pill ${PRIORITY_CLASS[t.priority] || 'pill-low'}`}>{t.priority}</span></td>
                    <td>{t.dueDate || '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t, e.target.value)}
                        className={`pill ${STATUS_CLASS[t.status] || 'pill-pending'}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewingTaskId(t.id)}>👁 Details</button>{' '}
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingTask(t); setShowForm(true); }}>Edit</button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteTask(t)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <TaskFormModal
          task={editingTask}
          employees={employees}
          projects={projects}
          departments={departments}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

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

function TaskFormModal({ task, employees, projects, departments, onClose, onSaved }) {
  const initialDept = (() => {
    if (task?.assignedTo) {
      const emp = employees.find((e) => e.id === task.assignedTo);
      return emp?.department || '';
    }
    return '';
  })();

  const [selectedDept, setSelectedDept] = useState(initialDept);
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assignedTo: task?.assignedTo || employees[0]?.id || '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate || '',
    projectId: task?.projectId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredEmployees = selectedDept
    ? employees.filter((e) => e.department === selectedDept)
    : employees;

  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    const filtered = dept ? employees.filter((e) => e.department === dept) : employees;
    if (filtered.length > 0) {
      // If editing task and the assigned user is in the filtered department, keep them
      if (task && task.assignedTo && filtered.some(e => e.id === task.assignedTo)) {
        setForm((prev) => ({ ...prev, assignedTo: task.assignedTo }));
      } else {
        setForm((prev) => ({ ...prev, assignedTo: filtered[0].id }));
      }
    } else {
      setForm((prev) => ({ ...prev, assignedTo: '' }));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (task) {
        await api.put(`/tasks/${task.id}`, form);
      } else {
        await api.post('/tasks', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save task.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={task ? 'Edit task' : 'Assign a new task'} onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Project</label>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">— No Project / General —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Department Filter</label>
            <select value={selectedDept} onChange={(e) => handleDeptChange(e.target.value)}>
              <option value="">— All Departments —</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Assign to</label>
          <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} required>
            {filteredEmployees.length === 0 && <option value="">No employees in this department</option>}
            {filteredEmployees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="field">
            <label>Due date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || !form.assignedTo}>
            {saving ? 'Saving…' : task ? 'Save changes' : 'Assign task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function TaskDetailsModal({ task, employees, onClose, onUpdateStatus }) {
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentTask, setCurrentTask] = useState(task);

  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  const sc = {
    'Submitted': { bg: '#fffbeb', color: '#d97706' },
    'Verified': { bg: '#f0fdf4', color: '#16a34a' },
    'Rejected': { bg: '#fef2f2', color: '#dc2626' },
    'Not Verified': { bg: '#fef2f2', color: '#dc2626' },
    'Pending Verification': { bg: '#eef2ff', color: '#4f46e5' },
  }[currentTask.pmedStatus || 'Pending Verification'] || { bg: '#f1f5f9', color: '#475569' };

  const employee = employees.find((e) => e.id === currentTask.assignedTo);
  const empName = employee ? employee.name : 'Unknown';
  const empDept = employee ? employee.department : '—';

  const handleViewFile = (data) => {
    if (!data) return;
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(
        `<iframe src="${data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const handleUpdatePmedStatus = async (status) => {
    await onUpdateStatus(currentTask, currentTask.status, status);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${currentTask.id}/comments`, { text: commentText });
      setCurrentTask(res.data);
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Modal title={`Task Details: ${currentTask.title}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
        {currentTask.description && (
          <div>
            <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>DESCRIPTION</strong>
            <p style={{ margin: 0, fontSize: '14px', color: '#1e293b', lineHeight: '1.5' }}>{currentTask.description}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>STATUS</strong>
            <span className={`pill ${STATUS_CLASS[currentTask.status] || 'pill-pending'}`}>{currentTask.status}</span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>PRIORITY</strong>
            <span className={`pill ${PRIORITY_CLASS[currentTask.priority] || 'pill-low'}`}>{currentTask.priority}</span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>DUE DATE</strong>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{currentTask.dueDate ? currentTask.dueDate : 'No due date'}</span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>RELATED PROJECT</strong>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              📂 {currentTask.projectName || 'None'}
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>ASSIGNED PERSON</strong>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              👤 {empName}
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>DEPARTMENT</strong>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
              🏢 {empDept}
            </span>
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>VERIFICATION STATUS</strong>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
              background: sc.bg, color: sc.color, textTransform: 'uppercase', display: 'inline-block'
            }}>
              {currentTask.pmedStatus || 'Pending Verification'}
            </span>
          </div>
        </div>

        {/* Work Deliverables & File Attachment Section */}
        {(currentTask.pmedFiles && currentTask.pmedFiles.length > 0) ? (
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>📄 Attached Work Deliverables / Proof Files</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
              Attached by employee for task completion verification:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentTask.pmedFiles.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'white', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', wordBreak: 'break-all', flex: 1, minWidth: '150px' }}>📎 {file.name || 'Work_Proof_File'}</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleViewFile(file.data)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      👁 View File
                    </button>
                    <a 
                      href={file.data} 
                      download={file.name || 'work_proof_file'} 
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}
                    >
                      Download File
                    </a>
                  </div>
                </div>
              ))}
            </div>

              {/* Admin Verification Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Admin Verification Review:</span>
                <button 
                  onClick={() => handleUpdatePmedStatus('Verified')}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#16a34a', border: 'none', padding: '4px 12px', fontSize: '12px' }}
                >
                  ✓ Verify & Approve Work
                </button>
                <button 
                  onClick={() => handleUpdatePmedStatus('Rejected')}
                  className="btn btn-danger btn-sm"
                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 12px', fontSize: '12px' }}
                >
                  ✕ Reject (Needs Revision)
                </button>
              </div>
          </div>
        ) : currentTask.pmedData ? (
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>📄 Attached Work Deliverable / Proof File</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
              Attached by employee for task completion verification:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'white', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', wordBreak: 'break-all', flex: 1, minWidth: '150px' }}>📎 {currentTask.pmedName || 'Work_Proof_File'}</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => handleViewFile(currentTask.pmedData)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                  >
                    👁 View File
                  </button>
                  <a 
                    href={currentTask.pmedData} 
                    download={currentTask.pmedName || 'work_proof_file'} 
                    className="btn btn-primary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}
                  >
                    Download File
                  </a>
                </div>
              </div>
              
              {/* Admin Verification Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Admin Verification Review:</span>
                <button 
                  onClick={() => handleUpdatePmedStatus('Verified')}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#16a34a', border: 'none', padding: '4px 12px', fontSize: '12px' }}
                >
                  ✓ Verify & Approve Work
                </button>
                <button 
                  onClick={() => handleUpdatePmedStatus('Rejected')}
                  className="btn btn-danger btn-sm"
                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 12px', fontSize: '12px' }}
                >
                  ✕ Reject (Needs Revision)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', border: '1px solid #e2e8f0', marginTop: '10px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No work deliverable proof file uploaded by employee yet.
          </div>
        )}

        {/* Task Notes & Q&A Thread for Admin & Employee */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>💬 Task Notes & Q&A Thread</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
            {!currentTask.comments || currentTask.comments.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '12px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                No notes or questions posted yet.
              </div>
            ) : (
              currentTask.comments.map((c) => (
                <div key={c.id || Math.random()} style={{ background: c.authorRole === 'admin' ? '#fff7ed' : '#f0f9ff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                      👤 {c.authorName} {c.authorRole && <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>({c.authorRole})</span>}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>{c.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Reply to employee or post instructions..."
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button 
              type="submit" 
              className="btn btn-primary btn-sm"
              disabled={submittingComment || !commentText.trim()}
              style={{ padding: '8px 16px' }}
            >
              {submittingComment ? 'Posting...' : 'Reply Note'}
            </button>
          </form>
        </div>

        <div className="modal-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '10px' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
