import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError

from src.database.db import AsyncSession
from src.database.models import User
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.repositories.user_repository import UserRepository
from src.exception_handlers.chat_exception import ChatIsNotGroupException, OwnerCantLeaveChatException, InvalidChatCreationException
from src.exception_handlers.user_exceptions import UserNotFoundException, UserAlreadyParticipantInChatException
from src.exception_handlers.db_exception import DatabaseException
from src.api.schemas.chat_schema import ChatParticipantResponse
from .helper import Helper

logger = logging.getLogger("chat_participant")


class ChatParticipantService:
	def __init__(self, sesison: AsyncSession):
		self.session = sesison
		self.chat_repo = ChatRepository(session=self.session)
		self.chat_participant_repo = ChatParticipantRepository(session=self.session)
		self.user_repo = UserRepository(session=self.session)
		self.helper = Helper(session=self.session)

	async def add_participant_to_group_chat(self, chatId: UUID, userId: UUID, current_user: User) -> dict[str, str]:
		chat = await self.helper.get_chat_or_404(chatId=chatId)
		
		if not chat.is_group:
			logger.warning(
				"Chat is private, not group chat",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group, you can't add participant")

		await self.helper.get_owner_or_403(ownerId=current_user.id, chatId=chatId)
		
		user = await self.user_repo.get(id=userId)

		if not user:
			logger.warning(
				"User not found by id",
				extra={"user_id": str(userId)}
			)

			raise UserNotFoundException("User not found")

		if userId == current_user.id:
			logger.warning(
				"User can't add yourself to chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise InvalidChatCreationException("User can't add yourself to chat")

		is_participant = await self.chat_participant_repo.is_participant(userId=userId, chatId=chatId)

		if is_participant:
			logger.warning(
				"User already participant of the chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)
			
			raise UserAlreadyParticipantInChatException("User already in the chat")

		try:
			await self.chat_participant_repo.create(
				chat_id=chatId,
				user_id=userId
			)

			await self.session.commit()

		except IntegrityError:
			await self.session.rollback()

			logger.error(
				"Database error, new participant not created",
				exc_info=True,
				extra={"user_id": str(userId)}
			)

			raise DatabaseException("Participant not added in chat")

		logger.info(
			"New participant added to the chat",
			extra={
				"chat_id": str(chatId),
				"user_id": str(userId)
			}
		)

		return {"detail": "New participant added to the chat"}

	async def remove_participant_from_chat(self, chatId: UUID, userId: UUID, current_user: User) -> dict[str, str]:
		chat = await self.helper.get_chat_or_404(chatId=chatId)
	
		if not chat.is_group:
			logger.warning(
				"Chat is private, not group chat",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group, you can't add participant")
		
		user = await self.user_repo.get(id=userId)

		if not user:
			logger.warning(
				"User not found by id",
				extra={"user_id": str(userId)}
			)

			raise UserNotFoundException("User not found")

		is_participant = await self.helper.get_participant_or_400(userId=userId, chatId=chatId)

		await self.helper.get_owner_or_403(ownerId=current_user.id, chatId=chatId)

		await self.chat_participant_repo.delete(id=is_participant.id)

		logger.info(
			"User successfully removed from the chat",
			extra={
				"chat_id": str(chatId),
				"user_id": str(current_user.id)
			}
		)

		return {"detail": "User removed from the chat"}

	async def get_participants_on_group_chat(self, chatId: UUID, user: User) -> list[ChatParticipantResponse]:
		# implement redis service
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"Chat is private, can't get participants",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group chat")

		await self.helper.get_participant_or_400(userId=user.id, chatId=chatId)

		participants = await self.chat_participant_repo.get_participants(chatId=chatId)

		logger.info(
			"Successful response of participants in chat",
			extra={"chat_id": str(chatId)}
		)

		return participants

	async def leave_chat(self, chatId: UUID, current_user: User) -> dict[str, str]: 
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		is_participant = await self.helper.get_participant_or_400(userId=current_user.id, chatId=chatId)

		if chat.owner_id == current_user.id:
			chat_participants = await self.chat_participant_repo.get_participants(chatId=chatId)

			if len(chat_participants) == 1:
				await self.chat_participant_repo.delete(id=is_participant.id)
				
				logger.info(
					"Owner deleted from chat",
					extra={
						"user_id": str(current_user.id),
						"chat_id": str(chatId)
					}
				)

				await self.chat_repo.delete(id=chat.id)

				logger.info(
					"Chat group is empty, chat deleted",
					extra={
						"user_id": str(current_user.id),
						"chat_id": str(chatId)
					}
				)

				return {"detail": "User successfully leaved from chat"}

			logger.warning(
				"Owner can't leave chat if chat has participants",
				extra={
					"user_id": str(current_user.id),
					"chat_id": str(chatId)
				}
			)

			raise OwnerCantLeaveChatException("Owner can't leave chat, if chat has participants, make owner another user or remove every user from chat")

		await self.chat_participant_repo.delete(id=is_participant.id)

		logger.info(
			"Successfully removed from chat",
			extra={
				"user_id": str(current_user.id),
				"chat_id": str(chatId)
			}
		)

		return {"detail": "User successfully leaved from chat"}
