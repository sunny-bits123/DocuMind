import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { documentService } from '../services/documentService'

function DashboardLayout() {
  const [documents, setDocuments] = useState([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pollRef = useRef(null)

  const refreshDocuments = useCallback(async () => {
    try {
      const data = await documentService.list()
      setDocuments(data.documents)
      return data.documents
    } catch (err) {
      console.error('Failed to load documents:', err.message)
      return []
    }
  }, [])

  useEffect(() => {
    refreshDocuments().finally(() => setDocumentsLoading(false))
  }, [refreshDocuments])

  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'pending')

    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(refreshDocuments, 3000)
    }
    if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [documents, refreshDocuments])

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="dashboard">
      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <span />
        <span />
        <span />
      </button>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
      )}

      <Sidebar
        documents={documents}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <Outlet context={{ documents, documentsLoading, refreshDocuments }} />
    </div>
  )
}

export default DashboardLayout