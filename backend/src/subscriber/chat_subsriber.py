import asyncio
import json
import logging
from uuid import UUID

from redis.asyncio.client import PubSub

from src.redis.redis_service import RedisService
from src.websocket.connectoin_manager import ConnectionManager
from src.repositories.chat_participant_repository import ChatParticipantRepository

logger = logging.getLogger("subscriber")


class ChatSubscriber:

    def __init__(
        self,
        redis: RedisService,
        manager: ConnectionManager,
        participant_repo: ChatParticipantRepository,
    ):
        self.redis = redis
        self.manager = manager
        self.participant_repo = participant_repo
        self.pubsub: PubSub | None = None
        self.running = False

    async def start(self) -> None:
        """
        Start listening Redis Pub/Sub.
        """
        self.pubsub = await self.redis.pubsub()

        await self.pubsub.psubscribe("chat:*")

        self.running = True

        logger.info("ChatSubscriber started")

        await self.listen()

    async def stop(self) -> None:
        """
        Stop subscriber.
        """
        self.running = False

        if self.pubsub:
            await self.pubsub.close()

        logger.info("ChatSubscriber stopped")

    async def listen(self) -> None:
        """
        Infinite listening loop.
        """
        while self.running:
            try:
                message = await self.pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )

                if message is None:
                    await asyncio.sleep(0.05)
                    continue

                await self.handle_message(message)

            except Exception:
                logger.exception("Error while listening redis")

                await asyncio.sleep(1)

    async def handle_message(self, redis_message: dict) -> None:
        """
        Handle redis event.
        """
        try:
            payload = json.loads(redis_message["data"])

            event_type = payload["type"]

            if event_type == "message_created":
                await self.handle_new_message(payload)

            elif event_type == "message_updated":
                pass
            elif event_type == "message_deleted":
                pass

            elif event_type == "typing":
                pass

            else:
                logger.warning(
                    "Unknown event type",
                    extra={"type": event_type},
                )

        except Exception:
            logger.exception("Unable to process redis message")

    async def handle_new_message(self, payload: dict) -> None:
        """
        Broadcast new message to every participant.
        """
        chat_id = UUID(payload["chat_id"])

        participants = await self.participant_repo.get_participants(chat_id)

        for participant in participants:
            await self.manager.send_to_user(
                participant.user_id,
                payload,
            )