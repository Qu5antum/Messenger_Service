

from .base_repository import BaseRepository
from src.database.models import Chat


class ChatRepository(BaseRepository):
	model = Chat