import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

import { subscribeToPushNotifications } from '../utils/pushNotifications';

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function Shell({ navGroups, activeKey, onNavigate, title, impersonating, onExitImpersonation, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const prevNotifIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  // Auto-subscribe user to Native Web Push Notifications when permission is granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        subscribeToPushNotifications().catch((err) => console.log('[PUSH AUTO-SUBSCRIBE]', err));
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            subscribeToPushNotifications().catch((err) => console.log('[PUSH AUTO-SUBSCRIBE]', err));
          }
        }).catch(() => {});
      }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const newNotifs = res.data || [];
      setNotifications(newNotifs);

      // Trigger native OS desktop popup for new unread notifications
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        newNotifs.forEach((n) => {
          if (!n.read && !prevNotifIdsRef.current.has(n.id)) {
            if (!isInitialLoadRef.current) {
              try {
                new Notification(n.title, {
                  body: n.content,
                  icon: '/logo.png',
                  tag: n.id,
                });
              } catch (e) {
                console.error('Failed to display browser notification:', e);
              }
            }
          }
        });
      }

      isInitialLoadRef.current = false;
      prevNotifIdsRef.current = new Set(newNotifs.map((n) => n.id));
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const displayName = impersonating ? impersonating.name : user?.name;
  const displayRole = impersonating ? 'employee (viewing)' : user?.role;

  return (
    <div className={`app-shell ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'mobile-sidebar-open' : ''}`}>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-overlay-backdrop" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px' }}>
            <img 
              src="/logo.png" 
              alt="Xebrightech Logo" 
              style={{ 
                height: isCollapsed ? '32px' : '40px', 
                width: isCollapsed ? '32px' : '40px', 
                objectFit: 'contain',
                borderRadius: '6px'
              }} 
            />
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <strong style={{ fontSize: '14px', color: '#ffffff', fontWeight: 700 }}>Xebrightech</strong>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Workforce Desk</span>
              </div>
            )}
          </div>
          <button className="btn-collapse-toggle" onClick={toggleCollapse} title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {isCollapsed ? '›' : '‹'}
          </button>
        </div>

        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            {group.label && !isCollapsed && <div className="nav-label">{group.label}</div>}
            {group.items.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${activeKey === item.key ? 'active' : ''}`}
                onClick={() => {
                  onNavigate(item.key);
                  setIsMobileOpen(false);
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-text">{item.label}</span>}
                {typeof item.count === 'number' && <span className="count">{item.count}</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <button className="nav-item" onClick={handleLogout} title={isCollapsed ? "Log out" : undefined}>
            <span className="nav-icon">⏻</span>
            {!isCollapsed && <span className="nav-text">Log out</span>}
          </button>
        </div>
      </aside>

      <div className="main">
        {impersonating && (
          <div className="impersonate-banner">
            <span>Viewing <strong>{impersonating.name}</strong>'s task dashboard as admin.</span>
            <button className="btn btn-sm btn-ghost" onClick={onExitImpersonation}>Back to my dashboard</button>
          </div>
        )}
        <div className="topbar">
          <div className="topbar-left">
            <button className="btn-hamburger" onClick={() => setIsMobileOpen(!isMobileOpen)} aria-label="Toggle Navigation Menu">
              ☰
            </button>
            <h2>{title}</h2>
          </div>
          <div className="who">
            {/* Notification Bell Dropdown */}
            <div style={{ position: 'relative', marginRight: '16px' }}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: 'var(--maroon, #800000)',
                      color: 'white',
                      borderRadius: '50%',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div
                  className="notif-dropdown"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '40px',
                    width: '320px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      borderTopLeftRadius: '8px',
                      borderTopRightRadius: '8px',
                    }}
                  >
                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>Notifications</strong>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--maroon, #800000)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: n.read ? 'transparent' : '#f0f9ff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: n.read ? 500 : 700, fontSize: '13px', color: '#1e293b' }}>{n.title}</span>
                            {!n.read && (
                              <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }}></span>
                            )}
                          </div>
                          <span style={{ fontSize: '12px', color: '#475569' }}>{n.content}</span>
                          <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onNavigate('notification-settings');
                      setShowNotifDropdown(false);
                    }}
                    style={{
                      border: 'none',
                      borderTop: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      padding: '10px',
                      textAlign: 'center',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderBottomLeftRadius: '8px',
                      borderBottomRightRadius: '8px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Configure Preferences ⚙️
                  </button>
                </div>
              )}
            </div>

            <div className="meta" style={{ textAlign: 'right' }}>
              <strong>{displayName}</strong>
              <span>{displayRole}</span>
            </div>
            <div className="avatar">{initials(displayName || '')}</div>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
