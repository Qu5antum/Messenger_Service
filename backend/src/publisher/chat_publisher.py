import json
import logging

from src.redis.redis_service import RedisService
from src.api.schemas.message_schema import MessageResponse

logger = logging.getLogger("publisher")



class ChatPublisher:
    def __init__(self, redis: RedisService):
        self.redis = redis

    async def publish_message(
        self,
        message: MessageResponse
    ) -> None:

        payload = {
            "type": "message_created",
            "chat_id": str(message.chat_id),
            "data": message.model_dump(mode="json"),
        }

        channel = f"chat:{message.chat_id}"

        logger.info(
            "Publishing chat message",
            extra={
                "channel": channel,
                "message_id": str(message.id),
            }
        )

        result = await self.redis.publish(
            channel=channel,
            message=json.dumps(payload),
        )

        logger.info(
            "Message published",
            extra={
                "channel": channel,
                "subscribers": result,
            }
        )

        