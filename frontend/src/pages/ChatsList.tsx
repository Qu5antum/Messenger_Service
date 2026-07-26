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
            <h2>Your Chats</h2>
            <div className="create-row">
                <input placeholder="Group title" value={title} onChange={e => setTitle(e.target.value)} />
                <button onClick={createGroup} disabled={loading}>{loading ? 'Creating...' : 'Create Group'}</button>
            </div>

            <div className="create-row">
                <input placeholder="Phone for private chat" value={phone} onChange={e => setPhone(e.target.value)} />
                <button onClick={createPrivate} disabled={loading}>{loading ? 'Creating...' : 'Create Private'}</button>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {loading ? <p>Loading...</p> : (
                <ul>
                    {chats.map(c => (
                        <li key={c.id}>
                            <Link to={`/chat/${c.id}`}>{c.title || (c.is_group ? 'Group' : 'Private')}{c.is_group ? ` (${c.title})` : ''}</Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
