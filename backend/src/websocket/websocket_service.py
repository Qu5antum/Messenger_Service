from fastapi import WebSocket
from uuid import UUID

from src.database.db import AsyncSession
from src.database.models import User
from .connectoin_manager import ConnectionManager
from src.services.message_service import MessageService
from src.api.schemas.message_schema import MessageRequest


class WebsocketService:
    def __init__(self, manager: ConnectionManager, message_service: MessageService):
        self.manager = manager
        self.message_service = message_service

    async def connect(self, websocket: WebSocket, user_id: UUID):
        await self.manager.connect(
            websocket=websocket,
            user_id=user_id
        )

    async def disconnect(self, user_id: UUID):
        self.manager.disconnect(user_id)

    async def handle_event(self, websocket: WebSocket, user_id: UUID, data: dict):
        match data["type"]:
            case "send_message":
                chat_id = UUID(data["chat_id"])
                
                message = MessageRequest(
                    text=data["payload"]["text"]
                )

                await self.message_service.send_message(
                    chatId=chat_id,
                    sender_id=user_id,
                    message=message,
                )

            case "ping":
                await websocket.send_json(
                    {
                        "type": "pong"
                    }
                )

            case _:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Unknown event"
                    }
                )