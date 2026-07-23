from uuid import UUID
from sqlalchemy import select

from .base_repository import BaseRepository
from src.database.models import Message


class MessageRepository(BaseRepository):
    model = Message

    async def get_all_messages_by_chat_id(self, chatId: UUID):
        result = await self.session.execute(
            select(self.model)
            .where(self.model.chat_id == chatId)
        )

        return result.scalars().all()

    async def search_message(self, message_text: str):
        result = await self.session.execute(
            select(self.model)
            .where(self.model.text.ilike(f"%{message_text}%"))
        )

        return result.scalars().all()