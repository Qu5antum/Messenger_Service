from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

from src.websocket.connectoin_manager import ConnectionManager
from src.auth.jwt_bearer import CurrentUser
from src.auth.jwt_handler import JWTHandler
from src.exception_handlers.user_exceptions import UnauthorizedException

logger = logging.getLogger("websocket")

jwt_handler = JWTHandler()
manager = ConnectionManager()
current_user = CurrentUser(jwt_handler=jwt_handler)

websocket_route = APIRouter(
    prefix="/api",
    tags=["Websocket"]
)

@websocket_route.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str,):
    user_id = await current_user.get_current_user_ws(token=token)

    await manager.connect(websocket=websocket, user_id=user_id)

    try:
        while True:
            data = await websocket.receive_json()

            event_type = data["type"]

            # add hande events
            if event_type == "send_message":
                pass

    except WebSocketDisconnect as e:
        logger.error(f"User disconnected: {e}")

        manager.disconnect(user_id=user_id)

    except UnauthorizedException as e:
        logger.error(f"User unauthorized: {e}")

        await websocket.close(code=1008)

        return UnauthorizedException("Invalid user")
        
            
