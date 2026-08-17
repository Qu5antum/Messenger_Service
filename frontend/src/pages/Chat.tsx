import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { buildWsUrl } from '../api/client'

import {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    searchMessages,
} from '../api/messages'

import {
    getParticipants,
    addParticipant,
    getChat,
    removeParticipant,
    leaveChat,
} from '../api/chats'


// =========================================
// Types
// =========================================

type MessageAttachment = {
    id: string
    message_id: string
    file_name: string
    file_key: string
    mime_type: string
    size: number
    duration?: number | null
}

type Message = {
    id: string
    chat_id: string
    sender_id: string
    text: string | null
    sent_at: Date
    edited_at: Date

    sender?: {
        id: string
        username?: string
        phone_number?: string
    } | null

    attachments: MessageAttachment[]
}

type Chat = {
    id: string
    title?: string
    is_group?: boolean
    owner_id?: string | null
}

type ParticipantUser = {
    id: string
    username?: string 
    phone_number?: string | null
}

type Participant = {
    id: string
    chat_id: string
    user_id: string
    joined_at: string

    user?: ParticipantUser | null
}


// =========================================
// Component
// =========================================

export default function Chat() {
    const { chatId = '' } = useParams()
    const navigate = useNavigate()

    // =========================================
    // State
    // =========================================

    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState('')

    const [chat, setChat] = useState<Chat | null>(null)

    const [participants, setParticipants] =
        useState<Participant[]>([])

    const [newParticipantPhone, setNewParticipantPhone] =
        useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // =========================================
    // Message editing
    // =========================================

    const [editingMessageId, setEditingMessageId] =
        useState<string | null>(null)

    const [editingText, setEditingText] =
        useState('')

    const [editingLoading, setEditingLoading] =
        useState(false)

    // =========================================
    // Message deleting
    // =========================================

    const [deletingMessageId, setDeletingMessageId] =
        useState<string | null>(null)

    // =========================================
    // Message search
    // =========================================

    const [searchText, setSearchText] = useState('')

    const [searchResults, setSearchResults] =
        useState<Message[]>([])

    const [searchLoading, setSearchLoading] =
        useState(false)

    const [isSearching, setIsSearching] =
        useState(false)

    // =========================================
    // Refs
    // =========================================

    const wsRef = useRef<WebSocket | null>(null)

    const messagesEndRef =
        useRef<HTMLDivElement | null>(null)

    // =========================================
    // Current user
    // =========================================

    const currentUserId =
        localStorage.getItem('user_id') || ''

    const currentUsername =
        localStorage.getItem('username') || ''

    // =========================================
    // Chat permissions
    // =========================================

    const isGroupChat =
        chat?.is_group === true

    const isOwner =
        isGroupChat &&
        chat?.owner_id === currentUserId


    // =========================================
    // Scroll
    // =========================================

    const scrollToBottom = (
        smooth = true
    ) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
        })
    }


    // =========================================
    // Load chat
    // =========================================

    useEffect(() => {
        if (!chatId) return

        const loadData = async () => {
            setError(null)

            try {
                setLoading(true)

                // Chat
                const chatInfo = await getChat(chatId)
                setChat(chatInfo)

                // Messages
                const msgs = await getMessages(chatId)
                setMessages(msgs)

                // Participants
                if (chatInfo.is_group) {
                    const parts =
                        await getParticipants(chatId)

                    setParticipants(parts)
                } else {
                    setParticipants([])
                }

                setTimeout(() => {
                    scrollToBottom(false)
                }, 50)

            } catch (err: any) {
                console.error(err)

                setMessages([])
                setParticipants([])

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

        loadData()
    }, [chatId])


    // =========================================
    // WebSocket
    // =========================================

    useEffect(() => {
        if (!chatId) return

        const token =
            localStorage.getItem('access_token')

        if (!token) return

        const ws =
            new WebSocket(buildWsUrl(token))

        wsRef.current = ws

        ws.onmessage = (event) => {
            try {
                const payload =
                    JSON.parse(event.data)

                if (
                    payload.type ===
                        'message_created' &&
                    payload.chat_id === chatId
                ) {
                    setMessages((prev) => [
                        ...prev,
                        payload.data,
                    ])

                    scrollToBottom()
                }

            } catch (e) {
                console.error(
                    'WS message parse error:',
                    e
                )
            }
        }

        ws.onerror = (event) => {
            console.error(
                'WebSocket error:',
                event
            )
        }

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [chatId])


    // =========================================
    // Send message
    // =========================================

    const handleSend = async () => {
        if (!chatId || !text.trim()) return

        setError(null)

        const textToSend =
            text.trim()

        setText('')

        const ws = wsRef.current

        const payload = {
            type: 'send_message',
            chat_id: chatId,
            payload: {
                text: textToSend,
            },
        }

        if (
            ws &&
            ws.readyState === WebSocket.OPEN
        ) {
            ws.send(
                JSON.stringify(payload)
            )

            return
        }

        try {
            const data =
                await sendMessage(
                    chatId,
                    textToSend
                )

            setMessages((prev) => [
                ...prev,
                data,
            ])

            scrollToBottom()

        } catch (e: any) {
            console.error(e)

            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )
        }
    }


    // =========================================
    // Message Enter
    // =========================================

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (
            e.key === 'Enter' &&
            !e.shiftKey
        ) {
            e.preventDefault()
            handleSend()
        }
    }


    // =========================================
    // Start message edit
    // =========================================

    const handleStartEdit = (
        message: Message
    ) => {
        setEditingMessageId(message.id)
        setEditingText(message.text ?? "")
        setError(null)
    }


    // =========================================
    // Cancel message edit
    // =========================================

    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditingText('')
    }


    // =========================================
    // Save message edit
    // =========================================

    const handleSaveEdit = async () => {
        if (!editingMessageId) return

        const newText =
            editingText.trim()

        if (!newText) {
            setError(
                'Сообщение не может быть пустым'
            )

            return
        }

        try {
            setEditingLoading(true)
            setError(null)

            const updatedMessage =
                await editMessage(
                    editingMessageId,
                    newText
                )

            setMessages((prev) =>
                prev.map((message) =>
                    message.id ===
                    editingMessageId
                        ? updatedMessage
                        : message
                )
            )

            setSearchResults((prev) =>
                prev.map((message) =>
                    message.id ===
                    editingMessageId
                        ? updatedMessage
                        : message
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


    // =========================================
    // Delete message
    // =========================================

    const handleDeleteMessage = async (
        messageId: string
    ) => {
        const confirmed =
            window.confirm(
                'Удалить это сообщение?'
            )

        if (!confirmed) return

        try {
            setDeletingMessageId(messageId)
            setError(null)

            await deleteMessage(messageId)

            setMessages((prev) =>
                prev.filter(
                    (message) =>
                        message.id !== messageId
                )
            )

            setSearchResults((prev) =>
                prev.filter(
                    (message) =>
                        message.id !== messageId
                )
            )

            if (
                editingMessageId ===
                messageId
            ) {
                handleCancelEdit()
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
            setDeletingMessageId(null)
        }
    }


    // =========================================
    // Search messages
    // =========================================

    const handleSearch = async () => {
        const query =
            searchText.trim()

        if (!chatId || !query) {
            setSearchResults([])
            setIsSearching(false)
            return
        }

        try {
            setSearchLoading(true)
            setError(null)
            setIsSearching(true)

            const results =
                await searchMessages(
                    chatId,
                    query
                )

            setSearchResults(results)

        } catch (e: any) {
            console.error(e)

            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )

            setSearchResults([])

        } finally {
            setSearchLoading(false)
        }
    }


    // =========================================
    // Search keyboard
    // =========================================

    const handleSearchKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
        }

        if (e.key === 'Escape') {
            setSearchText('')
            setSearchResults([])
            setIsSearching(false)
        }
    }


    // =========================================
    // Clear search
    // =========================================

    const handleClearSearch = () => {
        setSearchText('')
        setSearchResults([])
        setIsSearching(false)
    }


    // =========================================
    // Add participant
    // =========================================

    const handleAddParticipant = async () => {
        const phone =
            newParticipantPhone.trim()

        if (!chatId || !phone) {
            setError(
                'Введите номер телефона'
            )

            return
        }

        setError(null)

        try {
            setLoading(true)

            await addParticipant(
                chatId,
                phone
            )

            const parts =
                await getParticipants(
                    chatId
                )

            setParticipants(parts)
            setNewParticipantPhone('')

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


    // =========================================
    // Remove participant
    // =========================================

    const handleRemoveParticipant = async (
        participant: Participant
    ) => {

        if (!chatId) return

        // Только владелец может удалять
        if (!isOwner) {
            setError(
                'Только владелец группы может удалять участников'
            )

            return
        }

        /*
         * ВАЖНО:
         *
         * Backend:
         *
         * DELETE
         * /chat/{chat_id}/participant/{user_id}/remove_participant
         *
         * Поэтому передаем:
         *
         * participant.user.id
         *
         * НЕ:
         *
         * participant.id
         *
         * и НЕ:
         *
         * participant.user_id
         */

        const userId = participant.user?.id

        if (!userId) {
            setError(
                'Не удалось определить ID пользователя'
            )

            return
        }

        // Нельзя удалить самого себя
        if (userId === currentUserId) {
            setError(
                'Нельзя удалить самого себя. Используйте "Покинуть группу".'
            )

            return
        }

        const name =
            participant.user?.username ||
            participant.user?.phone_number ||
            userId

        const confirmed =
            window.confirm(
                `Удалить пользователя ${name} из группы?`
            )

        if (!confirmed) return

        try {
            setLoading(true)
            setError(null)

            /*
             * Передаем именно participant.user.id
             */
            await removeParticipant(
                chatId,
                userId
            )

            /*
             * Обновляем список участников
             */
            const parts =
                await getParticipants(
                    chatId
                )

            setParticipants(parts)

        } catch (e: any) {
            console.error(
                'Remove participant error:',
                e
            )

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


    // =========================================
    // Leave group
    // =========================================

    const handleLeaveChat = async () => {
        if (!chatId) return

        const confirmed =
            window.confirm(
                'Вы уверены, что хотите покинуть группу?'
            )

        if (!confirmed) return

        try {
            setLoading(true)
            setError(null)

            await leaveChat(chatId)

            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }

            navigate('/')

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


    // =========================================
    // Render message
    // =========================================

    const renderMessage = (
        message: Message
    ) => {
        const isMine =
            message.sender_id ===
            currentUserId

        const senderName =
            isMine
                ? currentUsername || 'Вы'
                : message.sender?.username ||
                  message.sender?.phone_number ||
                  message.sender_id

        const isEditing =
            editingMessageId ===
            message.id

        const isDeleting =
            deletingMessageId ===
            message.id

        return (
            <div
                key={message.id}
                className={`message-item ${
                    isMine ? 'mine' : ''
                }`}
            >

                <div className="message-author">
                    {senderName}
                </div>

                {isEditing ? (
                    <div className="message-edit">

                        <input
                            value={editingText}
                            onChange={(e) =>
                                setEditingText(
                                    e.target.value
                                )
                            }
                            onKeyDown={(e) => {
                                if (
                                    e.key === 'Enter'
                                ) {
                                    handleSaveEdit()
                                }

                                if (
                                    e.key === 'Escape'
                                ) {
                                    handleCancelEdit()
                                }
                            }}
                            autoFocus
                        />

                        <div className="message-actions">

                            <button
                                type="button"
                                onClick={
                                    handleSaveEdit
                                }
                                disabled={
                                    editingLoading
                                }
                            >
                                {editingLoading
                                    ? 'Сохранение...'
                                    : 'Сохранить'}
                            </button>

                            <button
                                type="button"
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
                ) : (
                    <>
                        <div className="message-bubble">
                            {message.text}
                        </div>

                        {isMine && (
                            <div className="message-actions">

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleStartEdit(
                                            message
                                        )
                                    }
                                >
                                    Изменить
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleDeleteMessage(
                                            message.id
                                        )
                                    }
                                    disabled={
                                        isDeleting
                                    }
                                >
                                    {isDeleting
                                        ? 'Удаление...'
                                        : 'Удалить'}
                                </button>

                            </div>
                        )}
                    </>
                )}

            </div>
        )
    }


    // =========================================
    // Render
    // =========================================

    return (
        <div className="chat-page">

            {/* ================================= */}
            {/* Header */}
            {/* ================================= */}

            <div className="chat-header">

                <div>
                    <h2>
                        {chat?.title || 'Чат'}
                    </h2>

                    {isGroupChat && (
                        <p className="chat-meta">
                            {participants.length}{' '}
                            {participants.length === 1
                                ? 'участник'
                                : 'участников'}
                        </p>
                    )}
                </div>


                {/* Search */}

                <div className="chat-search">

                    <input
                        placeholder="Поиск сообщений..."
                        value={searchText}
                        onChange={(e) =>
                            setSearchText(
                                e.target.value
                            )
                        }
                        onKeyDown={
                            handleSearchKeyDown
                        }
                    />

                    <button
                        type="button"
                        onClick={
                            handleSearch
                        }
                        disabled={
                            searchLoading ||
                            !searchText.trim()
                        }
                    >
                        {searchLoading
                            ? 'Поиск...'
                            : 'Найти'}
                    </button>

                    {isSearching && (
                        <button
                            type="button"
                            onClick={
                                handleClearSearch
                            }
                        >
                            Очистить
                        </button>
                    )}

                </div>

            </div>


            {/* ================================= */}
            {/* Search results */}
            {/* ================================= */}

            {isSearching && (
                <div className="search-results">

                    <div className="search-results-header">

                        <h3>
                            Результаты поиска
                        </h3>

                        <span>
                            {searchResults.length}
                        </span>

                    </div>

                    {searchResults.length === 0 ? (
                        <div className="empty-state">
                            Ничего не найдено
                        </div>
                    ) : (
                        <div className="search-results-list">

                            {searchResults.map(
                                renderMessage
                            )}

                        </div>
                    )}

                </div>
            )}


            {/* ================================= */}
            {/* Main */}
            {/* ================================= */}

            <div className="chat-grid">

                {/* ================================= */}
                {/* Chat */}
                {/* ================================= */}

                <section className="chat-window">

                    <div className="message-list">

                        {loading &&
                        messages.length === 0 ? (
                            <div className="empty-state">
                                Загрузка сообщений…
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="empty-state">
                                Нет сообщений.
                                Напишите первым!
                            </div>
                        ) : (
                            messages.map(
                                renderMessage
                            )
                        )}

                        <div
                            ref={messagesEndRef}
                        />

                    </div>


                    {/* Input */}

                    <div className="chat-input-row">

                        <input
                            placeholder="Напишите сообщение..."
                            value={text}
                            onChange={(e) =>
                                setText(
                                    e.target.value
                                )
                            }
                            onKeyDown={
                                handleKeyDown
                            }
                            disabled={!chatId}
                        />

                        <button
                            type="button"
                            onClick={
                                handleSend
                            }
                            disabled={
                                !chatId ||
                                !text.trim()
                            }
                        >
                            Отправить
                        </button>

                    </div>

                    {error && (
                        <p className="chat-error">
                            {error}
                        </p>
                    )}

                </section>


                {/* ================================= */}
                {/* Sidebar */}
                {/* ================================= */}

                {isGroupChat && (
                    <aside className="chat-sidebar">

                        {/* ================================= */}
                        {/* Participants */}
                        {/* ================================= */}

                        <div className="sidebar-section">

                            <h3>
                                Участники
                            </h3>

                            <ul className="participants-list">

                                {participants.map(
                                    (participant) => {

                                        /*
                                         * Здесь принципиально:
                                         *
                                         * participant.id
                                         *   = ID записи участника
                                         *
                                         * participant.user_id
                                         *   = FK пользователя
                                         *
                                         * participant.user.id
                                         *   = ID пользователя
                                         *
                                         * Backend remove endpoint
                                         * ожидает именно user.id.
                                         */

                                        const participantUserId =
                                            participant.user?.id

                                        const isCurrent =
                                            participantUserId ===
                                                currentUserId ||
                                            participant.user_id ===
                                                currentUserId

                                        const name =
                                            participant.user?.username ||
                                            participant.user?.phone_number ||
                                            participant.user_id

                                        return (
                                            <li
                                                key={
                                                    participant.id
                                                }
                                                className={
                                                    isCurrent
                                                        ? 'participant-current'
                                                        : ''
                                                }
                                            >

                                                <span>
                                                    {name}

                                                    {isCurrent &&
                                                        ' (вы)'}
                                                </span>


                                                {/* 
                                                 * Кнопка удаления
                                                 * только для owner
                                                 */}

                                                {isOwner &&
                                                !isCurrent &&
                                                participantUserId && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveParticipant(
                                                                participant
                                                            )
                                                        }
                                                        disabled={
                                                            loading
                                                        }
                                                    >
                                                        Удалить
                                                    </button>
                                                )}

                                            </li>
                                        )
                                    }
                                )}

                            </ul>

                        </div>


                        {/* ================================= */}
                        {/* Add participant */}
                        {/* ================================= */}

                        {isOwner && (
                            <div className="sidebar-section">

                                <h3>
                                    Добавить участника
                                </h3>

                                <div className="create-row">

                                    <input
                                        placeholder="Номер телефона"
                                        value={
                                            newParticipantPhone
                                        }
                                        onChange={(e) =>
                                            setNewParticipantPhone(
                                                e.target.value
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            handleAddParticipant
                                        }
                                        disabled={
                                            !chatId ||
                                            loading
                                        }
                                    >
                                        Добавить
                                    </button>

                                </div>

                            </div>
                        )}


                        {/* ================================= */}
                        {/* Leave */}
                        {/* ================================= */}

                        <div className="sidebar-section">

                            <button
                                type="button"
                                onClick={
                                    handleLeaveChat
                                }
                                disabled={
                                    loading
                                }
                                className="leave-chat-button"
                            >
                                {loading
                                    ? 'Обработка...'
                                    : 'Покинуть группу'}
                            </button>

                        </div>

                    </aside>
                )}

            </div>

        </div>
    )
}