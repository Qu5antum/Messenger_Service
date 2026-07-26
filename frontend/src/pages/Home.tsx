import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Home() {
    const { logout, username } = useAuth()

    return (
        <div>
            <h2>Home</h2>
            {username ? <p>Welcome, <strong>{username}</strong></p> : <p>Welcome, guest</p>}
            <nav>
                <Link to="/chats">Your Chats</Link> | <Link to="/register">Register</Link> | <Link to="/login">Login</Link>
            </nav>
            <div style={{ marginTop: 12 }}>
                <button onClick={logout}>Logout</button>
            </div>
        </div>
    )
}
