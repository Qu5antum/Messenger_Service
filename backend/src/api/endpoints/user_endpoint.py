from fastapi import APIRouter, Depends
from uuid import UUID

from src.database.db import AsyncSession, get_session
from src.services.user_service import UserService
from src.api.schemas.user_schema import UserOut
from src.database.models import User, UserRole
from src.api.dependencies.require_role_dependency import require_roles


user_route = APIRouter(
    prefix="/api",
    tags=["User"]
)

async def get_user_service(session: AsyncSession = Depends(get_session)):
    return UserService(session=session)


@user_route.get("/user", response_model=UserOut, status_code=200)
async def get_user_by_phone_number(
    phone_number: str,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_by_phone_number(phone_number=phone_number)


@user_route.get("/user/{user_id}", response_model=UserOut, status_code=200)
async def get_user_by_id(
    user_id: UUID,
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.USER)),
    userService: UserService = Depends(get_user_service)
):
    return await userService.get_user_by_id(user_id=user_id)