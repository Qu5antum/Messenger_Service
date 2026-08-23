import './App.css'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import ChatsList from './pages/ChatsList'
import RequireAuth from './RequireAuth'
import UserProfile from './pages/UserProfile'

/* 1. Компонент двухколоночного каркаса (Sidebar + Контент чата) */
function MainLayout() {
  const { logout, username } = useAuth()

  return (
    <div className="app-container">
      {/* Левая колонка: Сайбар с профилем и списком чатов */}
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="user-profile">
            <div className="user-avatar">
              {username ? username[0].toUpperCase() : 'G'}
            </div>
            <div className="user-info">
              <span className="user-name">{username || 'Гость'}</span>
              <span className="user-status">в сети</span>
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="btn-icon" title="Выйти" onClick={logout}>
              Выйти
            </button>
          </div>
        </header>

        {/* Компонент с поиском, созданием и списком чатов */}
        <ChatsList />
      </aside>

      {/* Правая колонка: Окно выбранного чата или Заглушка */}
      <main className="main-chat-area">
        <Outlet />
      </main>
    </div>
  )
}

/* 2. Компонент-заглушка, когда чат не выбран */
function EmptyChatWelcome() {
  return (
    <div className="empty-chat-welcome">
      <div className="welcome-icon">💬</div>
      <h2>Веб-версия Мессенджера</h2>
      <p>
        Отправляйте и получайте сообщения без необходимости держать телефон включенным.
        Выберите диалог слева, чтобы начать общение.
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<UserProfile />}/>

            <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
              <Route index element={<EmptyChatWelcome />} />
              <Route path="chat/:chatId" element={<Chat />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App