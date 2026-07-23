from uuid import UUID
import logging
from sqlalchemy.exc import IntegrityError

from src.database.db import AsyncSession
from src.database.models import User
from src.repositories.message_repository import MessageRepository
from src.api.schemas.message_schema import MessageRequest, MessageResponse
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.exception_handlers.chat_exception import ChatNotFoundException
from src.exception_handlers.user_exceptions import UserNotParticipantInChatException
from src.exception_handlers.db_exception import DatabaseException

logger = logging.getLogger("message")


class MessageService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.message_repo = MessageRepository(session=self.session)
        self.chat_repo = ChatRepository(session=self.session)
        self.chat_participant_repo = ChatParticipantRepository(session=self.session)

    async def send_message(self, chatId: UUID, sender: User, message: MessageRequest) -> MessageResponse:
        chat = await self.chat_repo.get(id=chatId)
        
        if not chat:
            logger.warning(
                "Chat not found",
                extra={"chat_id": str(chatId)}
            )

            raise ChatNotFoundException("Chat not found")

        chat_participant = await self.chat_participant_repo.get_chat_participant_by_user_id(
            userId=sender.id, 
            chatId=chatId
        )

        if not chat_participant:
            logger.warning(
                "User not participant in chat",
                extra={
                    "chat_id": str(chatId),
                    "user_id": str(sender.id)
                }
            )
        
            raise UserNotParticipantInChatException("User not participant in chat")

        try:
            new_message = await self.message_repo.create(
                text=message.text,
                sender_id=sender.id,
                chat_id=chatId
            )

            await self.session.commit()

        except IntegrityError:
            await self.session.rollback()

            logger.error(
                "Message not added, database error",
                exc_info=True,
                extra={
                    "chat_id": str(chatId),
                    "sender_id": str(sender.id)
                }
            )

            raise DatabaseException("Message not added")

        logger.info(
            "Message added to database, Message successful response",
            extra={
                "chat_id": str(chatId),
                "sender_id": str(sender.id)
            }
        )

        raise new_message




