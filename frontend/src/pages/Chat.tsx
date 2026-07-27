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
}

export default function Chat() {
    const params = useParams()
    const [chatId, setChatId] = useState(params.chatId || '')
    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState('')
    const wsRef = useRef<WebSocket | null>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [newParticipantPhone, setNewParticipantPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const currentUserId = localStorage.getItem('user_id') || ''
    const currentUsername = localStorage.getItem('username') || ''

    useEffect(() => {
        if (!chatId) return

        const token = localStorage.getItem('access_token')
        if (!token) return

        const ws = new WebSocket(buildWsUrl(token))
        wsRef.current = ws

        ws.onopen = () => {
            console.log('ws open')
        }

        ws.onmessage = (ev) => {
            try {
                const payload = JSON.parse(ev.data)
                if (payload.type === 'message_created' && payload.chat_id === chatId) {
                    setMessages((m) => [...m, payload.data])
                }
            } catch (e) {
                console.error('ws message parse error', e)
            }
        }

        ws.onclose = () => console.log('ws closed')

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [chatId])

    const loadMessages = async () => {
        if (!chatId) return
        setError(null)
        try {
            setLoading(true)
            const data = await getMessages(chatId)
            setMessages(data)
            const parts = await getParticipants(chatId)
            setParticipants(parts)
        } catch (err: any) {
            console.error(err)
            setMessages([])
            setError(String(err?.response?.data || err))
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async () => {
        if (!chatId || !text) return
        setError(null)

        const ws = wsRef.current
        const payload = {
            type: 'send_message',
            chat_id: chatId,
            payload: { text },
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload))
        } else {
            try {
                await sendMessage(chatId, text)
                await loadMessages()
            } catch (e: any) {
                console.error(e)
                setError(String(e?.response?.data || e))
            }
        }

        setText('')
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
                    <h2>Chat</h2>
                    <p className="chat-meta">Chat ID: <strong>{chatId || 'none'}</strong></p>
                </div>
                <div className="chat-controls">
                    <input
                        placeholder="Enter chat ID"
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                    />
                    <button onClick={loadMessages} disabled={loading || !chatId}>
                        {loading ? 'Loading…' : 'Load messages'}
                    </button>
                </div>
            </div>

            <div className="chat-grid">
                <section className="chat-window">
                    <div className="message-list">
                        {messages.length === 0 ? (
                            <div className="empty-state">No messages yet. Load the chat to begin.</div>
                        ) : (
                            messages.map((message) => {
                                const isMine = message.sender_id === currentUserId
                                const senderName = isMine
                                    ? currentUsername || 'You'
                                    : message.sender_id
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
                    </div>

                    <div className="chat-input-row">
                        <input
                            placeholder="Write a message..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={!chatId}
                        />
                        <button onClick={handleSend} disabled={!chatId || !text.trim()}>
                            Send
                        </button>
                    </div>
                    {error && <p className="chat-error">{error}</p>}
                </section>

                <aside className="chat-sidebar">
                    <div className="sidebar-section">
                        <h3>Participants</h3>
                        <p className="muted">{participants.length} participant{participants.length === 1 ? '' : 's'}</p>
                        <ul className="participants-list">
                            {participants.map((participant) => {
                                const isCurrent = participant.user_id === currentUserId
                                const name = participant.username || participant.user_id
                                return (
                                    <li key={participant.id} className={isCurrent ? 'participant-current' : ''}>
                                        {name}
                                        {isCurrent && ' (you)'}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>

                    <div className="sidebar-section">
                        <h3>Add participant</h3>
                        <div className="create-row">
                            <input
                                placeholder="Phone number"
                                value={newParticipantPhone}
                                onChange={(e) => setNewParticipantPhone(e.target.value)}
                            />
                            <button onClick={handleAddParticipant} disabled={!chatId || loading}>
                                Add
                            </button>
                        </div>
                        <p className="muted">Invite a new user by phone number.</p>
                    </div>
                </aside>
            </div>
        </div>
    )
}
