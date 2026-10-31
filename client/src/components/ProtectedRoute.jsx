import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-loading-screen">
        <Loader label="Checking your session..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
