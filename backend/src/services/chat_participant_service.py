import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError

from src.database.db import AsyncSession
from src.database.models import User
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.repositories.user_repository import UserRepository
from src.exception_handlers.chat_exception import ChatNotFoundException, ChatNotBelongToUserException, ChatIsNotGroupException
from src.exception_handlers.user_exceptions import UserNotFoundException, UserAlreadyParticipantInChatException
from src.exception_handlers.db_exception import DatabaseException

logger = logging.getLogger("chat_participant")


class ChatParticipantService:
	def __init__(self, sesison: AsyncSession):
		self.session = sesison
		self.chat_repo = ChatRepository(session=self.session)
		self.chat_participant_repo = ChatParticipantRepository(session=self.session)
		self.user_repo = UserRepository(session=self.session)

	async def add_participant_to_group_chat(self, chatId: UUID, userId: UUID, current_user: User) -> dict[str, str]:
		user = await self.user_repo.get(id=userId)

		if not user:
			logger.warning(
				"User not found by id",
				extra={"user_id": str(userId)}
			)

			raise UserNotFoundException("User not found")

		userIsParticipant = await self.chat_participant_repo.get_chat_participant_by_user_id(userId=userId)

		if userIsParticipant:
			logger.warning(
				"User already participant of the chat",
				extra={"user_id": str(userId)}
			)
			
			raise UserAlreadyParticipantInChatException("User already in the chat")


		chat = await self.chat_repo.get(id=chatId)

		if not chat:
			logger.warning(
				"Chat not found",
				extra={"chat_id": str(chatId)}
			)

			raise ChatNotFoundException("Chat not found")

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
			new_chat_participant = await self.chat_participant_repo.create(
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





