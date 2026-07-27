import api from './client'

export const getChats = () => api.get('/api/chat/all').then(r => r.data)

export const createGroupChat = (payload: { title?: string; description?: string; avatar?: string }) =>
    api.post('/api/chat/group_chat/create', { ...payload, is_group: true }).then(r => r.data)

export const createPrivateChat = (phone_number: string) =>
    api.post('/api/chat/private_chat/create', null, { params: { phone_number } }).then(r => r.data)

export const getChat = (chatId: string) => api.get(`/api/chat/${chatId}`).then(r => r.data)

export const addParticipant = (chatId: string, phoneNumber: string) =>
    api.post(`/api/chat/${chatId}/add_participant`, null, { params: { phone_number: phoneNumber } }).then(r => r.data)

export const getParticipants = (chatId: string) =>
    api.get(`/api/chat/${chatId}/participants`).then(r => r.data)
