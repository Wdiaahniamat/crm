import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/Shell';
import Modal from '../components/Modal';
import api from '../api';
import { TaskDetailsModal } from './AdminTasksPanel';

const TITLES = { 
  overview: 'Business overview', 
  clients: 'Clients', 
  projects: 'Projects', 
  ongoing: 'Ongoing tasks by employee',
  board: 'Task Board',
  list: 'Task List'
};

export default function AdminBusinessConsole() {
  const [tab, setTab] = useState('overview');
  const [initialClientFilter, setInitialClientFilter] = useState('');
  const [initialProjectFilter, setInitialProjectFilter] = useState('');
  const navigate = useNavigate();

  const navGroups = [
    {
      label: 'Business console · admin only',
      items: [
        { key: 'overview', label: 'Overview', icon: '◈' },
        { key: 'clients', label: 'Clients', icon: '🏢' },
        { key: 'projects', label: 'Projects', icon: '📁' },
        { key: 'ongoing', label: 'Ongoing tasks', icon: '▤' },
        { key: 'board', label: 'Board View', icon: '📋' },
        { key: 'list', label: 'List View', icon: '☰' },
      ],
    },
    {
      label: 'Workforce',
      items: [
        { key: 'back-desk', label: 'Back to Workforce Desk', icon: '←' },
      ],
    },
  ];

  function handleNavigate(key) {
    if (key === 'back-desk') {
      navigate('/admin');
    } else {
      // Reset filters when navigating via sidebar
      setInitialClientFilter('');
      setInitialProjectFilter('');
      setTab(key);
    }
  }

  function navigateToProjects(clientId) {
    setInitialClientFilter(clientId || '');
    setInitialProjectFilter('');
    setTab('projects');
  }

  function navigateToBoard(clientId, projectId) {
    setInitialClientFilter(clientId || '');
    setInitialProjectFilter(projectId || '');
    setTab('board');
  }

  return (
    <Shell navGroups={navGroups} activeKey={tab} onNavigate={handleNavigate} title={TITLES[tab]}>
      {tab === 'overview' && <ConsoleOverviewPanel />}
      {tab === 'clients' && <ClientsPanel onNavigateToProjects={navigateToProjects} onNavigateToBoard={navigateToBoard} />}
      {tab === 'projects' && <ProjectsPanel initialClientFilter={initialClientFilter} onNavigateToBoard={navigateToBoard} />}
      {tab === 'ongoing' && <OngoingPanel />}
      {tab === 'board' && <BoardPanel initialClientFilter={initialClientFilter} initialProjectFilter={initialProjectFilter} />}
      {tab === 'list' && <ListPanel initialClientFilter={initialClientFilter} initialProjectFilter={initialProjectFilter} />}
    </Shell>
  );
}

