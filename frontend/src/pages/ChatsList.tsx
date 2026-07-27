import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getChats, createGroupChat, createPrivateChat } from '../api/chats'

export default function ChatsList() {
    const [chats, setChats] = useState<any[]>([])
    const [title, setTitle] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const load = async () => {
        setError(null)
        try {
            setLoading(true)
            const data = await getChats()
            setChats(data)
        } catch (e: any) {
            console.error(e)
            setError(String(e?.response?.data || e))
        } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [])

    const createGroup = async () => {
        setError(null)
        if (!title) {
            setError('Group title required')
            return
        }
        try {
            setLoading(true)
            const res = await createGroupChat({ title })
            setTitle('')
            navigate(`/chat/${res.id}`)
        } catch (e: any) { console.error(e); setError(String(e)) } finally { setLoading(false) }
    }

    const createPrivate = async () => {
        setError(null)
        if (!phone) { setError('Phone required'); return }
        try {
            setLoading(true)
            const res = await createPrivateChat(phone)
            setPhone('')
            navigate(`/chat/${res.id}`)
        } catch (e: any) { console.error(e); setError(String(e)) } finally { setLoading(false) }
    }

    return (
        <div className="chats-list">
            <h2>Чаты</h2>

            <div className="create-section">
                <div className="create-row">
                <input 
                    placeholder="Название группы" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                />
                <button onClick={createGroup} disabled={loading}>
                    {loading ? '...' : 'Создать группу'}
                </button>
                </div>

                <div className="create-row">
                <input 
                    placeholder="Телефон для личного чата" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                />
                <button onClick={createPrivate} disabled={loading}>
                    {loading ? '...' : 'Написать'}
                </button>
                </div>
            </div>

            {error && <p className="error-msg">{error}</p>}

            {loading ? (
                <p className="muted">Загрузка чатов...</p>
            ) : (
                <ul className="chat-items-list">
                {chats.map(c => {
                    const name = c.title || (c.is_group ? 'Группа' : 'Личный чат');
                    return (
                    <li key={c.id}>
                        <Link to={`/chat/${c.id}`} className="chat-card">
                        <div className="chat-avatar">
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="chat-info">
                            <span className="chat-title">{name}</span>
                            <span className="chat-subtitle">
                            {c.is_group ? 'Групповой чат' : 'Личная переписка'}
                            </span>
                        </div>
                        </Link>
                    </li>
                    );
                })}
                </ul>
            )}
            </div>
    )
}
