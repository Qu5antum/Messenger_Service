import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
})

export default api

export const API_BASE = api.defaults.baseURL

export function buildWsUrl(token: string) {
    const base = api.defaults.baseURL || 'http://localhost:8000'
    const url = new URL(base)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url.host}/api/ws?token=${encodeURIComponent(token)}`
}
