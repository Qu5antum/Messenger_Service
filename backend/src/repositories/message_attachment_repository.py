from sqlalchemy import select
from uuid import UUID
from typing import Optional
from sqlalchemy.orm import selectinload

from .base_repository import BaseRepository
from src.database.models import MessageAttachment


class MessageAttachmentRepository(BaseRepository):
    model = MessageAttachment

    async def get_attachment(self, attachment_id: UUID) -> Optional[MessageAttachment]:
        result = await self.session.execute(
            select(self.model)
            .options(selectinload(self.model.message))
            .where(self.model.id == attachment_id)
        )

        return result.scalar_one_or_none()

    async def get_attachments_by_message_id(self, message_id: UUID) -> Optional[MessageAttachment]:
        result = await self.session.execute(
            select(self.model)
            .where(self.model.message_id==message_id)
        )

        return result.scalars().all()