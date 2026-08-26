import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
    getChats,
    getChatAvatar,
    createGroupChat,
    createPrivateChat,
    updateChat,
    deleteChat,
} from '../api/chats'

type Chat = {
    id: string
    title?: string
    avatar?: string
    description?: string
    owner_id?: string
    is_group?: boolean
    last_message?: string
    last_message_time?: string
}

type ChatUpdate = {
    title?: string
    description?: string
    owner_id?: string
    file?: File | null
}

export default function ChatsList() {
    const [chats, setChats] = useState<Chat[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [title, setTitle] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [editingChatId, setEditingChatId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [editingDescription, setEditingDescription] = useState('')
    const [editingFile, setEditingFile] = useState<File | null>(null)
    const [editingPreview, setEditingPreview] = useState<string | null>(null)
    const [editingLoading, setEditingLoading] = useState(false)

    const [deletingChatId, setDeletingChatId] = useState<string | null>(null)

    const navigate = useNavigate()
    const { chatId } = useParams()
    const currentUserId = localStorage.getItem('user_id') || ''

    const loadChatAvatars = async (chatList: Chat[]) => {
        const updatedChats = await Promise.all(
            chatList.map(async (chat) => {
                if (!chat.is_group) {
                    return chat
                }

                try {
                    const avatar = await getChatAvatar(chat.id)

                    return {
                        ...chat,
                        avatar,
                    }
                } catch {
                    return chat
                }
            })
        )

        setChats(updatedChats)
    }

    const load = async () => {
        setError(null)

        try {
            setLoading(true)

            const data = await getChats()

            await loadChatAvatars(data)
        } catch (e: any) {
            console.error(e)

            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()

        return () => {
            chats.forEach((chat) => {
                if (chat.avatar?.startsWith('blob:')) {
                    URL.revokeObjectURL(chat.avatar)
                }
            })
        }
    }, [])

    const createGroup = async () => {
        const groupTitle = title.trim()

        setError(null)

        if (!groupTitle) {
            setError('Введите название группы')
            return
        }

        try {
            setLoading(true)

            const res = await createGroupChat({
                title: groupTitle,
            })

            setTitle('')

            let newChat: Chat = res

            if (newChat.is_group) {
                try {
                    newChat = {
                        ...newChat,
                        avatar: await getChatAvatar(newChat.id),
                    }
                } catch {
                    // У группы может не быть аватара
                }
            }

            setChats((prev) => [
                newChat,
                ...prev,
            ])

            navigate(`/chat/${newChat.id}`)
        } catch (e: any) {
            console.error(e)

            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setLoading(false)
        }
    }

    const createPrivate = async () => {
        const userPhone = phone.trim()

        setError(null)

        if (!userPhone) {
            setError('Введите номер телефона')
            return
        }

        try {
            setLoading(true)

            const res = await createPrivateChat(userPhone)

            setPhone('')

            setChats((prev) => [
                res,
                ...prev,
            ])

            navigate(`/chat/${res.id}`)
        } catch (e: any) {
            console.error(e)

            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setLoading(false)
        }
    }

    const handleStartEdit = (chat: Chat) => {
        if (
            !chat.is_group ||
            chat.owner_id !== currentUserId
        ) {
            return
        }

        setEditingChatId(chat.id)
        setEditingTitle(chat.title || '')
        setEditingDescription(chat.description || '')
        setEditingFile(null)
        setEditingPreview(chat.avatar || null)
        setError(null)
    }

    const handleCancelEdit = () => {
        if (
            editingPreview?.startsWith('blob:')
        ) {
            URL.revokeObjectURL(editingPreview)
        }

        setEditingChatId(null)
        setEditingTitle('')
        setEditingDescription('')
        setEditingFile(null)
        setEditingPreview(null)
    }

    const handleFileChange = (
        e: ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0]

        if (!file) {
            return
        }

        if (!file.type.startsWith('image/')) {
            setError('Можно выбрать только изображение')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Размер изображения не должен превышать 5 МБ')
            return
        }

        if (editingPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(editingPreview)
        }

        setEditingFile(file)
        setEditingPreview(URL.createObjectURL(file))
        setError(null)
    }

    const handleSaveEdit = async () => {
        if (!editingChatId) {
            return
        }

        const chat = chats.find(
            (item) => item.id === editingChatId
        )

        if (!chat) {
            return
        }

        if (
            !chat.is_group ||
            chat.owner_id !== currentUserId
        ) {
            setError('Только владелец может изменить чат')
            return
        }

        const newTitle = editingTitle.trim()
        const newDescription = editingDescription.trim()

        if (!newTitle) {
            setError('Название группы не может быть пустым')
            return
        }

        const data: ChatUpdate = {
            title: newTitle,
            description: newDescription || undefined,
            file: editingFile,
        }

        try {
            setEditingLoading(true)
            setError(null)

            const updatedChat = await updateChat(
                editingChatId,
                data
            )

            let newAvatar = chat.avatar

            if (editingFile) {
                try {
                    newAvatar = await getChatAvatar(
                        editingChatId
                    )
                } catch {
                    newAvatar = undefined
                }
            }

            if (
                chat.avatar?.startsWith('blob:') &&
                chat.avatar !== newAvatar
            ) {
                URL.revokeObjectURL(chat.avatar)
            }

            setChats((prev) =>
                prev.map((item) =>
                    item.id === editingChatId
                        ? {
                            ...item,
                            ...updatedChat,
                            avatar: newAvatar,
                        }
                        : item
                )
            )

            handleCancelEdit()
        } catch (e: any) {
            console.error(e)

            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setEditingLoading(false)
        }
    }

    const handleDelete = async (chat: Chat) => {
        if (
            !chat.is_group ||
            chat.owner_id !== currentUserId
        ) {
            setError('Только владелец может удалить чат')
            return
        }

        const confirmed = window.confirm(
            `Удалить группу "${chat.title || 'Группа'}"?\n\nВсе сообщения и данные группы будут удалены.`
        )

        if (!confirmed) {
            return
        }

        try {
            setDeletingChatId(chat.id)
            setError(null)

            await deleteChat(chat.id)

            if (chat.avatar?.startsWith('blob:')) {
                URL.revokeObjectURL(chat.avatar)
            }

            setChats((prev) =>
                prev.filter(
                    (item) => item.id !== chat.id
                )
            )

            if (
                String(chat.id) ===
                String(chatId)
            ) {
                navigate('/')
            }
        } catch (e: any) {
            console.error(e)

            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        } finally {
            setDeletingChatId(null)
        }
    }

    const filteredChats = chats.filter((chat) => {
        const name =
            chat.title ||
            (
                chat.is_group
                    ? 'Группа'
                    : 'Личный чат'
            )

        return name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    })

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            <div className="sidebar-profile-button">
                <Link
                    to="/profile"
                    className="profile-link"
                >
                    <span className="profile-icon">
                        👤
                    </span>
                    <span>
                        Мой профиль
                    </span>
                </Link>
            </div>

            <div className="sidebar-search">
                <div className="search-input-wrapper">
                    <span className="search-icon">
                        🔍
                    </span>
                    <input
                        type="text"
                        placeholder="Поиск чатов..."
                        value={searchQuery}
                        onChange={(e) =>
                            setSearchQuery(
                                e.target.value
                            )
                        }
                    />
                </div>
            </div>

            <div
                style={{
                    padding: '10px 14px',
                    borderBottom:
                        '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                <div
                    className="search-input-wrapper"
                    style={{
                        gap: '6px',
                    }}
                >
                    <input
                        type="text"
                        placeholder="Название группы"
                        value={title}
                        onChange={(e) =>
                            setTitle(
                                e.target.value
                            )
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                createGroup()
                            }
                        }}
                        style={{
                            paddingLeft: '10px',
                        }}
                    />
                    <button
                        className="btn-primary"
                        onClick={createGroup}
                        disabled={
                            loading ||
                            !title.trim()
                        }
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                        }}
                    >
                        + Группа
                    </button>
                </div>

                <div
                    className="search-input-wrapper"
                    style={{
                        gap: '6px',
                    }}
                >
                    <input
                        type="text"
                        placeholder="Телефон пользователя"
                        value={phone}
                        onChange={(e) =>
                            setPhone(
                                e.target.value
                            )
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                createPrivate()
                            }
                        }}
                        style={{
                            paddingLeft: '10px',
                        }}
                    />
                    <button
                        className="btn-primary"
                        onClick={createPrivate}
                        disabled={
                            loading ||
                            !phone.trim()
                        }
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                        }}
                    >
                        + Чат
                    </button>
                </div>

                {error && (
                    <div
                        style={{
                            color: 'var(--danger)',
                            fontSize: '0.8rem',
                            marginTop: '4px',
                        }}
                    >
                        {error}
                    </div>
                )}
            </div>

            <div className="chats-list">
                {loading && chats.length === 0 ? (
                    <div
                        style={{
                            padding: '16px',
                            textAlign: 'center',
                            color: 'var(--muted)',
                            fontSize: '0.88rem',
                        }}
                    >
                        Загрузка чатов...
                    </div>
                ) : filteredChats.length === 0 ? (
                    <div
                        style={{
                            padding: '16px',
                            textAlign: 'center',
                            color: 'var(--muted)',
                            fontSize: '0.88rem',
                        }}
                    >
                        Чаты не найдены
                    </div>
                ) : (
                    filteredChats.map((chat) => {
                        const name =
                            chat.title ||
                            (
                                chat.is_group
                                    ? 'Группа'
                                    : 'Личный чат'
                            )

                        const isActive =
                            String(chat.id) ===
                            String(chatId)

                        const isOwner =
                            chat.is_group &&
                            chat.owner_id ===
                            currentUserId

                        const isEditing =
                            editingChatId ===
                            chat.id

                        const isDeleting =
                            deletingChatId ===
                            chat.id

                        if (isEditing) {
                            return (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${isActive ? 'active' : ''}`}
                                    style={{
                                        cursor: 'default',
                                    }}
                                >
                                    <div
                                        className="chat-avatar"
                                        style={{
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {editingPreview ? (
                                            <img
                                                src={editingPreview}
                                                alt={name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    borderRadius: '50%',
                                                }}
                                            />
                                        ) : (
                                            name
                                                .charAt(0)
                                                .toUpperCase()
                                        )}
                                    </div>

                                    <div
                                        className="chat-details"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                        }}
                                    >
                                        <input
                                            value={editingTitle}
                                            onChange={(e) =>
                                                setEditingTitle(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Название"
                                            autoFocus
                                        />

                                        <input
                                            value={editingDescription}
                                            onChange={(e) =>
                                                setEditingDescription(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Описание"
                                        />

                                        <label
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            Фото группы
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={
                                                    handleFileChange
                                                }
                                            />
                                        </label>

                                        {editingFile && (
                                            <span
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--muted)',
                                                }}
                                            >
                                                {editingFile.name}
                                            </span>
                                        )}

                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '6px',
                                            }}
                                        >
                                            <button
                                                onClick={
                                                    handleSaveEdit
                                                }
                                                disabled={
                                                    editingLoading
                                                }
                                                className="btn-primary"
                                            >
                                                {editingLoading
                                                    ? 'Сохранение...'
                                                    : 'Сохранить'}
                                            </button>

                                            <button
                                                onClick={
                                                    handleCancelEdit
                                                }
                                                disabled={
                                                    editingLoading
                                                }
                                            >
                                                Отмена
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div
                                key={chat.id}
                                className={`chat-item-wrapper ${isActive ? 'active' : ''}`}
                            >
                                <Link
                                    to={`/chat/${chat.id}`}
                                    className={`chat-item ${isActive ? 'active' : ''}`}
                                >
                                    <div
                                        className="chat-avatar"
                                        style={{
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {chat.avatar ? (
                                            <img
                                                src={chat.avatar}
                                                alt={name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    borderRadius: '50%',
                                                }}
                                            />
                                        ) : (
                                            name
                                                .charAt(0)
                                                .toUpperCase()
                                        )}
                                    </div>

                                    <div className="chat-details">
                                        <div className="chat-top-row">
                                            <span className="chat-title">
                                                {name}
                                            </span>
                                            <span className="chat-time">
                                                {
                                                    chat.last_message_time ||
                                                    ''
                                                }
                                            </span>
                                        </div>

                                        <div className="chat-last-message">
                                            {
                                                chat.last_message ||
                                                (
                                                    chat.is_group
                                                        ? 'Групповой чат'
                                                        : 'Личная переписка'
                                                )
                                            }
                                        </div>
                                    </div>
                                </Link>

                                {isOwner && (
                                    <div
                                        className="chat-actions"
                                        onClick={(e) =>
                                            e.stopPropagation()
                                        }
                                    >
                                        <button
                                            type="button"
                                            title="Редактировать чат"
                                            onClick={() =>
                                                handleStartEdit(
                                                    chat
                                                )
                                            }
                                        >
                                            ✎
                                        </button>

                                        <button
                                            type="button"
                                            title="Удалить чат"
                                            onClick={() =>
                                                handleDelete(
                                                    chat
                                                )
                                            }
                                            disabled={
                                                isDeleting
                                            }
                                        >
                                            {isDeleting
                                                ? '...'
                                                : '×'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}