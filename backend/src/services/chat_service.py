import logging
from sqlalchemy.orm import IntegrityError
from uuid import UUID

from src.database.db import AsyncSession
from src.database.models import User
from src.api.schemas.chat_schema import ChatCreate, ChatResponse, ChatUpdate
from src.repositories.chat_repository import ChatRepository
from src.repositories.user_repository import UserRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.exception_handlers.user_exceptions import UserNotFoundException, UserNotParticipantInChatException
from src.exception_handlers.chat_exception import ChatIsNotGroupException, InvalidChatCreationException
from src.exception_handlers.db_exception import DatabaseException
from .helper import Helper

logger = logging.getLogger("chat")


class ChatService:
	def __init__(self, session: AsyncSession):
		self.session = session
		self.chat_repo = ChatRepository(session=self.session)
		self.user_repo = UserRepository(session=self.session)
		self.chat_participant_repo = ChatParticipantRepository(session=self.session)
		self.helper = Helper(session=self.session)

	async def create_private_chat(self, phone_number: str, current_user: User) -> ChatResponse:
		user = await self.user_repo.get_user_id_by_phone_number(phone_number=phone_number)

		if not user:
			logger.warning(
				"User not found by phone number",
				extra={"phone_number": phone_number}
			)

			raise UserNotFoundException("User not found")

		if user.id == current_user.id:
			logger.warning(
				"User can't create private chat for yourself",
				extra={"user_id": str(current_user.id)}
			)

			raise InvalidChatCreationException("User can't create private chat for yourself")

		chat_participant = await self.chat_participant_repo.get_private_chat_of_two_user(
			userId1=user.id,
			userId2=current_user.id
		)

		if chat_participant:
			chat = await self.chat_repo.get(chat_participant.chat_id)

			logger.info("Chat already exists of this users")

			return ChatResponse.model_validate(chat)
		try:
			new_private_chat = await self.chat_repo.create()

			await self.chat_participant_repo.create(
				chat_id=new_private_chat.chat_id,
				user_id=current_user.id
			)

			await self.chat_participant_repo.create(
				chat_id=new_private_chat.chat_id,
				user_id=user.id
			)

			await self.session.commit()

		except IntegrityError:
			await self.session.rollback()

			logger.error(
				"Database Error",
				exc_info=True,
				extra={
					"to_user": user.id,
					"current_user": current_user.id
				}
			)

			raise DatabaseException("Database Error")

		logger.info(
			"New chat created, and chat participants added",
			extra={
					"to_user": user.id,
					"current_user": current_user.id
				}
			)

		return new_private_chat

	async def create_group_chat(self, chat: ChatCreate, user: User) -> ChatResponse:
		try:
			new_group_chat = await self.chat_repo.create(
				is_group=True,
				title= chat.title,
				avatar=chat.avatar,
				description=chat.description,
				owner_id=user.id
			)

			await self.chat_participant_repo.create(
				chat_id=new_group_chat.id,
				user_id=user.id
			)

			logger.info(
				"New participant added to chat",
				extra={"user_id": str(user.id)}
			)

			await self.session.commit()

		except IntegrityError:
			await self.session.rollback()

			logger.error(
				"Database error, chat not created",
				exc_info=True,
				extra={"user_id": str(user.id)}
			)

			raise DatabaseException("Database error, chat not created")

		logger.info(
			"New group chat created",
			extra={"user_id": str(user.id)}
		)

		return new_group_chat

	async def update_chat(self, chatId: UUID, chatUpdate: ChatUpdate, user: User) -> ChatResponse:
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"This chat is not group you can't edit it",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("This chat is not group you can't edit it")

		await self.helper.get_owner_or_403(ownerId=user.id, chatId=chatId)

		try:
			data = chatUpdate.model_dump(exclude_unset=True)

			update_chat = await self.chat_repo.update(
				id=chatId,
				data=data
			)

		except IntegrityError:
			await self.session.rollback()

			logger.error(
				"Database error, chat not updated",
				exc_info=True,
				extra={
					"chat_id": str(chatId),
					"user_id": str(user.id)
				}
			)

			raise DatabaseException("Chat not updated")

		logger.info(
			"Chat successfully updated",
			extra={
				"chat_id": str(chatId),
				"user_id": str(user.id)
			}
		)

		return update_chat

	async def delete_chat(self, chatId: UUID, user: User) -> dict[str, str]:
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"Chat is private you can't delete it",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is private you can't delete it ")

		await self.helper.get_owner_or_403(ownerId=user.id, chatId=chatId)

		await self.chat_repo.delete(id=chatId)

		logger.info(
			"Chat successfully deleted",
			extra={"chat_id": str(chatId)}
		)

		return {"detail": "Chat successfully deleted"}

	async def get_chat_by_id(self, chatId: UUID, user: User) -> ChatResponse: 
		# implement redis service
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		await self.helper.get_participant_or_400(userId=user.id, chatId=chatId)

		logger.info(
			"Successful response response",
			extra={"chat_id": str(chatId)}
		)

		return ChatResponse.model_validate(chat)

	async def get_user_chats(self, user: User) -> list[ChatResponse]:
		# implement redis service
		chat_participants = await self.chat_participant_repo.get_user_participant_in_chats(userId=user.id)

		chat_ids = [
			participant.chat_id
			for participant in chat_participants
		]

		chats = await self.chat_repo.get_chats_by_ids(chatIds=chat_ids)

		logger.info(
			"Successful chat responses",
			extra={"user_id": str(user.id)}
		)

		return chats
