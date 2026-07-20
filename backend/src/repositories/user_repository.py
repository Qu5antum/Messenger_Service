from sqlalchemy import select
from typing import Optional

from .base_repository import BaseRepository
from src.database.models import User


class UserRepository(BaseRepository):
    model = User

    async def get_user_with_username(self, username: str) -> Optional[User]:
        result = await self.session.execute(
            select(self.model).where(self.model.username == username)
        )

        return result.scalar_one_or_none()

    async def get_user_id_by_phone_number(self, phone_number: str) -> Optional[User]:
        result = await self.session.execute(
            select(self.model.id).where(self.model.phone_number == phone_number)
        )

        return result.scalar_one_or_none()

