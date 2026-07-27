import { useEffect, useRef, useState } from 'react'
import { buildWsUrl } from '../api/client'
import { getMessages, sendMessage } from '../api/messages'
import { useParams } from 'react-router-dom'
import { getParticipants, addParticipant } from '../api/chats'

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

export default function Chat() {
    const params = useParams()
    const chatId = params.chatId || ''

    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState('')
    const [participants, setParticipants] = useState<any[]>([])
    const [newParticipantPhone, setNewParticipantPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const wsRef = useRef<WebSocket | null>(null)
    const messagesEndRef = useRef<HTMLDivElement | null>(null)

    const currentUserId = localStorage.getItem('user_id') || ''
    const currentUsername = localStorage.getItem('username') || ''

    // Автоматическая прокрутка вниз
    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }

    useEffect(() => {
        if (!chatId) return

        const loadData = async () => {
            setError(null)
            try {
                setLoading(true)
                const [msgs, parts] = await Promise.all([
                    getMessages(chatId),
                    getParticipants(chatId)
                ])
                setMessages(msgs)
                setParticipants(parts)
                // Скролл в самый низ после загрузки сообщений
                setTimeout(() => scrollToBottom(false), 50)
            } catch (err: any) {
                console.error(err)
                setMessages([])
                setError(String(err?.response?.data || err))
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [chatId])

    useEffect(() => {
        if (!chatId) return

        const token = localStorage.getItem('access_token')
        if (!token) return

        const ws = new WebSocket(buildWsUrl(token))
        wsRef.current = ws

        ws.onmessage = (ev) => {
            try {
                const payload = JSON.parse(ev.data)
                if (payload.type === 'message_created' && payload.chat_id === chatId) {
                    setMessages((prev) => [...prev, payload.data])
                    scrollToBottom()
                }
            } catch (e) {
                console.error('ws message parse error', e)
            }
        }

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [chatId])

    const handleSend = async () => {
        if (!chatId || !text.trim()) return
        setError(null)

        const textToSend = text
        setText('')

        const ws = wsRef.current
        const payload = {
            type: 'send_message',
            chat_id: chatId,
            payload: { text: textToSend },
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload))
        } else {
            try {
                await sendMessage(chatId, textToSend)
                const data = await getMessages(chatId)
                setMessages(data)
                scrollToBottom()
            } catch (e: any) {
                console.error(e)
                setError(String(e?.response?.data || e))
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleAddParticipant = async () => {
        if (!chatId || !newParticipantPhone) {
            setError('Phone required')
            return
        }
        setError(null)
        try {
            setLoading(true)
            await addParticipant(chatId, newParticipantPhone)
            const parts = await getParticipants(chatId)
            setParticipants(parts)
            setNewParticipantPhone('')
        } catch (e: any) {
            console.error(e)
            setError(String(e?.response?.data || e))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="chat-page">
            <div className="chat-header">
                <div>
                    <h2>Чат</h2>
                    <p className="chat-meta">
                        {participants.length} {participants.length === 1 ? 'участник' : 'участников'}
                    </p>
                </div>
            </div>

            <div className="chat-grid">
                <section className="chat-window">
                    <div className="message-list">
                        {loading && messages.length === 0 ? (
                            <div className="empty-state">Загрузка сообщений…</div>
                        ) : messages.length === 0 ? (
                            <div className="empty-state">Нет сообщений. Напишите первым!</div>
                        ) : (
                            messages.map((message) => {
                                const isMine = message.sender_id === currentUserId
                                const senderName = isMine
                                    ? currentUsername || 'Вы'
                                    : message.sender?.username || message.sender?.phone_number || message.sender_id
                                return (
                                    <div
                                        key={message.id}
                                        className={`message-item ${isMine ? 'mine' : ''}`}
                                    >
                                        <div className="message-author">{senderName}</div>
                                        <div className="message-bubble">{message.text}</div>
                                    </div>
                                )
                            })
                        )}
                        {/* Якорь для прокрутки в самый низ */}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-row">
                        <input
                            placeholder="Напишите сообщение..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={!chatId}
                        />
                        <button onClick={handleSend} disabled={!chatId || !text.trim()}>
                            Отправить
                        </button>
                    </div>
                    {error && <p className="chat-error">{error}</p>}
                </section>

                <aside className="chat-sidebar">
                    <div className="sidebar-section">
                        <h3>Участники</h3>
                        <ul className="participants-list">
                            {participants.map((participant) => {
                                const user = participant.user || {}
                                const isCurrent = user.id === currentUserId || participant.user_id === currentUserId
                                const name = user.username || user.phone_number || participant.user_id
                                return (
                                    <li key={participant.id} className={isCurrent ? 'participant-current' : ''}>
                                        {name}
                                        {isCurrent && ' (вы)'}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>

                    <div className="sidebar-section">
                        <h3>Добавить участника</h3>
                        <div className="create-row">
                            <input
                                placeholder="Номер телефона"
                                value={newParticipantPhone}
                                onChange={(e) => setNewParticipantPhone(e.target.value)}
                            />
                            <button onClick={handleAddParticipant} disabled={!chatId || loading}>
                                Добавить
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}