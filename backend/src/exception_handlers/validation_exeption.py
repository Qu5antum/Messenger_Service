from .base_exception import BaseAppException


class ValidationException(BaseAppException):
    """Called when input data validation fails."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)