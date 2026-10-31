import { useState, useRef , useEffect} from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { documentService } from '../services/documentService'
import DocumentCard from '../components/DocumentCard'
import Loader from '../components/Loader'

function Dashboard() {
  const { user } = useAuth()
  const { documents, documentsLoading, refreshDocuments } = useOutletContext()
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

    const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploading(true)
    try {
      await documentService.upload(file)
      await refreshDocuments()
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

    const handleDelete = (id) => {
    const doc = documents.find((d) => d.id === id)
    if (!doc) return
    setDeleteError('')
    setDeleteTarget(doc)
  }

  const closeDeleteDialog = () => {
    if (deleting) return
    setDeleteTarget(null)
    setDeleteError('')
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await documentService.remove(deleteTarget.id)
      await refreshDocuments()
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete document')
    } finally {
      setDeleting(false)
    }
  }

  // Escape closes the dialog
  useEffect(() => {
    if (!deleteTarget) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeDeleteDialog()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteTarget, deleting])

  const toggleSelectMode = () => {
    setSelectMode((v) => !v)
    setSelectedIds([])
  }

  const toggleSelectDoc = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const startMultiChat = () => {
    if (selectedIds.length === 0) return
    navigate(`/chat/${selectedIds.join(',')}`)
  }

  const readyCount = documents.filter((d) => d.status === 'ready').length
  const readyDocuments = documents.filter((d) => d.status === 'ready')

  return (
    <main className="dashboard-main">
      <div className="dashboard-header">
        <div className="header-content">
          <span className="dashboard-kicker">Workspace</span>
          <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p>Upload a document and start asking questions grounded in its actual content.</p>
        </div>
      </div>

      <div className="dashboard-overview">
        <div className="overview-card overview-card-primary">
          <span className="overview-label">Total documents</span>
          <strong>{documents.length}</strong>
          <p>In your workspace</p>
        </div>
        <div className="overview-card">
          <span className="overview-label">Ready to chat</span>
          <strong>{readyCount}</strong>
          <p>Fully processed</p>
        </div>
      </div>

      <section className="upload-section">
        <div className="upload-section-copy">
          <span className="upload-section-kicker">Add content</span>
          <h2>Upload a document</h2>
          <p>Supports PDF, TXT, and Markdown files up to 20MB.</p>
        </div>
        <div className="file-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileSelect}
            disabled={uploading}
            className="file-input-hidden"
          />
          <button
            type="button"
            className="file-upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <span className="file-upload-title">
              {uploading ? 'Uploading...' : 'Choose a file'}
            </span>
            <span className="file-upload-subtitle">PDF, TXT, or MD</span>
          </button>
        </div>
        {uploadError && <div className="error-message">{uploadError}</div>}
      </section>

      <section className="documents-section">
        <div className="documents-section-header">
          <div>
            <span className="documents-section-kicker">Library</span>
            <h2>Your documents</h2>
          </div>
          <div className="documents-section-actions">
            <span className="documents-count-pill">{documents.length} total</span>
            {readyDocuments.length >= 2 && (
              <button type="button" className="btn-multi-toggle" onClick={toggleSelectMode}>
                {selectMode ? 'Cancel' : 'Chat with multiple'}
              </button>
            )}
          </div>
        </div>

        {selectMode && (
          <div className="multi-select-bar">
            <span>
              {selectedIds.length === 0
                ? 'Select two or more documents to chat with together'
                : `${selectedIds.length} document${selectedIds.length === 1 ? '' : 's'} selected`}
            </span>
            <button
              type="button"
              className="btn-primary"
              disabled={selectedIds.length < 2}
              onClick={startMultiChat}
            >
              Start chat
            </button>
          </div>
        )}

        {documentsLoading ? (
          <Loader label="Loading your documents..." />
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <h3>No documents yet</h3>
            <p>Upload your first file above to start chatting with it.</p>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
                selectable={selectMode}
                selected={selectedIds.includes(doc.id)}
                onToggleSelect={toggleSelectDoc}
              />
            ))}
          </div>
        )}
      </section>
            {deleteTarget && (
        <div className="modal-overlay" onClick={closeDeleteDialog}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-dialog-title">Delete this document?</h3>
            <p className="modal-text">
              <strong>{deleteTarget.name}</strong> will be permanently deleted. This cannot be undone.
            </p>
            {deleteError && <div className="error-message">{deleteError}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeDeleteDialog}
                disabled={deleting}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Dashboard