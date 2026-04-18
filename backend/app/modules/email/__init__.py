"""
Email Module - Generation and sending utilities.
"""
from .generator import EmailGenerator
from .sender import EmailSender, SMTPServer

__all__ = ["EmailGenerator", "EmailSender", "SMTPServer"]
