import React, { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from './api/auth'
import { useNavigate } from 'react-router-dom'

type AuthContextType = {
    token: string | null
    userId: string | null
    username: string | null
    login: (username: string, password: string) => Promise<void>
    logout: () => void
    register: (data: any) => Promise<any>
    dummyLogin: (role: string) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function decodeJwt(token: string) {
    try {
        const parts = token.split('.')
        if (parts.length < 2) return null
        const payload = parts[1]
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        return JSON.parse(decodeURIComponent(escape(decoded)))
    } catch {
        return null
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'))
    const [userId, setUserId] = useState<string | null>(localStorage.getItem('user_id'))
    const [username, setUsername] = useState<string | null>(localStorage.getItem('username'))
    const navigate = useNavigate()

    useEffect(() => {
        if (token) localStorage.setItem('access_token', token)
        else localStorage.removeItem('access_token')
    }, [token])

    useEffect(() => {
        if (userId) localStorage.setItem('user_id', userId)
        else localStorage.removeItem('user_id')
    }, [userId])

    useEffect(() => {
        if (username) localStorage.setItem('username', username)
        else localStorage.removeItem('username')
    }, [username])

    const login = async (usernameArg: string, password: string) => {
        const res = await authApi.login(usernameArg, password)
        if (res?.access_token) {
            setToken(res.access_token)
            setUsername(usernameArg)
            const payload = decodeJwt(res.access_token)
            setUserId(payload?.sub ?? null)
            navigate('/')
        }
    }

    const logout = () => {
        setToken(null)
        setUserId(null)
        setUsername(null)
        navigate('/login')
    }

    const register = (data: any) => authApi.register(data)
    const dummyLogin = async (role: string) => {
        const res = await authApi.dummyLogin(role)
        if (res?.access_token) {
            setToken(res.access_token)
            setUsername(null)
            const payload = decodeJwt(res.access_token)
            setUserId(payload?.sub ?? null)
            navigate('/')
        }
        return res
    }

    return (
        <AuthContext.Provider value={{ token, userId, username, login, logout, register, dummyLogin }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
