import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    useNavigate,
    useParams,
} from 'react-router-dom'

import {
    buildWsUrl,
} from '../api/client'

import {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    searchMessages,
} from '../api/messages'

import {
    getAttachment,
} from '../api/attachments'

import {
    getParticipants,
    addParticipant,
    getChat,
    removeParticipant,
    leaveChat,
} from '../api/chats'


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
    sent_at: string
    edited_at: string

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


export default function Chat() {
    const { chatId = '' } = useParams()
    const navigate = useNavigate()

    const [messages, setMessages] =
        useState<Message[]>([])

    const [text, setText] =
        useState('')

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null)

    const [chat, setChat] =
        useState<Chat | null>(null)

    const [participants, setParticipants] =
        useState<Participant[]>([])

    const [newParticipantPhone, setNewParticipantPhone] =
        useState('')

    const [loading, setLoading] =
        useState(false)

    const [sending, setSending] =
        useState(false)

    const [error, setError] =
        useState<string | null>(null)

    const [editingMessageId, setEditingMessageId] =
        useState<string | null>(null)

    const [editingText, setEditingText] =
        useState('')

    const [editingLoading, setEditingLoading] =
        useState(false)

    const [deletingMessageId, setDeletingMessageId] =
        useState<string | null>(null)

    const [searchText, setSearchText] =
        useState('')

    const [searchResults, setSearchResults] =
        useState<Message[]>([])

    const [searchLoading, setSearchLoading] =
        useState(false)

    const [isSearching, setIsSearching] =
        useState(false)

    const [attachmentUrls, setAttachmentUrls] =
        useState<Record<string, string>>({})

    const [isRecording, setIsRecording] =
        useState(false)

    const [recordingTime, setRecordingTime] =
        useState(0)

    const wsRef =
        useRef<WebSocket | null>(null)

    const messagesEndRef =
        useRef<HTMLDivElement | null>(null)

    const imageInputRef =
        useRef<HTMLInputElement | null>(null)

    const videoInputRef =
        useRef<HTMLInputElement | null>(null)

    const fileInputRef =
        useRef<HTMLInputElement | null>(null)

    const mediaRecorderRef =
        useRef<MediaRecorder | null>(null)

    const recordingChunksRef =
        useRef<Blob[]>([])

    const recordingTimerRef =
        useRef<number | null>(null)

    const currentUserId =
        localStorage.getItem('user_id') || ''

    const currentUsername =
        localStorage.getItem('username') || ''

    const isGroupChat =
        chat?.is_group === true

    const isOwner =
        isGroupChat &&
        chat?.owner_id === currentUserId


    const scrollToBottom = (
        smooth = true
    ) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth
                ? 'smooth'
                : 'auto',
        })
    }


    const formatFileSize = (
        bytes: number
    ) => {
        if (!bytes) {
            return '0 Bytes'
        }

        const sizes = [
            'Bytes',
            'KB',
            'MB',
            'GB',
        ]

        const index =
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            )

        return `${(
            bytes /
            Math.pow(1024, index)
        ).toFixed(2)} ${sizes[index]}`
    }


    const formatRecordingTime = (
        seconds: number
    ) => {
        const minutes =
            Math.floor(seconds / 60)

        const remainingSeconds =
            seconds % 60

        return `${String(minutes).padStart(
            2,
            '0'
        )}:${String(
            remainingSeconds
        ).padStart(2, '0')}`
    }


    useEffect(() => {
        if (!chatId) {
            return
        }

        const loadData = async () => {
            try {
                setLoading(true)
                setError(null)

                const chatInfo =
                    await getChat(chatId)

                setChat(chatInfo)

                const msgs =
                    await getMessages(chatId)

                setMessages(msgs)

                if (chatInfo.is_group) {
                    const parts =
                        await getParticipants(chatId)

                    setParticipants(parts)
                } else {
                    setParticipants([])
                }

                setTimeout(() => {
                    scrollToBottom(false)
                }, 100)

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

        loadData()

    }, [chatId])


    useEffect(() => {
        if (!chatId) {
            return
        }

        const loadAttachments = async () => {
            const allAttachments =
                messages.flatMap(
                    (message) =>
                        message.attachments || []
                )

            for (
                const attachment
                of allAttachments
            ) {
                if (
                    attachmentUrls[
                        attachment.id
                    ]
                ) {
                    continue
                }

                try {
                    const url =
                        await getAttachment(
                            chatId,
                            attachment.id
                        )

                    setAttachmentUrls(
                        (prev) => ({
                            ...prev,
                            [attachment.id]: url,
                        })
                    )

                } catch (e) {
                    console.error(
                        'Attachment load error:',
                        e
                    )
                }
            }
        }

        loadAttachments()

    }, [messages, chatId])


    useEffect(() => {
        return () => {
            Object.values(
                attachmentUrls
            ).forEach((url) => {
                URL.revokeObjectURL(url)
            })
        }

    }, [])


    useEffect(() => {
        if (!chatId) {
            return
        }

        const token =
            localStorage.getItem(
                'access_token'
            )

        if (!token) {
            return
        }

        const ws =
            new WebSocket(
                buildWsUrl(token)
            )

        wsRef.current = ws

        ws.onmessage = (
            event
        ) => {
            try {
                const payload =
                    JSON.parse(event.data)

                if (
                    payload.type ===
                    'message_created'
                    &&
                    payload.chat_id ===
                    chatId
                ) {
                    setMessages(
                        (prev) => [
                            ...prev,
                            payload.data,
                        ]
                    )

                    setTimeout(() => {
                        scrollToBottom()
                    }, 50)
                }

            } catch (e) {
                console.error(
                    'WS message parse error:',
                    e
                )
            }
        }

        ws.onerror = (
            event
        ) => {
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


    const handleSelectFile = (
        file: File | undefined
    ) => {
        if (!file) {
            return
        }

        setSelectedFile(file)
        setError(null)
    }


    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            e.target.files?.[0]

        handleSelectFile(file)

        e.target.value = ''
    }


    const handleVideoChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            e.target.files?.[0]

        handleSelectFile(file)

        e.target.value = ''
    }


    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file =
            e.target.files?.[0]

        handleSelectFile(file)

        e.target.value = ''
    }


    const handleRemoveSelectedFile = () => {
        setSelectedFile(null)
    }


    const handleSend = async () => {
        if (
            !chatId ||
            (
                !text.trim() &&
                !selectedFile
            )
        ) {
            return
        }

        try {
            setSending(true)
            setError(null)

            const textToSend =
                text.trim()

            const fileToSend =
                selectedFile

            setText('')
            setSelectedFile(null)

            const data =
                await sendMessage(
                    chatId,
                    textToSend || undefined,
                    fileToSend
                )

            setMessages((prev) => {
                const exists =
                    prev.some(
                        (message) =>
                            message.id ===
                            data.id
                    )

                if (exists) {
                    return prev
                }

                return [
                    ...prev,
                    data,
                ]
            })

            setTimeout(() => {
                scrollToBottom()
            }, 50)

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
            setSending(false)
        }
    }


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


    const startRecording = async () => {
        try {
            setError(null)

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true,
                })

            const recorder =
                new MediaRecorder(stream)

            recordingChunksRef.current = []

            recorder.ondataavailable = (
                event
            ) => {
                if (
                    event.data.size > 0
                ) {
                    recordingChunksRef.current.push(
                        event.data
                    )
                }
            }

            recorder.onstop = () => {
                const audioBlob =
                    new Blob(
                        recordingChunksRef.current,
                        {
                            type:
                                recorder.mimeType ||
                                'audio/webm',
                        }
                    )

                const extension =
                    audioBlob.type.includes(
                        'ogg'
                    )
                        ? 'ogg'
                        : 'webm'

                const audioFile =
                    new File(
                        [audioBlob],
                        `voice-${Date.now()}.${extension}`,
                        {
                            type:
                                audioBlob.type,
                        }
                    )

                setSelectedFile(
                    audioFile
                )

                stream
                    .getTracks()
                    .forEach(
                        (track) =>
                            track.stop()
                    )

                setIsRecording(false)
                setRecordingTime(0)
            }

            recorder.start()

            mediaRecorderRef.current =
                recorder

            setIsRecording(true)
            setRecordingTime(0)

            recordingTimerRef.current =
                window.setInterval(() => {
                    setRecordingTime(
                        (prev) =>
                            prev + 1
                    )
                }, 1000)

        } catch (e) {
            console.error(e)

            setError(
                'Не удалось получить доступ к микрофону'
            )
        }
    }


    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !==
                'inactive'
        ) {
            mediaRecorderRef.current.stop()
        }

        if (
            recordingTimerRef.current
        ) {
            window.clearInterval(
                recordingTimerRef.current
            )

            recordingTimerRef.current =
                null
        }
    }


    useEffect(() => {
        return () => {
            if (
                recordingTimerRef.current
            ) {
                window.clearInterval(
                    recordingTimerRef.current
                )
            }

            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !==
                    'inactive'
            ) {
                mediaRecorderRef.current.stop()
            }
        }

    }, [])


    const handleStartEdit = (
        message: Message
    ) => {
        setEditingMessageId(
            message.id
        )

        setEditingText(
            message.text ?? ''
        )
    }


    const handleCancelEdit = () => {
        setEditingMessageId(null)
        setEditingText('')
    }


    const handleSaveEdit = async () => {
        if (!editingMessageId) {
            return
        }

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

            const updatedMessage =
                await editMessage(
                    editingMessageId,
                    newText
                )

            setMessages((prev) =>
                prev.map(
                    (message) =>
                        message.id ===
                        editingMessageId
                            ? updatedMessage
                            : message
                )
            )

            setSearchResults((prev) =>
                prev.map(
                    (message) =>
                        message.id ===
                        editingMessageId
                            ? updatedMessage
                            : message
                )
            )

            handleCancelEdit()

        } catch (e: any) {
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


    const handleDeleteMessage = async (
        messageId: string
    ) => {
        if (
            !window.confirm(
                'Удалить это сообщение?'
            )
        ) {
            return
        }

        try {
            setDeletingMessageId(
                messageId
            )

            await deleteMessage(
                messageId
            )

            setMessages((prev) =>
                prev.filter(
                    (message) =>
                        message.id !==
                        messageId
                )
            )

            setSearchResults((prev) =>
                prev.filter(
                    (message) =>
                        message.id !==
                        messageId
                )
            )

        } catch (e: any) {
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
            setIsSearching(true)

            const results =
                await searchMessages(
                    chatId,
                    query
                )

            setSearchResults(
                results
            )

        } catch (e: any) {
            setError(
                String(
                    e?.response?.data?.detail ||
                    e?.response?.data ||
                    e
                )
            )

        } finally {
            setSearchLoading(false)
        }
    }


    const handleClearSearch = () => {
        setSearchText('')
        setSearchResults([])
        setIsSearching(false)
    }


    const handleAddParticipant =
        async () => {
            const phone =
                newParticipantPhone.trim()

            if (!phone || !chatId) {
                return
            }

            try {
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
                setError(
                    String(
                        e?.response?.data?.detail ||
                        e?.response?.data ||
                        e
                    )
                )
            }
        }


    const handleRemoveParticipant =
        async (
            participant: Participant
        ) => {
            const userId =
                participant.user?.id

            if (
                !chatId ||
                !userId
            ) {
                return
            }

            try {
                await removeParticipant(
                    chatId,
                    userId
                )

                setParticipants(
                    (prev) =>
                        prev.filter(
                            (item) =>
                                item.user?.id !==
                                userId
                        )
                )

            } catch (e: any) {
                setError(
                    String(
                        e?.response?.data?.detail ||
                        e?.response?.data ||
                        e
                    )
                )
            }
        }


    const handleLeaveChat =
        async () => {
            if (!chatId) {
                return
            }

            if (
                !window.confirm(
                    'Покинуть группу?'
                )
            ) {
                return
            }

            try {
                await leaveChat(chatId)

                navigate('/')

            } catch (e: any) {
                setError(
                    String(
                        e?.response?.data?.detail ||
                        e?.response?.data ||
                        e
                    )
                )
            }
        }


    const renderAttachment = (
        attachment: MessageAttachment
    ) => {
        const url =
            attachmentUrls[
                attachment.id
            ]

        if (!url) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
                    Загрузка файла...
                </div>
            )
        }

        if (
            attachment.mime_type.startsWith(
                'image/'
            )
        ) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
                    <img
                        src={url}
                        alt={
                            attachment.file_name
                        }
                        className="chat-image"
                    />

                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>
                </div>
            )
        }

        if (
            attachment.mime_type.startsWith(
                'video/'
            )
        ) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
                    <video
                        controls
                        preload="metadata"
                        className="chat-video"
                    >
                        <source
                            src={url}
                            type={
                                attachment.mime_type
                            }
                        />
                    </video>

                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>
                </div>
            )
        }

        if (
            attachment.mime_type.startsWith(
                'audio/'
            )
        ) {
            return (
                <div
                    key={attachment.id}
                    className="message-attachment"
                >
                    <audio
                        controls
                        preload="metadata"
                        className="chat-audio"
                    >
                        <source
                            src={url}
                            type={
                                attachment.mime_type
                            }
                        />
                    </audio>

                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>
                </div>
            )
        }

        return (
            <div
                key={attachment.id}
                className="message-attachment file-attachment"
            >
                <a
                    href={url}
                    download={
                        attachment.file_name
                    }
                >
                    Скачать:
                    {' '}
                    {attachment.file_name}
                </a>
            </div>
        )
    }


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
                    isMine
                        ? 'mine'
                        : ''
                }`}
            >
                <div className="message-author">
                    {senderName}
                </div>

                {isEditing ? (
                    <div className="message-edit">
                        <input
                            value={
                                editingText
                            }
                            onChange={(e) =>
                                setEditingText(
                                    e.target.value
                                )
                            }
                            autoFocus
                        />

                        <button
                            onClick={
                                handleSaveEdit
                            }
                            disabled={
                                editingLoading
                            }
                        >
                            Сохранить
                        </button>

                        <button
                            onClick={
                                handleCancelEdit
                            }
                        >
                            Отмена
                        </button>
                    </div>
                ) : (
                    <>
                        {message.text && (
                            <div className="message-bubble">
                                {message.text}
                            </div>
                        )}

                        {message.attachments?.map(
                            renderAttachment
                        )}

                        {isMine && (
                            <div className="message-actions">
                                {message.text && (
                                    <button
                                        onClick={() =>
                                            handleStartEdit(
                                                message
                                            )
                                        }
                                    >
                                        Изменить
                                    </button>
                                )}

                                <button
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


    return (
        <div className="chat-page">
            <div className="chat-header">
                <div>
                    <h2>
                        {chat?.title || 'Чат'}
                    </h2>

                    {isGroupChat && (
                        <p>
                            Участников:
                            {' '}
                            {participants.length}
                        </p>
                    )}
                </div>

                <div className="chat-search">
                    <input
                        placeholder="Поиск..."
                        value={
                            searchText
                        }
                        onChange={(e) =>
                            setSearchText(
                                e.target.value
                            )
                        }
                    />

                    <button
                        onClick={
                            handleSearch
                        }
                        disabled={
                            searchLoading
                        }
                    >
                        Найти
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

            {isSearching && (
                <div className="search-results">
                    <h3>
                        Результаты поиска
                    </h3>

                    {searchResults.map(
                        renderMessage
                    )}
                </div>
            )}

            <div className="chat-grid">
                <section className="chat-window">
                    <div className="message-list">
                        {loading &&
                        messages.length === 0 ? (
                            <div>
                                Загрузка...
                            </div>
                        ) : (
                            messages.map(
                                renderMessage
                            )
                        )}

                        <div
                            ref={
                                messagesEndRef
                            }
                        />
                    </div>

                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={
                            handleImageChange
                        }
                    />

                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        hidden
                        onChange={
                            handleVideoChange
                        }
                    />

                    <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        onChange={
                            handleFileChange
                        }
                    />

                    {selectedFile && (
                        <div className="selected-file">
                            <div className="selected-file-info">
                                <span className="selected-file-name">
                                    {selectedFile.name}
                                </span>

                                <span className="selected-file-size">
                                    {formatFileSize(
                                        selectedFile.size
                                    )}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    handleRemoveSelectedFile
                                }
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {isRecording && (
                        <div className="recording-panel">
                            Запись:
                            {' '}
                            {formatRecordingTime(
                                recordingTime
                            )}

                            <button
                                type="button"
                                onClick={
                                    stopRecording
                                }
                            >
                                Остановить
                            </button>
                        </div>
                    )}

                    <div className="chat-input-row">
                        <button
                            type="button"
                            onClick={() =>
                                imageInputRef.current?.click()
                            }
                            title="Добавить фото"
                        >
                            Фото
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                videoInputRef.current?.click()
                            }
                            title="Добавить видео"
                        >
                            Видео
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                fileInputRef.current?.click()
                            }
                            title="Добавить файл"
                        >
                            Файл
                        </button>

                        {!isRecording ? (
                            <button
                                type="button"
                                onClick={
                                    startRecording
                                }
                                title="Записать голосовое сообщение"
                            >
                                Аудио
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={
                                    stopRecording
                                }
                            >
                                Стоп
                            </button>
                        )}

                        <input
                            className="message-input"
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
                        />

                        <button
                            type="button"
                            className="send-button"
                            onClick={
                                handleSend
                            }
                            disabled={
                                sending ||
                                (
                                    !text.trim() &&
                                    !selectedFile
                                )
                            }
                        >
                            {sending
                                ? '...'
                                : 'Отправить'}
                        </button>
                    </div>

                    {error && (
                        <div className="chat-error">
                            {error}
                        </div>
                    )}
                </section>

                {isGroupChat && (
                    <aside className="chat-sidebar">
                        <div className="sidebar-section">
                            <h3>
                                Участники
                            </h3>

                            {participants.map(
                                (participant) => {
                                    const userId =
                                        participant.user?.id

                                    const isCurrent =
                                        userId ===
                                        currentUserId

                                    return (
                                        <div
                                            key={
                                                participant.id
                                            }
                                            className="participant"
                                        >
                                            <span>
                                                {participant.user?.username ||
                                                    participant.user?.phone_number ||
                                                    participant.user_id}

                                                {isCurrent &&
                                                    ' (Вы)'}
                                            </span>

                                            {isOwner &&
                                            !isCurrent &&
                                            userId && (
                                                <button
                                                    onClick={() =>
                                                        handleRemoveParticipant(
                                                            participant
                                                        )
                                                    }
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                    )
                                }
                            )}
                        </div>

                        {isOwner && (
                            <div className="sidebar-section">
                                <h3>
                                    Добавить
                                    участника
                                </h3>

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
                                    onClick={
                                        handleAddParticipant
                                    }
                                >
                                    Добавить
                                </button>
                            </div>
                        )}

                        <button
                            onClick={
                                handleLeaveChat
                            }
                        >
                            Покинуть группу
                        </button>
                    </aside>
                )}
            </div>
        </div>
    )
}