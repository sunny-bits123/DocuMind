import React from 'react'
import ChatMessage from './ChatMessage'

function ChatWindow({ messages, loading }) {
  return (
    <div className="chat-messages">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
      ))}
      {loading && <div className="loading-indicator">Loading...</div>}
    </div>
  )
}

export default ChatWindow
