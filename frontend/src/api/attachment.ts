import api from './client'

export const getAttachmentUrl = (
    chatId: string,
    attachmentId: string
) => {
    return `/api/chat/${chatId}/attachment/${attachmentId}`
}


export const getAttachment = (
    chatId: string,
    attachmentId: string
) =>
    api.get(
        `/api/chat/${chatId}/attachment/${attachmentId}`,
        {
            responseType: 'blob'
        }
    )