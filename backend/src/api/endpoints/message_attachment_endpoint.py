from fastapi import APIRouter, Depends
from uuid import UUID

from src.services.message_attachment_service import MessageAttachmentService
from src.database.db import AsyncSession, get_session
from src.database.models import User, UserRole
from src.api.dependencies.require_role_dependency import require_roles


message_attachment_route = APIRouter(
    prefix="/api",
    tags=["Attachment"]
)

async def get_message_attachment_service(session: AsyncSession = Depends(get_session)):
    return MessageAttachmentService(session=session)


@message_attachment_route.get("/chat/{chat_id}/attachment/{attachment_id}", status_code=200)
async def get_attachment(
    chat_id: UUID, 
    attachemt_id: UUID, 
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    message_attachment_service: MessageAttachmentService = Depends(get_message_attachment_service)
):
    return await message_attachment_service.get_attachments(chat_id=chat_id, attachment_id=attachemt_id, current_user_id=user.id)