from .base_exception import BaseAppException


class UserNotFoundException(BaseAppException):
    """Error if user is not found"""
    def __init__(self, message: str):
        super().__init__(message, status_code=404)


class UnauthorizedException(BaseAppException):
    """Called when the user is not authorized."""
    def __init__(self, message: str):
        super().__init__(message, status_code=401)


class UserAlreadyExists(BaseAppException):
    """Called if the user already exists."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class UserAlreadyParticipantInChatException(BaseAppException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class UserNotParticipantInChatException(BaseAppException):
    def __init__(self, message: str):
        super().__init__(message, status_code=400)