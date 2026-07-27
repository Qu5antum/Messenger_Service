import json

from src.redis.redis_service import RedisService
from src.api.schemas.message_schema import MessageResponse


class ChatPublisher:
    def __init__(self, redis: RedisService):
        self.redis = redis

    async def publish_message(self, message: MessageResponse) -> None:
        payload = {
            "type": "message_created",
            "chat_id": str(message.chat_id),
            "data": message.model_dump(),
        }

        await self.redis.publish(
            channel=f"chat:{message.chat_id}",
            message=json.dumps(payload, default=str),
        )

        