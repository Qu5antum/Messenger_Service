import api from './client'

export const getMessages = (chatId: string) =>
    api.get(`/api/chat/${chatId}/messages`).then((r) => r.data)

export const sendMessage = (chatId: string, text: string) =>
    api.post(`/api/chat/${chatId}/message/send`, { text }).then((r) => r.data)
