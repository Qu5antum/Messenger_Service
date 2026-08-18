from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional

from .base_repository import BaseRepository
from src.database.models import Message


class MessageRepository(BaseRepository):
    model = Message

    async def get_all_messages_by_chat_id(self, chatId: UUID):
        result = await self.session.execute(
            select(self.model)
            .options(selectinload(self.model.sender))
            .options(selectinload(self.model.attachments))
            .where(self.model.chat_id == chatId)
        )

        return result.scalars().all()

    async def search_message(self, message_text: str, chatId: UUID):
        result = await self.session.execute(
            select(self.model)
            .where(
                self.model.chat_id == chatId,
                self.model.text.ilike(f"%{message_text}%")
            )
        )

        return result.scalars().all()

    async def get_message_with_sender(self, messageId: UUID) -> Optional[Message]:
        result = await self.session.execute(
            select(self.model)
            .options(selectinload(self.model.sender))
            .options(selectinload(self.model.attachments))
            .where(self.model.id == messageId)
        )

        return result.scalar_one_or_none()