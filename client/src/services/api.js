const API_URL = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('docmind_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  let data = null
  try {
    data = await response.json()
  } catch {
    // response had no JSON body
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  put: (path, body) =>
    request(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  delete: (path) => request(path, { method: 'DELETE' }),
  getBlob: async (path) => {
    const token = getToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const response = await fetch(`${API_URL}${path}`, { headers })

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`
      try {
        const data = await response.json()
        if (data?.message) message = data.message
      } catch {
        // no JSON body
      }
      throw new Error(message)
    }

    return response.blob()
  },
  stream: async (path, body, { onToken } = {}) => {
    const token = getToken()
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    })

    if (!response.ok || !response.body) {
      let message = `Request failed with status ${response.status}`
      try {
        const data = await response.json()
        if (data?.message) message = data.message
      } catch {
        // no JSON body
      }
      const error = new Error(message)
      // Route missing or no stream support: the caller falls back to the normal request
      if (response.status === 404 || !response.body) error.code = 'STREAM_UNAVAILABLE'
      throw error
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalData = null

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop()

      for (const raw of events) {
        const lines = raw.split('\n')
        const eventLine = lines.find((l) => l.startsWith('event: '))
        const dataLine = lines.find((l) => l.startsWith('data: '))
        if (!dataLine) continue

        const name = eventLine ? eventLine.slice(7) : 'message'
        const payload = JSON.parse(dataLine.slice(6))

        if (name === 'token') onToken?.(payload.text)
        else if (name === 'done') finalData = payload
        else if (name === 'error') throw new Error(payload.message)
      }
    }

    if (!finalData) throw new Error('The answer stream ended unexpectedly')
    return finalData
  }
}