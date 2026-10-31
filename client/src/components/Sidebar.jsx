import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

const statusClass = {
  ready: 'status-ready',
  pending: 'status-pending',
  failed: 'status-failed'
}

function Sidebar({ documents, isOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { docId: activeDocId } = useParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const activeIds = activeDocId ? activeDocId.split(',') : []

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavigate = (path) => {
    navigate(path)
    onClose?.()
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?'

  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-top-row">
          <Link to="/dashboard" className="sidebar-brand-row" onClick={onClose}>
            <Logo size={28} />
            <span className="sidebar-brand">DocuMind</span>
          </Link>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
      </div>

      <button
        type="button"
        className="sidebar-rail-button"
        onClick={() => handleNavigate('/dashboard')}
      >
        + New upload
      </button>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Your documents</div>
        <div className="documents-list">
          {documents.length === 0 && (
            <div className="sidebar-empty-state">
              No documents yet. Upload one from the dashboard to start chatting.
            </div>
          )}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`document-item-row ${activeIds.includes(doc.id) ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className="document-item"
                onClick={() => handleNavigate(`/chat/${doc.id}`)}
                disabled={doc.status !== 'ready'}
              >
                <span className={`doc-status-indicator ${statusClass[doc.status]}`} />
                <span className="doc-name">{doc.name}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-spacer" />

      <div className="sidebar-account-area" ref={menuRef}>
        {menuOpen && (
          <div className="sidebar-account-menu">
            <div className="sidebar-account-menu-header">
              <div className="sidebar-account-avatar">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initial}
              </div>
              <div className="sidebar-account-meta">
                <div className="sidebar-account-name">{user?.name}</div>
                <div className="sidebar-account-handle">{user?.email}</div>
              </div>
            </div>
            <div className="sidebar-account-menu-group">
              <button
                type="button"
                className="sidebar-account-menu-item sidebar-account-menu-item-danger"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="sidebar-account-trigger"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <div className="sidebar-account-avatar">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initial}
          </div>
          <div className="sidebar-account-trigger-text">
            <span className="sidebar-account-name">{user?.name}</span>
            <span className="sidebar-account-handle">{user?.email}</span>
          </div>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar