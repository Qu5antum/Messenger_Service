from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import logging

from src.database.db import AsyncSession, get_session
from src.websocket.connectoin_manager import ConnectionManager
from src.auth.jwt_bearer import CurrentUser
from src.auth.jwt_handler import JWTHandler
from src.exception_handlers.user_exceptions import UnauthorizedException
from src.websocket.websocket_service import WebsocketService
from src.services.message_service import MessageService

logger = logging.getLogger("websocket")

jwt_handler = JWTHandler()
manager = ConnectionManager()
current_user = CurrentUser(jwt_handler=jwt_handler)

websocket_route = APIRouter(
    prefix="/api",
    tags=["Websocket"]
)

async def get_message_service(session: AsyncSession = Depends(get_session)):
    return MessageService(session=session)

async def get_websocket_service(message_service: MessageService = Depends(get_message_service)):
    return WebsocketService(manager=manager, message_service=message_service)

@websocket_route.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str, websocket_service: WebsocketService = Depends(get_websocket_service)):
    user_id = await current_user.get_current_user_ws(token=token)

    await manager.connect(websocket=websocket, user_id=user_id)

    try:
        while True:
            data = await websocket.receive_json()

            await websocket_service.handle_event(
                websocket=websocket,
                user_id=user_id,
                data=data
            )

    except WebSocketDisconnect as e:
        logger.error(f"User disconnected: {e}")

        manager.disconnect(user_id=user_id)

    except UnauthorizedException as e:
        logger.error(f"User unauthorized: {e}")

        await websocket.close(code=1008)

        return UnauthorizedException("Invalid user")
        
            
