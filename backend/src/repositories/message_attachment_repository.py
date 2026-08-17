from .base_repository import BaseRepository
from src.database.models import MessageAttachment


class MessageAttachmentRepository(BaseRepository):
    model = MessageAttachment