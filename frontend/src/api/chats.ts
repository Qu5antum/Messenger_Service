import api from './client'

export const getChats = () => api.get('/api/chat/all').then(r => r.data)

export const createGroupChat = (payload: { title?: string; description?: string; avatar?: string }) =>
    api.post('/api/chat/group_chat/create', { ...payload, is_group: true }).then(r => r.data)

export const createPrivateChat = (phone_number: string) =>
    api.post('/api/chat/private_chat/create', null, { params: { phone_number } }).then(r => r.data)

export const getChat = (chatId: string) => api.get(`/api/chat/${chatId}`).then(r => r.data)

export type ChatUpdate = {
    title?: string
    avatar?: string
    description?: string
    owner_id?: string
}

export const updateChat = (
    chatId: string,
    data: ChatUpdate
) =>
    api.put(`/api/chat/${chatId}/chat_update`, data).then((r) => r.data)

export const deleteChat = (chatId: string) => 
    api.delete(`/api/chat/${chatId}/delete`).then((r) => r.data)

export const addParticipant = (chatId: string, phoneNumber: string) =>
    api.post(`/api/chat/${chatId}/add_participant`, null, { params: { phone_number: phoneNumber } }).then(r => r.data)

export const getParticipants = (chatId: string) =>
    api.get(`/api/chat/${chatId}/participants`).then(r => r.data)

export const removeParticipant = (chatId: string, userId: string) =>
    api.delete(`/api/chat/${chatId}/participant/${userId}/remove_participant`).then(r => r.data)

export const leaveChat = (chatId: string) =>
    api.delete(`/api/chat/${chatId}/leave`).then(r => r.data)
