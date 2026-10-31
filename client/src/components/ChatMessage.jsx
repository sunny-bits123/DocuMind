import ReactMarkdown from 'react-markdown'

function ChatMessage({ message, onOpenSource, canOpenSource }) {
  const isUser = message.role === 'user'

  return (
    <div className={`chat-message ${isUser ? 'user' : 'bot'}`}>
      <div className="message-shell">
        <div className="message-meta">
          <span className="message-role">{isUser ? 'You' : 'DocuMind'}</span>
        </div>
        <div className="message-content">
          <div className="message-text">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="message-sources">
              <div className="message-sources-title">Sources</div>
              {message.sources.map((source, i) => {
                const pages = source.pages?.length
                  ? source.pages
                  : source.page != null
                    ? [source.page]
                    : []
                const label =
                  pages.length > 1
                    ? `${source.filename} · pages ${pages[0]}–${pages[pages.length - 1]}`
                    : pages.length === 1
                      ? `${source.filename} · page ${pages[0]}`
                      : `${source.filename} · chunk ${source.position}`
                const clickable = Boolean(onOpenSource && canOpenSource && canOpenSource(source))

                return (
                  <div
                    className="message-source"
                    key={`${source.documentId}-${source.position}-${i}`}
                  >
                    {clickable ? (
                      <button
                        type="button"
                        className="message-source-name message-source-link"
                        onClick={() =>
                          onOpenSource({
                            documentId: String(source.documentId),
                            page: source.page,
                            pages
                          })
                        }
                      >
                        {label}
                      </button>
                    ) : (
                      <div className="message-source-name">{label}</div>
                    )}
                    <div className="message-source-excerpt">{source.excerpt}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <span className="message-timestamp">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  )
}

export default ChatMessage