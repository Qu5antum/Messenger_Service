import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Register() {
    const { register } = useAuth()
    const [form, setForm] = useState({ username: '', phone_number: '', password: '', confirm_password: '', role: 'user' })
    const [msg, setMsg] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setMsg(null)
        if (!form.username || !form.phone_number || !form.password) {
            setMsg('All fields required')
            return
        }
        if (form.password !== form.confirm_password) {
            setMsg('Passwords do not match')
            return
        }
        try {
            setLoading(true)
            await register({ ...form })
            localStorage.setItem('username', form.username)
            setMsg('Registered successfully. Redirecting to login...')
            navigate('/login')
        } catch (err: any) {
            setMsg(err?.response?.data?.detail || String(err))
        } finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <h2>Register</h2>
            <form onSubmit={onSubmit}>
                <input name="username" placeholder="Username" value={form.username} onChange={onChange} />
                <input name="phone_number" placeholder="Phone number" value={form.phone_number} onChange={onChange} />
                <input name="password" type="password" placeholder="Password" value={form.password} onChange={onChange} />
                <input name="confirm_password" type="password" placeholder="Confirm password" value={form.confirm_password} onChange={onChange} />
                <select name="role" value={form.role} onChange={onChange}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
            </form>
            {msg && <p>{msg}</p>}
        </div>
    )
}
