import shutil
from pathlib import Path
from uuid import UUID
from fastapi import UploadFile
import logging

from src.core.config import settings
from src.database.models import MessageType
from src.exception_handlers.file_exception import FileErrorException

logger = logging.getLogger("file")


class FileService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR

    async def save_message_file(self, chat_id: UUID, attachment_id: UUID, file: UploadFile, message_type: MessageType):
        directory = (
            self.upload_dir / f"{message_type}s" / str(chat_id)
        )

        directory.mkdir(
            parents=True,
            exist_ok=True
        )

        extension = Path(file.filename or "").suffix.lower()

        filename = (
            f"{attachment_id}{extension}"
        )

        file_path = directory / filename

        size = 0

        try:

            with file_path.open("wb") as buffer:
                while chunk := await file.read(1024 * 1024):
                    size += len(chunk)

                    buffer.write(chunk)

        except FileErrorException as e:
            logger.warning(f"File error exception: {e}")

            raise FileErrorException("File error exception")
        finally:
            
            logger.warning("File closed")

            await file.close()

        return str(file_path), size

    async def delete_file(self, file_key: str) -> None:
        path = Path(file_key)

        if path.exists():
            path.unlink()
