import api from './client'

export const getUserByPhone = (phone: string) => 
    api.get('/api/user', { params: { phone_number: phone } }).then(r => r.data)

export const getUserProfile = () =>
    api
        .get('/api/user/profile')
        .then((response) => response.data)


type UpdateProfileData = {
    username?: string
    phoneNumber?: string
    description?: string
    avatarFile?: File | null
}

export const updateProfile = (
    data: UpdateProfileData
) => {
    const formData = new FormData()

    if (data.username !== undefined) {
        formData.append(
            'username',
            data.username
        )
    }

    if (data.phoneNumber !== undefined) {
        formData.append(
            'phone_number',
            data.phoneNumber
        )
    }

    if (data.description !== undefined) {
        formData.append(
            'description',
            data.description
        )
    }

    if (data.avatarFile) {
        formData.append(
            'avatar_upload_file',
            data.avatarFile
        )
    }

    return api
        .put(
            '/api/user/update/profile',
            formData
        )
        .then((response) => response.data)
}


export const getUserAvatar = () =>
    api
        .get(
            `/api/user/avatar`,
            {
                responseType: 'blob'
            }
        )
        .then((response) =>
            URL.createObjectURL(
                response.data
            )
        )
