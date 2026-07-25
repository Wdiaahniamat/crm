import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';
import AnnouncementsWidget from '../components/AnnouncementsWidget';
import api from '../api';
import AdminTasksPanel from './AdminTasksPanel';
import AdminEmployeesPanel from './AdminEmployeesPanel';
import AdminRequestsPanel from './AdminRequestsPanel';
import AdminLeavesPanel from './AdminLeavesPanel';
import AdminProfilePanel from './AdminProfilePanel';
import DepartmentsPanel from './DepartmentsPanel';
import CalendarPanel from './CalendarPanel';
import MeetingsPanel from './MeetingsPanel';
import EmployeeWorkspace from './EmployeeWorkspace';
import ChatPanel from './ChatPanel';
import NotificationSettings from './NotificationSettings';
import AdminAssetsPanel from './AdminAssetsPanel';
import AdminVerifiedDocsPanel from './AdminVerifiedDocsPanel';
import AdminTaskVerificationPanel from './AdminTaskVerificationPanel';
import CompanyInfoPanel from './CompanyInfoPanel';

const TITLES = {
  overview: 'Admin overview',
  tasks: 'Task management',
  'task-verification': 'Task Verification',
  employees: 'Employees',
  requests: 'Account requests',
  leaves: 'Leave approvals',
  departments: 'Departments',
  'company-assets': 'Company Assets',
  'verified-docs': 'Verified Documents & Deliverables',
  calendar: 'Calendar',
  meetings: 'Meetings',
  chat: 'Chat room',
  'admin-profile': 'My profile',
  'notification-settings': 'Notification settings',
  'company-info': 'Company Info',
};

