import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function CompanyInfoPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [infoList, setInfoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/company-info');
      setInfoList(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load company information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ title: '', content: '' });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({ title: item.title, content: item.content });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('Both title and content are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (editingItem) {
        // Edit existing
        await api.put(`/company-info/${editingItem.id}`, form);
        setNotice('Company information updated successfully.');
      } else {
        // Create new
        await api.post('/company-info', form);
        setNotice('Company information added successfully.');
      }
      setShowModal(false);
      loadInfo();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save company information.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      await api.delete(`/company-info/${item.id}`);
      setNotice('Company information deleted successfully.');
      loadInfo();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete company information.');
    }
  };

  // Helper to render beautiful icons based on titles
  const getIconForTitle = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('web') || t.includes('site') || t.includes('url')) return '🌐';
    if (t.includes('phone') || t.includes('number') || t.includes('call') || t.includes('tel') || t.includes('contact') || t.includes('helpline')) return '📞';
    if (t.includes('email') || t.includes('mail') || t.includes('support')) return '✉️';
    if (t.includes('address') || t.includes('office') || t.includes('location')) return '📍';
    if (t.includes('tax') || t.includes('vat') || t.includes('reg') || t.includes('tin') || t.includes('license')) return '📜';
    if (t.includes('bank') || t.includes('pay') || t.includes('iban')) return '🏦';
    return '🏢';
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => 
      urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue, #3b82f6)', textDecoration: 'underline' }}>{part}</a> : part
    );
  };

  if (loading) return <div className="empty-state">Loading company information…</div>;

  return (
    <div style={{ padding: '4px' }}>
      {notice && <div className="success-banner" style={{ marginBottom: '20px' }}>{notice}</div>}

      <div className="panel">
        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Corporate Directory & Details</h3>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              + Add Information
            </button>
          )}
        </div>

        <div className="panel-body">
          <p style={{ marginTop: 0, color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '24px' }}>
            Official organization registry data, communication contacts, and online portal details.
          </p>

          {infoList.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">🏢</div>
              No company information entries available.
              {isAdmin && <p style={{ fontSize: '13px' }}>Click "+ Add Information" above to create one.</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {infoList.map((item) => (
                <div
                  key={item.id}
                  className="task-card"
                  style={{
                    margin: 0,
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '24px', background: 'var(--canvas)', padding: '8px', borderRadius: '8px' }}>
                        {getIconForTitle(item.title)}
                      </span>
                      <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>{item.title}</strong>
                    </div>
                    <div 
                      style={{ 
                        fontSize: '14.5px', 
                        color: 'var(--text)', 
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {renderTextWithLinks(item.content)}
                    </div>
                  </div>

                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '20px', 
                      borderTop: '1px solid var(--border)', 
                      paddingTop: '12px',
                      fontSize: '11px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'}</span>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleOpenEdit(item)}
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleDelete(item)}
                          style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--red, #dc2626)' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal 
          title={editingItem ? 'Edit Company Information' : 'Add Company Information'} 
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            {error && <div style={{ color: 'red', fontSize: '13px' }}>{error}</div>}

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Title / Attribute Name</label>
              <input
                type="text"
                placeholder="e.g. Official Website, Helpline Number, Office Address"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  border: '1px solid var(--border)',
                  outline: 'none',
                }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Content / Value</label>
              <textarea
                placeholder="Enter details here..."
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
