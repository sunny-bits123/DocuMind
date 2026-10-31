import React from 'react'
import { BrowserRouter as Router, Routes as BrowserRoutes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChatPage from './pages/ChatPage'

function Routes() {
  return (
    <Router>
      <BrowserRoutes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat/new" element={<ChatPage />} />
        <Route path="/chat/:docId" element={<ChatPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </BrowserRoutes>
    </Router>
  )
}

export default Routes
