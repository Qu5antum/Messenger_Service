import logging

from src.database.db import AsyncSession
from src.api.schemas.user_schema import UserOut
from src.repositories.user_repository import UserRepository

logger = logging.getLogger("user")


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session=self.session)

    async def get_user_by_phone_number(self, phone_number: str) -> UserOut:
        user = await self.user_repo.get_user_by_phone_number(phone_number=phone_number)

        logger.info("Successful response of user")

        return user