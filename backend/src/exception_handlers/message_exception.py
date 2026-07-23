from .base_exception import BaseAppException


class MessageNotFoundException(BaseAppException):
	def __init__(self, message: str):
		super().__init__(message, status_code=404)


class MessageNotBelongToUserException(BaseAppException):
	def __init__(self, message: str):
		super().__init__(message, status_code=403)