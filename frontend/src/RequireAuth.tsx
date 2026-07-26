import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children }: { children: JSX.Element }) {
    const auth = useAuth()
    const location = useLocation()

    if (!auth.token) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return children
}
