import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getChats, createGroupChat, createPrivateChat } from '../api/chats'

export default function ChatsList() {
  const [chats, setChats] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const navigate = useNavigate()
  const { chatId } = useParams() 

  const load = async () => {
    setError(null)
    try {
      setLoading(true)
      const data = await getChats()
      setChats(data)
    } catch (e: any) {
      console.error(e)
      setError(String(e?.response?.data || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const createGroup = async () => {
    setError(null)
    if (!title) {
      setError('Введите название группы')
      return
    }
    try {
      setLoading(true)
      const res = await createGroupChat({ title })
      setTitle('')
      navigate(`/chat/${res.id}`)
    } catch (e: any) {
      console.error(e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const createPrivate = async () => {
    setError(null)
    if (!phone) {
      setError('Введите номер телефона')
      return
    }
    try {
      setLoading(true)
      const res = await createPrivateChat(phone)
      setPhone('')
      navigate(`/chat/${res.id}`)
    } catch (e: any) {
      console.error(e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  // Фильтрация чатов по поиску
  const filteredChats = chats.filter((c) => {
    const name = c.title || (c.is_group ? 'Группа' : 'Личный чат')
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Поиск */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Быстрое создание группы или личного чата */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="search-input-wrapper" style={{ gap: '6px' }}>
          <input
            type="text"
            placeholder="Название группы"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ paddingLeft: '10px' }}
          />
          <button className="btn-primary" onClick={createGroup} disabled={loading} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            + Группа
          </button>
        </div>

        <div className="search-input-wrapper" style={{ gap: '6px' }}>
          <input
            type="text"
            placeholder="Телефон пользователя"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ paddingLeft: '10px' }}
          />
          <button className="btn-primary" onClick={createPrivate} disabled={loading} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            + Чат
          </button>
        </div>

        {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</div>}
      </div>

      {/* Список чатов */}
      <div className="chats-list">
        {loading && chats.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
            Загрузка чатов...
          </div>
        ) : filteredChats.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.88rem' }}>
            Чаты не найдены
          </div>
        ) : (
          filteredChats.map((c) => {
            const name = c.title || (c.is_group ? 'Группа' : 'Личный чат')
            const isActive = String(c.id) === String(chatId)

            return (
              <Link
                to={`/chat/${c.id}`}
                key={c.id}
                className={`chat-item ${isActive ? 'active' : ''}`}
              >
                <div className="chat-avatar">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="chat-details">
                  <div className="chat-top-row">
                    <span className="chat-title">{name}</span>
                    <span className="chat-time">{c.last_message_time || ''}</span>
                  </div>
                  <div className="chat-last-message">
                    {c.last_message || (c.is_group ? 'Групповой чат' : 'Личная переписка')}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}