const EMPLOYEE_VIEW_TITLES = {
  overview: 'Overview', incomplete: 'Incomplete tasks', completed: 'Completed tasks', 'all-tasks': 'All tasks', attendance: 'Attendance & leave', profile: 'Profile',
  meetings: 'Meetings', calendar: 'Calendar', chat: 'Chat',
};

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  // "switch to employee dashboard" state
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [employeeTab, setEmployeeTab] = useState('overview');

  const loadCounts = useCallback(async () => {
    const [tasksRes, requestsRes, employeesRes, leavesRes] = await Promise.all([
      api.get('/tasks'), api.get('/requests'), api.get('/users'), api.get('/leaves'),
    ]);
    const allTasks = tasksRes.data;
    const allEmployees = employeesRes.data;
    setTasks(allTasks);
    setEmployees(allEmployees);
    setStats({
      employees: allEmployees.length,
      tasks: allTasks.length,
      incomplete: allTasks.filter((t) => t.status !== 'completed').length,
      completed: allTasks.filter((t) => t.status === 'completed').length,
    });
    setPendingCount(requestsRes.data.filter((r) => r.status === 'pending').length);
    setPendingLeaves(leavesRes.data.filter((l) => l.status === 'pending').length);
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts, tab]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('Notifications Enabled', {
              body: 'You will now receive desktop alerts for Xebrightech CRM events.',
              icon: '/icon-192.png'
            });
          }
        });
      }
    }
  }, []);

  function switchToEmployee(emp) {
    setViewingEmployee(emp);
    setEmployeeTab('overview');
  }

  const navGroups = [
    {
      label: 'Workforce desk',
      items: [
        { key: 'overview', label: 'Overview', icon: '◈' },
        { key: 'tasks', label: 'Admin update task', icon: '▤' },
        { key: 'task-verification', label: 'Task Verification', icon: '🔍' },
        { key: 'employees', label: 'Employees', icon: '👥' },
        { key: 'requests', label: 'Account requests', icon: '✉', count: pendingCount || undefined },
        { key: 'leaves', label: 'Leave approvals', icon: '📅', count: pendingLeaves || undefined },
        { key: 'departments', label: 'Departments', icon: '🏢' },
        { key: 'company-assets', label: 'Company assets', icon: '💼' },
        { key: 'company-info', label: 'Company info', icon: '🏢' },
        { key: 'verified-docs', label: 'Verified documents', icon: '📜' },
        { key: 'calendar', label: 'Calendar', icon: '📆' },
        { key: 'meetings', label: 'Meetings', icon: '🤝' },
        { key: 'chat', label: 'Chat', icon: '💬' },
      ],
    },
    {
      label: 'Account',
      items: [
        { key: 'admin-profile', label: 'My profile', icon: '👤' },
        { key: 'notification-settings', label: 'Notifications', icon: '⚙' },
      ],
    },
  ];

  // Employee "switch profile" investigate view
  if (viewingEmployee) {
    const empNavGroups = [
      {
        label: `${viewingEmployee.name}'s workspace`,
        items: [
          { key: 'overview', label: 'Overview', icon: '◈' },
          { key: 'incomplete', label: 'Incomplete tasks', icon: '◔' },
          { key: 'completed', label: 'Completed tasks', icon: '✓' },
          { key: 'all-tasks', label: 'All tasks', icon: '▤' },
          { key: 'attendance', label: 'Attendance & leave', icon: '📅' },
          { key: 'meetings', label: 'Meetings', icon: '🤝' },
          { key: 'calendar', label: 'Calendar', icon: '📆' },
          { key: 'chat', label: 'Chat', icon: '💬' },
          { key: 'profile', label: 'Profile', icon: '⚙' },
        ],
      },
    ];
    return (
      <Shell
        navGroups={empNavGroups}
        activeKey={employeeTab}
        onNavigate={setEmployeeTab}
        title={EMPLOYEE_VIEW_TITLES[employeeTab]}
        impersonating={viewingEmployee}
        onExitImpersonation={() => setViewingEmployee(null)}
      >
        <EmployeeWorkspace tab={employeeTab} employeeId={viewingEmployee.id} employeeName={viewingEmployee.name} isAdminView />
      </Shell>
    );
  }

  return (
    <Shell navGroups={navGroups} activeKey={tab} onNavigate={setTab} title={TITLES[tab]}>
      {tab === 'overview' && stats && (
        <>
          <AnnouncementsWidget />
          <div className="stat-grid">
            <div className="stat-card"><div className="num">{stats.employees}</div><div className="label">Employees</div></div>
            <div className="stat-card"><div className="num">{stats.tasks}</div><div className="label">Total tasks</div></div>
            <div className="stat-card"><div className="num">{stats.incomplete}</div><div className="label">Incomplete</div></div>
            <div className="stat-card"><div className="num">{stats.completed}</div><div className="label">Completed</div></div>
          </div>
          <div className="admin-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start', marginTop: '20px' }}>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-head"><h3>Business console</h3></div>
              <div className="panel-body">
                <p style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>
                  Clients, projects and ongoing work by employee live in a separate admin-only console.
                </p>
                <Link to="/admin/business" className="btn btn-primary btn-sm">Open business console →</Link>
              </div>
            </div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-head"><h3>Workforce stats</h3></div>
              <div className="panel-body">
                <p style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>
                  View real-time workforce, leave approvals and departmental analytics.
                </p>
                <button onClick={() => setTab('employees')} className="btn btn-ghost btn-sm" style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)' }}>View employees panel →</button>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '24px' }}>
            <div className="panel-head"><h3>Employee workload overview</h3></div>
            <div className="panel-body">
              <p style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: 13.5, marginBottom: '20px' }}>
                Real-time dashboard tasks summary for registered employees.
              </p>
              {employees.length === 0 ? (
                <div className="empty-state">No employees found.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {employees.map((emp) => {
                    const empTasks = tasks.filter((t) => t.assignedTo === emp.id);
                    const completedCount = empTasks.filter((t) => t.status === 'completed').length;
                    const pendingCount = empTasks.filter((t) => t.status !== 'completed').length;
                    return (
                      <div 
                        key={emp.id} 
                        className="task-card" 
                        style={{ 
                          margin: 0, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'space-between',
                          padding: '16px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          background: 'var(--surface)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <div className="avatar" style={{ flexShrink: 0 }}>
                              {emp.name ? emp.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '??'}
                            </div>
                            <div>
                              <strong style={{ display: 'block', fontSize: '15px', color: 'var(--ink)' }}>{emp.name}</strong>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.employeeRole || 'Staff'} · {emp.department || 'General'}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                            <div style={{ background: 'var(--canvas)', padding: '8px 4px', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>{empTasks.length}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Assigned</div>
                            </div>
                            <div style={{ background: 'var(--green-soft)', padding: '8px 4px', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green)' }}>{completedCount}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Completed</div>
                            </div>
                            <div style={{ background: 'var(--amber-soft)', padding: '8px 4px', borderRadius: 'var(--radius-sm)' }}>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--amber)' }}>{pendingCount}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Pending</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'tasks' && <AdminTasksPanel />}
      {tab === 'task-verification' && <AdminTaskVerificationPanel />}
      {tab === 'employees' && <AdminEmployeesPanel onSwitchToEmployee={switchToEmployee} />}
      {tab === 'requests' && <AdminRequestsPanel />}
      {tab === 'leaves' && <AdminLeavesPanel />}
      {tab === 'departments' && <DepartmentsPanel />}
      {tab === 'company-assets' && <AdminAssetsPanel />}
      {tab === 'company-info' && <CompanyInfoPanel />}
      {tab === 'verified-docs' && <AdminVerifiedDocsPanel />}
      {tab === 'calendar' && <CalendarPanel />}
      {tab === 'meetings' && <MeetingsPanel />}
      {tab === 'chat' && <ChatPanel onBack={() => setTab('overview')} />}
      {tab === 'admin-profile' && <AdminProfilePanel />}
      {tab === 'notification-settings' && <NotificationSettings />}
    </Shell>
  );
}
