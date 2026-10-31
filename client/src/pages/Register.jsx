import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="login-shell register-shell">
        <section className="login-hero register-hero">
          <div className="login-brand-badge">Document Intelligence Workspace</div>
          <h1>Your documents, ready to answer questions.</h1>
          <p>
            Create a free account to upload documents and start getting grounded, cited answers
            from your own content.
          </p>
          <div className="login-feature-list">
            <div className="login-feature-item">
              <span className="login-feature-kicker">Private</span>
              <strong>Your documents are visible only to you</strong>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-kicker">Grounded</span>
              <strong>No hallucinated answers — every response is sourced</strong>
            </div>
          </div>
        </section>

        <div className="login-container register-container">
          <div className="login-panel-top">
            <div className="login-logo-mark">
              <Logo size={40} />
            </div>
            <div>
              <p className="login-eyebrow">Get started</p>
              <div className="login-header register-header">
                <h1>Create your account</h1>
                <p>Set up your DocMind workspace in a few seconds.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError('')
                }}
                placeholder="Your name"
                disabled={loading}
                autoFocus
              />
            </div>
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
                placeholder="At least 6 characters"
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary auth-submit">
              {loading ? 'Creating your account...' : 'Create account'}
            </button>
          </form>

          <div className="login-footer register-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
