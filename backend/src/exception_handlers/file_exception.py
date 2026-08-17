from .base_exception import BaseAppException


class FileErrorException(BaseAppException):
    def __init__(self, message, status_code = 500):
        super().__init__(message, status_code)


class FileNotFoundException(BaseAppException):
    def __init__(self, message, status_code = 404):
        super().__init__(message, status_code)