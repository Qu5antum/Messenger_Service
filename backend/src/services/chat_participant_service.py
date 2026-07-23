import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError

from src.database.db import AsyncSession
from src.database.models import User
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.repositories.user_repository import UserRepository
from src.exception_handlers.chat_exception import ChatNotFoundException, ChatNotBelongToUserException, ChatIsNotGroupException, OwnerCantLeaveChatException
from src.exception_handlers.user_exceptions import UserNotFoundException, UserAlreadyParticipantInChatException, UserNotParticipantInChatException
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
		user = await self.user_repo.get(id=userId)

		if not user:
			logger.warning(
				"User not found by id",
				extra={"user_id": str(userId)}
			)

			raise UserNotFoundException("User not found")

		chat_participant = await self.chat_participant_repo.get_chat_participant_by_user_id(userId=userId, chatId=chatId)

		if chat_participant:
			logger.warning(
				"User already participant of the chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)
			
			raise UserAlreadyParticipantInChatException("User already in the chat")


		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"Chat is private, not group chat",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group, you can't add participant")

		chatOfUser = await self.chat_repo.get_chat_by_owner_id(owner_id=current_user.id, chat_id=chatId)

		if not chatOfUser:
			logger.warning(
				"User not owner of this chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise ChatNotBelongToUserException("Permision denied, this group chat not belong to user")

		try:
			await self.chat_participant_repo.create(
				chat_id=chatId,
				user_id=userId
			)

			await self.session.commit()

		except IntegrityError:
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

	async def remove_paritcipant_from_chat(self, chatId: UUID, userId: UUID, current_user: User) -> dict[str, str]:
		user = await self.user_repo.get(id=userId)

		if not user:
			logger.warning(
				"User not found by id",
				extra={"user_id": str(userId)}
			)

			raise UserNotFoundException("User not found")

		chat_participant = await self.chat_participant_repo.get_chat_participant_by_user_id(userId=userId, chatId=chatId)

		if not chat_participant:
			logger.warning(
				"User not participant in this chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)
			
			raise UserNotParticipantInChatException("User not participant in this chat")

		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"Chat is private, not group chat",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group, you can't add participant")

		chatOfUser = await self.chat_repo.get_chat_by_owner_id(owner_id=current_user.id, chat_id=chatId)

		if not chatOfUser:
			logger.warning(
				"User not owner of this chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)

			raise ChatNotBelongToUserException("Permision denied, this group chat not belong to user")

		await self.chat_participant_repo.delete(id=chat_participant.id)

		logger.info(
			"User successfully removed from the chat",
			extra={
				"chat_id": str(chatId),
				"user_id": str(current_user.id)
			}
		)

		return {"detail": "User removed from the chat"}

	async def get_participants_on_group_chat(self, chatId: UUID) -> list[ChatParticipantResponse]:
		# implement redis service
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		if not chat.is_group:
			logger.warning(
				"Chat is private, can't get participants",
				extra={"chat_id": str(chatId)}
			)

			raise ChatIsNotGroupException("Chat is not group chat")

		participants = await self.chat_participant_repo.get_participants(chatId=chatId)

		logger.info(
			"Successful response of participants in chat",
			extra={"chat_id": str(chatId)}
		)

		return participants

	async def leave_chat(self, chatId: UUID, current_user: User) -> dict[str, str]: 
		chat = await self.helper.get_chat_or_404(chatId=chatId)

		chat_participant = await self.chat_participant_repo.get_chat_participant_by_user_id(userId=current_user.id, chatId=chatId)
		
		if not chat_participant:
			logger.warning(
				"User not participant in this chat",
				extra={
					"chat_id": str(chatId),
					"user_id": str(current_user.id)
				}
			)
			
			raise UserNotParticipantInChatException("User not participant in this chat")

		if chat.owner_id == current_user.id:
			chat_participants = await self.chat_participant_repo.get_participants(chatId=chatId)

			if len(chat_participants) > 1:
				logger.warning(
					"Owner can't leave chat if chat has participants",
					extra={
						"user_id": str(current_user.id),
						"chat_id": str(chatId)
					}
				)

				raise OwnerCantLeaveChatException("Owner can't leave chat, if chat has participants, make owner another user or remove every user from chat")
			else:
				await self.chat_participant_repo.delete(id=chat_participant.id)

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

		await self.chat_participant_repo.delete(id=chat_participant.id)

		logger.info(
			"Successfully removed from chat",
			extra={
				"user_id": str(current_user.id),
				"chat_id": str(chatId)
			}
		)

		return {"detail": "User successfully leaved from chat"}
