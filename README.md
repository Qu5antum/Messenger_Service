# 💬 Messenger Service

Полнофункциональное приложение для обмена сообщениями в режиме реального времени с поддержкой приватных и групповых чатов.

---

## 📋 Содержание

- [Возможности](#возможности)
- [Стек технологий](#стек-технологий)
- [Требования](#требования)
- [Установка и запуск](#установка-и-запуск)
- [Конфигурация](#конфигурация)
- [Структура проекта](#структура-проекта)
- [API Документация](#api-документация)
- [Использование](#использование)
- [Архитектура](#архитектура)

---

## 🚀 Возможности

### Аутентификация и авторизация
- 🔐 JWT токены для аутентификации
- 👥 Система ролей (USER, ADMIN)
- 🔑 Refresh токены для продления сессии
- 📝 Система регистрации пользователей

### Чаты
- 💬 Приватные чаты между двумя пользователями
- 👫 Групповые чаты с неограниченным количеством участников
- ➕ Добавление/удаление участников в чат
- 👤 Управление участниками чата

### Сообщения
- 📨 Отправка сообщений в реальном времени
- ✏️ Редактирование сообщений
- 🗑️ Удаление сообщений
- 📜 История сообщений

### Real-time функциональность
- 🔔 WebSocket для мгновенной доставки сообщений
- 📡 Redis Pub/Sub для трансляции сообщений
- ⚡ Синхронизация между участниками в реальном времени

---

## 🛠️ Стек технологий

### Backend
- **FastAPI** - современный веб-фреймворк для API
- **SQLAlchemy** - ORM для работы с БД
- **PostgreSQL** - реляционная база данных
- **Redis** - для Pub/Sub и кеширования
- **Alembic** - миграции БД
- **Pydantic** - валидация данных
- **Python 3.11**

### Frontend
- **React 19** - UI фреймворк
- **TypeScript** - типизация JavaScript
- **React Router** - маршрутизация
- **Axios** - HTTP клиент
- **Vite** - сборщик проекта
- **Node.js 20**

### DevOps
- **Docker** - контейнеризация
- **Docker Compose** - оркестрация контейнеров
- **Nginx** - веб-сервер для frontend

---

## 📦 Требования

- Docker 20.10+
- Docker Compose 2.0+
- (Или для локальной разработки: Python 3.11, Node.js 20, PostgreSQL 15, Redis 7)

---

## 🚀 Установка и запуск

### С помощью Docker Compose (рекомендуется)

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd Messenger_Service
```

2. **Создайте файл `.env` в корневой папке:**
```bash
cp .env.example .env
```

Или создайте файл вручную с параметрами (см. раздел [Конфигурация](#конфигурация))

3. **Запустите приложение:**
```bash
docker-compose up --build
```

4. **Приложение будет доступно по адресам:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Swagger документация: http://localhost:8000/docs
   - ReDoc документация: http://localhost:8000/redoc

### Локальная разработка

#### Backend

1. **Перейдите в папку backend:**
```bash
cd backend
```

2. **Создайте виртуальное окружение:**
```bash
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
```

3. **Установите зависимости:**
```bash
pip install -r requirements.txt
```

4. **Примените миграции БД:**
```bash
alembic upgrade head
```

5. **Запустите сервер:**
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

1. **Перейдите в папку frontend:**
```bash
cd frontend
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Запустите dev сервер:**
```bash
npm run dev
```

4. **Сборка для production:**
```bash
npm run build
```

---

## ⚙️ Конфигурация

Создайте файл `.env` в корневой директории:

```env
# Database
DB_USER=postgres
DB_PASS=postgres
DB_NAME=chat_service
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
SECRET_KEY=your-secret-key-change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Application
APP_NAME=Chat_Service
DEBUG=True

# Frontend API URL
VITE_API_URL=http://localhost:8000
```

---

## 📁 Структура проекта

```
Messenger_Service/
├── backend/                          # FastAPI приложение
│   ├── src/
│   │   ├── api/
│   │   │   ├── endpoints/           # API эндпоинты
│   │   │   │   ├── auth_endpoint.py
│   │   │   │   ├── user_endpoint.py
│   │   │   │   ├── chat_endpoint.py
│   │   │   │   ├── message_endpoint.py
│   │   │   │   ├── chat_participant_endpoint.py
│   │   │   │   └── websocket_endpoint.py
│   │   │   ├── schemas/             # Pydantic схемы
│   │   │   └── dependencies/        # Зависимости для DI
│   │   ├── auth/                    # Аутентификация (JWT)
│   │   ├── core/                    # Конфигурация приложения
│   │   ├── database/                # БД модели и сессии
│   │   ├── services/                # Бизнес-логика
│   │   ├── repositories/            # Работа с БД
│   │   ├── exception_handlers/      # Обработчики ошибок
│   │   ├── middleware/              # Middleware
│   │   ├── publisher/               # Redis Publisher
│   │   ├── subscriber/              # Redis Subscriber
│   │   ├── redis/                   # Redis сервис
│   │   ├── websocket/               # WebSocket логика
│   │   └── main.py                  # Точка входа
│   ├── migrations/                  # Alembic миграции
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
│
├── frontend/                         # React приложение
│   ├── src/
│   │   ├── api/                     # API клиент
│   │   ├── pages/                   # React страницы
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ChatsList.tsx
│   │   │   └── Chat.tsx
│   │   ├── AuthContext.tsx          # Authentication контекст
│   │   ├── RequireAuth.tsx          # Защита маршрутов
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── App.css
│   │   └── index.css
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── eslint.config.js
│
├── docker-compose.yml
└── README.md
```

---

## 📚 API Документация

### Аутентификация

#### Регистрация пользователя
```http
POST /api/user/register
Content-Type: application/json

{
  "username": "john_doe",
  "phone_number": "+1234567890",
  "password": "securepassword",
  "role": "user"
}

Response: 201 Created
{
  "id": "uuid",
  "username": "john_doe",
  "phone_number": "+1234567890",
  "role": "user",
  "created_at": "2024-01-01T00:00:00"
}
```

#### Вход
```http
POST /api/user/login
Content-Type: application/x-www-form-urlencoded

username=john_doe&password=securepassword

Response: 200 OK
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

#### Тестовый вход (для демонстрации)
```http
POST /api/user/dummyLogin
Content-Type: application/json

{
  "role": "user"
}

Response: 200 OK
{
  "access_token": "...",
  "token_type": "bearer"
}
```

### Чаты

#### Получить все чаты пользователя
```http
GET /api/chat/all
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "title": "Group Chat",
    "is_group": true,
    "owner_id": "uuid",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### Создать приватный чат
```http
POST /api/chat/private_chat/create?phone_number=+1234567890
Authorization: Bearer <access_token>

Response: 201 Created
{
  "id": "uuid",
  "is_group": false,
  "created_at": "2024-01-01T00:00:00"
}
```

#### Создать групповой чат
```http
POST /api/chat/group_chat/create
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "My Group",
  "description": "Group description",
  "avatar": "https://...",
  "is_group": true
}

Response: 201 Created
{
  "id": "uuid",
  "title": "My Group",
  "is_group": true,
  "owner_id": "uuid",
  "created_at": "2024-01-01T00:00:00"
}
```

### Сообщения

#### Отправить сообщение
```http
POST /api/chat/{chat_id}/message/send
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "text": "Hello, World!"
}

Response: 201 Created
{
  "id": "uuid",
  "chat_id": "uuid",
  "sender_id": "uuid",
  "text": "Hello, World!",
  "created_at": "2024-01-01T00:00:00"
}
```

#### Получить сообщения из чата
```http
GET /api/chat/{chat_id}/messages
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "chat_id": "uuid",
    "sender_id": "uuid",
    "text": "Hello, World!",
    "created_at": "2024-01-01T00:00:00"
  }
]
```

### Участники чата

#### Добавить участника
```http
POST /api/chat/{chat_id}/add_participant?phone_number=+1234567890
Authorization: Bearer <access_token>

Response: 201 Created
{
  "id": "uuid",
  "chat_id": "uuid",
  "user_id": "uuid",
  "joined_at": "2024-01-01T00:00:00"
}
```

#### Получить участников чата
```http
GET /api/chat/{chat_id}/participants
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "username": "john_doe",
    "joined_at": "2024-01-01T00:00:00"
  }
]
```

#### Удалить участника
```http
DELETE /api/chat/{chat_id}/participant/{user_id}/remove_participant
Authorization: Bearer <access_token>

Response: 200 OK
```

#### Покинуть чат
```http
DELETE /api/chat/{chat_id}/leave
Authorization: Bearer <access_token>

Response: 200 OK
```

### WebSocket

#### Подключиться к чату
```javascript
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:8000/api/ws?token=${token}`);

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log(payload);
  // {
  //   "type": "message_created",
  //   "chat_id": "uuid",
  //   "data": { message object }
  // }
};
```

#### Отправить сообщение через WebSocket
```javascript
const payload = {
  "type": "send_message",
  "chat_id": "uuid",
  "payload": { "text": "Hello!" }
};
ws.send(JSON.stringify(payload));
```

---

## 💻 Использование

### Веб-интерфейс

1. **Регистрация:**
   - Перейдите на http://localhost:3000
   - Нажмите "Register"
   - Заполните форму (username, phone, password)
   - Нажмите кнопку Register

2. **Вход:**
   - Перейдите на страницу Login
   - Введите учетные данные или используйте "Dummy Login"
   - Вас перенесет на главную страницу

3. **Создание чата:**
   - Перейдите в "Your Chats"
   - Нажмите "Create Group" для группового чата
   - Или нажмите "Create Private Chat" и введите номер телефона

4. **Обмен сообщениями:**
   - Выберите чат из списка
   - Введите идентификатор чата и нажмите "Load messages"
   - Напишите сообщение и нажмите Send
   - Сообщения будут отправлены в реальном времени

---

## 🏗️ Архитектура

### Слои приложения

```
┌─────────────────────────────────────────┐
│         Frontend (React/TypeScript)      │
├─────────────────────────────────────────┤
│         HTTP/WebSocket API (FastAPI)    │
├─────────────────────────────────────────┤
│  Services (Business Logic) ──┐           │
│  Repositories (Data Access)  │           │
│  Database Models             └──────────→┤ PostgreSQL
├─────────────────────────────────────────┤
│  Redis Pub/Sub (Real-time messaging)   │
├─────────────────────────────────────────┤
│  Authentication (JWT)                   │
└─────────────────────────────────────────┘
```

### Поток данных

1. **REST API:**
   - Frontend отправляет HTTP запрос
   - FastAPI обрабатывает запрос
   - Service выполняет бизнес-логику
   - Repository работает с БД
   - Response возвращается клиенту

2. **Real-time messaging:**
   - WebSocket соединение устанавливается
   - Клиент отправляет сообщение
   - Server публикует в Redis Pub/Sub
   - Все подписанные клиенты получают сообщение
   - Frontend обновляет UI в реальном времени

---

## 🔒 Безопасность

- ✅ JWT токены для аутентификации
- ✅ Валидация входных данных (Pydantic)
- ✅ CORS настройки
- ✅ Роли и разрешения (Role-based access)
- ✅ Хеширование паролей
- ⚠️ Измените `SECRET_KEY` в production

---

## 📝 Логирование

Backend логирует:
- Аутентификацию пользователей
- Создание/удаление сообщений и чатов
- Ошибки БД
- WebSocket соединения
- Redis операции

Просмотр логов (в Docker):
```bash
docker-compose logs -f backend
```

---

## 🐛 Решение проблем

### Проблема: Контейнеры не запускаются
```bash
# Проверьте статус контейнеров
docker-compose ps

# Посмотрите логи
docker-compose logs -f
```

### Проблема: Ошибка подключения к БД
```bash
# Убедитесь, что PostgreSQL контейнер здоров
docker-compose ps db

# Проверьте переменные окружения в .env
```

### Проблема: WebSocket не работает
```bash
# Проверьте соединение и токен в браузерной консоли
# Убедитесь, что Redis работает
docker-compose ps redis
```

---

## 📞 Контакты и поддержка

Для вопросов и предложений откройте Issue в репозитории.

---

## 📄 Лицензия

MIT License - см. LICENSE файл
