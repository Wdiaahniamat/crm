const STATUS_LABEL = { pending: 'Pending', 'in-progress': 'In progress', completed: 'Completed' };
const STATUS_CLASS = { pending: 'pill-pending', 'in-progress': 'pill-progress', completed: 'pill-completed' };
const PRIORITY_CLASS = { high: 'pill-high', medium: 'pill-medium', low: 'pill-low' };

export default function TaskCard({ task, onAdvance, onEdit, canEdit, onViewDetails }) {
  const nextStatus = task.status === 'pending' ? 'in-progress' : task.status === 'in-progress' ? 'completed' : null;
  const nextLabel = task.status === 'pending' ? 'Start task' : task.status === 'in-progress' ? 'Mark done' : null;

  return (
    <div 
      className="task-card" 
      onClick={() => onViewDetails && onViewDetails(task)} 
      style={{ cursor: onViewDetails ? 'pointer' : 'default' }}
    >
      <div className="top-row">
        <h4>{task.title}</h4>
        <span className={`pill ${PRIORITY_CLASS[task.priority] || 'pill-low'}`}>{task.priority}</span>
      </div>
      {task.description && <p>{task.description}</p>}
      {task.projectName && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '-4px' }}>
          📂 <span>{task.projectName}</span>
        </div>
      )}
      <div className="meta-row">
        <span className={`pill ${STATUS_CLASS[task.status]}`}>{STATUS_LABEL[task.status]}</span>
        <span className="due">{task.dueDate ? `Due ${task.dueDate}` : 'No due date'}</span>
      </div>
      <div className="meta-row" onClick={(e) => e.stopPropagation()}>
        {nextStatus && (
          <button className="btn btn-primary btn-sm" onClick={() => onAdvance(task, nextStatus)}>
            {nextLabel}
          </button>
        )}
        {task.status === 'completed' && (
          <button className="btn btn-ghost btn-sm" onClick={() => onAdvance(task, 'pending')}>Reopen</button>
        )}
        {canEdit && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>Edit</button>
        )}
      </div>
    </div>
  );
}
