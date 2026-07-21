from .base_exception import BaseAppException


class ChatNotFoundException(BaseAppException):
	def __init__(self, message, status_code = 404):
	    super().__init__(message, status_code)


class ChatNotBelongToUserException(BaseAppException):
	def __init__(self, message, status_code = 400):
	    super().__init__(message, status_code)