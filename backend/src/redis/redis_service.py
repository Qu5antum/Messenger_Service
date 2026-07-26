import logging
import os
from typing import Optional, Any, Set
import redis.asyncio as aioredis
from redis.exceptions import RedisError
from redis.asyncio.client import PubSub

logger = logging.getLogger(__name__)

class RedisService:
    """
    A unified Asynchronous Redis Client Service class for microservices.
    Implements a single pool lifecycle to avoid port exhaustion.
    """
    _instance: Optional['RedisService'] = None
    
    def __new__(cls, *args: Any, **kwargs: Any) -> 'RedisService':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._client = None
        return cls._instance

    def __init__(self, redis_url: Optional[str] = None):
        # Initialize attributes only once
        if not hasattr(self, "redis_url"):
            self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://redis:6379/0")

    def initialize(self) -> None:
        """
        Initializes the connection pool lazily. 
        `decode_responses=True` automatically handles bytes-to-string conversions.
        """
        if self._client is None:
            self._client = aioredis.from_url(
                self.redis_url, 
                decode_responses=True,
                max_connections=10  # Configure based on service load
            )
            logger.info("Async Redis client pool initialized.")

    async def ping(self) -> bool:
        """Health check endpoint for container probes."""
        self.initialize()
        try:
            return await self._client.ping()
        except RedisError as e:
            logger.error(f"Redis connection failed: {e}")
            return False

    async def get(self, key: str) -> Optional[str]:
        """Fetch a value from Redis securely."""
        self.initialize()
        try:
            return await self._client.get(key)
        except RedisError as e:
            logger.error(f"Error fetching key {key}: {e}")
            return None

    async def set(self, key: str, value: str, expire_seconds: Optional[int] = None) -> bool:
        """Set a value with an optional TTL (Time To Live)."""
        self.initialize()
        try:
            return await self._client.set(key, value, ex=expire_seconds)
        except RedisError as e:
            logger.error(f"Error setting key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        self.initialize()
        try:
            await self._client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Error deleting key {key}: {e}")
            return False

    async def close(self) -> None:
        """Closes the pool connection gracefully during service shutdown."""
        if self._client is not None:
            await self._client.aclose()
            logger.info("Async Redis client pool closed gracefully.")
            self._client = None

    async def incr(self, key: str) -> int:
        self.initialize()
        try:
            return await self._client.incr(key)
        except RedisError as e:
            logger.error(f"Error incrementing key {key}: {e}")
            raise
    
    async def decr(self, key: str) -> int:
        self.initialize()
        try:
            return await self._client.decr(key)
        except RedisError as e:
            logger.error(f"Error decrement key {key}: {e}")
            raise

    async def exists(self, key: str) -> bool:
        self.initialize()
        try:
            return bool(await self._client.exists(key))
        except RedisError as e:
            logger.error(f"Error exists key {key}: {e}")
            raise
    
    async def incrbyfloat(self, key: str, amount: float) -> float:
        self.initialize()
        try:
            return await self._client.incrbyfloat(key, amount)
        except RedisError as e:
            logger.error(f"Error increment by float key {key}: {e}")
            raise 

    async def incrby(self, key: str, amount: int) -> int:
        self.initialize()
        try:
            return await self._client.incrby(key, amount)
        except RedisError as e:
            logger.error(f"Error increment by key {key}: {e}")
            raise

    async def publish(self, channel: str, message: str) -> int:
        self.initialize()
        try:
            return await self._client.publish(channel, message)
        except RedisError as e:
            logger.error(f"Error publish: {e}")
            raise

    async def pubsub(self) -> PubSub:
        self.initialize()
        try:
            return self._client.pubsub()
        except RedisError as e:
            logger.error(f"Error pubsub: {e}")
            raise

    async def sadd(self, key: str, user_id: str, ttl_seconds: int = 3600) -> None:
        """Add a user to the room using SADD."""
        self.initialize()
        try:
            await self._client.sadd(key, user_id)
            await self._client.expire(key, ttl_seconds)
        except RedisError as e:
            logger.error(
                f"Error user join: {e}",
                extra={"user_id": str(user_id)}
            )
            raise

    async def srem(self, key: str, user_id: str) -> None:
        """Remove a user from the room using SREM."""
        self.initialize()
        try:
            await self._client.srem(key, user_id)
        except RedisError as e:
            logger.error(
                f"Error user leave: {e}",
                extra={"user_id": str(user_id)}
            )
            raise

    async def smembers(self, key: str) -> Set[str]:
        """Get all members in the room using SMEMBERS."""
        self.initialize()
        try:
            return await self._client.smembers(key)
        except RedisError as e:
            logger.error(f"Error get active users: {e}")
            raise