from fastapi import APIRouter, Depends
from uuid import UUID

from src.database.models import User, UserRole
from src.api.dependencies.require_role_dependency import require_roles
from src.services.chat_service import ChatService
from .chat_endpoint import get_chat_service

admin_route = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)


@admin_route.delete("/chat/{chat_id}", status_code=200)
async def delete_chat_admin(
    chat_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN)),
    chatService: ChatService = Depends(get_chat_service)
):
    return await chatService.delete_chat_for_admin(chatId=chat_id, user=user)