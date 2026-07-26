import { useEffect, useRef, useState } from 'react'
import { buildWsUrl } from '../api/client'
import { getMessages, sendMessage } from '../api/messages'
import { useParams } from 'react-router-dom'
import { getParticipants, addParticipant } from '../api/chats'
import { getUserByPhone } from '../api/users'

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

    useEffect(() => {
        if (!chatId) return

        const token = localStorage.getItem('access_token')
        if (!token) return

        // open websocket
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
        } finally { setLoading(false) }
    }

    const handleSend = async () => {
        if (!chatId || !text) return
        setError(null)

        // prefer websocket if open
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
        if (!chatId || !newParticipantPhone) { setError('Phone required'); return }
        setError(null)
        try {
            setLoading(true)
            const user = await getUserByPhone(newParticipantPhone)
            if (user?.id) {
                await addParticipant(chatId, user.id)
                const parts = await getParticipants(chatId)
                setParticipants(parts)
                setNewParticipantPhone('')
            } else {
                setError('User not found')
            }
        } catch (e: any) { console.error(e); setError(String(e?.response?.data || e)) } finally { setLoading(false) }
    }

    return (
        <div>
            <h2>Chat</h2>

            <div>
                <input placeholder="Chat ID" value={chatId} onChange={(e) => setChatId(e.target.value)} />
                <button onClick={loadMessages} disabled={loading}>{loading ? 'Loading...' : 'Load messages'}</button>
            </div>

            <div style={{ marginTop: 12 }}>
                <div style={{ border: '1px solid #ccc', padding: 8, minHeight: 150 }}>
                    {messages.map((m) => (
                        <div key={m.id} style={{ padding: 6, borderBottom: '1px solid #eee' }}>
                            <strong>{m.sender_id === localStorage.getItem('user_id') ? localStorage.getItem('username') || m.sender_id : m.sender_id}</strong>: {m.text}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 12 }}>
                    <h4>Participants</h4>
                    <ul>
                        {participants.map(p => (
                            <li key={p.id}>{p.user_id === localStorage.getItem('user_id') ? (localStorage.getItem('username') || p.user_id) : p.user_id}</li>
                        ))}
                    </ul>
                    <div className="create-row">
                        <input placeholder="Phone to add" value={newParticipantPhone} onChange={e => setNewParticipantPhone(e.target.value)} />
                        <button onClick={handleAddParticipant} disabled={loading}>{loading ? 'Adding...' : 'Add'}</button>
                    </div>
                </div>

                <div style={{ marginTop: 8 }}>
                    <input style={{ width: '70%' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" />
                    <button onClick={handleSend}>Send</button>
                </div>
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div style={{ marginTop: 8 }}>
                <input style={{ width: '70%' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" />
                <button onClick={handleSend} disabled={!text}>{'Send'}</button>
            </div>
        </div>
    )
}
