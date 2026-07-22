import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminEmployeesPanel({ onSwitchToEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(emp) {
    const status = emp.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/users/${emp.id}/status`, { status });
      if (selectedEmployee && selectedEmployee.id === emp.id) {
        setSelectedEmployee((prev) => ({ ...prev, status }));
      }
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update status.');
    }
  }

  async function saveDetails(empId, payload) {
    try {
      const res = await api.put(`/users/${empId}`, payload);
      setSelectedEmployee(res.data);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save employee details.');
    }
  }

  async function deleteEmployee(emp) {
    if (!confirm(`Are you absolutely sure you want to permanently delete "${emp.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/users/${emp.id}`);
      setSelectedEmployee(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete employee.');
    }
  }

  if (loading) return <div className="empty-state">Loading employees…</div>;

  return (
    <div className="panel">
      <div className="panel-head"><h3>Registered employees</h3></div>
      <div className="panel-body">
        {employees.length === 0 ? (
          <div className="empty-state"><div className="glyph">👥</div>No employees yet — approve an account request to add one.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {employees.map((emp) => (
              <div 
                className="task-card" 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="avatar" style={{ flexShrink: 0 }}>{initials(emp.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)' }}>{emp.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{emp.username} · {emp.department}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <span className={`pill ${emp.status === 'active' ? 'pill-completed' : 'pill-pending'}`} style={{ fontSize: '10px' }}>
                    {emp.status}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {emp.employeeRole || 'Staff'} · {emp.contractType || 'Permanent'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <EmployeeDetailModal 
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onToggleStatus={toggleStatus}
          onSave={saveDetails}
          onDelete={deleteEmployee}
          onSwitch={onSwitchToEmployee}
          departments={departments}
        />
      )}
    </div>
  );
}

function EmployeeDetailModal({ employee, onClose, onToggleStatus, onSave, onDelete, onSwitch, departments = [] }) {
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    phone: employee.phone || '',
    department: employee.department,
    employeeRole: employee.employeeRole || 'Staff',
    team: employee.team || 'General',
    joiningDate: employee.joiningDate || new Date().toISOString().slice(0, 10),
    onboardingDate: employee.onboardingDate || new Date().toISOString().slice(0, 10),
    contractType: employee.contractType || 'Permanent',
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      department: employee.department,
      employeeRole: employee.employeeRole || 'Staff',
      team: employee.team || 'General',
      joiningDate: employee.joiningDate || new Date().toISOString().slice(0, 10),
      onboardingDate: employee.onboardingDate || new Date().toISOString().slice(0, 10),
      contractType: employee.contractType || 'Permanent',
    });
  }, [employee]);

  function handleChange(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave(employee.id, form);
    setIsEditing(false);
  }

  return (
    <Modal title="Employee Profile Dashboard" onClose={onClose}>
      <div style={{ position: 'relative' }}>
        {/* Switch Shortcut in Corner */}
        <div style={{ position: 'absolute', top: '-48px', right: 0 }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => { onSwitch(employee); onClose(); }}
            title="Switch to employee's workspace dashboard view"
          >
            🔌 Switch to Dashboard
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>{initials(employee.name)}</div>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0 }}>{employee.name}</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              @{employee.username} · Account Status: <span className={`pill ${employee.status === 'active' ? 'pill-completed' : 'pill-pending'}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>{employee.status}</span>
            </span>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Full Name</label>
              <input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Email</label>
                <input required type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Department</label>
                <select required value={form.department} onChange={(e) => handleChange('department', e.target.value)}>
                  <option value="">— Select department —</option>
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Role</label>
                <input required value={form.employeeRole} onChange={(e) => handleChange('employeeRole', e.target.value)} placeholder="e.g. Intern, Manager" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Team</label>
                <input required value={form.team} onChange={(e) => handleChange('team', e.target.value)} placeholder="e.g. Support" />
              </div>
              <div className="field">
                <label>Contract Type</label>
                <select value={form.contractType} onChange={(e) => handleChange('contractType', e.target.value)}>
                  <option value="Permanent">Permanent</option>
                  <option value="Internship">Internship</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Part-time">Part-time</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Joining Date</label>
                <input type="date" value={form.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} />
              </div>
              <div className="field">
                <label>Onboarding Date</label>
                <input type="date" value={form.onboardingDate} onChange={(e) => handleChange('onboardingDate', e.target.value)} />
              </div>
            </div>
            
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Department</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{employee.department}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Designated Role</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{employee.employeeRole || 'Staff'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Team</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{employee.team || 'General'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Contract Type</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{employee.contractType || 'Permanent'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Joining Date</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{employee.joiningDate || '—'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Onboarding Date</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{employee.onboardingDate || '—'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Email</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)', wordBreak: 'break-all' }}>{employee.email}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Phone</span>
                <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{employee.phone || '—'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
                  📝 Edit Profile
                </button>{' '}
                <button className="btn btn-ghost btn-sm" onClick={() => onToggleStatus(employee)}>
                  {employee.status === 'active' ? '🚫 Deactivate' : '✅ Reactivate'}
                </button>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(employee)}>
                🗑️ Delete Employee
              </button>
            </div>
            
            <div className="modal-actions" style={{ borderTop: 'none', padding: 0, marginTop: '20px' }}>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
