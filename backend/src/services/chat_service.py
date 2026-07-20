import logging

from src.database.db import AsyncSession
from src.database.models import User
from src.api.schemas.chat_schema import ChatCreate
from src.repositories.chat_repository import ChatRepository
from src.repositories.user_repository import UserRepository

logger = logging.getLogger("auth")



class ChatService:
	def __init__(self, session: AsyncSession):
		self.session = session
		self.chat_repo = ChatRepository(session=self.session)

	async def create_chat(phone_number: str, chat: ChatCreate, user: User):
		pass


