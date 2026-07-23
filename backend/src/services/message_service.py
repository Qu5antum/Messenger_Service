from uuid import UUID
import logging
from sqlalchemy.exc import IntegrityError

from src.database.db import AsyncSession
from src.database.models import User
from src.repositories.message_repository import MessageRepository
from src.api.schemas.message_schema import MessageRequest, MessageResponse, MessageUpdate
from src.repositories.chat_repository import ChatRepository
from src.repositories.chat_participant_repository import ChatParticipantRepository
from src.exception_handlers.user_exceptions import UserNotParticipantInChatException
from src.exception_handlers.db_exception import DatabaseException
from src.exception_handlers.message_exception import MessageNotFoundException, MessageNotBelongToUserException
from .helper import Helper

logger = logging.getLogger("message")


class MessageService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.message_repo = MessageRepository(session=self.session)
        self.chat_repo = ChatRepository(session=self.session)
        self.chat_participant_repo = ChatParticipantRepository(session=self.session)
        self.helper = Helper(session=self.session)

    async def send_message(self, chatId: UUID, sender: User, message: MessageRequest) -> MessageResponse:
        # implemet redis service
        await self.helper.get_chat_or_404(chatId=chatId)

        is_participant = await self.chat_participant_repo.is_participant(
            userId=sender.id, 
            chatId=chatId
        )

        if not is_participant:
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

    async def edit_message(self, messageId: UUID, sender: User, message: MessageUpdate) -> MessageResponse:
        # implement redis service
        message = await self.message_repo.get(id=messageId)

        if not message:
            logger.warning(
                "Message not found",
                extra={"message_id": str(messageId)}
            )

            raise MessageNotFoundException("Message not found")

        if message.sender_id != sender.id:
            logger.warning(
                "Message not belong to user",
                extra={
                    "message_id": str(messageId),
                    "user_id": str(sender.id)
                }
            )

            raise MessageNotBelongToUserException("Message not belong to user")

        try:
            data = message.model_dump(exclude_unset=True)

            updated_message = await self.message_repo.update(
                id=messageId,
                data=data
            )

        except IntegrityError:
            await self.session.rollback()

            logger.error(
                "Message not updated, Database error",
                exc_info=True,
                extra={
                    "message_id": str(messageId),
                    "user_id": str(sender.id)
                }
            )

            raise DatabaseException("Message not updated")

        logger.info(
            "Message updated",
            extra={
                "message_id": str(messageId),
                "user_id": str(sender.id)
            }
        )

        return updated_message

    async def delete_message(self, messageId: UUID, user: User) -> dict[str, str]:
        message = await self.message_repo.get(id=messageId)

        if not message:
            logger.warning(
                "Message not found",
                extra={"message_id": str(messageId)}
            )

            raise MessageNotFoundException("Message not found")

        if message.sender_id != user.id:
            logger.warning(
                "Message not belong to user",
                extra={
                    "message_id": str(messageId),
                    "user_id": str(user.id)
                }
            )

            raise MessageNotBelongToUserException("Message not belong to user")

        await self.message_repo.delete(id=messageId)

        logger.info(
            "Message successfully deleted",
            extra={
                "message_id": str(messageId),
                "user_id": str(user.id)
            }
        )

        return {"detail": "Message deleted"}
