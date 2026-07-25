import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AnnouncementsWidget({ readOnly = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' && !readOnly;
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      await api.post('/announcements', { title, content });
      setTitle('');
      setContent('');
      fetchAnnouncements();
    } catch (err) {
      setError('Failed to create announcement');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      setError('Failed to delete announcement');
    }
  };

  if (loading && announcements.length === 0) return <div className="card">Loading announcements...</div>;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '20px' }}>📢</span>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#1e293b' }}>Announcements</h2>
      </div>

      {error && <div style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>{error}</div>}

      {isAdmin && (
        <form onSubmit={handleCreate} style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Post New Announcement</h3>
          <input
            type="text"
            className="input"
            placeholder="Announcement Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box' }}
            required
          />
          <textarea
            className="input"
            placeholder="Announcement Message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows="3"
            style={{ marginBottom: '12px', width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            required
          ></textarea>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Post Announcement</button>
        </form>
      )}

      {announcements.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px', background: '#f8fafc', borderRadius: '8px' }}>
          No announcements at this time.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {announcements.map((a) => (
            <div key={a.id} style={{ padding: '16px', background: '#f1f5f9', borderRadius: '8px', borderLeft: '4px solid #3b82f6', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{a.title}</h4>
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(a.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{a.content}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Posted by {a.authorName}</span>
                <span>{new Date(a.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
