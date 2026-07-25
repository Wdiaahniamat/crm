import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';


export default function ChatPanel({ employeeId, onBack }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [replyingToMessage, setReplyingToMessage] = useState(null);

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);

  // Mobile view toggle: 'contacts' | 'chat'
  const [mobileView, setMobileView] = useState('contacts');

  const [userSearch, setUserSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({ name: file.name, data: ev.target.result, type: file.type });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get('/chat/contacts');
        setContacts(res.data);
        if (res.data.length > 0) {
          if (employeeId) {
            const match = res.data.find(c => c.id === employeeId);
            const target = match || res.data[0];
            setSelectedTarget(target);
            if (window.innerWidth <= 768) {
              window.history.pushState({ chatMobileView: true }, '');
            }
            setMobileView('chat');
          }
          // On mobile: stay on contacts list by default until user taps one
          // On desktop: will show side-by-side regardless
        }
      } catch (err) {
        console.error('Failed to fetch chat contacts', err);
      }
    }
    fetchUsers();
  }, []); // eslint-disable-line

  useEffect(() => {
    const handlePopState = (e) => {
      if (mobileView === 'chat' && window.innerWidth <= 768) {
        setMobileView('contacts');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mobileView]);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!selectedTarget) return;
    try {
      const res = await api.get(`/chat/history/${selectedTarget.id}`);
      setMessages(res.data);
    } catch {
      if (!silent) setError('Failed to load messages.');
    }
  }, [selectedTarget]);

  useEffect(() => {
    setError('');
    fetchMessages(false);
  }, [selectedTarget, fetchMessages]);

  // WebSocket Connection
  useEffect(() => {
    if (!user) return;
    
    let ws = null;
    let reconnectTimer = null;
    let isComponentMounted = true;

    const connectWebSocket = () => {
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = API_BASE.startsWith('http')
        ? API_BASE.replace(/^http/, 'ws')
        : `${wsProtocol}//${window.location.host}${API_BASE}`;
      const wsUrl = `${wsHost}/chat/ws/${user.id}`;
      
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Chat WebSocket connected');
        setError('');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.action === 'send') {
            setMessages((prev) => {
              if (prev.some(m => m.id === data.id)) return prev;
              return [...prev, data];
            });
          } else if (data.action === 'edit') {
            setMessages((prev) => prev.map(m => m.id === data.id ? { ...m, content: data.content } : m));
          } else if (data.action === 'delete') {
            setMessages((prev) => prev.filter(m => m.id !== data.id));
          }
        } catch (err) {
          console.error('Error parsing websocket message', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Chat WebSocket error', err);
      };

      ws.onclose = () => {
        console.log('Chat WebSocket closed');
        if (isComponentMounted) {
          // Attempt to reconnect after 3 seconds
          reconnectTimer = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function selectContact(contact) {
    setSelectedTarget(contact);
    if (mobileView !== 'chat') {
      if (window.innerWidth <= 768) {
        window.history.pushState({ chatMobileView: true }, '');
      }
      setMobileView('chat');
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || sending || !selectedTarget) return;
    setSending(true);
    try {
      const payload = {
        action: 'send',
        receiverId: selectedTarget.id,
        content: newMessage,
        attachmentName: attachment?.name,
        attachmentData: attachment?.data,
        replyToId: replyingToMessage?.id,
      };
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      } else {
        setError('Chat connection is not open.');
      }
      
      setNewMessage('');
      setAttachment(null);
      setReplyingToMessage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setError('Could not send message.');
    } finally {
      setSending(false);
    }
  }

  function handleEditInit(msg) {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  }

  async function handleEditSave(msgId) {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'edit', id: msgId, content: editContent }));
      } else {
        setError('Chat connection is not open.');
      }
      setEditingMessageId(null);
      setEditContent('');
    } catch {
      setError('Could not edit message.');
    }
  }

  async function handleDelete(msgId) {
    if (!window.confirm('Are you sure you want to delete this message for everyone? It will be removed from both sides.')) return;
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'delete', id: msgId }));
      } else {
        setError('Chat connection is not open.');
      }
    } catch {
      setError('Could not delete message.');
    }
  }

  const filteredUsers = contacts.filter((u) =>
    (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredMessages = messages.filter((m) =>
    m.content.toLowerCase().includes(messageSearch.toLowerCase())
  );

  function getInitials(name = '') {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  // --- Shared contacts sidebar JSX ---
  function ContactsList({ mobile = false }) {
    return (
      <div className={mobile ? 'chat-mobile-contacts' : 'chat-sidebar'}>
        <div className={mobile ? '' : 'chat-sidebar-section'} style={mobile ? {} : {}}>
          <div
            className={mobile ? '' : 'chat-sidebar-header'}
            style={{
              padding: mobile ? '14px 16px' : undefined,
              background: mobile ? 'var(--surface)' : undefined,
              borderBottom: mobile ? '1px solid var(--border)' : undefined,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={mobile ? { fontSize: '16px', fontWeight: 700, color: 'var(--ink)' } : {}}>
              {mobile ? '💬 ' : ''}
              {mobile ? 'Direct Messages' : <h4 style={{ margin: 0 }}>Messages & Groups</h4>}
            </span>
            {user?.role === 'admin' && !mobile && (
              <button 
                onClick={() => selectContact({ id: 'CREATE_GROUP', name: 'Create Group' })}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                + Group
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '12px', padding: '4px 8px', borderColor: 'var(--border)', marginLeft: 'auto' }}
              >
                ← Back
              </button>
            )}
          </div>

          <div className="chat-search-wrapper" style={mobile ? { padding: '12px 16px' } : {}}>
            <input
              type="text"
              className="chat-search-input"
              placeholder="🔍 Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className={mobile ? '' : 'chat-list'} style={mobile ? { padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '4px' } : {}}>
            {filteredUsers.length === 0 ? (
              <div className={mobile ? '' : 'chat-empty-list'} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No contacts found
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  className={`chat-list-item ${selectedTarget?.id === u.id ? 'active' : ''}`}
                  onClick={() => selectContact(u)}
                  style={mobile ? { padding: '12px 16px', fontSize: '14px' } : {}}
                >
                  <span className="status-dot online">●</span>
                  <div className="chat-list-item-info">
                    <span className="name" style={mobile ? { fontSize: '14px' } : {}}>{u.name}</span>
                    {u.department && <span className="dept">{u.department}</span>}
                    {!u.department && <span className="dept" style={{ textTransform: 'capitalize' }}>{u.role}</span>}
                  </div>
                  {mobile && <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>›</span>}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Shared chat area JSX ---
  function ChatAreaContent() {
    if (!selectedTarget) {
      return (
        <div className="chat-messages-empty">
          <div className="empty-icon">💬</div>
          Select a contact to start messaging.
        </div>
      );
    }

    if (selectedTarget.id === 'CREATE_GROUP') {
      const allEmployees = contacts.filter(c => c.role === 'employee' || c.role === 'admin');
      
      return (
        <div className="create-group-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <h2>Create Custom Discussion Group</h2>
          {error && <div className="error-banner" style={{ marginBottom: '16px' }}>{error}</div>}
          
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Group Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={groupName} 
              onChange={e => setGroupName(e.target.value)} 
              placeholder="e.g. Q3 Planning"
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </div>

          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Select Members</label>
          <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflowY: 'auto', background: 'var(--surface)', padding: '16px', marginBottom: '24px' }}>
            {allEmployees.map(emp => (
              <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                <input 
                  type="checkbox" 
                  checked={selectedEmpIds.includes(emp.id)} 
                  onChange={(e) => {
                    if (e.target.checked) setSelectedEmpIds(prev => [...prev, emp.id]);
                    else setSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
                  }} 
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{emp.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emp.department || emp.role}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-primary" 
              disabled={!groupName.trim() || selectedEmpIds.length === 0}
              onClick={async () => {
                try {
                  const res = await api.post('/chat/groups', { name: groupName, employeeIds: selectedEmpIds });
                  setGroupName('');
                  setSelectedEmpIds([]);
                  const newGroup = { id: res.data.id, name: groupName, username: 'Custom Group', role: 'group', isGroup: true };
                  setContacts(prev => [...prev, newGroup]);
                  selectContact(newGroup);
                } catch {
                  setError('Could not create group.');
                }
              }}
            >
              Create Group
            </button>
            <button className="btn btn-ghost" onClick={() => selectContact(null)}>Cancel</button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            {/* "← Contacts" only visible on mobile, hidden on desktop via CSS */}
            <button
              className="chat-mobile-back-btn btn btn-ghost btn-sm"
              onClick={() => {
                if (window.innerWidth <= 768 && window.history.state?.chatMobileView) {
                  window.history.back();
                } else {
                  setMobileView('contacts');
                }
              }}
              style={{ flexShrink: 0 }}
            >
              ← Contacts
            </button>
            <div className="chat-header-info" style={{ minWidth: 0 }}>
              <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>💬 {selectedTarget.name}</h3>
              <span className="desc">{selectedTarget.isGroup ? 'Discussion Group' : 'Direct Message (Private)'}</span>
            </div>
          </div>
          <div className="chat-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {selectedTarget.isGroup && user?.role === 'admin' && (
              <button 
                className="btn btn-sm btn-ghost" 
                style={{ color: 'var(--maroon)', borderColor: 'var(--maroon)' }}
                onClick={async () => {
                  if (window.confirm(`Are you sure you want to delete the group "${selectedTarget.name}"? This cannot be undone.`)) {
                    try {
                      await api.delete(`/chat/groups/${selectedTarget.id}`);
                      setContacts(prev => prev.filter(c => c.id !== selectedTarget.id));
                      selectContact(null);
                    } catch {
                      setError('Could not delete group.');
                    }
                  }
                }}
              >
                Delete Group
              </button>
            )}
          </div>
          <div className="chat-message-search" style={{ flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search in this chat..."
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
            />
            {messageSearch && (
              <button className="clear-search" onClick={() => setMessageSearch('')}>×</button>
            )}
          </div>
        </div>

        <div className="chat-messages-scroller">
          {error && <div className="error-banner">{error}</div>}
          {filteredMessages.length === 0 ? (
            <div className="chat-messages-empty">
              <div className="empty-icon">💬</div>
              {messageSearch
                ? 'No messages match your search query.'
                : `No messages here yet. Start the conversation with ${selectedTarget.name}!`}
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              const dateStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={msg.id} className={`chat-message-row ${isMe ? 'chat-message-me' : ''}`}>
                  <div className="avatar">{getInitials(isMe ? user?.name : selectedTarget.name)}</div>
                  <div className="msg-body" style={{ position: 'relative' }}>
                    <div className="msg-meta">
                      <span className="msg-sender">{isMe ? user?.name : selectedTarget.name}</span>
                      <span className="msg-time">{dateStr}</span>
                      {isMe && (
                        <div className="msg-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '12px' }}>
                          <button onClick={() => setReplyingToMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Reply</button>
                          <button onClick={() => handleEditInit(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)' }}>Edit</button>
                          <button onClick={() => handleDelete(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maroon)' }}>Delete</button>
                        </div>
                      )}
                      {!isMe && (
                        <div className="msg-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '12px' }}>
                          <button onClick={() => setReplyingToMessage(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>Reply</button>
                        </div>
                      )}
                    </div>
                    <div className="msg-content">
                      {msg.replyToId && messages.find(m => m.id === msg.replyToId) && (
                        <div style={{ background: 'var(--canvas)', borderLeft: '3px solid var(--blue)', padding: '4px 8px', marginBottom: '4px', fontSize: '12px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                          <em>Replying to: {messages.find(m => m.id === msg.replyToId).content.substring(0, 50)}...</em>
                        </div>
                      )}
                      {msg.id === editingMessageId ? (
                        <div style={{ marginTop: '4px' }}>
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', marginBottom: '4px' }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(msg.id);
                              if (e.key === 'Escape') setEditingMessageId(null);
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEditSave(msg.id)} className="btn btn-sm btn-primary">Save</button>
                            <button onClick={() => setEditingMessageId(null)} className="btn btn-sm btn-ghost">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                      )}
                      {msg.attachmentData && (
                        <div className="msg-attachment" style={{ marginTop: '8px' }}>
                          {msg.attachmentData.startsWith('data:image/') ? (
                            <img
                              src={msg.attachmentData}
                              alt={msg.attachmentName || 'Attachment'}
                              style={{ maxWidth: '200px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                            />
                          ) : (
                            <a
                              href={msg.attachmentData}
                              download={msg.attachmentName}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--canvas)', borderRadius: 'var(--radius)', color: 'var(--ink)', textDecoration: 'none', border: '1px solid var(--border)' }}
                            >
                              📎 {msg.attachmentName || 'Download attachment'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container" style={{ padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          {attachment && (
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--canvas)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📎 {attachment.name}</span>
              <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maroon)' }}>×</button>
            </div>
          )}
          {replyingToMessage && (
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--canvas)', borderLeft: '3px solid var(--blue)', borderRadius: '0 var(--radius) var(--radius) 0' }}>
              <span style={{ fontSize: '12px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                <em>Replying to: {replyingToMessage.content.substring(0, 50)}...</em>
              </span>
              <button onClick={() => setReplyingToMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maroon)' }}>×</button>
            </div>
          )}
          <form className="chat-input-bar" onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, padding: 0, border: 'none', background: 'none' }}>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', color: 'var(--text-muted)', flexShrink: 0 }}
              title="Attach file"
            >
              📎
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder={`Message ${selectedTarget.name}... (Shift+Enter for new line)`}
              style={{ flex: 1, minWidth: 0, resize: 'none', height: '40px', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'inherit' }}
              rows={1}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || (!newMessage.trim() && !attachment)} style={{ flexShrink: 0 }}>
              Send
            </button>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ===== DESKTOP: side-by-side ===== */}
      <div className="chat-container chat-desktop-only">
        {ContactsList({ mobile: false })}
        <div className="chat-area">
          {ChatAreaContent()}
        </div>
      </div>

      {/* ===== MOBILE: full-screen, toggle between contacts and chat ===== */}
      <div className="chat-mobile-only">
        {mobileView === 'contacts' ? (
          ContactsList({ mobile: true })
        ) : (
          <div className="chat-area chat-mobile-chat-area">
            {ChatAreaContent()}
          </div>
        )}
      </div>
    </>
  );
}
