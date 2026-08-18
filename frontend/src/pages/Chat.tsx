import {
    useEffect,
    useRef,
    useState
} from 'react'

import {
    useNavigate,
    useParams
} from 'react-router-dom'

import {
    buildWsUrl
} from '../api/client'

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


// =========================================
// Component
// =========================================

export default function Chat() {

    const { chatId = '' } =
        useParams()

    const navigate =
        useNavigate()


    // =========================================
    // State
    // =========================================

    const [messages, setMessages] =
        useState<Message[]>([])

    const [text, setText] =
        useState('')

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null)

    const [selectedFilePreview, setSelectedFilePreview] =
        useState<string | null>(null)


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


    // =========================================
    // Recording
    // =========================================

    const [isRecording, setIsRecording] =
        useState(false)

    const [recordingTime, setRecordingTime] =
        useState(0)


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
    // Search
    // =========================================

    const [searchText, setSearchText] =
        useState('')

    const [searchResults, setSearchResults] =
        useState<Message[]>([])

    const [searchLoading, setSearchLoading] =
        useState(false)

    const [isSearching, setIsSearching] =
        useState(false)


    // =========================================
    // Refs
    // =========================================

    const wsRef =
        useRef<WebSocket | null>(null)

    const messagesEndRef =
        useRef<HTMLDivElement | null>(null)

    const imageInputRef =
        useRef<HTMLInputElement | null>(null)

    const videoInputRef =
        useRef<HTMLInputElement | null>(null)

    const audioInputRef =
        useRef<HTMLInputElement | null>(null)

    const fileInputRef =
        useRef<HTMLInputElement | null>(null)

    const mediaRecorderRef =
        useRef<MediaRecorder | null>(null)

    const audioChunksRef =
        useRef<Blob[]>([])

    const recordingIntervalRef =
        useRef<number | null>(null)


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
    // Attachment URL
    // =========================================

    const getAttachmentUrl = (
        attachmentId: string
    ) => {

        return `http://127.0.0.1:8000/api/chat/${chatId}/attachment/${attachmentId}`
    }


    // =========================================
    // Scroll
    // =========================================

    const scrollToBottom = (
        smooth = true
    ) => {

        messagesEndRef.current?.scrollIntoView({
            behavior: smooth
                ? 'smooth'
                : 'auto',
        })
    }


    // =========================================
    // Load chat
    // =========================================

    useEffect(() => {

        if (!chatId) {
            return
        }

        const loadData = async () => {

            setError(null)

            try {

                setLoading(true)

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


        ws.onmessage = (event) => {

            try {

                const payload =
                    JSON.parse(event.data)

                if (
                    payload.type ===
                    'message_created' &&
                    payload.chat_id === chatId
                ) {

                    setMessages((prev) => {

                        const exists =
                            prev.some(
                                (message) =>
                                    message.id ===
                                    payload.data.id
                            )

                        if (exists) {
                            return prev
                        }

                        return [
                            ...prev,
                            payload.data,
                        ]
                    })

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
    // Select file
    // =========================================

    const handleSelectFile = (
        file: File | null
    ) => {

        if (!file) {
            return
        }


        if (
            selectedFilePreview
        ) {

            URL.revokeObjectURL(
                selectedFilePreview
            )
        }


        setSelectedFile(file)


        if (
            file.type.startsWith('image/') ||
            file.type.startsWith('video/') ||
            file.type.startsWith('audio/')
        ) {

            const previewUrl =
                URL.createObjectURL(file)

            setSelectedFilePreview(
                previewUrl
            )

        } else {

            setSelectedFilePreview(null)
        }
    }


    // =========================================
    // Remove selected file
    // =========================================

    const handleRemoveSelectedFile = () => {

        if (
            selectedFilePreview
        ) {

            URL.revokeObjectURL(
                selectedFilePreview
            )
        }

        setSelectedFile(null)

        setSelectedFilePreview(null)


        if (imageInputRef.current) {
            imageInputRef.current.value = ''
        }

        if (videoInputRef.current) {
            videoInputRef.current.value = ''
        }

        if (audioInputRef.current) {
            audioInputRef.current.value = ''
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }


    // =========================================
    // Image select
    // =========================================

    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {

        const file =
            e.target.files?.[0] || null

        handleSelectFile(file)
    }


    // =========================================
    // Video select
    // =========================================

    const handleVideoChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {

        const file =
            e.target.files?.[0] || null

        handleSelectFile(file)
    }


    // =========================================
    // Audio select
    // =========================================

    const handleAudioChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {

        const file =
            e.target.files?.[0] || null

        handleSelectFile(file)
    }


    // =========================================
    // Other file select
    // =========================================

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {

        const file =
            e.target.files?.[0] || null

        handleSelectFile(file)
    }


    // =========================================
    // Start voice recording
    // =========================================

    const startRecording = async () => {

        try {

            setError(null)

            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true
                })


            const mediaRecorder =
                new MediaRecorder(stream)

            mediaRecorderRef.current =
                mediaRecorder

            audioChunksRef.current = []


            mediaRecorder.ondataavailable =
                (event) => {

                    if (
                        event.data.size > 0
                    ) {

                        audioChunksRef.current.push(
                            event.data
                        )
                    }
                }


            mediaRecorder.onstop = () => {

                const audioBlob =
                    new Blob(
                        audioChunksRef.current,
                        {
                            type:
                                mediaRecorder.mimeType ||
                                'audio/webm'
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
                                audioBlob.type
                        }
                    )


                handleSelectFile(
                    audioFile
                )


                stream
                    .getTracks()
                    .forEach(
                        (track) =>
                            track.stop()
                    )
            }


            mediaRecorder.start()

            setIsRecording(true)

            setRecordingTime(0)


            recordingIntervalRef.current =
                window.setInterval(() => {

                    setRecordingTime(
                        (prev) => prev + 1
                    )

                }, 1000)

        } catch (e) {

            console.error(
                'Recording error:',
                e
            )

            setError(
                'Не удалось получить доступ к микрофону'
            )
        }
    }


    // =========================================
    // Stop voice recording
    // =========================================

    const stopRecording = () => {

        const recorder =
            mediaRecorderRef.current

        if (
            recorder &&
            recorder.state !== 'inactive'
        ) {

            recorder.stop()
        }


        if (
            recordingIntervalRef.current
        ) {

            clearInterval(
                recordingIntervalRef.current
            )

            recordingIntervalRef.current =
                null
        }

        setIsRecording(false)
    }


    // =========================================
    // Cleanup recording
    // =========================================

    useEffect(() => {

        return () => {

            if (
                recordingIntervalRef.current
            ) {

                clearInterval(
                    recordingIntervalRef.current
                )
            }


            if (
                selectedFilePreview
            ) {

                URL.revokeObjectURL(
                    selectedFilePreview
                )
            }
        }

    }, [selectedFilePreview])


    // =========================================
    // Send message
    // =========================================

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


            const data =
                await sendMessage(
                    chatId,
                    textToSend,
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
                    data
                ]
            })


            setText('')

            handleRemoveSelectedFile()


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
    // Start edit
    // =========================================

    const handleStartEdit = (
        message: Message
    ) => {

        if (
            message.attachments.length > 0
        ) {

            setError(
                'Редактирование сообщений с файлами пока недоступно'
            )

            return
        }

        setEditingMessageId(
            message.id
        )

        setEditingText(
            message.text ?? ''
        )

        setError(null)
    }


    // =========================================
    // Cancel edit
    // =========================================

    const handleCancelEdit = () => {

        setEditingMessageId(null)

        setEditingText('')
    }


    // =========================================
    // Save edit
    // =========================================

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

            setError(null)


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

        if (!confirmed) {
            return
        }


        try {

            setDeletingMessageId(
                messageId
            )

            setError(null)


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
    // Search
    // =========================================

    const handleSearch = async () => {

        const query =
            searchText.trim()

        if (
            !chatId ||
            !query
        ) {

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


            setSearchResults(
                results
            )

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

        if (
            e.key === 'Enter'
        ) {

            e.preventDefault()

            handleSearch()
        }


        if (
            e.key === 'Escape'
        ) {

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

        if (
            !chatId ||
            !phone
        ) {

            setError(
                'Введите номер телефона'
            )

            return
        }


        try {

            setLoading(true)

            setError(null)


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

        if (!chatId) {
            return
        }


        if (!isOwner) {

            setError(
                'Только владелец группы может удалять участников'
            )

            return
        }


        const userId =
            participant.user?.id

        if (!userId) {

            setError(
                'Не удалось определить ID пользователя'
            )

            return
        }


        if (
            userId === currentUserId
        ) {

            setError(
                'Нельзя удалить самого себя'
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

        if (!confirmed) {
            return
        }


        try {

            setLoading(true)

            setError(null)


            await removeParticipant(
                chatId,
                userId
            )


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
    // Leave chat
    // =========================================

    const handleLeaveChat = async () => {

        if (!chatId) {
            return
        }


        const confirmed =
            window.confirm(
                'Вы уверены, что хотите покинуть группу?'
            )

        if (!confirmed) {
            return
        }


        try {

            setLoading(true)

            setError(null)


            await leaveChat(
                chatId
            )


            if (
                wsRef.current
            ) {

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
    // Render attachment
    // =========================================

    const renderAttachment = (
        attachment: MessageAttachment
    ) => {

        const url =
            getAttachmentUrl(
                attachment.id
            )


        // Image
        if (
            attachment.mime_type.startsWith(
                'image/'
            )
        ) {

            return (

                <div
                    key={attachment.id}
                    className="message-attachment image-attachment"
                >

                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        <img
                            src={url}
                            alt={
                                attachment.file_name
                            }
                            className="chat-image"
                        />

                    </a>

                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>

                </div>
            )
        }


        // Video
        if (
            attachment.mime_type.startsWith(
                'video/'
            )
        ) {

            return (

                <div
                    key={attachment.id}
                    className="message-attachment video-attachment"
                >

                    <video
                        src={url}
                        controls
                        preload="metadata"
                        className="chat-video"
                    />

                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>

                </div>
            )
        }


        // Audio
        if (
            attachment.mime_type.startsWith(
                'audio/'
            )
        ) {

            return (

                <div
                    key={attachment.id}
                    className="message-attachment audio-attachment"
                >

                    <audio
                        src={url}
                        controls
                        preload="metadata"
                        className="chat-audio"
                    />

                    <div className="attachment-name">
                        {attachment.file_name}
                    </div>

                </div>
            )
        }


        // Other files
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
                    target="_blank"
                    rel="noopener noreferrer"
                >

                    📄 Скачать файл

                </a>

                <div className="attachment-name">
                    {attachment.file_name}
                </div>

            </div>
        )
    }


    // =========================================
    // Render selected file preview
    // =========================================

    const renderSelectedFile = () => {

        if (!selectedFile) {
            return null
        }


        return (

            <div className="selected-file-preview">

                <div className="selected-file-header">

                    <span>
                        {selectedFile.name}
                    </span>

                    <button
                        type="button"
                        onClick={
                            handleRemoveSelectedFile
                        }
                    >
                        ✕
                    </button>

                </div>


                {selectedFile.type.startsWith(
                    'image/'
                ) && selectedFilePreview && (

                    <img
                        src={selectedFilePreview}
                        alt={selectedFile.name}
                        className="selected-image-preview"
                    />
                )}


                {selectedFile.type.startsWith(
                    'video/'
                ) && selectedFilePreview && (

                    <video
                        src={selectedFilePreview}
                        controls
                        className="selected-video-preview"
                    />
                )}


                {selectedFile.type.startsWith(
                    'audio/'
                ) && selectedFilePreview && (

                    <audio
                        src={selectedFilePreview}
                        controls
                    />
                )}

            </div>
        )
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

                        {message.text && (

                            <div className="message-bubble">

                                {message.text}

                            </div>
                        )}


                        {message.attachments?.length > 0 && (

                            <div className="message-attachments">

                                {message.attachments.map(
                                    renderAttachment
                                )}

                            </div>
                        )}


                        {isMine && (

                            <div className="message-actions">

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleStartEdit(
                                            message
                                        )
                                    }
                                    disabled={
                                        message.attachments.length > 0
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
                            ref={
                                messagesEndRef
                            }
                        />

                    </div>


                    {/* ================================= */}
                    {/* Selected file preview */}
                    {/* ================================= */}

                    {renderSelectedFile()}


                    {/* ================================= */}
                    {/* Hidden inputs */}
                    {/* ================================= */}

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
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={
                            handleAudioChange
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


                    {/* ================================= */}
                    {/* Input */}
                    {/* ================================= */}

                    <div className="chat-input-row">

                        {/* Image */}

                        <button
                            type="button"
                            title="Добавить фото"
                            onClick={() =>
                                imageInputRef.current?.click()
                            }
                            disabled={sending}
                        >
                            📷
                        </button>


                        {/* Video */}

                        <button
                            type="button"
                            title="Добавить видео"
                            onClick={() =>
                                videoInputRef.current?.click()
                            }
                            disabled={sending}
                        >
                            🎥
                        </button>


                        {/* Audio file */}

                        <button
                            type="button"
                            title="Добавить аудио"
                            onClick={() =>
                                audioInputRef.current?.click()
                            }
                            disabled={sending}
                        >
                            🎵
                        </button>


                        {/* Voice recording */}

                        {!isRecording ? (

                            <button
                                type="button"
                                title="Записать голосовое сообщение"
                                onClick={
                                    startRecording
                                }
                                disabled={sending}
                            >
                                🎙️
                            </button>

                        ) : (

                            <button
                                type="button"
                                title="Остановить запись"
                                onClick={
                                    stopRecording
                                }
                            >
                                ⏹️ {recordingTime} сек
                            </button>
                        )}


                        {/* File */}

                        <button
                            type="button"
                            title="Добавить файл"
                            onClick={() =>
                                fileInputRef.current?.click()
                            }
                            disabled={sending}
                        >
                            📎
                        </button>


                        {/* Text */}

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
                            disabled={
                                !chatId ||
                                sending
                            }
                        />


                        {/* Send */}

                        <button
                            type="button"
                            onClick={
                                handleSend
                            }
                            disabled={
                                !chatId ||
                                sending ||
                                (
                                    !text.trim() &&
                                    !selectedFile
                                )
                            }
                        >

                            {sending
                                ? 'Отправка...'
                                : 'Отправить'}

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

                        {/* Participants */}

                        <div className="sidebar-section">

                            <h3>
                                Участники
                            </h3>


                            <ul className="participants-list">

                                {participants.map(
                                    (participant) => {

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


                        {/* Add participant */}

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


                        {/* Leave */}

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