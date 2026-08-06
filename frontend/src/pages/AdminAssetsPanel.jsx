import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { downloadFileFromDataUrl } from '../utils/downloadUtils';

const ASSET_TYPES = ['Social Media', 'Credentials', 'Domain/Web', 'Hosting/Server', 'Other'];
const ASSET_ICONS = {
  'Social Media': '📱',
  'Credentials': '🔑',
  'Domain/Web': '🌐',
  'Hosting/Server': '☁️',
  'Other': '💼'
};

export default function AdminAssetsPanel() {
  const [assets, setAssets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('Company Data');

  // Modal forms state
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [form, setForm] = useState({
    companyName: 'Our Company',
    customCompany: '',
    assetType: 'Social Media',
    name: '',
    value: '',
    notes: '',
    status: 'Active',
    folder: 'Company Data',
    fileName: '',
    fileData: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, clientsRes] = await Promise.all([
        api.get('/assets'),
        api.get('/clients')
      ]);
      setAssets(assetsRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error('Could not load assets data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setForm((prev) => ({ ...prev, fileName: '', fileData: '' }));
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/upload', formData);
      setForm((prev) => ({ ...prev, fileName: res.data.fileName, fileData: res.data.url }));
    } catch (err) {
      console.error('File upload failed', err);
      alert('File upload failed. Please try again.');
    }
  };

  const openAddModal = () => {
    setEditingAsset(null);
    setForm({
      companyName: 'Our Company',
      customCompany: '',
      assetType: 'Social Media',
      name: '',
      value: '',
      notes: '',
      status: 'Active',
      folder: currentFolder,
      fileName: '',
      fileData: ''
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    const isPredefinedCompany = asset.companyName === 'Our Company' || clients.some(c => c.name === asset.companyName);
    setForm({
      companyName: isPredefinedCompany ? asset.companyName : 'Custom',
      customCompany: isPredefinedCompany ? '' : asset.companyName,
      assetType: asset.assetType,
      name: asset.name,
      value: asset.value,
      notes: asset.notes || '',
      status: asset.status || 'Active',
      folder: asset.folder || 'Company Data',
      fileName: asset.fileName || '',
      fileData: asset.fileData || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    const finalCompanyName = form.companyName === 'Custom' ? form.customCompany.trim() : form.companyName;
    if (!finalCompanyName) {
      setError('Please specify a company name.');
      setSaving(false);
      return;
    }

    const payload = {
      companyName: finalCompanyName,
      assetType: form.assetType,
      name: form.name.trim(),
      value: form.value.trim(),
      notes: form.notes.trim(),
      status: form.status,
      folder: form.folder,
      fileName: form.fileName,
      fileData: form.fileData
    };

    try {
      if (editingAsset) {
        await api.put(`/assets/${editingAsset.id}`, payload);
      } else {
        await api.post('/assets', payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save asset.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await api.delete(`/assets/${id}`);
      loadData();
    } catch (err) {
      alert('Could not delete asset.');
    }
  };

  // Filtering logic
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !typeFilter || asset.assetType === typeFilter;
    const matchesCompany = !companyFilter || asset.companyName === companyFilter;
    const matchesFolder = (asset.folder || 'Company Data') === currentFolder;

    return matchesSearch && matchesType && matchesCompany && matchesFolder;
  });

  // Get unique companies list for filters
  const uniqueCompanies = Array.from(new Set(assets.map(a => a.companyName)));

  if (loading) return <div className="empty-state">Loading company assets…</div>;

  return (
    <div>
      {/* Header and Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>
            Central repository for social media handles, server credentials, and digital assets.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} style={{ background: 'var(--maroon)' }}>
          + Add New Asset
        </button>
      </div>

      {/* Folders Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
        {['Company Data', 'Employees Data', 'Tasks Data'].map(folder => (
          <button
            key={folder}
            onClick={() => setCurrentFolder(folder)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: currentFolder === folder ? 'var(--maroon)' : '#f1f5f9',
              color: currentFolder === folder ? '#fff' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            {folder === 'Company Data' ? '🏢 ' : folder === 'Employees Data' ? '👥 ' : '📋 '}{folder}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Search</label>
            <input 
              type="text" 
              placeholder="Search by name, value, company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
            />
          </div>
          <div style={{ minWidth: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Asset Type</label>
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
            >
              <option value="">— All Types —</option>
              {ASSET_TYPES.map(t => <option key={t} value={t}>{ASSET_ICONS[t]} {t}</option>)}
            </select>
          </div>
          <div style={{ minWidth: '150px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Company</label>
            <select 
              value={companyFilter} 
              onChange={(e) => setCompanyFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
            >
              <option value="">— All Companies —</option>
              <option value="Our Company">Our Company</option>
              {uniqueCompanies.filter(c => c !== 'Our Company').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Cards list */}
      {filteredAssets.length === 0 ? (
        <div className="empty-state">No company assets match your criteria.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredAssets.map((asset) => (
            <div 
              key={asset.id} 
              className="panel" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                height: '100%', 
                margin: 0,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ padding: '16px 20px' }}>
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="pill" style={{ background: 'var(--maroon-soft)', color: 'var(--maroon)', fontSize: '10.5px', fontWeight: 700 }}>
                    {ASSET_ICONS[asset.assetType] || '💼'} {asset.assetType}
                  </span>
                  <span className={`pill ${asset.status === 'Active' ? 'pill-completed' : 'pill-pending'}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                    {asset.status || 'Active'}
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', marginBottom: '2px' }}>{asset.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Owner: <strong>{asset.companyName}</strong>
                </div>

                {/* Primary Asset Value Box */}
                <div style={{ background: 'var(--canvas)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                    {asset.value}
                  </span>
                  <button 
                    onClick={() => handleCopy(asset.id, asset.value)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px 8px', fontSize: '11px', flexShrink: 0 }}
                  >
                    {copiedId === asset.id ? 'Copied! ✓' : 'Copy 📋'}
                  </button>
                </div>

                {asset.fileName && (
                  <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {asset.fileName}</span>
                    <button 
                      onClick={(e) => { e.preventDefault(); downloadFileFromDataUrl(asset.fileData, asset.fileName); }}
                      className="btn btn-primary btn-sm" 
                      style={{ padding: '4px 10px', fontSize: '11px', border: 'none', background: 'var(--maroon)' }}
                    >
                      Download
                    </button>
                  </div>
                )}

                {/* Additional Notes */}
                {asset.notes && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', background: '#fafafb', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--border)' }}>
                    {asset.notes}
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', background: '#fafafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => openEditModal(asset)}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Edit Asset
                </button>
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={() => handleDelete(asset.id)}
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal title={editingAsset ? 'Edit Asset' : 'Add Company Asset'} onClose={() => setShowModal(false)}>
          {error && <div className="error-banner" style={{ marginBottom: '16px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Folder Location</label>
              <select 
                value={form.folder} 
                onChange={(e) => setForm({ ...form, folder: e.target.value })}
              >
                <option value="Company Data">Company Data</option>
                <option value="Employees Data">Employees Data</option>
                <option value="Tasks Data">Tasks Data</option>
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Company Ownership</label>
                <select 
                  value={form.companyName} 
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                >
                  <option value="Our Company">Our Company (Internal)</option>
                  {clients.map(c => <option key={c.id} value={c.name}>{c.name} (Client)</option>)}
                  <option value="Custom">Custom Company Name...</option>
                </select>
              </div>

              <div className="field">
                <label>Asset Category</label>
                <select 
                  value={form.assetType} 
                  onChange={(e) => setForm({ ...form, assetType: e.target.value })}
                >
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {form.companyName === 'Custom' && (
              <div className="field">
                <label>Custom Company Name</label>
                <input 
                  required
                  placeholder="e.g. Acme Corp" 
                  value={form.customCompany} 
                  onChange={(e) => setForm({ ...form, customCompany: e.target.value })}
                />
              </div>
            )}

            <div className="field">
              <label>Asset Name</label>
              <input 
                required
                placeholder="e.g. Official Twitter Account, AWS Staging Credentials" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Value / Handle / Link</label>
              <input 
                required
                placeholder="e.g. @acme_brand or https://twitter.com/acme" 
                value={form.value} 
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Status</label>
                <select 
                  value={form.status} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Credentials & Configuration Notes (Optional)</label>
              <textarea 
                rows={3} 
                placeholder="e.g. Username: admin, Pass: xxxx, or recovery email details" 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Attachment (Optional)</label>
              {form.fileName && (
                <div style={{ fontSize: '13px', marginBottom: '8px', padding: '8px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  📎 {form.fileName}
                  <button type="button" onClick={() => setForm({ ...form, fileName: '', fileData: '' })} style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✖ Remove</button>
                </div>
              )}
              <input type="file" onChange={handleFileChange} />
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} style={{ background: 'var(--maroon)' }}>
                {saving ? 'Saving…' : editingAsset ? 'Save Changes' : 'Add Asset'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
