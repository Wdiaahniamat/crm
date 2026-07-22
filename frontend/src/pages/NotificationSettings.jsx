import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToPushNotifications,
  getPushSubscriptionStatus,
  sendTestPushNotification
} from '../utils/pushNotifications';

export default function NotificationSettings() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState({ supported: false, permission: 'default', subscribed: false });
  const [pushLoading, setPushLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const eventTypes = [
    {
      key: 'task_assigned',
      title: 'Task Assigned',
      desc: 'When you are added as an assignee to a task.',
      adminOnly: false,
    },
    {
      key: 'task_updated',
      title: 'Task Updated',
      desc: 'When any metadata on your assigned tasks changes.',
      adminOnly: false,
    },
    {
      key: 'task_due_today',
      title: 'Task Due Today',
      desc: 'Morning digest and alerts for tasks due by tonight.',
      adminOnly: false,
    },
    {
      key: 'task_overdue',
      title: 'Task Overdue',
      desc: 'Critical escalation warnings when a task passes its deadline.',
      adminOnly: false,
    },
    {
      key: 'mentioned_in_comment',
      title: 'Mentioned in Comment',
      desc: 'When someone tags you with @yourname in a task thread or chats with you directly.',
      adminOnly: false,
    },
    {
      key: 'comment_added',
      title: 'Comment Added',
      desc: 'When an update is posted on a task you created or follow.',
      adminOnly: false,
    },
    {
      key: 'project_completed',
      title: 'Project Completed',
      desc: 'When a project your team is on gets marked done.',
      adminOnly: false,
    },
    {
      key: 'client_added',
      title: 'Client Added',
      desc: 'System notification when a client is onboarded (Admins only).',
      adminOnly: true,
    },
    {
      key: 'leave_request_submitted',
      title: 'Leave Request Submitted',
      desc: 'When a new request is lodged for review (Managers/Admins).',
      adminOnly: true,
    },
    {
      key: 'leave_approved',
      title: 'Leave Approved',
      desc: 'When your requested leave dates have been approved.',
      adminOnly: false,
    },
    {
      key: 'leave_rejected',
      title: 'Leave Rejected',
      desc: 'When your requested leave dates have been declined.',
      adminOnly: false,
    },
    {
      key: 'company_event_added',
      title: 'Company Event Added',
      desc: 'When an all-hands event or general notice is scheduled.',
      adminOnly: false,
    },
  ];

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get('/notifications/settings');
        setSettings(res.data);
      } catch (err) {
        setError('Failed to load notification settings.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    async function checkPush() {
      const status = await getPushSubscriptionStatus();
      setPushStatus(status);
    }
    checkPush();

    if (typeof window !== 'undefined') {
      if (window.deferredPrompt) {
        setInstallable(true);
      }
      
      const handleInstallable = () => {
        setInstallable(true);
      };
      
      window.addEventListener('pwa-installable', handleInstallable);
      return () => window.removeEventListener('pwa-installable', handleInstallable);
    }
  }, []);

  const handleInstallApp = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User choice for PWA: ${outcome}`);
    window.deferredPrompt = null;
    setInstallable(false);
  };

  const handleEnablePush = async () => {
    setPushLoading(true);
    setError('');
    setMessage('');
    try {
      await subscribeToPushNotifications();
      const updatedStatus = await getPushSubscriptionStatus();
      setPushStatus(updatedStatus);
      setMessage('✔️ Desktop & Mobile Push Notifications enabled! You will receive native OS popups.');
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error('Error enabling push notifications:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to enable push notifications.';
      setError(errMsg);
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    setError('');
    setMessage('');
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('🚀 Test CRM Notification', {
            body: 'This is an instant test popup from Xebrightech CRM!',
            icon: '/icon-192.png',
            tag: 'test-popup-' + Date.now()
          });
        } catch (e) {
          console.error('Local notification error:', e);
        }
      }
      const result = await sendTestPushNotification();
      setMessage(`🚀 ${result.message}`);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      console.error('Error testing push notification:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to send test push notification.';
      setError(errMsg);
    } finally {
      setPushLoading(false);
    }
  };

  const handleCheckboxChange = (eventKey, channel) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const currentEventSettings = prev[eventKey] || { in_app: false, email: false, push: false };
      return {
        ...prev,
        [eventKey]: {
          ...currentEventSettings,
          [channel]: !currentEventSettings[channel],
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.put('/notifications/settings', { settings });
      setMessage('Preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to save preferences.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading settings...</div>;
  }

  return (
    <div className="panel-container" style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--slate-800)', marginBottom: '8px' }}>Notification Manager</h2>
        <p style={{ color: 'var(--slate-500)', fontSize: '14px' }}>
          Configure your preferences for how you receive alerts across in-app message feed, registered email digests, and native OS mobile/desktop push alerts.
        </p>
      </header>

      {error && <div className="error-banner" style={{ marginBottom: '16px', background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px' }}>{error}</div>}
      {message && <div className="success-banner" style={{ marginBottom: '16px', background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '6px' }}>{message}</div>}

      {/* System Integration Card */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>💻 Native OS Push & Mobile Integration</h3>
        <p style={{ color: 'var(--slate-500)', fontSize: '13px', margin: 0 }}>
          Receive native OS desktop & mobile push notification popups (Windows / macOS / Android / iOS) even when the CRM dashboard is minimized or closed in your browser.
        </p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Notification Permission Button */}
          <button
            onClick={handleEnablePush}
            className="btn"
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
              background: pushStatus.subscribed ? '#e2e8f0' : 'var(--maroon, #800000)',
              color: pushStatus.subscribed ? '#475569' : '#fff',
              border: 'none',
              cursor: pushLoading ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={pushLoading}
          >
            {pushStatus.subscribed ? '✔️ Native OS Push Enabled' : '🔔 Enable Native OS Push Notifications'}
          </button>

          {/* Test Push Button */}
          <button
            onClick={handleTestPush}
            className="btn"
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px',
              background: '#0d9488',
              color: '#fff',
              border: 'none',
              cursor: pushLoading ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={pushLoading}
          >
            🚀 Send Test OS Notification Popup
          </button>
          
          {/* PWA Install Button */}
          {installable && (
            <button
              onClick={handleInstallApp}
              className="btn"
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📱 Install App on Mobile / Desktop
            </button>
          )}
        </div>
      </div>


      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px', fontWeight: 600, color: '#475569', fontSize: '13px' }}>NOTIFICATION EVENT</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#475569', fontSize: '13px', textAlign: 'center', width: '100px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span>🔔</span>
                  <span>IN-APP</span>
                </div>
              </th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#475569', fontSize: '13px', textAlign: 'center', width: '100px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span>✉️</span>
                  <span>EMAIL</span>
                </div>
              </th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#475569', fontSize: '13px', textAlign: 'center', width: '110px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span>📱</span>
                  <span>PUSH ALERT</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {eventTypes.map((event) => {
              // Hide admin-only rows if the user is not an admin
              if (event.adminOnly && !isAdmin) return null;

              const eventPref = settings?.[event.key] || { in_app: false, email: false, push: false };

              return (
                <tr key={event.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', marginBottom: '2px' }}>{event.title}</div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>{event.desc}</div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={eventPref.in_app}
                      onChange={() => handleCheckboxChange(event.key, 'in_app')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--maroon)' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={eventPref.email}
                      onChange={() => handleCheckboxChange(event.key, 'email')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--maroon)' }}
                    />
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={eventPref.push}
                      onChange={() => handleCheckboxChange(event.key, 'push')}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--maroon)' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-start' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 24px', fontWeight: 600, fontSize: '14px', borderRadius: '6px' }}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
