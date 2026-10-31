import { useNavigate } from 'react-router-dom'

const statusLabel = {
  ready: 'Ready',
  pending: 'Processing...',
  failed: 'Failed'
}

const statusClass = {
  ready: 'status-badge-ready',
  pending: 'status-badge-pending',
  failed: 'status-badge-failed'
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentCard({ document, onDelete, selectable, selected, onToggleSelect }) {
  const navigate = useNavigate()
  const isReady = document.status === 'ready'

  const handleCardClick = () => {
    if (selectable && isReady) {
      onToggleSelect(document.id)
    }
  }

  return (
    <div
      className={`document-card ${isReady ? '' : 'is-disabled'} ${selected ? 'is-selected' : ''}`}
      onClick={selectable ? handleCardClick : undefined}
    >
      <div className="card-header">
        <div className="card-header-main">
          <span className="document-type-pill">{document.fileType}</span>
          <h3>{document.name}</h3>
        </div>
        {selectable ? (
          <input
            type="checkbox"
            className="document-select-checkbox"
            checked={!!selected}
            disabled={!isReady}
            onChange={() => onToggleSelect(document.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`status-badge ${statusClass[document.status]}`}>
            {statusLabel[document.status]}
          </span>
        )}
      </div>

      {document.status === 'failed' && document.failureReason && (
        <p className="card-description">{document.failureReason}</p>
      )}

      <div className="card-meta">
        <span>{formatSize(document.fileSize)}</span>
        <span>{new Date(document.createdAt).toLocaleDateString()}</span>
      </div>

      {!selectable && (
        <div className="card-actions">
          <button
            type="button"
            className="btn-view"
            disabled={!isReady}
            onClick={() => navigate(`/chat/${document.id}`)}
          >
            {isReady ? 'Open chat' : 'Processing...'}
          </button>
          <button type="button" className="btn-delete" onClick={() => onDelete(document.id)}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default DocumentCard