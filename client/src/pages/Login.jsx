import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-brand-badge">Document Intelligence Workspace</div>
          <h1>Search, verify, and chat with your knowledge in one place.</h1>
          <p>
            DocuMind turns uploaded files into a clean research workflow with grounded answers,
            source-aware retrieval, and fast document chat.
          </p>
          <div className="login-feature-list">
            <div className="login-feature-item">
              <span className="login-feature-kicker">Source-grounded</span>
              <strong>Answers tied back to uploaded content</strong>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-kicker">Multi-format</span>
              <strong>PDF, TXT, and Markdown supported</strong>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-kicker">Fast handoff</span>
              <strong>Built for focused reading, Q&A, and document review</strong>
            </div>
          </div>
        </section>

        <div className="login-container">
          <div className="login-panel-top">
            <div className="login-logo-mark">
              <Logo size={40} />
            </div>
            <div>
              <p className="login-eyebrow">Welcome back</p>
              <div className="login-header">
                <h1>Sign in to DocuMind</h1>
                <p>Access your workspace and continue chatting with your files.</p>
              </div>
            </div>
          </div>

          <div className="login-trust-row">
            <span>Secure access</span>
            <span>Private per-account workspace</span>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="you@example.com"
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary auth-submit">
              {loading ? 'Signing you in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Need an account? <Link to="/register">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
