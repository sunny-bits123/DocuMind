import { api } from './api'

export const chatService = {
  sendMessage: (docIds, message) => api.post('/chat/message', { docIds, message }),
  sendMessageStream: (docIds, message, handlers) =>
    api.stream('/chat/message/stream', { docIds, message }, handlers),
  getHistory: (docId) => api.get(`/chat/history/${docId}`)
}