from fastapi import APIRouter, Depends
from uuid import UUID

from src.database.db import AsyncSession, get_session
from src.database.models import User, UserRole
from src.services.chat_service import ChatService
from src.api.schemas.chat_schema import ChatResponse, ChatCreate, ChatUpdate
from src.api.dependencies.require_role_dependency import require_roles


chat_route = APIRouter(
	prefix="/api",
	tags=["Chat"]
)

async def get_chat_service(session: AsyncSession = Depends(get_session)):
	return ChatService(session=session)


@chat_route.post("/chat/private_chat/create", response_model=ChatResponse, status_code=201)
async def create_private_chat(
	phone_number: str,
	user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
	chatService: ChatService = Depends(get_chat_service)
):
	return await chatService.create_private_chat(phone_number=phone_number, current_user=user)


@chat_route.post("/chat/group_chat/create", response_model=ChatResponse, status_code=201)
async def create_group_chat(
	chatCreate: ChatCreate,
	user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
	chatService: ChatService = Depends(get_chat_service)
):
	return await chatService.create_group_chat(chat=chatCreate, user=user)


@chat_route.put("/chat/{chat_id}/chat_update", response_model=ChatResponse, status_code=200)
async def update_chat(
	chat_id: UUID,
	chatUpdate: ChatUpdate,
	user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
	chatService: ChatService = Depends(get_chat_service)
):
	return await chatService.update_chat(chatId=chat_id, chatUpdate=chatUpdate, user=user)


@chat_route.delete("/chat/{chat_id}/delete", status_code=200)
async def delete_chat(
	chat_id: UUID,
	user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
	chatService: ChatService = Depends(get_chat_service)
):
	return await chatService.delete_chat(chatId=chat_id, user=user)


@chat_route.get("/chat/{chat_id}", response_model=ChatResponse, status_code=200)
async def get_chat(
	chat_id: UUID,
	user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
	chatService: ChatService = Depends(get_chat_service)
):
	return await chatService.get_chat_by_id(chatId=chat_id, user=user)


@chat_route.get("/chat/all", response_model=list[ChatResponse], status_code=200)
async def get_chats(
	user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
	chatService: ChatService = Depends(get_chat_service)
):
	return await chatService.get_user_chats(user=user)