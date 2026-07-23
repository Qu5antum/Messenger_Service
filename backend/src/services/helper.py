from uuid import UUID
import logging

from src.database.db import AsyncSession
from src.exception_handlers.chat_exception import ChatNotFoundException
from src.repositories.chat_repository import ChatRepository

logger = logging.getLogger("helper")


class Helper:
	def __init__(self, session: AsyncSession):
		self.session = session
		self.chat_repo = ChatRepository(session=self.session)

	async def get_chat_or_404(self, chatId: UUID):
		chat = await self.chat_repo.get(id=chatId)

		if not chat:
			logger.warning(
				"Chat not found",
				extra={"chat_id": str(chatId)}
			)

			raise ChatNotFoundException("Chat not found")

		return chat