import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { supabase } from '../supabaseClient';

export default function AdminProfilePanel() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', password: '' });
  const [saving, setSaving] = useState(false);

  // Document management
  const [docForm, setDocForm] = useState({ name: '', docType: 'Passport', status: 'Submitted' });
  const [docFile, setDocFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/me');
      setProfile(res.data);
      setForm({
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone || '',
        department: res.data.department || '',
        password: '',
      });
    } catch {
      setError('Could not load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const res = await api.put('/users/me', payload);
      setProfile(res.data);
      setNotice('Profile updated successfully.');
      setForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

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
        data: publicUrlData.publicUrl,
      });
    } catch (err) {
      console.error('Upload failed', err);
      alert('File upload failed.');
    }
  };

  async function handleAddDoc(e) {
    e.preventDefault();
    if (!docForm.name.trim()) return;
    setError('');
    setNotice('');
    try {
      const docs = [...(profile.documents || [])];
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
      const res = await api.put('/users/me', { documents: docs });
      setProfile(res.data);
      setDocForm({ name: '', docType: 'Passport', status: 'Submitted' });
      setDocFile(null);
      e.target.reset();
      setNotice('Document added.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add document.');
    }
  }

  async function handleRemoveDoc(docId) {
    setError('');
    setNotice('');
    try {
      const docs = (profile.documents || []).filter((d) => d.id !== docId);
      const res = await api.put('/users/me', { documents: docs });
      setProfile(res.data);
      setNotice('Document removed.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove document.');
    }
  }

  if (loading) return <div className="empty-state">Loading profile…</div>;
  if (!profile) return <div className="error-banner">Profile not found.</div>;

  const documents = profile.documents || [];

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
    'Submitted': { bg: 'var(--amber-soft)', color: 'var(--amber)' },
    'Verified': { bg: 'var(--green-soft)', color: 'var(--green)' },
    'Rejected': { bg: 'var(--red-soft)', color: 'var(--red)' },
    'Pending': { bg: 'var(--indigo-soft)', color: 'var(--indigo)' },
  };

  return (
    <>
      {notice && <div className="success-banner">{notice}</div>}
      {error && <div className="error-banner">{error}</div>}

      {/* Profile Info Header */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {profile.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{profile.name}</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{profile.username} · {profile.role}</span>
            </div>
          </div>
          <span className="pill pill-completed" style={{ fontSize: '10px' }}>{profile.status}</span>
        </div>
        <div className="panel-body">
          <form onSubmit={handleSave}>
            <div className="field-row">
              <div className="field">
                <label>Full name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Department</label>
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
              </div>
            </div>
            <div className="field">
              <label>New password (leave blank to keep current)</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile changes'}</button>
          </form>
        </div>
      </div>

      {/* Verification Documents */}
      <div className="panel">
        <div className="panel-head">
          <h3>Verification documents</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Upload and manage your verification documents. These are used for company compliance and identity verification purposes.
          </p>

          {/* Document Cards */}
          {documents.length > 0 && (
            <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
              {documents.map((doc) => {
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
                        <a 
                          href={doc.fileData} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--maroon)', borderColor: 'var(--maroon)' }}
                          download={doc.fileName}
                        >
                          👁 View File
                        </a>
                      )}
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                        background: sc.bg, color: sc.color, textTransform: 'uppercase',
                      }}>
                        {doc.status}
                      </span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveDoc(doc.id)}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Remove document"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {documents.length === 0 && (
            <div className="empty-state" style={{ marginBottom: '24px' }}>
              <div className="glyph">📋</div>
              No verification documents uploaded yet.
            </div>
          )}

          {/* Add Document Form */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--ink)' }}>Add a new document</h4>
            <form onSubmit={handleAddDoc}>
              <div className="field">
                <label>Document name</label>
                <input
                  required value={docForm.name}
                  onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                  placeholder="e.g. Business Registration Certificate"
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Document type</label>
                  <select value={docForm.docType} onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}>
                    <option value="Passport">Passport</option>
                    <option value="National ID">National ID</option>
                    <option value="Trade License">Trade License</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Tax Document">Tax Document</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={docForm.status} onChange={(e) => setDocForm({ ...docForm, status: e.target.value })}>
                    <option value="Submitted">Submitted</option>
                    <option value="Verified">Verified</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Upload File (Image, PDF, etc.)</label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  onChange={handleFileChange} 
                />
              </div>
              <button className="btn btn-primary btn-sm" type="submit">+ Add document</button>
            </form>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="panel">
        <div className="panel-head"><h3>Account details</h3></div>
        <div className="panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Username</span>
              <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>@{profile.username}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Role</span>
              <strong style={{ fontSize: '14px', color: 'var(--ink)', textTransform: 'capitalize' }}>{profile.role}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</span>
              <strong style={{ fontSize: '14px', color: 'var(--ink)', textTransform: 'capitalize' }}>{profile.status}</strong>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Member since</span>
              <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
