import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useParams, useOutletContext, Navigate } from 'react-router-dom'
import { chatService } from '../services/chatService'
import ChatMessage from '../components/ChatMessage'
import Loader from '../components/Loader'

// viewer: pdf.js is only downloaded when someone actually opens the viewer
const DocumentViewer = lazy(() => import('../components/DocumentViewer'))

const VIEWER_CLOSED = { open: false, documentId: null, page: 1, pages: [], jumpKey: 0 } // viewer
const DESKTOP_QUERY = '(min-width: 901px)' // viewer

function ChatPage() {
  const { docId: docIdParam } = useParams()
  const { documents, documentsLoading, refreshDocuments } = useOutletContext()
  const [messages, setMessages] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [viewer, setViewer] = useState(VIEWER_CLOSED) // viewer
  const windowRef = useRef(null)
  const inputRef = useRef(null)
  const viewerRef = useRef(viewer) // viewer
  const autoOpenDoneRef = useRef(false) // viewer
  viewerRef.current = viewer // viewer

  const docIds = docIdParam.split(',').filter(Boolean)
  const isMulti = docIds.length > 1
  const chatDocuments = documents.filter((d) => docIds.includes(d.id))
  const allReady = chatDocuments.length > 0 && chatDocuments.every((d) => d.status === 'ready')
  const activeDoc = !isMulti ? chatDocuments[0] : null
  const hasOverview = activeDoc && (activeDoc.summary || activeDoc.topics?.length || activeDoc.suggestedQuestions?.length)
  const canViewActiveDoc = Boolean(activeDoc && activeDoc.fileType === 'pdf' && activeDoc.status === 'ready') // viewer

  const historyDocId = docIds[0]

  useEffect(() => {
    refreshDocuments()
  }, [])

  // viewer: a different chat starts with a closed viewer
  useEffect(() => {
    setViewer(VIEWER_CLOSED)
    autoOpenDoneRef.current = false
  }, [docIdParam])

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)

    chatService
      .getHistory(historyDocId)
      .then((data) => {
        if (!cancelled) setMessages(data.messages)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [historyDocId])

  useEffect(() => {
    if (windowRef.current) {
      windowRef.current.scrollTop = windowRef.current.scrollHeight
    }
  }, [messages])

  if (!documentsLoading && chatDocuments.length === 0) {
    return <Navigate to="/dashboard" replace />
  }

  // viewer: only PDF sources that carry a page number can open the viewer
  const canOpenSource = (source) => {
    if (source.page == null) return false
    const doc = chatDocuments.find((d) => d.id === String(source.documentId))
    return doc?.fileType === 'pdf'
  }

  // viewer: manual open (source button or header button)
  const openSource = ({ documentId, page, pages }) => {
    autoOpenDoneRef.current = true
    setViewer((prev) => ({
      open: true,
      documentId,
      page: page || 1,
      pages: pages || [],
      jumpKey: prev.jumpKey + 1
    }))
  }

  const closeViewer = () => {
    autoOpenDoneRef.current = true
    setViewer(VIEWER_CLOSED)
  }
    // viewer: every page cited by any source of the answer, sorted
  const collectPages = (sources) => {
    const set = new Set()
    for (const s of sources || []) {
      if (!canOpenSource(s)) continue
      const list = s.pages?.length ? s.pages : [s.page]
      list.forEach((p) => set.add(p))
    }
    return [...set].sort((a, b) => a - b)
  }

    // viewer: decide what a new answer does to the viewer
  const applyAnswerToViewer = (sources) => {
    const top = sources?.[0]
    if (!top || !canOpenSource(top)) return

    const allPages = collectPages(sources)
    const current = viewerRef.current
    if (current.open) {
      // Already open: follow the answer (single-document chats only)
      if (!isMulti) {
        setViewer({
          open: true,
          documentId: String(top.documentId),
          page: top.page,
          pages: allPages,
          jumpKey: current.jumpKey + 1
        })
      }
      return
    }

    const isDesktop = window.matchMedia(DESKTOP_QUERY).matches
    if (!isMulti && isDesktop && !autoOpenDoneRef.current) {
      autoOpenDoneRef.current = true
      setViewer({
        open: true,
        documentId: String(top.documentId),
        page: top.page,
        pages: allPages,
        jumpKey: current.jumpKey + 1
      })
    }
  }
  const handleSend = async (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setError('')
    setInput('')
    setSending(true)

    const optimisticUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimisticUserMessage])

    const botTempId = `temp-bot-${Date.now()}`

    // Adds each piece of the answer to the growing bot message
    const appendToken = (piece) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === botTempId)) {
          return prev.map((m) => (m.id === botTempId ? { ...m, content: m.content + piece } : m))
        }
        return [
          ...prev,
          { id: botTempId, role: 'bot', content: piece, createdAt: new Date().toISOString() }
        ]
      })
    }

    // Swaps the growing message for the saved one, with its sources
    const finalize = (data) => {
      const finalMessage = {
        id: data.messageId,
        role: 'bot',
        content: data.response,
        sources: data.sources,
        createdAt: new Date().toISOString()
      }
      setMessages((prev) =>
        prev.some((m) => m.id === botTempId)
          ? prev.map((m) => (m.id === botTempId ? finalMessage : m))
          : [...prev, finalMessage]
      )
      applyAnswerToViewer(data.sources) // viewer
    }

    try {
      try {
        const data = await chatService.sendMessageStream(docIds, trimmed, { onToken: appendToken })
        finalize(data)
      } catch (streamErr) {
        if (streamErr.code !== 'STREAM_UNAVAILABLE') throw streamErr
        // Streaming not available: use the normal full-answer request
        const data = await chatService.sendMessage(docIds, trimmed)
        finalize(data)
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== botTempId)) // drop a half-written answer
      setError(err.message || 'Failed to get a response. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const askSuggested = (q) => {
    setInput(q)
    inputRef.current?.focus()
  }
  const streamingStarted = messages.some((m) => String(m.id).startsWith('temp-bot-'))
  const headerTitle = isMulti
    ? `${chatDocuments.length} documents`
    : chatDocuments[0]?.name || 'Loading...'

  const viewerDocName = chatDocuments.find((d) => d.id === viewer.documentId)?.name // viewer

  return (
    <div className={`chat-page ${viewer.open ? 'has-viewer' : ''}`}>
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-header-main">
            <span className="chat-header-kicker">
              {isMulti ? 'Multi-document chat' : 'Document chat'}
            </span>
            <h2>{headerTitle}</h2>
            {isMulti ? (
              <div className="chat-doc-pills">
                {chatDocuments.map((d) => (
                  <span className="chat-doc-pill" key={d.id}>
                    {d.name}
                  </span>
                ))}
              </div>
            ) : (
              <p>Answers are grounded only in this document's content.</p>
            )}
          </div>
          {canViewActiveDoc && !viewer.open && (
            <button
              type="button"
              className="chat-header-viewer-btn"
              onClick={() => openSource({ documentId: activeDoc.id, page: 1 })}
            >
              View document
            </button>
          )}
        </div>

        <div className="chat-window" ref={windowRef}>
          {historyLoading ? (
            <Loader label="Loading conversation..." />
          ) : messages.length === 0 ? (
            !isMulti && hasOverview ? (
              <div className="doc-overview-card">
                <div className="doc-overview-header">
                  <span className="doc-overview-header-icon">🧭</span>
                  <h3>Understand this document</h3>
                </div>

                {activeDoc.summary && (
                  <div className="doc-overview-section">
                    <div className="doc-overview-section-title">
                      <span>📄</span> What is it about?
                    </div>
                    <p className="doc-overview-summary">{activeDoc.summary}</p>
                  </div>
                )}

                {activeDoc.topics?.length > 0 && (
                  <div className="doc-overview-section">
                    <div className="doc-overview-section-title">
                      <span>📌</span> Main Topics
                    </div>
                    <ul className="doc-overview-topics">
                      {activeDoc.topics.map((topic, i) => (
                        <li key={i}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeDoc.suggestedQuestions?.length > 0 && (
                  <div className="doc-overview-section">
                    <div className="doc-overview-section-title">
                      <span>💡</span> Suggested Questions
                    </div>
                    <div className="doc-overview-questions">
                      {activeDoc.suggestedQuestions.map((q, i) => (
                        <button
                          type="button"
                          key={i}
                          className="doc-overview-question-item"
                          onClick={() => askSuggested(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="doc-overview-ask-button"
                  onClick={() => inputRef.current?.focus()}
                >
                  Ask a question →
                </button>
              </div>
            ) : (
              <div className="chat-empty">
                <div className="chat-empty-orb">AI</div>
                <h3>
                  {isMulti ? 'Ask anything across these documents' : 'Ask anything about this document'}
                </h3>
                <p>
                  {isMulti
                    ? 'Try a question that draws on information from more than one file.'
                    : "Try asking for a summary, a specific fact, or how two sections relate."}
                </p>
              </div>
            )
          ) : (
            <div className="chat-messages">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOpenSource={openSource}
                  canOpenSource={canOpenSource}
                />
              ))}
               {sending && !streamingStarted && <div className="chat-thinking">DocuMind is thinking...</div>}
            </div>
          )}
        </div>

        {error && <div className="error-message chat-error">{error}</div>}

        <form onSubmit={handleSend} className="chat-input-form">
          <div className="chat-input-shell">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isMulti
                  ? 'Ask a question across these documents...'
                  : 'Ask a question about this document...'
              }
              disabled={sending || !allReady}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>

      {viewer.open && (
        <Suspense
          fallback={
            <aside className="viewer-panel">
              <Loader label="Loading viewer..." />
            </aside>
          }
        >
          <DocumentViewer
            documentId={viewer.documentId}
            documentName={viewerDocName}
            page={viewer.page}
            citedPages={viewer.pages}
            jumpKey={viewer.jumpKey}
            onClose={closeViewer}
          />
        </Suspense>
      )}
    </div>
  )
}

export default ChatPage