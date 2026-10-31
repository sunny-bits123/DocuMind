import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { documentService } from '../services/documentService'
import Loader from './Loader'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// Keep a few downloaded PDFs in memory so re-opening or jumping between
// citations on the same file doesn't download it again.
const blobCache = new Map()
const CACHE_LIMIT = 3

function cacheBlob(id, blob) {
  blobCache.set(id, blob)
  if (blobCache.size > CACHE_LIMIT) {
    blobCache.delete(blobCache.keys().next().value)
  }
}

function DocumentViewer({ documentId, documentName, page, citedPages = [], jumpKey, onClose }) {
  const [blob, setBlob] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(page || 1)
  const [width, setWidth] = useState(0)
  const bodyRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoadError('')
    setNumPages(null)

    const cached = blobCache.get(documentId)
    if (cached) {
      setBlob(cached)
      return undefined
    }

    setBlob(null)
    documentService
      .getFile(documentId)
      .then((fileBlob) => {
        if (cancelled) return
        cacheBlob(documentId, fileBlob)
        setBlob(fileBlob)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Could not load the document')
      })

    return () => {
      cancelled = true
    }
  }, [documentId])

  // Jump whenever a new citation is clicked (jumpKey changes even for the same page)
  useEffect(() => {
    setPageNumber(page || 1)
  }, [page, documentId, jumpKey])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const currentPage = Math.min(Math.max(1, pageNumber), numPages || pageNumber)
  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1))
  const goNext = () => setPageNumber((p) => Math.min(numPages || p, p + 1))

  return (
    <aside className="viewer-panel" aria-label="Document viewer">
      <div className="viewer-toolbar">
        <span className="viewer-title" title={documentName}>
          {documentName || 'Document'}
        </span>
        <div className="viewer-controls">
          <button
            type="button"
            className="viewer-btn"
            onClick={goPrev}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="viewer-page-label">
            Page {currentPage}
            {numPages ? ` of ${numPages}` : ''}
          </span>
          <button
            type="button"
            className="viewer-btn"
            onClick={goNext}
            disabled={!numPages || currentPage >= numPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
        <button type="button" className="viewer-btn viewer-close" onClick={onClose} aria-label="Close viewer">
          ×
        </button>
      </div>

      {citedPages.length > 1 && (
        <div className="viewer-cited">
          <span className="viewer-cited-label">Answer spans</span>
          {citedPages.map((p) => (
            <button
              type="button"
              key={p}
              className={`viewer-cited-btn ${p === currentPage ? 'is-active' : ''}`}
              onClick={() => setPageNumber(p)}
            >
              Page {p}
            </button>
          ))}
        </div>
      )}

      <div className="viewer-body" ref={bodyRef}>
        {loadError ? (
          <div className="error-message">{loadError}</div>
        ) : !blob ? (
          <Loader label="Loading document..." />
        ) : (
          <Document
            file={blob}
            onLoadSuccess={({ numPages: total }) => setNumPages(total)}
            onLoadError={(err) => setLoadError(err.message || 'Could not read this PDF')}
            loading={<Loader label="Rendering..." />}
          >
            {width > 0 && <Page pageNumber={currentPage} width={Math.min(width, 900)} />}
          </Document>
        )}
      </div>
    </aside>
  )
}

export default DocumentViewer