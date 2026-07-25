import { useState } from 'react';
import Shell from '../components/Shell';
import EmployeeWorkspace from './EmployeeWorkspace';
import NotificationSettings from './NotificationSettings';
import CompanyInfoPanel from './CompanyInfoPanel';

const TITLES = {
  overview: 'Overview',
  incomplete: 'Incomplete tasks',
  completed: 'Completed tasks',
  'all-tasks': 'All tasks',
  'task-verification': 'Task Verification',
  attendance: 'Attendance & leave',
  meetings: 'Meetings',
  calendar: 'Calendar',
  chat: 'Chat',
  profile: 'My profile',
  'notification-settings': 'Notification settings',
  'company-info': 'Company Info',
};

export default function EmployeeDashboard() {
  const [tab, setTab] = useState('overview');

  const navGroups = [
    {
      label: 'Workspace',
      items: [
        { key: 'overview', label: 'Overview', icon: '◈' },
        { key: 'incomplete', label: 'Incomplete tasks', icon: '◔' },
        { key: 'completed', label: 'Completed tasks', icon: '✓' },
        { key: 'all-tasks', label: 'Manage all tasks', icon: '▤' },
        { key: 'task-verification', label: 'Task Verification', icon: '🔍' },
        { key: 'attendance', label: 'Attendance & leave', icon: '📅' },
        { key: 'meetings', label: 'Meetings', icon: '🤝' },
        { key: 'calendar', label: 'Calendar', icon: '📆' },
        { key: 'chat', label: 'Chat', icon: '💬' },
        { key: 'company-info', label: 'Company Info', icon: '🏢' },
      ],
    },
    {
      label: 'Account',
      items: [
        { key: 'profile', label: 'Manage my profile', icon: '👤' },
        { key: 'notification-settings', label: 'Notifications', icon: '⚙' },
      ],
    },
  ];

  return (
    <Shell navGroups={navGroups} activeKey={tab} onNavigate={setTab} title={TITLES[tab]}>
      {tab === 'notification-settings' ? (
        <NotificationSettings />
      ) : tab === 'company-info' ? (
        <CompanyInfoPanel />
      ) : (
        <EmployeeWorkspace tab={tab} onNavigate={setTab} />
      )}
    </Shell>
  );
}
