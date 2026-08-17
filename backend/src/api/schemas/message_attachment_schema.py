from pydantic import BaseModel, ConfigDict
from uuid import UUID


class MessageAttachmentResponse(BaseModel):
    id: UUID
    message_id: UUID
    file_name: str
    file_key: str
    mime_type: str
    size: int
    duration: float | None = None

    model_config = ConfigDict(from_attributes=True)
