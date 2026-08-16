import { useEffect, useRef, useState } from 'react'
import { buildWsUrl } from '../api/client'
import {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    searchMessages,
} from '../api/messages'
import { useParams } from 'react-router-dom'
import { getParticipants, addParticipant, getChat } from '../api/chats'

type Message = {
    id: string
    chat_id: string
    sender_id: string
    text: string
    sender?: {
        id: string
        username?: string
        phone_number?: string
    }
}

type Chat = {
    id: string
    title?: string
    is_group?: boolean
}

export default function Chat() {
    const params = useParams()
    const chatId = params.chatId || ''
    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState('')
    const [chat, setChat] = useState<Chat | null>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [newParticipantPhone, setNewParticipantPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Редактирование
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
    const [editingText, setEditingText] = useState('')
    const [editingLoading, setEditingLoading] = useState(false)
    // Удаление
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
    // Поиск
    const [searchText, setSearchText] = useState('')
    const [searchResults, setSearchResults] = useState<Message[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)
    const messagesEndRef = useRef<HTMLDivElement | null>(null)
    const currentUserId = localStorage.getItem('user_id') || ''
    const currentUsername = localStorage.getItem('username') || ''

    const isGroupChat = chat?.is_group === true

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
        })
    }

    useEffect(() => {
        if (!chatId) return

        const loadData = async () => {
            setError(null)

            try {
                setLoading(true)

                const chatInfo = await getChat(chatId)
                setChat(chatInfo)

                const msgs = await getMessages(chatId)
                setMessages(msgs)

                if (chatInfo.is_group) {
                    const parts = await getParticipants(chatId)
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
    // -----------------------------------------
    // WebSocket
    // -----------------------------------------

    useEffect(() => {
        if (!chatId) return
        const token = localStorage.getItem('access_token')
        if (!token) return
        const ws = new WebSocket(buildWsUrl(token))
        wsRef.current = ws
        ws.onmessage = (ev) => {
            try {
                const payload = JSON.parse(ev.data)
                if (
                    payload.type === 'message_created' &&
                    payload.chat_id === chatId
                ) {
                    setMessages((prev) => [
                        ...prev,
                        payload.data,
                    ])

                    scrollToBottom()
                }
            } catch (e) {
                console.error('ws message parse error', e)
            }
        }

        ws.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [chatId])
    // Send message
    const handleSend = async () => {
        if (!chatId || !text.trim()) return

        setError(null)

        const textToSend = text.trim()

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
            ws.send(JSON.stringify(payload))
        } else {
            try {
                const data = await sendMessage(
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
    }
    // Enter
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

    // Start editing
    const handleStartEdit = (
        message: Message
    ) => {
        setEditingMessageId(message.id)
        setEditingText(message.text)
        setError(null)
    }

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditingText('')
    }

    // Save edited message
    const handleSaveEdit = async () => {
        if (!editingMessageId) return

        const newText = editingText.trim()

        if (!newText) {
            setError('Сообщение не может быть пустым')
            return
        }

        try {
            setEditingLoading(true)
            setError(null)

            const updatedMessage = await editMessage(
                editingMessageId,
                newText
            )

            setMessages((prev) =>
                prev.map((message) =>
                    message.id === editingMessageId
                        ? updatedMessage
                        : message
                )
            )

            // Если редактируемое сообщение присутствует
            // в результатах поиска — тоже обновляем его
            setSearchResults((prev) =>
                prev.map((message) =>
                    message.id === editingMessageId
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

    // Delete message

    const handleDelete = async (
        messageId: string
    ) => {
        const confirmed = window.confirm(
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
                editingMessageId === messageId
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

    // -----------------------------------------
    // Search messages
    // -----------------------------------------

    const handleSearch = async () => {
        const query = searchText.trim()

        if (!chatId || !query) {
            setSearchResults([])
            setIsSearching(false)
            return
        }

        try {
            setSearchLoading(true)
            setError(null)
            setIsSearching(true)

            const results = await searchMessages(
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

    // -----------------------------------------
    // Search input Enter
    // -----------------------------------------

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

    // -----------------------------------------
    // Clear search
    // -----------------------------------------

    const handleClearSearch = () => {
        setSearchText('')
        setSearchResults([])
        setIsSearching(false)
    }

    // -----------------------------------------
    // Add participant
    // -----------------------------------------

    const handleAddParticipant = async () => {
        if (!chatId || !newParticipantPhone) {
            setError('Phone required')
            return
        }

        setError(null)

        try {
            setLoading(true)

            await addParticipant(
                chatId,
                newParticipantPhone
            )

            const parts =
                await getParticipants(chatId)

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

    // -----------------------------------------
    // Render message
    // -----------------------------------------

    const renderMessage = (
        message: Message
    ) => {
        const isMine =
            message.sender_id === currentUserId

        const senderName = isMine
            ? currentUsername || 'Вы'
            : message.sender?.username ||
              message.sender?.phone_number ||
              message.sender_id

        const isEditing =
            editingMessageId === message.id

        const isDeleting =
            deletingMessageId === message.id

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
                                    onClick={() =>
                                        handleStartEdit(
                                            message
                                        )
                                    }
                                >
                                    Изменить
                                </button>

                                <button
                                    onClick={() =>
                                        handleDelete(
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

    return (
        <div className="chat-page">

            {/* -------------------------------- */}
            {/* Header */}
            {/* -------------------------------- */}

            <div className="chat-header">
                <div>
                    <h2>
                        {chat?.title ?? 'Чат'}
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

                {/* SEARCH */}

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
                        onClick={handleSearch}
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
                            onClick={
                                handleClearSearch
                            }
                        >
                            Очистить
                        </button>
                    )}
                </div>
            </div>

            {/* -------------------------------- */}
            {/* Search results */}
            {/* -------------------------------- */}

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
                                (message) =>
                                    renderMessage(
                                        message
                                    )
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* -------------------------------- */}
            {/* Main */}
            {/* -------------------------------- */}

            <div className="chat-grid">

                <section className="chat-window">

                    <div className="message-list">

                        {loading &&
                        messages.length === 0 ? (
                            <div className="empty-state">
                                Загрузка сообщений…
                            </div>
                        ) : messages.length ===
                          0 ? (
                            <div className="empty-state">
                                Нет сообщений.
                                Напишите первым!
                            </div>
                        ) : (
                            messages.map(
                                (message) =>
                                    renderMessage(
                                        message
                                    )
                            )
                        )}

                        <div
                            ref={messagesEndRef}
                        />
                    </div>

                    {/* -------------------------------- */}
                    {/* Input */}
                    {/* -------------------------------- */}

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
                            onClick={handleSend}
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

                {/* -------------------------------- */}
                {/* Sidebar */}
                {/* -------------------------------- */}

                {isGroupChat && (
                    <aside className="chat-sidebar">

                        <div className="sidebar-section">
                            <h3>
                                Участники
                            </h3>

                            <ul className="participants-list">
                                {participants.map(
                                    (
                                        participant
                                    ) => {
                                        const user =
                                            participant.user ||
                                            {}

                                        const isCurrent =
                                            user.id ===
                                                currentUserId ||
                                            participant.user_id ===
                                                currentUserId

                                        const name =
                                            user.username ||
                                            user.phone_number ||
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
                                                {name}

                                                {isCurrent &&
                                                    ' (вы)'}
                                            </li>
                                        )
                                    }
                                )}
                            </ul>
                        </div>

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
                                    onChange={(
                                        e
                                    ) =>
                                        setNewParticipantPhone(
                                            e.target
                                                .value
                                        )
                                    }
                                />

                                <button
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

                    </aside>
                )}
            </div>
        </div>
    )
}