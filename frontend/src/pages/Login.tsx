import { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function Login() {
    const { login, dummyLogin } = useAuth()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [msg, setMsg] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setMsg(null)
        if (!username || !password) {
            setMsg('Username and password are required')
            return
        }
        try {
            setLoading(true)
            await login(username, password)
        } catch (err: any) {
            setMsg(err?.response?.data?.detail || String(err))
        } finally { setLoading(false) }
    }

    const onDummy = async (role: string) => {
        setMsg(null)
        try {
            setLoading(true)
            await dummyLogin(role)
        } catch (err: any) {
            setMsg(String(err))
        } finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <h2>Вход в аккаунт</h2>
            <form className="auth-form" onSubmit={onSubmit}>
                <input 
                placeholder="Имя пользователя" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                />
                <input 
                placeholder="Пароль" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                />
                <button type="submit" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
                </button>
            </form>

            <div className="dummy-buttons">
                <button onClick={() => onDummy('user')} disabled={loading}>
                Тест (User)
                </button>
                <button onClick={() => onDummy('admin')} disabled={loading}>
                Тест (Admin)
                </button>
            </div>

            {msg && <p className="error-msg">{msg}</p>}
            </div>
    )
}
