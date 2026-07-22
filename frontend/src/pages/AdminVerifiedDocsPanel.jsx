import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import Modal from '../components/Modal';

export default function AdminVerifiedDocsPanel() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, usersRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/users'),
      ]);
      setTasks(tasksRes.data);
      setEmployees(usersRes.data);
    } catch (err) {
      console.error('Failed to load verified documents data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract all verified deliverable proof documents
  const verifiedTaskDocs = tasks
    .filter((t) => t.pmedData && t.pmedStatus === 'Verified')
    .map((t) => {
      const emp = employees.find((e) => e.id === t.assignedTo);
      return {
        id: t.id,
        docName: t.pmedName || 'Work_Deliverable_Proof',
        docData: t.pmedData,
        sourceType: 'Task Deliverable',
        taskTitle: t.title,
        projectName: t.projectName || 'General',
        employeeName: emp ? emp.name : 'Unknown Employee',
        department: emp ? emp.department : 'General',
        updatedAt: t.updatedAt || t.completedAt || t.createdAt,
      };
    });

  const filteredDocs = verifiedTaskDocs.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.docName.toLowerCase().includes(q) ||
      doc.taskTitle.toLowerCase().includes(q) ||
      doc.employeeName.toLowerCase().includes(q) ||
      doc.department.toLowerCase().includes(q)
    );
  });

  const handleViewFile = (doc) => {
    if (!doc.docData) return;
    setPreviewFile(doc);
  };

  if (loading) return <div className="empty-state">Loading verified documents...</div>;

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Verified Documents & Work Deliverables</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: '4px 0 0 0' }}>
            Central archive of all task work deliverables and employee documents verified and approved by Admin.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Search Archive</label>
            <input 
              type="text" 
              placeholder="Search by document name, task, employee, or department..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Verified Documents Table */}
      {filteredDocs.length === 0 ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📜</div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b' }}>No verified documents in archive yet</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            When an admin approves and verifies an employee work deliverable, it will automatically move here.
          </p>
        </div>
      ) : (
        <div className="panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>DOCUMENT</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>TASK / PROJECT</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>EMPLOYEE</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>VERIFICATION STATUS</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>📜</span>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{doc.docName}</strong>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{doc.sourceType}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block' }}>{doc.taskTitle}</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>📂 {doc.projectName}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block' }}>👤 {doc.employeeName}</strong>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>🏢 {doc.department}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ✓ Verified & Approved
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleViewFile(doc)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        👁 Preview File
                      </button>
                      <a 
                        href={doc.docData} 
                        download={doc.docName}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', background: 'var(--maroon)' }}
                      >
                        ⬇ Download
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview File Modal */}
      {previewFile && (
        <Modal title={`Document Preview: ${previewFile.docName}`} onClose={() => setPreviewFile(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{previewFile.docName}</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Task: {previewFile.taskTitle} | Employee: {previewFile.employeeName}</span>
              </div>
              <a 
                href={previewFile.docData} 
                download={previewFile.docName}
                className="btn btn-primary btn-sm"
                style={{ padding: '6px 14px', fontSize: '12px', textDecoration: 'none', background: 'var(--maroon)' }}
              >
                ⬇ Download File
              </a>
            </div>

            <div style={{ width: '100%', height: '450px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }}>
              {previewFile.docData.startsWith('data:image/') ? (
                <img 
                  src={previewFile.docData} 
                  alt={previewFile.docName} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <iframe 
                  src={previewFile.docData} 
                  title={previewFile.docName} 
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setPreviewFile(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
