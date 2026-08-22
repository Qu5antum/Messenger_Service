import api from './client'

export const getAttachment = async (
    chatId: string,
    attachmentId: string
) => {
    const response = await api.get(
        `/api/chat/${chatId}/attachment/${attachmentId}`,
        {
            responseType: 'blob',
        }
    )

    return URL.createObjectURL(
        response.data
    )
}