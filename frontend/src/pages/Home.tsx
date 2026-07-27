import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Home() {
    const { logout, username } = useAuth()

    return (
        <header className="app-nav">
            <div className="nav-user">
                <span>Привет, <strong>{username || 'Гость'}</strong></span>
            </div>
            <nav className="nav-links">
                <Link to="/chats">Чаты</Link>
                {!username && <Link to="/login">Вход</Link>}
                {!username && <Link to="/register">Регистрация</Link>}
                {username && <button className="btn-secondary" onClick={logout}>Выйти</button>}
            </nav>
            </header>
    )
}
