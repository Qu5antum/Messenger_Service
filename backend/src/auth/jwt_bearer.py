from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import logging

from .jwt_handler import JWTHandler
from src.api.schemas.token_schema import TokenPayload
from src.exception_handlers.user_exceptions import UnauthorizedException
from src.exception_handlers.validation_exeption import ValidationException
from src.core.config import settings

logger = logging.getLogger("current_user")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/user/login")

class CurrentUser:
    def __init__(self, jwt_handler: JWTHandler):
        self.jwt_handler = jwt_handler

    def __call__(self, token: str = Depends(oauth2_scheme)) -> TokenPayload:
        try:
            payload = self.jwt_handler.decode_token(token)
            token_data = TokenPayload(**payload)

            if not token_data.sub:
                logger.warning("Invalid token missing subject")

                raise UnauthorizedException("Invalid token: missing subject.")
            
            if not token_data.role:
                logger.warning("Invalid token missing role")

                raise UnauthorizedException("Invalid token: missing role.")

            return token_data

        except JWTError as e:
            logger.error(f"Invalid or expired token: {e}")

            raise UnauthorizedException("Invalid or expired token.")

        except ValidationException as e:
            logger.error(f"Invalid token structure: {e}")

            raise UnauthorizedException("Invalid token structure.")

    async def get_current_user_ws(self, token: str):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],)

            user_id = payload.get("sub") or payload.get("id")

        except JWTError as e:
            logger.error(f"The token has expired: {e}")

            raise UnauthorizedException("Invalid or expired token.")

        except ValidationException as e:
            logger.error(f"Invalid token: {e}")

            raise UnauthorizedException("Invalid token structure.")

        logger.info(
            "authenticated user id",
            extra={"user_id": str(user_id)}
        )

        return user_id

        

