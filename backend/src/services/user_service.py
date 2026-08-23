import logging
from uuid import UUID
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import UploadFile

from src.database.db import AsyncSession
from src.api.schemas.user_schema import UserOut, UserUpdate
from src.repositories.user_repository import UserRepository
from src.exception_handlers.user_exceptions import UserNotFoundException
from src.exception_handlers.db_exception import DatabaseException
from src.services.file_service import FileService

logger = logging.getLogger("user")


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session=self.session)
        self.file_service = FileService()

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

    async def update_profile(self, current_user_id: UUID, user_update: UserUpdate, avatar_file: UploadFile | None = None) -> dict[str, str]:
        file_key = None

        try:
            data = user_update.model_dump(
                exclude_unset=True,
                exclude_none=True,
            )

            if avatar_file:
                file_key = (
                    await self.file_service.save_avatar_file(
                        user_id=current_user_id,
                        file=avatar_file
                    )
                )

            await self.user_repo.update_user_profile(current_user_id=current_user_id, data=data, file_key=file_key)

            logger.info("User profile successfully updated")

            return {"detail": "User profile updated"}

        except IntegrityError as e:
            await self.session.rollback()

            logger.error(
                f"Error, profile not updated: {e}",
                extra={"user_id": str(current_user_id)}
            )

            if file_key:
                await self.file_service.delete_file(file_key=file_key)

            raise DatabaseException("Database error")

        except SQLAlchemyError as e:
            await self.session.rollback()

            logger.error(
                f"Error, profile not updated: {e}",
                extra={"user_id": str(current_user_id)}
            )

            if file_key:
                await self.file_service.delete_file(file_key=file_key)

            raise DatabaseException("Database error")    