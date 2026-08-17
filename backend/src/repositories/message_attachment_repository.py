from sqlalchemy import select
from uuid import UUID
from sqlalchemy.orm import selectinload

from .base_repository import BaseRepository
from src.database.models import MessageAttachment


class MessageAttachmentRepository(BaseRepository):
    model = MessageAttachment

    async def get_attachment(self, attachment_id: UUID) -> MessageAttachment | None:
        result = await self.session.execute(
            select(MessageAttachment)
            .options(selectinload(MessageAttachment.message))
            .where(MessageAttachment.id == attachment_id)
        )

        return result.scalar_one_or_none()