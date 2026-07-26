import api from './client'

export const getUserByPhone = (phone: string) => api.get('/api/user', { params: { phone_number: phone } }).then(r => r.data)
