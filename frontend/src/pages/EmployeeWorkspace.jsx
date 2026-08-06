import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import AnnouncementsWidget from '../components/AnnouncementsWidget';
import MeetingsPanel from './MeetingsPanel';
import CalendarPanel from './CalendarPanel';
import ChatPanel from './ChatPanel';
import { subscribeToPushNotifications } from '../utils/pushNotifications';
import { downloadFileFromDataUrl } from '../utils/downloadUtils';

const STATUS_LABEL = { 'To Do': 'To Do', pending: 'Pending', 'in-progress': 'In progress', completed: 'Completed', Done: 'Completed' };
const STATUS_CLASS = { 'To Do': 'pill-pending', pending: 'pill-pending', 'in-progress': 'pill-progress', completed: 'pill-completed', Done: 'pill-completed' };
const PRIORITY_CLASS = { high: 'pill-high', medium: 'pill-medium', low: 'pill-low' };

export default function EmployeeWorkspace({ tab, employeeId, employeeName, isAdminView, onNavigate }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [installable, setInstallable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showShortcutInstructions, setShowShortcutInstructions] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        const currentPermission = Notification.permission;
        setNotificationPermission(currentPermission);
        if (currentPermission === 'default') {
          Notification.requestPermission().then((permission) => {
            setNotificationPermission(permission);
            if (permission === 'granted') {
              new Notification('Notifications Enabled', {
                body: 'You will now receive desktop alerts for Xebrightech CRM events.',
                icon: '/icon-192.png'
              });
            }
          });
        }
      }
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

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    if (Notification.permission === 'denied') {
      alert('Notification permission is blocked. Please click the lock/settings icon next to the URL in your browser address bar to allow notifications for this site.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        await subscribeToPushNotifications();
        new Notification('Notifications Enabled', {
          body: 'You will now receive native OS alerts for CRM events.',
          icon: '/icon-192.png'
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  const handleInstallApp = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) {
      setShowShortcutInstructions(true);
      return;
    }
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User choice for PWA: ${outcome}`);
    window.deferredPrompt = null;
    setInstallable(false);
  };

  const targetId = employeeId || user?.id;

  // Selected Task Detail State
  const [selectedTask, setSelectedTask] = useState(null);
  const [completedFilter, setCompletedFilter] = useState('all');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Verification Documents States
  const [docForm, setDocForm] = useState({ name: '', docType: 'Passport', status: 'Submitted' });
  const [docFile, setDocFile] = useState(null);
  const [savingDoc, setSavingDoc] = useState(false);

  const docTypeIcons = {
    'Passport': '🛂',
    'Trade License': '📜',
    'National ID': '🪪',
    'Certificate': '🎓',
    'Tax Document': '💼',
    'Insurance': '🛡️',
    'Other': '📄',
  };

  const statusColors = {
    'Submitted': { bg: '#fffbeb', color: '#d97706' },
    'Verified': { bg: '#f0fdf4', color: '#16a34a' },
    'Rejected': { bg: '#fef2f2', color: '#dc2626' },
    'Pending': { bg: '#eef2ff', color: '#4f46e5' },
  };

  const loadAll = useCallback(() => {
    const query = isAdminView ? { params: { employeeId: targetId } } : {};
    
    setLoadingTasks(true);
    api.get('/tasks', query)
      .then(taskRes => {
        setTasks(taskRes.data);
        if (selectedTask) {
          const freshTask = taskRes.data.find(t => t.id === selectedTask.id);
          if (freshTask) setSelectedTask(freshTask);
        }
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load tasks.'))
      .finally(() => setLoadingTasks(false));

    setLoadingLeaves(true);
    api.get('/leaves', query)
      .then(res => setLeaves(res.data))
      .catch(err => console.error('Leaves error:', err))
      .finally(() => setLoadingLeaves(false));

    setLoadingAttendance(true);
    api.get('/attendance', query)
      .then(res => setAttendance(res.data))
      .catch(err => console.error('Attendance error:', err))
      .finally(() => setLoadingAttendance(false));

    setLoadingProfile(true);
    const profileEndpoint = isAdminView ? `/users/${targetId}` : '/users/me';
    api.get(profileEndpoint)
      .then(res => setProfile(res.data))
      .catch(err => console.error('Profile error:', err))
      .finally(() => setLoadingProfile(false));
  }, [targetId, isAdminView]); // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  // Reset task detail view when switching sidebar tabs
  useEffect(() => {
    setSelectedTask(null);
  }, [tab]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setDocFile(null);
      return;
    }
    try {
      const uniqueName = Date.now() + '-' + Math.random().toString(36).substring(7) + '-' + file.name;
      const { data, error } = await supabase.storage
        .from('crm-uploads')
        .upload(uniqueName, file);
        
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('crm-uploads')
        .getPublicUrl(uniqueName);
        
      setDocFile({
        name: file.name,
        type: file.type,
        data: publicUrlData.publicUrl
      });
    } catch (err) {
      console.error('Upload failed', err);
      alert('File upload failed.');
    }
  };

  const handleAddDoc = async (e) => {
    e.preventDefault();
    if (!docForm.name.trim()) return;
    setSavingDoc(true);
    setNotice('');
    try {
      const docs = [...(profile?.documents || [])];
      docs.push({
        id: Date.now().toString(),
        name: docForm.name.trim(),
        docType: docForm.docType,
        status: docForm.status,
        fileName: docFile?.name || '',
        fileData: docFile?.data || '',
        fileType: docFile?.type || '',
        uploadedAt: new Date().toISOString(),
      });
      
      const payload = { documents: docs };
      const endpoint = isAdminView ? `/users/${targetId}` : '/users/me';
      const res = await api.put(endpoint, payload);
      setProfile(res.data);
      setDocForm({ name: '', docType: 'Passport', status: 'Submitted' });
      setDocFile(null);
      e.target.reset();
      setNotice('Document uploaded successfully.');
    } catch (err) {
      setNotice('Could not add document.');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleRemoveDoc = async (docId) => {
    setNotice('');
    try {
      const docs = (profile?.documents || []).filter((d) => d.id !== docId);
      const payload = { documents: docs };
      const endpoint = isAdminView ? `/users/${targetId}` : '/users/me';
      const res = await api.put(endpoint, payload);
      setProfile(res.data);
      setNotice('Document removed.');
    } catch (err) {
      setNotice('Could not remove document.');
    }
  };

  async function advanceTask(task, status) {
    await api.put(`/tasks/${task.id}/status`, { status });
    loadAll();
  }

  async function applyLeave(payload) {
    await api.post('/leaves', payload);
    setNotice('Leave request submitted.');
    loadAll();
  }

  async function checkIn() {
    try {
      await api.post('/attendance/check-in');
      setNotice('Marked present for today.');
      loadAll();
    } catch (err) {
      setNotice(err.response?.data?.error || 'Could not check in.');
    }
  }

  async function saveProfile(payload) {
    await api.put('/users/me', payload);
    setNotice('Profile updated.');
    loadAll();
  }

  if (loadingProfile && !profile) return <div className="empty-state">Loading Profile…</div>;
  if (error) return <div className="error-banner">{error}</div>;

  const incomplete = tasks.filter((t) => t.status !== 'completed');
  const completed = tasks.filter((t) => t.status === 'completed');
  const todayCheckedIn = attendance.some((a) => a.date === new Date().toISOString().slice(0, 10));

  // If a task card was clicked, render its Detail sub-view
  if (selectedTask) {
    const task = selectedTask;
    const isDone = task.status === 'completed' || task.status === 'Done';

    const handlePmedFileChange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      const fileDataPromises = files.map(async (file) => {
        const uniqueName = Date.now() + '-' + Math.random().toString(36).substring(7) + '-' + file.name;
        const { data, error } = await supabase.storage
          .from('crm-uploads')
          .upload(uniqueName, file);
          
        if (error) throw error;
        
        const { data: publicUrlData } = supabase.storage
          .from('crm-uploads')
          .getPublicUrl(uniqueName);
          
        return { name: file.name, data: publicUrlData.publicUrl };
      });
      
      try {
        const newPmedFiles = await Promise.all(fileDataPromises);
        const existingFiles = task.pmedFiles || [];
        // If there's an old pmedData that isn't in pmedFiles, we could include it, but
        // for now we'll just merge the pmedFiles array.
        const allFiles = [...existingFiles, ...newPmedFiles];
        
        const res = await api.put(`/tasks/${task.id}/status`, {
          status: task.status,
          pmedFiles: allFiles,
          pmedStatus: 'Pending Verification'
        });
        setSelectedTask(res.data);
        loadAll();
        setNotice('Work completion proof files attached successfully.');
        setTimeout(() => setNotice(''), 4000);
      } catch (err) {
        console.error('Upload failed:', err);
        setNotice('Failed to attach work files: ' + (err.message || 'Unknown error. Check console.'));
      }
    };

    const handleDeleteFile = async (indexToRemove) => {
      const existingFiles = task.pmedFiles || [];
      const updatedFiles = existingFiles.filter((_, idx) => idx !== indexToRemove);
      try {
        const res = await api.put(`/tasks/${task.id}/status`, {
          status: task.status,
          pmedFiles: updatedFiles,
          pmedStatus: 'Pending Verification' 
        });
        setSelectedTask(res.data);
        loadAll();
        setNotice('File removed successfully.');
        setTimeout(() => setNotice(''), 4000);
      } catch {
        setNotice('Failed to remove file.');
      }
    };

    const handleDeleteOldFile = async () => {
      try {
        const res = await api.put(`/tasks/${task.id}/status`, {
          status: task.status,
          pmedName: null,
          pmedData: null,
          pmedStatus: 'Pending Verification'
        });
        setSelectedTask(res.data);
        loadAll();
        setNotice('File removed successfully.');
        setTimeout(() => setNotice(''), 4000);
      } catch {
        setNotice('Failed to remove file.');
      }
    };

    const handleViewFile = (data) => {
      if (!data) return;
      const newTab = window.open();
      if (newTab) {
        newTab.document.write(
          `<iframe src="${data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    };

    const handleCommentSubmit = async (e) => {
      e.preventDefault();
      if (!commentText.trim() || submittingComment) return;
      setSubmittingComment(true);
      try {
        const res = await api.post(`/tasks/${task.id}/comments`, { text: commentText });
        setSelectedTask(res.data);
        setCommentText('');
        loadAll();
        setNotice('Note/question posted.');
        setTimeout(() => setNotice(''), 3000);
      } catch (err) {
        console.error('Failed to post comment', err);
        setNotice('Could not post note.');
      } finally {
        setSubmittingComment(false);
      }
    };

    const handleStatusChange = async (newStatus) => {
      try {
        const res = await api.put(`/tasks/${task.id}/status`, { status: newStatus });
        setSelectedTask(res.data);
        loadAll();
        setNotice(`Task status updated to: ${STATUS_LABEL[newStatus] || newStatus}`);
        setTimeout(() => setNotice(''), 3000);
      } catch {
        setNotice('Failed to update status.');
      }
    };

    return (
      <div>
        {notice && <div className="success-banner">{notice}</div>}
        
        <div className="panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="panel-head" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => setSelectedTask(null)}
              style={{ fontSize: '14px', padding: '6px 12px' }}
            >
              ← Back to tasks
            </button>
            <h3 style={{ margin: 0, flex: 1 }}>{task.title}</h3>
          </div>
          
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {task.description && (
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>DESCRIPTION</strong>
                <p style={{ margin: 0, fontSize: '14px', color: '#1e293b', lineHeight: '1.5' }}>{task.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>CURRENT STATUS</strong>
                <span className={`pill ${STATUS_CLASS[task.status] || 'pill-pending'}`}>{STATUS_LABEL[task.status] || task.status}</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>PRIORITY</strong>
                <span className={`pill ${PRIORITY_CLASS[task.priority] || 'pill-low'}`}>{task.priority}</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>DUE DATE</strong>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{task.dueDate ? task.dueDate : 'No due date'}</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>RELATED PROJECT</strong>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                  📂 {task.projectName || 'None'}
                </span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>VERIFICATION STATUS</strong>
                <span className={`pill ${
                  task.pmedStatus === 'Verified' ? 'pill-completed' : task.pmedStatus === 'Rejected' || task.pmedStatus === 'Not Verified' ? 'pill-high' : 'pill-progress'
                }`}>
                  {task.pmedStatus || 'Pending Verification'}
                </span>
              </div>
            </div>

            {/* Status Change Controls */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Update Task Status:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  className={`btn btn-sm ${task.status === 'pending' || task.status === 'To Do' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleStatusChange('To Do')}
                  style={{ minWidth: '64px' }}
                >
                  To Do
                </button>
                <button 
                  className={`btn btn-sm ${task.status === 'in-progress' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleStatusChange('in-progress')}
                  style={{ minWidth: '90px' }}
                >
                  In Progress
                </button>
                <button 
                  className={`btn btn-sm ${task.status === 'completed' || task.status === 'Done' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ background: isDone ? '#16a34a' : undefined, color: isDone ? '#fff' : undefined, minWidth: '130px' }}
                  onClick={() => handleStatusChange('completed')}
                >
                  ✓ Mark Completed
                </button>
              </div>
            </div>

            {/* Work Deliverables & File Upload Section */}
            <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>📎 Attach Work File / Completion Deliverable</h4>
                {task.pmedStatus && (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: task.pmedStatus === 'Verified' ? '#dcfce7' : task.pmedStatus === 'Rejected' ? '#fee2e2' : '#fef3c7', color: task.pmedStatus === 'Verified' ? '#15803d' : task.pmedStatus === 'Rejected' ? '#b91c1c' : '#b45309' }}>
                    {task.pmedStatus}
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
                Attach your completed work file, document, or proof of task execution for Admin review and verification.
              </p>
              
              {task.pmedFiles && task.pmedFiles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {task.pmedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all', flex: 1, minWidth: '150px' }}>📄 {file.name || 'Work_Deliverable_Proof'}</span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleViewFile(file.data)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          👁 View File
                        </button>
                        <button 
                          onClick={(e) => { e.preventDefault(); downloadFileFromDataUrl(file.data, file.name || 'work_deliverable'); }}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px', border: 'none' }}
                        >
                          ⬇ Download File
                        </button>
                        <button
                          onClick={() => handleDeleteFile(idx)}
                          className="btn btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px', background: '#fee2e2', color: '#b91c1c', border: 'none' }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <label style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--maroon)', fontWeight: 600, alignSelf: 'flex-start' }}>
                    🔄 Upload Updated / Replaced Work Files
                    <input type="file" multiple onChange={handlePmedFileChange} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : task.pmedData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', wordBreak: 'break-all', flex: 1, minWidth: '150px' }}>📄 {task.pmedName || 'Work_Deliverable_Proof'}</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleViewFile(task.pmedData)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        👁 View File
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); downloadFileFromDataUrl(task.pmedData, task.pmedName || 'work_deliverable'); }}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px', border: 'none' }}
                      >
                        ⬇ Download File
                      </button>
                      <button
                        onClick={handleDeleteOldFile}
                        className="btn btn-sm"
                        style={{ padding: '4px 10px', fontSize: '12px', background: '#fee2e2', color: '#b91c1c', border: 'none' }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                  
                  <label style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--maroon)', fontWeight: 600, alignSelf: 'flex-start' }}>
                    🔄 Upload Updated / Replaced Work File
                    <input type="file" multiple onChange={handlePmedFileChange} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <div>
                  <label 
                    style={{ 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '8px', 
                      padding: '24px', 
                      textAlign: 'center', 
                      cursor: 'pointer', 
                      background: '#f8fafc',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>📁</span>
                    <span>Click to Upload Work Deliverable File</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Supports documents, images, PDFs, ZIPs, etc.</span>
                    <input 
                      type="file" 
                      multiple
                      onChange={handlePmedFileChange} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Task Notes & Questions Thread */}
            <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', border: '1px solid #cbd5e1' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>💬 Task Notes & Questions Thread</h4>
              
              {/* Existing Comments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                {!task.comments || task.comments.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '12px', background: '#f8fafc', borderRadius: '6px', textAlign: 'center' }}>
                    No notes or questions posted yet. Enter your notes below to communicate with the Admin.
                  </div>
                ) : (
                  task.comments.map((c) => (
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

              {/* Add Comment Input */}
              <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Enter notes, updates, or questions for this task..."
                  style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={submittingComment || !commentText.trim()}
                  style={{ padding: '8px 16px' }}
                >
                  {submittingComment ? 'Posting...' : 'Post Note'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {notice && <div className="success-banner">{notice}</div>}

      {tab === 'overview' && (
        <>
          <AnnouncementsWidget readOnly={true} />
          {/* Quick Setup Integration Widget */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1e293b', fontWeight: 600 }}>💻 Desktop & System Integrations</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Enable system notifications to receive alerts instantly when tasks or leaves are updated, or add a quick-launch app shortcut on your desktop.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={handleRequestPermission}
                className="btn"
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: notificationPermission === 'granted' ? '#cbd5e1' : 'var(--maroon, #800000)',
                  color: notificationPermission === 'granted' ? '#475569' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                disabled={notificationPermission === 'granted'}
              >
                {notificationPermission === 'granted' ? '✔️ Desktop Notifications Enabled' : '🔔 Enable Desktop Notifications'}
              </button>

              <button
                onClick={handleInstallApp}
                className="btn"
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                🖥️ Create Desktop Shortcut
              </button>
            </div>

            {showShortcutInstructions && (
              <div style={{
                background: '#e0f2fe',
                borderLeft: '4px solid #0284c7',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#0369a1',
                marginTop: '4px',
                lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>💡 How to install as a Desktop App:</div>
                To install this dashboard onto your desktop, look at your browser address bar:
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                  <li><strong>Chrome/Edge:</strong> Click the <strong>Install app</strong> icon (a computer icon with a down arrow) at the right end of the URL address bar, or open the browser menu (⋮) and select <strong>Save and share → Install page as app</strong>.</li>
                  <li><strong>Safari:</strong> Go to <strong>File → Add to Dock</strong>.</li>
                  <li><strong>Firefox:</strong> Make sure you are using a Chromium-based browser to install PWAs, or bookmark the page to your desktop.</li>
                </ul>
                <button 
                  onClick={() => setShowShortcutInstructions(false)} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '8px',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <div className="stat-grid">
            <div className="stat-card"><div className="num">{loadingTasks ? '...' : tasks.length}</div><div className="label">Total tasks</div></div>
            <div className="stat-card"><div className="num">{loadingTasks ? '...' : incomplete.length}</div><div className="label">Incomplete</div></div>
            <div className="stat-card"><div className="num">{loadingTasks ? '...' : completed.length}</div><div className="label">Completed</div></div>
            <div className="stat-card"><div className="num">{loadingLeaves ? '...' : leaves.filter((l) => l.status === 'pending').length}</div><div className="label">Leave requests pending</div></div>
          </div>
          <div className="panel">
            <div className="panel-head"><h3>Needs attention</h3></div>
            <div className="panel-body">
              {loadingTasks ? (
                <div className="empty-state">Loading tasks...</div>
              ) : incomplete.length === 0 ? (
                <div className="empty-state"><div className="glyph">✓</div>All caught up — no incomplete tasks.</div>
              ) : (
                <div className="task-grid">
                  {incomplete.slice(0, 6).map((t) => (
                    <TaskCard key={t.id} task={t} onAdvance={advanceTask} onViewDetails={setSelectedTask} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'incomplete' && (
        <div className="panel">
          <div className="panel-head"><h3>Incomplete tasks</h3></div>
          <div className="panel-body">
            {loadingTasks ? (
              <div className="empty-state">Loading tasks...</div>
            ) : incomplete.length === 0 ? (
              <div className="empty-state"><div className="glyph">✓</div>Nothing pending right now.</div>
            ) : (
              <div className="task-grid">
                {incomplete.map((t) => <TaskCard key={t.id} task={t} onAdvance={advanceTask} onViewDetails={setSelectedTask} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'completed' && (
        <div className="panel">
          <div className="panel-head"><h3>Completed tasks</h3></div>
          <div className="panel-body">
            <div className="select-chip-row" style={{ marginBottom: 16, display: 'flex', gap: '8px' }}>
              {[
                { key: 'all', label: 'All Completed' },
                { key: 'verified', label: 'Verified' },
                { key: 'not-verified', label: 'Not Verified' },
                { key: 'pending', label: 'Pending Verification' }
              ].map((f) => (
                <button 
                  key={f.key} 
                  className={`select-chip ${completedFilter === f.key ? 'active' : ''}`} 
                  onClick={() => setCompletedFilter(f.key)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '999px',
                    border: '1px solid #cbd5e1',
                    background: completedFilter === f.key ? 'var(--maroon)' : '#fff',
                    color: completedFilter === f.key ? '#fff' : '#475569',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {(() => {
              const filteredCompleted = completed.filter((t) => {
                if (completedFilter === 'verified') return t.pmedStatus === 'Verified';
                if (completedFilter === 'not-verified') return t.pmedStatus === 'Not Verified';
                if (completedFilter === 'pending') return !t.pmedStatus || t.pmedStatus === 'Pending Verification';
                return true;
              });

              if (filteredCompleted.length === 0) {
                return <div className="empty-state">No tasks in this view yet.</div>;
              }

              return (
                <div className="task-grid">
                  {filteredCompleted.map((t) => (
                    <TaskCard 
                      key={t.id} 
                      task={t} 
                      onAdvance={advanceTask} 
                      onViewDetails={setSelectedTask} 
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {tab === 'all-tasks' && (
        <div className="panel">
          <div className="panel-head"><h3>All tasks</h3></div>
          <div className="panel-body">
            {tasks.length === 0 ? (
              <div className="empty-state"><div className="glyph">＋</div>No tasks assigned yet.</div>
            ) : (
              <div className="task-grid">
                {tasks.map((t) => <TaskCard key={t.id} task={t} onAdvance={advanceTask} onViewDetails={setSelectedTask} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'task-verification' && (
        <TaskVerificationTab tasks={tasks} onViewDetails={setSelectedTask} />
      )}

      {tab === 'attendance' && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h3>Attendance</h3>
              {!isAdminView && (
                <button className="btn btn-primary btn-sm" onClick={checkIn} disabled={todayCheckedIn}>
                  {todayCheckedIn ? 'Checked in today' : 'Mark present today'}
                </button>
              )}
            </div>
            <div className="panel-body">
              {attendance.length === 0 ? (
                <div className="empty-state">No attendance recorded yet.</div>
              ) : (
                <table>
                  <thead><tr><th>Date</th><th>Check-in time</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...attendance].reverse().map((a) => (
                      <tr key={a.id}>
                        <td>{a.date}</td>
                        <td>{new Date(a.checkInTime).toLocaleTimeString()}</td>
                        <td><span className="pill pill-completed">{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Leave requests</h3></div>
            <div className="panel-body">
              {!isAdminView && <LeaveForm onSubmit={applyLeave} />}
              {leaves.length === 0 ? (
                <div className="empty-state" style={{ marginTop: 12 }}>No leave requests yet.</div>
              ) : (
                <table style={{ marginTop: 16 }}>
                  <thead><tr><th>Dates</th><th>Type</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {[...leaves].reverse().map((l) => (
                      <tr key={l.id}>
                        <td>{l.startDate} → {l.endDate}</td>
                        <td style={{ textTransform: 'capitalize' }}>{l.type}</td>
                        <td>{l.reason}</td>
                        <td><span className={`pill pill-${l.status === 'pending' ? 'pending' : l.status}`}>{l.status}</span></td>
                        <td>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Delete this leave request?')) return;
                              try {
                                await api.delete(`/leaves/${l.id}`);
                                setLeaves(prev => prev.filter(x => x.id !== l.id));
                              } catch (err) {
                                console.error(err);
                                alert('Failed to delete leave request');
                              }
                            }}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'meetings' && <MeetingsPanel isEmployeeView />}

      {tab === 'calendar' && <CalendarPanel readOnly={true} />}

      {tab === 'chat' && <ChatPanel employeeId={employeeId} isAdminView={isAdminView} onBack={onNavigate ? () => onNavigate('overview') : undefined} />}

      {tab === 'profile' && profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
          {/* Profile Details Panel */}
          <div className="panel">
            <div className="panel-head"><h3>{isAdminView ? `${employeeName}'s profile` : 'My profile'}</h3></div>
            <div className="panel-body">
              {isAdminView ? (
                <div>
                  <p><strong>Name:</strong> {profile.name}</p>
                  <p><strong>Username:</strong> {profile.username}</p>
                  <p><strong>Email:</strong> {profile.email}</p>
                  <p><strong>Department:</strong> {profile.department}</p>
                  <p><strong>Phone:</strong> {profile.phone || '—'}</p>
                  <p><strong>Status:</strong> {profile.status}</p>
                </div>
              ) : (
                <ProfileForm profile={profile} onSave={saveProfile} />
              )}
            </div>
          </div>

          {/* Verification Documents Panel */}
          <div className="panel">
            <div className="panel-head">
              <h3>Verification documents</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {(profile.documents || []).length} document{((profile.documents || []).length) !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="panel-body">
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Upload and manage your verification documents. These are used for company compliance and identity verification purposes.
              </p>

              {/* Document Cards */}
              {(profile.documents || []).length > 0 && (
                <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                  {(profile.documents || []).map((doc) => {
                    const sc = statusColors[doc.status] || statusColors['Pending'];
                    return (
                      <div
                        key={doc.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '14px 18px',
                          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                          borderLeft: `4px solid ${sc.color}`,
                          background: 'var(--surface)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '22px' }}>{docTypeIcons[doc.docType] || '📄'}</span>
                          <div>
                            <strong style={{ fontSize: '14px', color: 'var(--ink)', display: 'block' }}>{doc.name}</strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              {doc.docType} · Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                            {doc.fileName && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
                                📎 {doc.fileName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {doc.fileData && (
                            <button 
                              onClick={(e) => { e.preventDefault(); downloadFileFromDataUrl(doc.fileData, doc.fileName); }}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--maroon)', borderColor: 'var(--maroon)', background: 'transparent' }}
                            >
                              👁 View/Download File
                            </button>
                          )}
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                            background: sc.bg, color: sc.color, textTransform: 'uppercase',
                          }}>
                            {doc.status}
                          </span>
                          {!isAdminView && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRemoveDoc(doc.id)}
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              title="Remove document"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {(profile.documents || []).length === 0 && (
                <div className="empty-state" style={{ marginBottom: '24px' }}>
                  <div className="glyph">📋</div>
                  No verification documents uploaded yet.
                </div>
              )}

              {/* Add Document Form */}
              {!isAdminView && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--ink)' }}>Add a new document</h4>
                  <form onSubmit={handleAddDoc}>
                    <div className="field-row">
                      <div className="field">
                        <label>Document name</label>
                        <input
                          required value={docForm.name}
                          onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                          placeholder="e.g. Identity Proof"
                        />
                      </div>
                      <div className="field" style={{ width: '200px', flex: 'none' }}>
                        <label>Type</label>
                        <select value={docForm.docType} onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}>
                          <option value="Passport">Passport</option>
                          <option value="National ID">National ID</option>
                          <option value="Certificate">Certificate</option>
                          <option value="Tax Document">Tax Document</option>
                          <option value="Insurance">Insurance</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>File</label>
                      <input type="file" required onChange={handleFileChange} />
                    </div>
                    <button className="btn btn-primary btn-sm" disabled={savingDoc}>
                      {savingDoc ? 'Uploading...' : 'Upload document'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskVerificationTab({ tasks, onViewDetails }) {
  const [verFilter, setVerFilter] = useState('all');

  const VFILTERS = [
    { key: 'all', label: 'All Tasks', color: '#475569', bg: '#f1f5f9' },
    { key: 'Verified', label: '✓ Verified', color: '#16a34a', bg: '#f0fdf4' },
    { key: 'Rejected', label: '✕ Rejected', color: '#dc2626', bg: '#fef2f2' },
    { key: 'Pending Verification', label: '⏳ Pending Review', color: '#4f46e5', bg: '#eef2ff' },
    { key: 'Submitted', label: '📤 Submitted', color: '#d97706', bg: '#fffbeb' },
    { key: 'none', label: '○ No Proof Yet', color: '#94a3b8', bg: '#f8fafc' },
  ];

  const filtered = tasks.filter((t) => {
    if (verFilter === 'all') return true;
    if (verFilter === 'none') return !t.pmedStatus && !t.pmedData;
    return t.pmedStatus === verFilter;
  });

  const counts = {
    all: tasks.length,
    Verified: tasks.filter(t => t.pmedStatus === 'Verified').length,
    Rejected: tasks.filter(t => t.pmedStatus === 'Rejected').length,
    'Pending Verification': tasks.filter(t => t.pmedStatus === 'Pending Verification').length,
    Submitted: tasks.filter(t => t.pmedStatus === 'Submitted').length,
    none: tasks.filter(t => !t.pmedStatus && !t.pmedData).length,
  };

  const VSTATUS_STYLE = {
    Verified: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    Rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    'Pending Verification': { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
    Submitted: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    default: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
  };

  return (
    <div>
      {/* Summary Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Tasks', count: tasks.length, color: '#475569', icon: '📋' },
          { label: 'Verified', count: counts.Verified, color: '#16a34a', icon: '✅' },
          { label: 'Rejected', count: counts.Rejected, color: '#dc2626', icon: '❌' },
          { label: 'Pending Review', count: counts['Pending Verification'], color: '#4f46e5', icon: '⏳' },
          { label: 'No Proof', count: counts.none, color: '#94a3b8', icon: '○' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Task Verification Status</h3>
        </div>
        <div className="panel-body">
          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
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
                <span style={{ background: verFilter === f.key ? f.color : '#e2e8f0', color: verFilter === f.key ? '#fff' : '#64748b', borderRadius: '999px', padding: '0 6px', fontSize: '11px', fontWeight: 700, marginLeft: '2px' }}>
                  {counts[f.key] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">📋</div>
              No tasks in this category.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map((t) => {
                const vstyle = VSTATUS_STYLE[t.pmedStatus] || VSTATUS_STYLE.default;
                const vLabel = t.pmedStatus || (t.pmedData ? 'Submitted' : 'No Proof Uploaded');
                return (
                  <div
                    key={t.id}
                    onClick={() => onViewDetails(t)}
                    style={{
                      background: '#fff',
                      border: `1px solid ${vstyle.border}`,
                      borderLeft: `4px solid ${vstyle.color}`,
                      borderRadius: '10px',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'box-shadow 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a', wordBreak: 'break-word' }}>{t.title}</strong>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: vstyle.bg, color: vstyle.color, border: `1px solid ${vstyle.border}`, whiteSpace: 'nowrap' }}>
                          {vLabel}
                        </span>
                      </div>
                      {t.description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                          {t.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Status: <strong style={{ color: '#475569' }}>{t.status}</strong></span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Priority: <strong style={{ color: '#475569' }}>{t.priority}</strong></span>
                        {t.dueDate && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Due: <strong style={{ color: '#475569' }}>{t.dueDate}</strong></span>}
                        {t.projectName && <span style={{ fontSize: '11px', color: '#94a3b8' }}>📂 {t.projectName}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {t.pmedData && (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>📎 Proof attached</span>
                      )}
                      <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        View →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaveForm({ onSubmit }) {
  const [form, setForm] = useState({ startDate: '', endDate: '', type: 'casual', reason: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      setForm({ startDate: '', endDate: '', type: 'casual', reason: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field-row">
        <div className="field">
          <label>From</label>
          <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div className="field">
          <label>To</label>
          <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <div className="field">
          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label>Reason</label>
        <textarea rows={2} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </div>
      <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Submitting…' : 'Apply for leave'}</button>
    </form>
  );
}

function ProfileForm({ profile, onSave }) {
  const [form, setForm] = useState({
    name: profile.name, email: profile.email, phone: profile.phone || '', department: profile.department, password: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      await onSave(payload);
      setForm((f) => ({ ...f, password: '' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Department</label>
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>New password (optional)</label>
        <input type="password" placeholder="Leave blank to keep current password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <button className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}
