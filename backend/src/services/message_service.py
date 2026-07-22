from uuid import UUID
import logging

from src.database.db import AsyncSession
from src.repositories.message_repository import MessageRepository

logger = logging.getLogger("message")


class MessageService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.message_repo = MessageRepository(session=self.session)
