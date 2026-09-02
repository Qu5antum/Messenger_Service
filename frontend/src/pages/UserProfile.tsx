import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    useNavigate,
} from 'react-router-dom'

import {
    getCurrentUserProfile,
    updateProfile,
    getCurrentUserAvatar
} from '../api/users'

type UserProfile = {
    id: string
    username: string
    phone_number: string
    description?: string | null
}

export default function UserProfile() {
    const navigate = useNavigate()

    const avatarUrlRef = useRef<string | null>(null)
    const previewUrlRef = useRef<string | null>(null)

    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [username, setUsername] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [description, setDescription] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // =========================================
    // Set avatar URL
    // =========================================

    const replaceAvatarUrl = (newUrl: string | null) => {
        // Освобождаем память только если новый URL отличается от старого
        if (
            avatarUrlRef.current &&
            avatarUrlRef.current !== newUrl &&
            avatarUrlRef.current.startsWith('blob:')
        ) {
            URL.revokeObjectURL(avatarUrlRef.current)
        }

        avatarUrlRef.current = newUrl
        setAvatarUrl(newUrl)
    }

    // =========================================
    // Set preview URL
    // =========================================

    const replacePreviewUrl = (newUrl: string | null) => {
        if (
            previewUrlRef.current &&
            previewUrlRef.current !== newUrl &&
            previewUrlRef.current.startsWith('blob:')
        ) {
            URL.revokeObjectURL(previewUrlRef.current)
        }

        previewUrlRef.current = newUrl
        setPreviewUrl(newUrl)
    }

    // =========================================
    // Load avatar
    // =========================================

    const loadAvatar = async () => {
        const url = await getCurrentUserAvatar()
        replaceAvatarUrl(url)
    }

    // =========================================
    // Load profile
    // =========================================

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true)
                setError(null)

                const user = await getCurrentUserProfile()

                setProfile(user)
                setUsername(user.username || '')
                setPhoneNumber(user.phone_number || '')
                setDescription(user.description || '')

                await loadAvatar()
            } catch (err: any) {
                console.error('Profile loading error:', err)
                setError(
                    String(
                        err?.response?.data?.detail ||
                        err?.response?.data ||
                        err?.message ||
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
    // Cleanup on unmount
    // =========================================

    useEffect(() => {
        return () => {
            if (
                avatarUrlRef.current &&
                avatarUrlRef.current.startsWith('blob:')
            ) {
                URL.revokeObjectURL(avatarUrlRef.current)
            }

            if (
                previewUrlRef.current &&
                previewUrlRef.current.startsWith('blob:')
            ) {
                URL.revokeObjectURL(previewUrlRef.current)
            }
        }
    }, [])

    // =========================================
    // Avatar select
    // =========================================

    const handleAvatarChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        if (!file.type.startsWith('image/')) {
            setError('Можно выбрать только изображение')
            return
        }

        const newPreviewUrl = URL.createObjectURL(file)

        replacePreviewUrl(newPreviewUrl)
        setSelectedAvatar(file)
        setError(null)
        setSuccess(null)
    }

    // =========================================
    // Save profile
    // =========================================

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault()

        try {
            setSaving(true)
            setError(null)
            setSuccess(null)

            const hasNewAvatar = selectedAvatar !== null

            const updatedUser = await updateProfile({
                username: username.trim(),
                phoneNumber: phoneNumber.trim(),
                description: description.trim(),
                avatarFile: selectedAvatar,
            })

            setProfile(updatedUser)
            setUsername(updatedUser.username || '')
            setPhoneNumber(updatedUser.phone_number || '')
            setDescription(updatedUser.description || '')

            // Удаляем локальное превью перед загрузкой реального изображения с сервера
            replacePreviewUrl(null)
            setSelectedAvatar(null)

            if (hasNewAvatar) {
                await loadAvatar()
            }

            setSuccess('Профиль успешно обновлён')
        } catch (err: any) {
            console.error('Profile update error:', err)
            setError(
                String(
                    err?.response?.data?.detail ||
                    err?.response?.data ||
                    err?.message ||
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
    // Profile error
    // =========================================

    if (!profile) {
        return (
            <div className="profile-page">
                <div className="profile-error">
                    {error || 'Не удалось загрузить профиль'}
                </div>
            </div>
        )
    }

    // =========================================
    // Avatar
    // =========================================

    const displayedAvatar = previewUrl || avatarUrl
    const avatarLetter = profile.username?.charAt(0).toUpperCase() || '?'

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
                        <h2>Мой профиль</h2>
                        <p>Управление информацией профиля</p>
                    </div>
                </div>

                <form className="profile-form" onSubmit={handleSave}>
                    {/* Avatar */}
                    <div className="profile-avatar-section">
                        <div className="profile-avatar-wrapper">
                            {displayedAvatar ? (
                                <img
                                    src={displayedAvatar}
                                    alt="Аватар"
                                    className="profile-avatar-image"
                                    onError={() => {
                                        // Запасной вариант, если картинка не смогла отрисоваться
                                        replaceAvatarUrl(null)
                                    }}
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
                                accept="image/png, image/jpeg, image/jpg"
                                onChange={handleAvatarChange}
                                hidden
                            />

                            <span>PNG, JPG, JPEG</span>
                        </div>
                    </div>

                    {/* Username */}
                    <div className="profile-field">
                        <label>Имя пользователя</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Введите имя пользователя"
                        />
                    </div>

                    {/* Phone */}
                    <div className="profile-field">
                        <label>Номер телефона</label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+7..."
                        />
                    </div>

                    {/* Description */}
                    <div className="profile-field">
                        <label>О себе</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Расскажите немного о себе"
                            rows={5}
                        />
                    </div>

                    {/* Error */}
                    {error && <div className="profile-error">{error}</div>}

                    {/* Success */}
                    {success && <div className="profile-success">{success}</div>}

                    {/* Submit */}
                    <button
                        type="submit"
                        className="profile-save-button"
                        disabled={saving}
                    >
                        {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </form>
            </div>
        </div>
    )
}