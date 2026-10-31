import { api } from './api'

export const documentService = {
  upload: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/documents/upload', formData)
  },
  list: () => api.get('/documents'),
  get: (id) => api.get(`/documents/${id}`),
  rename: (id, name) => api.put(`/documents/${id}`, { name }),
  togglePin: (id, pinned) => api.put(`/documents/${id}`, { pinned }),
  remove: (id) => api.delete(`/documents/${id}`),
  getFile: (id) => api.getBlob(`/documents/${id}/file`)
}
