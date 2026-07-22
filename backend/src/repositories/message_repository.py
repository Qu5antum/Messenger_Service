

from .base_repository import BaseRepository
from src.database.models import Message


class MessageRepository(BaseRepository):
    model = Message