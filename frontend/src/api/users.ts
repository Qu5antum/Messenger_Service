import api from './client'

export const getUserByPhone = (phone: string) => 
    api.get('/api/user', { params: { phone_number: phone } }).then(r => r.data)

export const getUserProfile = () =>
    api
        .get('/api/user/profile')
        .then((response) => response.data)


export type UpdateProfileData = {
    username?: string
    phoneNumber?: string
    description?: string
    avatarFile?: File | null
}


export const updateProfile = (
    data: UpdateProfileData
) => {
    const formData =
        new FormData()

    formData.append(
        'username',
        data.username || ''
    )

    formData.append(
        'phone_number',
        data.phoneNumber || ''
    )

    formData.append(
        'description',
        data.description || ''
    )

    if (data.avatarFile) {
        formData.append(
            'avatar_upload_file',
            data.avatarFile,
            data.avatarFile.name
        )
    }

    return api
        .put(
            '/api/user/update/profile',
            formData
        )
        .then(
            response => response.data
        )
}


export const getUserAvatar = async (): Promise<string | null> => {
    try {
        const response = await api.get('/api/user/avatar', {
            responseType: 'blob',
        })

        if (!response.data || response.data.size === 0) {
            return null
        }

        return URL.createObjectURL(response.data)
    } catch (error) {
        return null
    }
}
