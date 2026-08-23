import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from src.database.db import AsyncSession
from src.api.schemas.user_schema import UserOut, UserUpdate
from src.repositories.user_repository import UserRepository
from src.exception_handlers.user_exceptions import UserNotFoundException
from src.exception_handlers.db_exception import DatabaseException

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

    async def update_profile(self, current_user_id: UUID, user_update: UserUpdate) -> dict[str, str]:
        user = await self.user_repo.get(id=current_user_id)

        if not user: 
            logger.warning(
                "User not found by id",
                extra={"user_id": str(current_user_id)}
            )

            return UserNotFoundException("User not found")

        try:
            data = user_update.model_dump(exclude_unset=True)

            await self.user_repo.update(id=current_user_id, data=data)

            logger.info("User profile successfully updated")

            return {"detail": "User profile updated"}

        except IntegrityError as e:
            await self.session.rollback()

            logger.error(
                f"Error, profile not updated: {e}",
                extra={"user_id": str(current_user_id)}
            )

            raise DatabaseException("Database error")

        except SQLAlchemyError as e:
            await self.session.rollback()

            logger.error(
                f"Error, profile not updated: {e}",
                extra={"user_id": str(current_user_id)}
            )

            raise DatabaseException("Database error")
        