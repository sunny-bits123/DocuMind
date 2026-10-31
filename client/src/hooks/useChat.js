import { useState, useCallback } from 'react'
import { chatService } from '../services/chatService'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sendMessage = useCallback(async (docId, message) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await chatService.sendMessage(docId, message)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async (docId) => {
    setLoading(true)
    setError(null)
    
    try {
      const history = await chatService.getHistory(docId)
      setMessages(history)
      return history
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    messages,
    loading,
    error,
    sendMessage,
    fetchHistory
  }
}
