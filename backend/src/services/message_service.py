from uuid import UUID
import logging
from sqlalchemy.exc import IntegrityError

from src.database.db import AsyncSession
from src.database.models import User
from src.repositories.message_repository import MessageRepository
from src.api.schemas.message_schema import MessageRequest, MessageResponse, MessageUpdate
from src.exception_handlers.db_exception import DatabaseException
from src.exception_handlers.message_exception import MessageNotBelongToUserException
from .helper import Helper

logger = logging.getLogger("message")


class MessageService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.message_repo = MessageRepository(session=self.session)
        self.helper = Helper(session=self.session)

    async def send_message(self, chatId: UUID, sender: User, message: MessageRequest) -> MessageResponse:
        # implemet redis service
        await self.helper.get_chat_or_404(chatId=chatId)

        await self.helper.get_participant_or_400(
            userId=sender.id,
            chatId=chatId
        )

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

        return new_message

    async def edit_message(self, messageId: UUID, sender: User, message_update: MessageUpdate) -> MessageResponse:
        # implement redis service
        message = await self.helper.get_message_or_404(messageId=messageId)

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
            data = message_update.model_dump(exclude_unset=True)

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
        message = await self.helper.get_message_or_404(messageId=messageId)

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

    async def get_messages_in_chat(self, chatId: UUID, user: User) -> list[MessageResponse]:
        # implement redis service
        await self.helper.get_chat_or_404(chatId=chatId)

        await self.helper.get_participant_or_400(userId=user.id, chatId=chatId)

        messages = await self.message_repo.get_all_messages_by_chat_id(chatId=chatId)

        logger.info(
            "Successfull response messages",
            extra={"chat_id": str(chatId)}
        )

        return messages

    async def get_message(self, messageId: UUID, user: User) -> MessageResponse:
        # implement redis service
        message = await self.helper.get_message_or_404(messageId=messageId)

        if message.sender_id != user.id:
            logger.warning(
                "Message does not belong to the user",
                extra={
                    "message_id": str(messageId),
                    "user_id": str(user.id)
                }
            )

            raise MessageNotBelongToUserException("Message does not belong to the user")

        return message

