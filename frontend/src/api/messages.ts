import api from './client'

export const getMessages = (chatId: string) =>
    api.get(`/api/chat/${chatId}/messages`).then((r) => r.data)

export const sendMessage = (chatId: string, text: string) =>
    api.post(`/api/chat/${chatId}/message/send`, { text }).then((r) => r.data)

export const editMessage = (messageId: string, text: string) =>
    api.put(`/api/message/${messageId}/update`, { text }).then((r) => r.data)

export const deleteMessage = (messageId: string) =>
    api.delete(`/api/message/${messageId}/delete`).then((r) => r.data)

export const searchMessages = (chatId: string, messageText: string) =>
    api.get(`/api/chat/${chatId}/message/search_message`, {
            params: { messageText },
        }).then((r) => r.data)
