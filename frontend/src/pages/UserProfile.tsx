import {
    useEffect,
    useState,
} from 'react'

import {
    useNavigate,
} from 'react-router-dom'

import {
    getUserProfile,
    getUserAvatar,
    updateProfile,
} from '../api/users'


type UserProfile = {
    id: string
    username: string
    phone_number: string
    description?: string | null
}


export default function UserProfile() {
    const navigate = useNavigate()

    const [profile, setProfile] =
        useState<UserProfile | null>(null)

    const [username, setUsername] =
        useState('')

    const [phoneNumber, setPhoneNumber] =
        useState('')

    const [description, setDescription] =
        useState('')

    const [avatarUrl, setAvatarUrl] =
        useState<string | null>(null)

    const [selectedAvatar, setSelectedAvatar] =
        useState<File | null>(null)

    const [previewUrl, setPreviewUrl] =
        useState<string | null>(null)

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [error, setError] =
        useState<string | null>(null)

    const [success, setSuccess] =
        useState<string | null>(null)


    // =========================================
    // Load profile
    // =========================================

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true)
                setError(null)

                const user =
                    await getUserProfile()

                setProfile(user)

                setUsername(
                    user.username || ''
                )

                setPhoneNumber(
                    user.phone_number || ''
                )

                setDescription(
                    user.description || ''
                )

                try {
                    const url =
                        await getUserAvatar()

                    setAvatarUrl(url)

                } catch (avatarError) {
                    console.error(
                        'Avatar loading error:',
                        avatarError
                    )
                }

            } catch (err: any) {
                console.error(err)

                setError(
                    String(
                        err?.response?.data?.detail ||
                        err?.response?.data ||
                        err
                    )
                )

            } finally {
                setLoading(false)
            }
        }

        loadProfile()

    }, [])


    // =========================================
    // Cleanup blob URLs
    // =========================================

    useEffect(() => {
        return () => {
            if (avatarUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(
                    avatarUrl
                )
            }

            if (previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(
                    previewUrl
                )
            }
        }
    }, [
        avatarUrl,
        previewUrl,
    ])


    // =========================================
    // Avatar select
    // =========================================

    const handleAvatarChange = (
        event: React.ChangeEvent<
            HTMLInputElement
        >
    ) => {
        const file =
            event.target.files?.[0]

        if (!file) {
            return
        }

        if (
            !file.type.startsWith(
                'image/'
            )
        ) {
            setError(
                'Можно выбрать только изображение'
            )

            return
        }

        if (
            previewUrl?.startsWith('blob:')
        ) {
            URL.revokeObjectURL(
                previewUrl
            )
        }

        const newPreviewUrl =
            URL.createObjectURL(file)

        setSelectedAvatar(file)

        setPreviewUrl(
            newPreviewUrl
        )

        setError(null)
        setSuccess(null)
    }


    // =========================================
    // Save profile
    // =========================================

    const handleSave = async (
        event: React.FormEvent
    ) => {
        event.preventDefault()

        try {
            setSaving(true)
            setError(null)
            setSuccess(null)

            const updatedUser =
                await updateProfile({
                    username: username.trim(),
                    phoneNumber: phoneNumber.trim(),
                    description: description.trim(),
                    avatarFile: selectedAvatar,
                })

            setProfile(updatedUser)

            setUsername(
                updatedUser.username || ''
            )

            setPhoneNumber(
                updatedUser.phone_number || ''
            )

            setDescription(
                updatedUser.description || ''
            )

            if (selectedAvatar && previewUrl) {
                if (
                    avatarUrl?.startsWith(
                        'blob:'
                    )
                ) {
                    URL.revokeObjectURL(
                        avatarUrl
                    )
                }

                setAvatarUrl(
                    previewUrl
                )

                setPreviewUrl(null)

                setSelectedAvatar(null)
            }

            setSuccess(
                'Профиль успешно обновлён'
            )

        } catch (err: any) {
            console.error(
                'Profile update error:',
                err
            )

            setError(
                String(
                    err?.response?.data?.detail ||
                    err?.response?.data ||
                    err
                )
            )

        } finally {
            setSaving(false)
        }
    }


    // =========================================
    // Loading
    // =========================================

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-loading">
                    Загрузка профиля...
                </div>
            </div>
        )
    }


    // =========================================
    // Error
    // =========================================

    if (!profile) {
        return (
            <div className="profile-page">
                <div className="profile-error">
                    {error ||
                        'Не удалось загрузить профиль'}
                </div>
            </div>
        )
    }


    // =========================================
    // Avatar
    // =========================================

    const displayedAvatar =
        previewUrl || avatarUrl

    const avatarLetter =
        profile.username
            ?.charAt(0)
            .toUpperCase() || '?'


    // =========================================
    // Render
    // =========================================

    return (
        <div className="profile-page">

            <div className="profile-card">

                <div className="profile-header">
                    <button
                        type="button"
                        className="profile-back-button"
                        onClick={() => navigate('/')}
                    >
                        ← Назад
                    </button>

                    <div className="profile-header-content">
                        <h2>
                            Мой профиль
                        </h2>

                        <p>
                            Управление информацией профиля
                        </p>
                    </div>

                </div>


                <form
                    className="profile-form"
                    onSubmit={handleSave}
                >

                    {/* Avatar */}

                    <div className="profile-avatar-section">

                        <div className="profile-avatar-wrapper">

                            {displayedAvatar ? (
                                <img
                                    src={
                                        displayedAvatar
                                    }
                                    alt="Аватар"
                                    className="profile-avatar-image"
                                />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    {avatarLetter}
                                </div>
                            )}

                        </div>


                        <div className="profile-avatar-info">

                            <label
                                htmlFor="avatar-input"
                                className="avatar-upload-button"
                            >
                                Изменить фото
                            </label>

                            <input
                                id="avatar-input"
                                type="file"
                                accept="image/*"
                                onChange={
                                    handleAvatarChange
                                }
                                hidden
                            />

                            <span>
                                PNG, JPG, JPEG
                            </span>

                        </div>

                    </div>


                    {/* Username */}

                    <div className="profile-field">

                        <label>
                            Имя пользователя
                        </label>

                        <input
                            type="text"
                            value={username}
                            onChange={(event) =>
                                setUsername(
                                    event.target.value
                                )
                            }
                            placeholder="Введите имя пользователя"
                        />

                    </div>


                    {/* Phone */}

                    <div className="profile-field">

                        <label>
                            Номер телефона
                        </label>

                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(event) =>
                                setPhoneNumber(
                                    event.target.value
                                )
                            }
                            placeholder="+7..."
                        />

                    </div>


                    {/* Description */}

                    <div className="profile-field">

                        <label>
                            О себе
                        </label>

                        <textarea
                            value={description}
                            onChange={(event) =>
                                setDescription(
                                    event.target.value
                                )
                            }
                            placeholder="Расскажите немного о себе"
                            rows={5}
                        />

                    </div>


                    {/* Error */}

                    {error && (
                        <div className="profile-error">
                            {error}
                        </div>
                    )}


                    {/* Success */}

                    {success && (
                        <div className="profile-success">
                            {success}
                        </div>
                    )}


                    {/* Submit */}

                    <button
                        type="submit"
                        className="profile-save-button"
                        disabled={saving}
                    >
                        {saving
                            ? 'Сохранение...'
                            : 'Сохранить изменения'}
                    </button>

                </form>

            </div>

        </div>
    )
}