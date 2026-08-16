import logging
from uuid import UUID

from src.database.db import AsyncSession
from src.api.schemas.user_schema import UserOut
from src.repositories.user_repository import UserRepository
from src.exception_handlers.user_exceptions import UserNotFoundException

logger = logging.getLogger("user")


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session=self.session)

    async def get_user_by_phone_number(self, phone_number: str) -> UserOut:
        user = await self.user_repo.get_user_by_phone_number(phone_number=phone_number)

        if not user: 
            logger.warning(
                "User not found by this number",
                extra={"phone_number": phone_number}
            )

            return UserNotFoundException("User not found")

        logger.info("Successful response of user")

        return user

    async def get_user_by_id(self, user_id: UUID) -> UserOut:
        user = await self.user_repo.get_obj(id=user_id)
        
        if not user: 
            logger.warning(
                "User not found by id",
                extra={"user_id": str(user_id)}
            )

            return UserNotFoundException("User not found")

        logger.info("Successful response of user by id")

        return user