from uuid import UUID
import logging
from fastapi.responses import FileResponse

from src.database.db import AsyncSession
from .helper import Helper
from src.core.config import settings
from src.repositories.message_attachment_repository import MessageAttachmentRepository
from src.exception_handlers.message_exception import MessageAttachmentNotFoundException
from src.exception_handlers.file_exception import FileNotFoundException

logger = logging.getLogger("attachment")


class MessageAttachmentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.helper = Helper(session=self.session)
        self.attachment_repo = MessageAttachmentRepository(session=self.session)

    async def get_attachments(self, chat_id: UUID, attachment_id: UUID, current_user_id: UUID):
        await self.helper.get_chat_or_404(chatId=chat_id)

        await self.helper.get_participant_or_400(userId=current_user_id, chatId=chat_id)

        attachment = await self.attachment_repo.get_attachment(attachment_id=attachment_id)

        if not attachment:
            logger.warning(
                "Attachment not found",
                extra={"attachment_id": str(attachment_id)}
            )

            raise MessageAttachmentNotFoundException("Message attachment not found")

        if attachment.message.chat_id != chat_id:
            logger.warning(
                "Message attachment not belong to this chat",
                extra={
                    "attachment_id": str(attachment_id),
                    "chat_id": str(chat_id)
                }
            )

            raise MessageAttachmentNotFoundException("Message attachment not found")

        file_path = attachment.file_key

        return FileResponse(
            path=file_path,
            media_type=attachment.mime_type,
            headers={
                "Content-Disposition": (
                    f'inline; filename="{attachment.file_name}"'
                )
            }
        )


