# 💬 Messenger Service

A full-featured real-time messaging application with support for private and group chats.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Usage](#usage)
- [Architecture](#architecture)

---

## 🚀 Features

### Authentication & Authorization
- 🔐 JWT token-based authentication
- 👥 Role-based access control (USER, ADMIN)
- 🔑 Refresh tokens for session persistence
- 📝 User registration system

### Chats
- 💬 Private one-on-one messaging
- 👫 Group chats with unlimited participants
- ➕ Add/remove participants from chats
- 👤 Chat participant management

### Messages
- 📨 Real-time message delivery
- ✏️ Edit messages
- 🗑️ Delete messages
- 📜 Message history

### Real-time Features
- 🔔 WebSocket for instant message delivery
- 📡 Redis Pub/Sub for message broadcasting
- ⚡ Synchronization between participants

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database interactions
- **PostgreSQL** - Relational database
- **Redis** - Pub/Sub and caching
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- **Python 3.11**

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Vite** - Build tool
- **Node.js 20**

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Container orchestration
- **Nginx** - Web server for frontend

---

## 📦 Requirements

- Docker 20.10+
- Docker Compose 2.0+
- (Or for local development: Python 3.11, Node.js 20, PostgreSQL 15, Redis 7)

---

## 🚀 Installation & Setup

### Using Docker Compose (Recommended)

1. **Clone the repository:**
```bash
git clone <repository-url>
cd Messenger_Service
```

2. **Create `.env` file in the root directory:**
```bash
cp .env.example .env
```

Or create it manually with parameters (see [Configuration](#configuration) section)

3. **Start the application:**
```bash
docker-compose up --build
```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Swagger Documentation: http://localhost:8000/docs
   - ReDoc Documentation: http://localhost:8000/redoc

### Local Development

#### Backend

1. **Navigate to backend folder:**
```bash
cd backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Run database migrations:**
```bash
alembic upgrade head
```

5. **Start the server:**
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

1. **Navigate to frontend folder:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm run dev
```

4. **Build for production:**
```bash
npm run build
```

---

## ⚙️ Configuration

Create `.env` file in the root directory:

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

## 📁 Project Structure

```
Messenger_Service/
├── backend/                          # FastAPI application
│   ├── src/
│   │   ├── api/
│   │   │   ├── endpoints/           # API endpoints
│   │   │   │   ├── auth_endpoint.py
│   │   │   │   ├── user_endpoint.py
│   │   │   │   ├── chat_endpoint.py
│   │   │   │   ├── message_endpoint.py
│   │   │   │   ├── chat_participant_endpoint.py
│   │   │   │   └── websocket_endpoint.py
│   │   │   ├── schemas/             # Pydantic schemas
│   │   │   └── dependencies/        # Dependency injection
│   │   ├── auth/                    # Authentication (JWT)
│   │   ├── core/                    # Application configuration
│   │   ├── database/                # Database models & sessions
│   │   ├── services/                # Business logic
│   │   ├── repositories/            # Data access layer
│   │   ├── exception_handlers/      # Error handlers
│   │   ├── middleware/              # Middleware
│   │   ├── publisher/               # Redis Publisher
│   │   ├── subscriber/              # Redis Subscriber
│   │   ├── redis/                   # Redis service
│   │   ├── websocket/               # WebSocket logic
│   │   └── main.py                  # Entry point
│   ├── migrations/                  # Alembic migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic.ini
│
├── frontend/                         # React application
│   ├── src/
│   │   ├── api/                     # API client
│   │   ├── pages/                   # React pages
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ChatsList.tsx
│   │   │   └── Chat.tsx
│   │   ├── AuthContext.tsx          # Authentication context
│   │   ├── RequireAuth.tsx          # Route protection
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

## 📚 API Documentation

### Authentication

#### User Registration
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

#### Login
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

#### Dummy Login (Demo)
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

### Chats

#### Get All User Chats
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

#### Create Private Chat
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

#### Create Group Chat
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

### Messages

#### Send Message
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

#### Get Messages from Chat
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

### Chat Participants

#### Add Participant
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

#### Get Chat Participants
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

#### Remove Participant
```http
DELETE /api/chat/{chat_id}/participant/{user_id}/remove_participant
Authorization: Bearer <access_token>

Response: 200 OK
```

#### Leave Chat
```http
DELETE /api/chat/{chat_id}/leave
Authorization: Bearer <access_token>

Response: 200 OK
```

### WebSocket

#### Connect to Chat
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

#### Send Message via WebSocket
```javascript
const payload = {
  "type": "send_message",
  "chat_id": "uuid",
  "payload": { "text": "Hello!" }
};
ws.send(JSON.stringify(payload));
```

---

## 💻 Usage

### Web Interface

1. **Register:**
   - Navigate to http://localhost:3000
   - Click "Register"
   - Fill in the form (username, phone, password)
   - Click Register button

2. **Login:**
   - Go to Login page
   - Enter your credentials or use "Dummy Login"
   - You'll be redirected to the home page

3. **Create Chat:**
   - Go to "Your Chats"
   - Click "Create Group" for a group chat
   - Or click "Create Private Chat" and enter a phone number

4. **Exchange Messages:**
   - Select a chat from the list
   - Enter chat ID and click "Load messages"
   - Write a message and click Send
   - Messages will be delivered in real-time

---

## 🏗️ Architecture

### Application Layers

```
┌─────────────────────────────────────────┐
│      Frontend (React/TypeScript)         │
├─────────────────────────────────────────┤
│     HTTP/WebSocket API (FastAPI)        │
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

### Data Flow

1. **REST API:**
   - Frontend sends HTTP request
   - FastAPI processes the request
   - Service executes business logic
   - Repository queries the database
   - Response is returned to client

2. **Real-time Messaging:**
   - WebSocket connection is established
   - Client sends a message
   - Server publishes to Redis Pub/Sub
   - All subscribed clients receive the message
   - Frontend updates UI in real-time

---

## 🔒 Security

- ✅ JWT token-based authentication
- ✅ Input validation (Pydantic)
- ✅ CORS configuration
- ✅ Role-based access control
- ✅ Password hashing
- ⚠️ Change `SECRET_KEY` in production

---

## 📝 Logging

Backend logs:
- User authentication
- Message and chat creation/deletion
- Database errors
- WebSocket connections
- Redis operations

View logs (in Docker):
```bash
docker-compose logs -f backend
```

---

## 🐛 Troubleshooting

### Problem: Containers won't start
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

### Problem: Database connection error
```bash
# Ensure PostgreSQL container is healthy
docker-compose ps db

# Check environment variables in .env
```

### Problem: WebSocket not working
```bash
# Check connection and token in browser console
# Ensure Redis is running
docker-compose ps redis
```

---

## 📞 Support

For questions and suggestions, please open an Issue in the repository.

---

## 📄 License

MIT License - see LICENSE file