function ClientsPanel({ onNavigateToProjects, onNavigateToBoard }) {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showLinkProject, setShowLinkProject] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, projectRes, taskRes, userRes] = await Promise.all([
        api.get('/clients'),
        api.get('/projects'),
        api.get('/tasks'),
        api.get('/users'),
      ]);
      setClients(clientRes.data);
      setProjects(projectRes.data);
      setTasks(taskRes.data);
      setEmployees(userRes.data.filter((e) => e.status === 'active'));
    } catch (err) {
      console.error('Error loading client dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sync selected client details after updates
  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find((c) => c.id === selectedClient.id);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clients, selectedClient]);

  function formatCurrency(val) {
    if (!val) return '—';
    const clean = String(val).replace(/[^0-9.]/g, '');
    if (!clean) return val;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(clean);
  }

  if (loading) return <div className="empty-state">Loading clients directory…</div>;

  // View 1: Client Full Dashboard
  if (selectedClient) {
    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedClient(null)}
            style={{ fontWeight: 600 }}
          >
            ← Back to Directory
          </button>
        </div>

        {/* Client Top Banner Card */}
        <div className="panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select 
                  value={selectedClient.status || 'active'} 
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    await api.put(`/clients/${selectedClient.id}`, { status: newStatus });
                    load();
                  }}
                  className="pill" 
                  style={{ 
                    background: selectedClient.status === 'completed' ? 'var(--green-soft)' : selectedClient.status === 'inactive' ? 'var(--red-soft)' : 'var(--maroon-soft)',
                    color: selectedClient.status === 'completed' ? 'var(--green)' : selectedClient.status === 'inactive' ? 'var(--red)' : 'var(--maroon)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    textTransform: 'uppercase'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
                <span className="pill" style={{ background: '#fef3c7', color: '#d97706' }}>
                  ★ Satisfaction: {selectedClient.satisfaction || '95/10'}
                </span>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--ink)' }}>{selectedClient.name}</h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                Lead Partner: <strong>{selectedClient.company || '—'}</strong>
              </div>

              <div style={{ borderLeft: '3px solid var(--maroon)', paddingLeft: '12px', marginTop: '16px', background: '#fafafb', padding: '12px', borderRadius: '0 6px 6px 0' }}>
                <strong style={{ display: 'block', fontSize: '13px', color: 'var(--ink)', marginBottom: '4px' }}>Account Strategy & Notes:</strong>
                <span style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{selectedClient.notes || 'No strategy notes recorded yet.'}</span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', width: '280px', overflow: 'hidden' }}>
              <table style={{ margin: 0, fontSize: '13px' }}>
                <tbody>
                  <tr>
                    <td style={{ background: '#f8fafc', fontWeight: 600, padding: '10px 12px' }}>Contract Valuation</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '10px 12px' }}>{formatCurrency(selectedClient.contractValuation)}</td>
                  </tr>
                  <tr>
                    <td style={{ background: '#f8fafc', fontWeight: 600, padding: '10px 12px' }}>Renewal Date</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '10px 12px' }}>{selectedClient.renewalDate || '—'}</td>
                  </tr>
                  <tr>
                    <td style={{ background: '#f8fafc', fontWeight: 600, padding: '10px 12px' }}>Linked Projects</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '10px 12px' }}>{projects.filter(p => p.clientId === selectedClient.id).length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Details Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start', marginBottom: '24px' }}>
          {/* Associated Projects Panel */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-head">
              <h3>📂 ASSOCIATED PROJECTS</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)' }}
                  onClick={() => setShowLinkProject(!showLinkProject)}
                >
                  {showLinkProject ? '✕ Cancel' : '+ Link New Project'}
                </button>
              </div>
            </div>
            <div className="panel-body">
              {showLinkProject && (
                <LinkProjectForm 
                  client={selectedClient} 
                  employees={employees} 
                  onSaved={() => { setShowLinkProject(false); load(); }} 
                />
              )}
              
              <AssociatedProjectsList 
                client={selectedClient}
                projects={projects}
                tasks={tasks}
                onProjectClick={(p) => setShowProjectDetails(p)}
                onNavigateToBoard={onNavigateToBoard}
              />

              {/* Cross-tab navigation links */}
              {projects.filter(p => p.clientId === selectedClient.id).length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)', fontWeight: 600, fontSize: '12px' }}
                    onClick={() => onNavigateToProjects && onNavigateToProjects(selectedClient.id)}
                  >
                    📁 View in Projects Tab →
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--indigo, #6366f1)', borderColor: 'var(--indigo, #6366f1)', fontWeight: 600, fontSize: '12px' }}
                    onClick={() => onNavigateToBoard && onNavigateToBoard(selectedClient.id)}
                  >
                    📋 View Tasks in Board →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Communication Logs Panel */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-head">
              <h3>📞 ACCOUNT COMMUNICATION LOGS</h3>
            </div>
            <div className="panel-body">
              <RecordCommunicationForm 
                client={selectedClient}
                onSaved={() => load()}
              />
              
              <CommunicationLogsFeed 
                client={selectedClient}
                logs={selectedClient.logs || []}
                onSaved={() => load()}
              />
            </div>
          </div>
        </div>

        {/* Vaults section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          <DocumentVaultPanel client={selectedClient} onSaved={load} />
          <ClientReportsPanel client={selectedClient} onSaved={load} />
        </div>

        {/* Project Details Modal */}
        {showProjectDetails && (
          <Modal 
            title={`Project Detail: ${showProjectDetails.name}`} 
            onClose={() => setShowProjectDetails(null)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Project Status */}
              <div>
                <span className={`pill ${showProjectDetails.status === 'completed' ? 'pill-completed' : showProjectDetails.status === 'on-hold' ? 'pill-pending' : 'pill-progress'}`}>
                  Status: {showProjectDetails.status}
                </span>
                <p style={{ marginTop: '8px', fontSize: '13.5px', color: 'var(--text-muted)', lineBreak: 'anywhere' }}>
                  {showProjectDetails.description || 'No project description.'}
                </p>
              </div>

              {/* Ongoing Tasks */}
              <div>
                <h4 style={{ color: 'var(--maroon)', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px' }}>
                  📋 Ongoing Tasks
                </h4>
                {(() => {
                  const ongoingTasks = tasks.filter(t => t.projectId === showProjectDetails.id && t.status !== 'completed');
                  if (ongoingTasks.length === 0) {
                    return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No ongoing tasks for this project.</div>;
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ongoingTasks.map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--canvas)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
                          <div>
                            <strong>{t.title}</strong>
                            {t.dueDate && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Due: {t.dueDate}</span>}
                          </div>
                          <span className={`pill pill-${t.priority}`}>{t.priority}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Assigned Employees */}
              <div>
                <h4 style={{ color: 'var(--maroon)', fontSize: '13.5px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px' }}>
                  👥 Assigned Employees
                </h4>
                {(() => {
                  const assignedEmps = employees.filter(emp => showProjectDetails.employeeIds?.includes(emp.id));
                  if (assignedEmps.length === 0) {
                    return <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No employees assigned to this project yet.</div>;
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {assignedEmps.map(emp => (
                        <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--canvas)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
                          <div>
                            <strong>{emp.name}</strong> — <span style={{ color: 'var(--text-muted)' }}>{emp.department}</span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.email}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="modal-actions" style={{ marginTop: '10px', borderTop: 'none', paddingTop: 0 }}>
                <button className="btn btn-ghost" onClick={() => setShowProjectDetails(null)}>Close</button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // View 2: Clients Directory Grid
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', marginBottom: '4px' }}>Clients Directory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
            Overview of corporate account relationships, contract values, and satisfaction indexes
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ background: 'var(--maroon)' }}>
          + Add New Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="empty-state">No clients yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {clients.map((c) => {
            const clientProjects = projects.filter(p => p.clientId === c.id);
            const activeProjCount = clientProjects.filter(p => p.status === 'ongoing').length;
            return (
              <div key={c.id} className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }}>
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: 'none' }}>
                  <select 
                    value={c.status || 'active'} 
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      await api.put(`/clients/${c.id}`, { status: newStatus });
                      load();
                    }}
                    className="pill" 
                    style={{ 
                      background: c.status === 'completed' ? 'var(--green-soft)' : c.status === 'inactive' ? 'var(--red-soft)' : 'var(--maroon-soft)',
                      color: c.status === 'completed' ? 'var(--green)' : c.status === 'inactive' ? 'var(--red)' : 'var(--maroon)',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '3px 8px',
                      textTransform: 'uppercase'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <span className="pill" style={{ background: '#fef3c7', color: '#d97706', fontSize: '11px', fontWeight: 700 }}>
                    ★ {c.satisfaction || '95/10'}
                  </span>
                </div>
                
                {/* Card Body */}
                <div style={{ padding: '0 20px 16px', flexGrow: 1 }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', marginBottom: '4px' }}>{c.name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Lead Partner: <strong>{c.company || 'Individual Client'}</strong>
                  </div>

                  {/* Gray Bubble */}
                  <div style={{ background: 'var(--canvas)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Contract Valuation</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                        {formatCurrency(c.contractValuation)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Renewal Date</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                        {c.renewalDate || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Active Projects Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                    <span className="pill" style={{ background: 'var(--maroon-soft)', color: 'var(--maroon)', fontSize: '11px', padding: '3px 8px' }}>
                      {activeProjCount} Active Projects
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Click to configure summary</span>
                  </div>
                </div>

                {/* Card Footer Link */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: '#fafafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button 
                    className="btn-link"
                    style={{ background: 'none', border: 'none', color: 'var(--maroon)', fontWeight: 700, cursor: 'pointer', fontSize: '13.5px', padding: 0 }}
                    onClick={() => setSelectedClient(c)}
                  >
                    Full Detail View →
                  </button>
                  <button 
                    className="btn btn-danger btn-sm" 
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={() => {
                      if (confirm(`Remove client "${c.name}"?`)) {
                        api.delete(`/clients/${c.id}`).then(() => load());
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title="Add client" onClose={() => setShowForm(false)}>
          <ClientForm onSaved={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}

function ClientForm({ onSaved, onClose }) {
  const [form, setForm] = useState({ 
    name: '', 
    company: '', 
    email: '', 
    phone: '', 
    notes: '',
    contractValuation: '',
    renewalDate: '',
    satisfaction: '95/10',
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/clients', form);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field"><label>Contact name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="field"><label>Company (Lead Partner)</label><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
      <div className="field-row">
        <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Contract Valuation ($)</label><input type="number" placeholder="50000" value={form.contractValuation} onChange={(e) => setForm({ ...form, contractValuation: e.target.value })} /></div>
        <div className="field"><label>Renewal Date</label><input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Satisfaction Score</label><input placeholder="95/10" value={form.satisfaction} onChange={(e) => setForm({ ...form, satisfaction: e.target.value })} /></div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className="field"><label>Account Strategy & Notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add client'}</button>
      </div>
    </form>
  );
}

function LinkProjectForm({ client, employees, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [employeeIds, setEmployeeIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleEmployee(id) {
    setEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/projects', {
        name,
        clientId: client.id,
        description,
        employeeIds,
        status: 'ongoing',
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not link project.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fdf2f4', border: '1px solid rgba(128, 0, 32, 0.1)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
      <h4 style={{ color: 'var(--maroon)', fontSize: '13.5px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Link New Project</h4>
      {error && <div className="error-banner">{error}</div>}
      
      <div className="field">
        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Project Name</label>
        <input required placeholder="e.g., Enterprise Rollout" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      
      <div className="field">
        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Scope Description</label>
        <textarea rows={2} placeholder="Link summary..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      
      <div className="field">
        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Assigned Team</label>
        <div className="select-chip-row">
          {employees.map((e) => (
            <button 
              type="button" 
              key={e.id} 
              className={`select-chip ${employeeIds.includes(e.id) ? 'active' : ''}`} 
              onClick={() => toggleEmployee(e.id)}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              {e.name}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-block" disabled={saving} style={{ background: 'var(--maroon)', padding: '8px 16px', fontSize: '13px' }}>
        {saving ? 'Linking…' : 'Create & Associate Project'}
      </button>
    </form>
  );
}

function AssociatedProjectsList({ client, projects, tasks, onProjectClick, onNavigateToBoard }) {
  const clientProjects = projects.filter((p) => p.clientId === client.id);

  if (clientProjects.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13.5px', padding: '12px 0' }}>No associated projects yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {clientProjects.map((p) => {
        // Calculate tasks metrics
        const projTasks = tasks.filter((t) => t.projectId === p.id);
        const completedTasks = projTasks.filter((t) => t.status === 'completed').length;
        const totalTasks = projTasks.length;

        // Format date
        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '7/17/2026';

        return (
          <div 
            key={p.id} 
            style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', background: '#fff', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <button 
                type="button"
                className="btn-link"
                style={{ background: 'none', border: 'none', color: 'var(--ink)', fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                onClick={() => onProjectClick(p)}
                title="Click to view details"
              >
                {p.name}
              </button>
              <span className={`pill ${p.status === 'completed' ? 'pill-completed' : p.status === 'on-hold' ? 'pill-pending' : 'pill-progress'}`} style={{ fontSize: '10px' }}>
                {p.status}
              </span>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineBreak: 'anywhere' }}>
              {p.description || 'No scope description provided.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pill" style={{ background: 'var(--maroon-soft)', color: 'var(--maroon)', fontSize: '10.5px', padding: '2px 8px' }}>
                  {completedTasks}/{totalTasks} tasks done
                </span>
                {totalTasks > 0 && onNavigateToBoard && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--indigo, #6366f1)', fontWeight: 600, cursor: 'pointer', fontSize: '11px', padding: 0 }}
                    onClick={() => onNavigateToBoard(client.id, p.id)}
                    title="View project tasks in Board"
                  >
                    View in Board →
                  </button>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)' }}>Registered {createdDate}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecordCommunicationForm({ client, onSaved }) {
  const [type, setType] = useState('Email Exchange');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!notes.trim()) return;

    setSaving(true);
    try {
      const newLog = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      
      const updatedLogs = [newLog, ...(client.logs || [])];
      await api.put(`/clients/${client.id}`, { logs: updatedLogs });
      setNotes('');
      onSaved();
    } catch (err) {
      console.error('Error saving communication log', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fafafb', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
      <h4 style={{ color: 'var(--maroon)', fontSize: '13.5px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Record Communication</h4>
      
      <div className="field">
        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Interaction Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Email Exchange">✉ Email Exchange</option>
          <option value="Phone Call">📞 Phone Call</option>
          <option value="Video Call">🎥 Video Call</option>
          <option value="In-Person Meeting">🤝 In-Person Meeting</option>
        </select>
      </div>

      <div className="field">
        <label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Summary Notes</label>
        <textarea 
          rows={3} 
          required
          placeholder="Discussed project milestones and contract renewal terms..." 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
        />
      </div>

      <button className="btn btn-primary btn-block" disabled={saving} style={{ background: 'var(--maroon)', padding: '8px 16px', fontSize: '13px' }}>
        {saving ? 'Recording…' : 'Record Interaction Log'}
      </button>
    </form>
  );
}

function CommunicationLogsFeed({ client, logs, onSaved }) {
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(logId) {
    try {
      const updatedLogs = logs.filter((l) => l.id !== logId);
      await api.put(`/clients/${client.id}`, { logs: updatedLogs });
      setDeletingId(null);
      onSaved();
    } catch (err) {
      console.error('Error deleting communication log', err);
    }
  }

  if (!logs || logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13.5px', padding: '24px 0' }}>
        No communication notes logged yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
      {logs.map((log) => (
        <div 
          key={log.id} 
          style={{ borderLeft: '3px solid var(--maroon)', background: 'var(--canvas)', borderRadius: '0 8px 8px 0', padding: '12px 14px', position: 'relative' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>{log.type}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(log.createdAt).toLocaleString()}
              </span>
              {deletingId === log.id ? (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id)}
                    style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(null)}
                    style={{ background: 'var(--border)', color: 'var(--ink)', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setDeletingId(log.id)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--red)', 
                    cursor: 'pointer', 
                    fontSize: '14px', 
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7
                  }}
                  title="Delete Log"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0, paddingRight: '20px' }}>
            {log.notes}
          </p>
        </div>
      ))}
    </div>
  );
}

function DocumentVaultPanel({ client, onSaved }) {
  const [deletingId, setDeletingId] = useState(null);
  const [mockName, setMockName] = useState('');
  const [showMockInput, setShowMockInput] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const newFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size > 1024 * 1024 
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
          : (file.size / 1024).toFixed(1) + ' KB',
        uploadedAt: new Date().toISOString(),
        status: 'pending'
      };
      const updatedVault = [...(client.vaultFiles || []), newFile];
      await api.put(`/clients/${client.id}`, { vaultFiles: updatedVault });
      onSaved();
    } catch (err) {
      console.error('Error attaching vault file', err);
    }
  }

  async function handleMockAttach() {
    if (!mockName.trim()) return;
    try {
      const newFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: mockName.trim(),
        size: '142.5 KB',
        uploadedAt: new Date().toISOString(),
        status: 'pending'
      };
      const updatedVault = [...(client.vaultFiles || []), newFile];
      await api.put(`/clients/${client.id}`, { vaultFiles: updatedVault });
      setMockName('');
      setShowMockInput(false);
      onSaved();
    } catch (err) {
      console.error('Error attaching vault file', err);
    }
  }

  async function approveFile(fileId) {
    try {
      const file = (client.vaultFiles || []).find((f) => f.id === fileId);
      if (!file) return;
      const updatedVault = (client.vaultFiles || []).filter((f) => f.id !== fileId);
      const approvedFile = { ...file, status: 'approved', approvedAt: new Date().toISOString() };
      const updatedReports = [...(client.reportFiles || []), approvedFile];
      await api.put(`/clients/${client.id}`, {
        vaultFiles: updatedVault,
        reportFiles: updatedReports
      });
      onSaved();
    } catch (err) {
      console.error('Error approving vault file', err);
    }
  }

  async function removeFile(fileId) {
    try {
      const updatedVault = (client.vaultFiles || []).filter((f) => f.id !== fileId);
      await api.put(`/clients/${client.id}`, { vaultFiles: updatedVault });
      setDeletingId(null);
      onSaved();
    } catch (err) {
      console.error('Error removing vault file', err);
    }
  }

  const files = client.vaultFiles || [];

  return (
    <div className="panel" style={{ marginBottom: 0 }}>
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>📄 DOCUMENT VAULT</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showMockInput ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="document.pdf" 
                value={mockName} 
                onChange={(e) => setMockName(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', width: '130px' }}
              />
              <button 
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleMockAttach}
                style={{ background: 'var(--maroon)', padding: '4px 8px', fontSize: '11px', border: 'none', color: 'white', borderRadius: '4px' }}
              >
                Add
              </button>
              <button 
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => { setShowMockInput(false); setMockName(''); }}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                id={`vault-file-${client.id}`} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              <button 
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => document.getElementById(`vault-file-${client.id}`).click()}
                style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)', fontWeight: 600 }}
              >
                + Attach File
              </button>
              <button 
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowMockInput(true)}
                style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)', fontWeight: 600, marginLeft: '8px' }}
              >
                + Mock File
              </button>
            </>
          )}
        </div>
      </div>
      <div className="panel-body" style={{ minHeight: '150px' }}>
        {files.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '24px', marginBottom: '4px' }}>🔒</span>
            <div style={{ fontSize: '13px' }}>Secure vault active. No pending files.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {files.map((file) => (
              <div 
                key={file.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: 'var(--canvas)', 
                  padding: '10px 12px', 
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '18px' }}>📄</span>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }} title={file.name}>
                      {file.name}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {file.size} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <span className="pill pill-pending" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                    Pending
                  </span>
                  <button 
                    type="button"
                    className="btn btn-sm" 
                    onClick={() => approveFile(file.id)}
                    style={{ background: 'var(--green)', color: 'white', padding: '3px 8px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Approve
                  </button>
                  {deletingId === file.id ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        style={{ background: 'var(--border)', color: 'var(--ink)', border: 'none', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      className="btn btn-sm btn-ghost" 
                      onClick={() => setDeletingId(file.id)}
                      style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '3px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientReportsPanel({ client, onSaved }) {
  const [deletingId, setDeletingId] = useState(null);
  const [mockName, setMockName] = useState('');
  const [showMockInput, setShowMockInput] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const newFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size > 1024 * 1024 
          ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
          : (file.size / 1024).toFixed(1) + ' KB',
        uploadedAt: new Date().toISOString(),
        status: 'approved',
        direct: true
      };
      const updatedReports = [...(client.reportFiles || []), newFile];
      await api.put(`/clients/${client.id}`, { reportFiles: updatedReports });
      onSaved();
    } catch (err) {
      console.error('Error attaching report file', err);
    }
  }

  async function handleMockAttach() {
    if (!mockName.trim()) return;
    try {
      const newFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: mockName.trim(),
        size: '250.0 KB',
        uploadedAt: new Date().toISOString(),
        status: 'approved',
        direct: true
      };
      const updatedReports = [...(client.reportFiles || []), newFile];
      await api.put(`/clients/${client.id}`, { reportFiles: updatedReports });
      setMockName('');
      setShowMockInput(false);
      onSaved();
    } catch (err) {
      console.error('Error attaching report file', err);
    }
  }

  async function removeFile(fileId) {
    try {
      const updatedReports = (client.reportFiles || []).filter((f) => f.id !== fileId);
      await api.put(`/clients/${client.id}`, { reportFiles: updatedReports });
      setDeletingId(null);
      onSaved();
    } catch (err) {
      console.error('Error removing report file', err);
    }
  }

  const files = client.reportFiles || [];

  return (
    <div className="panel" style={{ marginBottom: 0 }}>
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>📊 CLIENT EXPORTS & REPORTS</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showMockInput ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="report.pdf" 
                value={mockName} 
                onChange={(e) => setMockName(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', width: '130px' }}
              />
              <button 
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleMockAttach}
                style={{ background: 'var(--maroon)', padding: '4px 8px', fontSize: '11px', border: 'none', color: 'white', borderRadius: '4px' }}
              >
                Add
              </button>
              <button 
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => { setShowMockInput(false); setMockName(''); }}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                id={`report-file-${client.id}`} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              <button 
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => document.getElementById(`report-file-${client.id}`).click()}
                style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)', fontWeight: 600 }}
              >
                + Attach Report/File
              </button>
              <button 
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowMockInput(true)}
                style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)', fontWeight: 600, marginLeft: '8px' }}
              >
                + Mock File
              </button>
            </>
          )}
        </div>
      </div>
      <div className="panel-body" style={{ minHeight: '150px' }}>
        {files.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '24px', marginBottom: '4px' }}>📂</span>
            <div style={{ fontSize: '13px' }}>Ready for summaries. No files attached.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {files.map((file) => (
              <div 
                key={file.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: 'var(--canvas)', 
                  padding: '10px 12px', 
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }} title={file.name}>
                      {file.name}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {file.size} • {new Date(file.uploadedAt).toLocaleDateString()} {file.direct ? '(Direct)' : '(From Vault)'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <span className="pill pill-completed" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                    Approved
                  </span>
                  {deletingId === file.id ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        style={{ background: 'var(--border)', color: 'var(--ink)', border: 'none', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      className="btn btn-sm btn-ghost" 
                      onClick={() => setDeletingId(file.id)}
                      style={{ color: 'var(--red)', borderColor: 'var(--red)', padding: '3px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BoardPanel({ initialClientFilter, initialProjectFilter }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [clientFilter, setClientFilter] = useState(initialClientFilter || '');
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter || '');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Editing state
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [viewingTaskId, setViewingTaskId] = useState(null);

  const viewingTask = tasks.find((t) => t.id === viewingTaskId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes, eRes, cRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects'),
        api.get('/users'),
        api.get('/clients')
      ]);
      setTasks(tRes.data);
      setProjects(pRes.data);
      setEmployees(eRes.data.filter(e => e.status === 'active'));
      setClients(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(taskId, newStatus) {
    try {
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      load();
    } catch (err) {
      console.error('Error updating task status', err);
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.delete(`/tasks/${taskId}`);
      setDeletingTaskId(null);
      load();
    } catch (err) {
      console.error('Error deleting task', err);
    }
  }

  if (loading) return <div className="empty-state">Loading board…</div>;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (employeeFilter && t.assignedTo !== employeeFilter) return false;
    
    if (projectFilter) {
      if (t.projectId !== projectFilter) return false;
    } else if (clientFilter) {
      const clientProjectIds = projects.filter(p => p.clientId === clientFilter).map(p => p.id);
      if (!t.projectId || !clientProjectIds.includes(t.projectId)) return false;
    }
    
    return true;
  });

  const columns = {
    pending: { title: 'To Do', color: 'var(--amber)', tasks: filteredTasks.filter(t => t.status === 'pending') },
    'in-progress': { title: 'In Progress', color: 'var(--indigo)', tasks: filteredTasks.filter(t => t.status === 'in-progress') },
    completed: { title: 'Completed', color: 'var(--green)', tasks: filteredTasks.filter(t => t.status === 'completed') }
  };

  const filteredProjects = clientFilter 
    ? projects.filter(p => p.clientId === clientFilter)
    : projects;

  return (
    <div>
      {/* Filters Toolbar */}
      <div className="panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            <div style={{ minWidth: '160px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Client</label>
              <select 
                value={clientFilter} 
                onChange={(e) => { setClientFilter(e.target.value); setProjectFilter(''); }}
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">— All Clients —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Project</label>
              <select 
                value={projectFilter} 
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">— All Projects —</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Employee</label>
              <select 
                value={employeeFilter} 
                onChange={(e) => setEmployeeFilter(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">— All Employees —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <button 
              type="button"
              className="btn btn-primary btn-sm" 
              style={{ background: 'var(--maroon)' }}
              onClick={() => { setEditingTask(null); setShowForm(true); }}
            >
              + Create Task
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
        {Object.entries(columns).map(([colId, col]) => (
          <div 
            key={colId} 
            className="panel" 
            style={{ 
              background: '#f8fafc', 
              borderRadius: '8px', 
              border: '1px solid var(--border)', 
              padding: '16px', 
              minHeight: '600px', 
              display: 'flex', 
              flexDirection: 'column',
              marginBottom: 0
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: `2px solid ${col.color}`, paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--ink)' }}>{col.title}</h3>
              <span className="pill" style={{ background: col.color, color: 'white', fontSize: '11px', fontWeight: 700, padding: '2px 8px' }}>
                {col.tasks.length}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto' }}>
              {col.tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: '6px', background: 'white' }}>
                  No tasks
                </div>
              ) : (
                col.tasks.map((task) => {
                  const assignee = employees.find(e => e.id === task.assignedTo);
                  const project = projects.find(p => p.id === task.projectId);
                  const client = project ? clients.find(c => c.id === project.clientId) : null;
                  
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => setViewingTaskId(task.id)}
                      style={{ 
                        background: 'white', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border)', 
                        borderLeft: `4px solid ${
                          task.priority === 'high' ? 'var(--red)' : task.priority === 'medium' ? 'var(--amber)' : '#94a3b8'
                        }`,
                        padding: '14px', 
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                      title="Click card to view details, deliverables & notes"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--ink)', fontWeight: 700, lineHeight: 1.3 }}>{task.title}</strong>
                        <span className={`pill pill-${task.priority}`} style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', textTransform: 'uppercase' }}>
                          {task.priority}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {task.description}
                        </p>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: 'var(--text)', borderTop: '1px dashed var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                        <div>📂 Project: <strong>{project ? project.name : 'General'}</strong></div>
                        {client && <div>🏢 Client: <strong>{client.name}</strong></div>}
                        <div>👤 Assignee: <strong>{assignee ? assignee.name : 'Unknown'}</strong></div>
                        {task.dueDate && <div>📅 Due: <strong>{task.dueDate}</strong></div>}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={task.status} 
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="pill"
                          style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            border: '1px solid var(--border)', 
                            background: 'white',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            type="button"
                            className="btn btn-ghost" 
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            onClick={() => setViewingTaskId(task.id)}
                          >
                            👁 Details
                          </button>
                          <button 
                            type="button"
                            className="btn btn-ghost" 
                            style={{ padding: '2px 6px', fontSize: '11px' }}
                            onClick={() => { setEditingTask(task); setShowForm(true); }}
                          >
                            Edit
                          </button>
                          {deletingTaskId === task.id ? (
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleDeleteTask(task.id)}
                                style={{ background: 'var(--red)', color: 'white', padding: '2px 4px', fontSize: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => setDeletingTaskId(null)}
                                style={{ padding: '2px 4px', fontSize: '10px', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              className="btn btn-ghost" 
                              style={{ padding: '2px 6px', fontSize: '11px', color: 'var(--red)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
                              onClick={() => setDeletingTaskId(task.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <TaskFormModal
          task={editingTask}
          employees={employees}
          projects={projects}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {viewingTask && (
        <TaskDetailsModal
          task={viewingTask}
          employees={employees}
          onClose={() => setViewingTaskId(null)}
          onUpdateStatus={async (tItem, status, pmedStatus) => {
            await handleStatusChange(tItem.id, status);
            if (pmedStatus) {
              await api.put(`/tasks/${tItem.id}/status`, { status, pmedStatus });
            }
            load();
          }}
        />
      )}
    </div>
  );
}

function ListPanel({ initialClientFilter, initialProjectFilter }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [clientFilter, setClientFilter] = useState(initialClientFilter || '');
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter || '');
  const [employeeFilter, setEmployeeFilter] = useState('');

  // Editing state
  const [editingTask, setEditingTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes, eRes, cRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects'),
        api.get('/users'),
        api.get('/clients')
      ]);
      setTasks(tRes.data);
      setProjects(pRes.data);
      setEmployees(eRes.data.filter(e => e.status === 'active'));
      setClients(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(taskId, newStatus) {
    try {
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      load();
    } catch (err) {
      console.error('Error updating task status', err);
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.delete(`/tasks/${taskId}`);
      setDeletingTaskId(null);
      load();
    } catch (err) {
      console.error('Error deleting task', err);
    }
  }

  if (loading) return <div className="empty-state">Loading tasks…</div>;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (employeeFilter && t.assignedTo !== employeeFilter) return false;
    
    if (projectFilter) {
      if (t.projectId !== projectFilter) return false;
    } else if (clientFilter) {
      const clientProjectIds = projects.filter(p => p.clientId === clientFilter).map(p => p.id);
      if (!t.projectId || !clientProjectIds.includes(t.projectId)) return false;
    }
    
    return true;
  });

  const filteredProjects = clientFilter 
    ? projects.filter(p => p.clientId === clientFilter)
    : projects;

  const STATUS_CLASS = { pending: 'pill-pending', 'in-progress': 'pill-progress', completed: 'pill-completed' };
  const PRIORITY_CLASS = { high: 'pill-high', medium: 'pill-medium', low: 'pill-low' };

  return (
    <div className="panel">
      {/* Filters Toolbar */}
      <div className="panel-head" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '160px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Client</label>
              <select 
                value={clientFilter} 
                onChange={(e) => { setClientFilter(e.target.value); setProjectFilter(''); }}
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">— All Clients —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Project</label>
              <select 
                value={projectFilter} 
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">— All Projects —</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ minWidth: '160px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Employee</label>
              <select 
                value={employeeFilter} 
                onChange={(e) => setEmployeeFilter(e.target.value)}
                style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
              >
                <option value="">— All Employees —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <button 
              type="button"
              className="btn btn-primary btn-sm" 
              style={{ background: 'var(--maroon)' }}
              onClick={() => { setEditingTask(null); setShowForm(true); }}
            >
              + Create Task
            </button>
          </div>
        </div>
      </div>

      <div className="panel-body">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">No tasks match the filters.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Client / Project</th>
                <th>Assigned to</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filteredTasks].reverse().map((t) => {
                const assignee = employees.find(e => e.id === t.assignedTo);
                const project = projects.find(p => p.id === t.projectId);
                const client = project ? clients.find(c => c.id === project.clientId) : null;
                
                return (
                  <tr key={t.id}>
                    <td>
                      <div><strong>{t.title}</strong></div>
                      {t.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.description}</div>}
                    </td>
                    <td>
                      {project ? (
                        <div>
                          <strong>{project.name}</strong>
                          {client && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🏢 {client.name}</div>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>{assignee ? assignee.name : 'Unknown'}</td>
                    <td><span className={`pill ${PRIORITY_CLASS[t.priority]}`}>{t.priority}</span></td>
                    <td>{t.dueDate || '—'}</td>
                    <td>
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className={`pill ${STATUS_CLASS[t.status]}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingTask(t); setShowForm(true); }}>Edit</button>{' '}
                      {deletingTaskId === t.id ? (
                        <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', marginLeft: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            style={{ background: 'var(--red)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTaskId(null)}
                            style={{ background: 'var(--border)', color: 'var(--ink)', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => setDeletingTaskId(t.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <TaskFormModal
          task={editingTask}
          employees={employees}
          projects={projects}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function TaskFormModal({ task, employees, projects, onClose, onSaved }) {
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
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Assign to</label>
            <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} required>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
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

function ProjectsPanel({ initialClientFilter, onNavigateToBoard }) {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState(initialClientFilter || '');

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes, eRes, tRes] = await Promise.all([api.get('/projects'), api.get('/clients'), api.get('/users'), api.get('/tasks')]);
    setProjects(pRes.data);
    setClients(cRes.data);
    setEmployees(eRes.data.filter((e) => e.status === 'active'));
    setTasks(tRes.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Apply initialClientFilter when it changes (cross-tab navigation)
  useEffect(() => {
    if (initialClientFilter) setClientFilter(initialClientFilter);
  }, [initialClientFilter]);

  function clientName(id) { return clients.find((c) => c.id === id)?.name || '—'; }

  async function setStatus(p, status) {
    await api.put(`/projects/${p.id}`, { status });
    load();
  }

  async function remove(p) {
    if (!confirm(`Delete project "${p.name}"?`)) return;
    await api.delete(`/projects/${p.id}`);
    load();
  }

  if (loading) return <div className="empty-state">Loading projects…</div>;

  const filteredProjects = clientFilter
    ? projects.filter(p => p.clientId === clientFilter)
    : projects;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Projects</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ minWidth: '180px' }}>
            <select 
              value={clientFilter} 
              onChange={(e) => setClientFilter(e.target.value)}
              style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px' }}
            >
              <option value="">— All Clients —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ New project</button>
        </div>
      </div>
      <div className="panel-body">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">{clientFilter ? 'No projects for this client.' : 'No projects yet.'}</div>
        ) : (
          <table>
            <thead><tr><th>Project</th><th>Client</th><th>Team</th><th>Tasks</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filteredProjects.map((p) => {
                const projTasks = tasks.filter(t => t.projectId === p.id);
                const completedCount = projTasks.filter(t => t.status === 'completed').length;
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.description && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                    </td>
                    <td>{clientName(p.clientId)}</td>
                    <td>{p.employeeIds.length} member{p.employeeIds.length !== 1 ? 's' : ''}</td>
                    <td>
                      <span className="pill" style={{ background: 'var(--maroon-soft)', color: 'var(--maroon)', fontSize: '10.5px', padding: '2px 8px' }}>
                        {completedCount}/{projTasks.length}
                      </span>
                    </td>
                    <td>
                      <select value={p.status} onChange={(e) => setStatus(p, e.target.value)} className={`pill ${p.status === 'completed' ? 'pill-completed' : p.status === 'on-hold' ? 'pill-pending' : 'pill-progress'}`} style={{ border: 'none', cursor: 'pointer' }}>
                        <option value="ongoing">Ongoing</option>
                        <option value="on-hold">On hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {onNavigateToBoard && (
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ fontSize: '11px', marginRight: '4px' }}
                          onClick={() => onNavigateToBoard(p.clientId, p.id)}
                          title="View tasks in Board"
                        >
                          📋 Board
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {showForm && (
        <Modal title="New project" onClose={() => setShowForm(false)}>
          <ProjectForm clients={clients} employees={employees} onSaved={() => { setShowForm(false); load(); }} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}

function ProjectForm({ clients, employees, onSaved, onClose }) {
  const [form, setForm] = useState({ name: '', clientId: '', description: '', employeeIds: [] });
  const [saving, setSaving] = useState(false);

  function toggleEmployee(id) {
    setForm((f) => ({
      ...f,
      employeeIds: f.employeeIds.includes(id) ? f.employeeIds.filter((x) => x !== id) : [...f.employeeIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/projects', form);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field"><label>Project name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="field">
        <label>Client</label>
        <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
          <option value="">No client linked</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="field"><label>Description</label><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="field">
        <label>Team members</label>
        <div className="select-chip-row">
          {employees.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No active employees yet.</span>}
          {employees.map((e) => (
            <button type="button" key={e.id} className={`select-chip ${form.employeeIds.includes(e.id) ? 'active' : ''}`} onClick={() => toggleEmployee(e.id)}>
              {e.name}
            </button>
          ))}
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create project'}</button>
      </div>
    </form>
  );
}

function OngoingPanel() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [tRes, eRes] = await Promise.all([api.get('/tasks'), api.get('/users')]);
      setTasks(tRes.data);
      setEmployees(eRes.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="empty-state">Loading…</div>;

  const active = employees.filter((e) => e.status === 'active');

  return (
    <div className="panel">
      <div className="panel-head"><h3>Ongoing tasks by employee</h3></div>
      <div className="panel-body">
        {active.length === 0 ? (
          <div className="empty-state">No employees yet.</div>
        ) : (
          active.map((e) => {
            const empTasks = tasks.filter((t) => t.assignedTo === e.id && t.status !== 'completed');
            return (
              <div key={e.id} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>{e.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({empTasks.length} ongoing)</span></div>
                {empTasks.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing in progress.</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {empTasks.map((t) => (
                      <li key={t.id} style={{ fontSize: 13.5, marginBottom: 3 }}>
                        {t.title} <span className={`pill pill-${t.status === 'in-progress' ? 'progress' : 'pending'}`}>{t.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ConsoleOverviewPanel() {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([api.get('/clients'), api.get('/projects')]);
        setClients(cRes.data);
        setProjects(pRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="empty-state">Loading overview…</div>;

  const ongoingProjects = projects.filter((p) => p.status === 'ongoing');

  function getClientName(clientId) {
    return clients.find((c) => c.id === clientId)?.name || '—';
  }

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="num">{clients.length}</div>
          <div className="label">Total Clients</div>
        </div>
        <div className="stat-card">
          <div className="num">{ongoingProjects.length}</div>
          <div className="label">Ongoing Projects</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Clients Summary List */}
        <div className="panel">
          <div className="panel-head">
            <h3>Active Clients</h3>
          </div>
          <div className="panel-body">
            {clients.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>No clients registered yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clients.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--ink)' }}>{c.name}</strong>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{c.company || 'Individual Client'}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px' }}>
                      <div>{c.email || '—'}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{c.phone || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ongoing Projects Summary List */}
        <div className="panel">
          <div className="panel-head">
            <h3>Ongoing Projects</h3>
          </div>
          <div className="panel-body">
            {ongoingProjects.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>No ongoing projects right now.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ongoingProjects.map((p) => (
                  <div key={p.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--ink)' }}>{p.name}</strong>
                      <span className="pill pill-progress" style={{ fontSize: '10px' }}>{p.status}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-muted)', lineBreak: 'anywhere' }}>
                      {p.description || 'No description provided.'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
                      <span>Client: <strong>{getClientName(p.clientId)}</strong></span>
                      <span>Team: <strong>{p.employeeIds?.length || 0} members</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
