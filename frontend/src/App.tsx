import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import ChatsList from './pages/ChatsList'
import RequireAuth from './RequireAuth'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/chats" element={<RequireAuth><ChatsList /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
            <Route path="/chat/:chatId" element={<RequireAuth><Chat /></RequireAuth>} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
