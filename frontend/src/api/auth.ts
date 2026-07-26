import api from './client'

export const register = (data: any) => api.post('/api/user/register', data).then(r => r.data)

export const login = (username: string, password: string) => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    return api.post('/api/user/login', params).then(r => r.data)
}

export const dummyLogin = (role: string) => api.post('/api/user/dummyLogin', { role }).then(r => r.data)

export const refresh = (token: string) => api.post('/api/user/refresh', { token }).then(r => r.data)
