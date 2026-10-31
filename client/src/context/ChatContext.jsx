import React, { createContext, useState, useCallback } from 'react'
import { chatService } from '../services/chatService'

export const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentDocId, setCurrentDocId] = useState(null)

  const sendMessage = useCallback(async (docId, message) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await chatService.sendMessage(docId, message)
      setMessages(prev => [...prev, 
        { text: message, sender: 'user', timestamp: new Date() },
        { text: response.response, sender: 'bot', timestamp: new Date() }
      ])
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async (docId) => {
    setLoading(true)
    setError(null)
    setCurrentDocId(docId)
    
    try {
      const history = await chatService.getHistory(docId)
      setMessages(history)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setCurrentDocId(null)
  }, [])

  return (
    <ChatContext.Provider value={{
      messages,
      loading,
      error,
      currentDocId,
      sendMessage,
      loadHistory,
      clearMessages
    }}>
      {children}
    </ChatContext.Provider>
  )
}
