"""
Email Sender - SMTP utilities
WARNING: This module handles sensitive credentials. Use environment variables!
Based on Healthcarecampaign.py
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from ..core.config import settings

logger = logging.getLogger(__name__)


class SMTPServer:
    """SMTP server connection manager."""

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: bool = True
    ):
        self.host = host or settings.smtp_host
        self.port = port or settings.smtp_port
        self.username = username or settings.smtp_user
        self.password = password or settings.smtp_password
        self.use_tls = use_tls
        self._connection: Optional[smtplib.SMTP] = None

    def connect(self) -> bool:
        """Establish SMTP connection."""
        try:
            self._connection = smtplib.SMTP(self.host, self.port)

            if self.use_tls:
                self._connection.starttls()

            if self.username and self.password:
                self._connection.login(self.username, self.password)

            logger.info(f"Connected to SMTP server {self.host}:{self.port}")
            return True

        except Exception as e:
            logger.error(f"SMTP connection failed: {e}")
            return False

    def disconnect(self):
        """Close SMTP connection."""
        if self._connection:
            try:
                self._connection.quit()
            except Exception:
                pass
            self._connection = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()


class EmailSender:
    """
    Sends emails via SMTP.

    SECURITY WARNING: Never hardcode passwords!
    Use environment variables or a secure vault.
    """

    def __init__(
        self,
        smtp_server: Optional[SMTPServer] = None,
        from_email: Optional[str] = None,
        from_name: str = "Xellex Team"
    ):
        self.smtp = smtp_server or SMTPServer()
        self.from_email = from_email or settings.smtp_user
        self.from_name = from_name

    def send(
        self,
        to_email: str,
        subject: str,
        body: str,
        is_html: bool = False
    ) -> bool:
        """
        Send a single email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body content
            is_html: Whether body is HTML

        Returns:
            True if sent successfully
        """
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            mime_type = "html" if is_html else "plain"
            msg.attach(MIMEText(body, mime_type))

            with self.smtp:
                self.smtp._connection.sendmail(
                    self.from_email,
                    [to_email],
                    msg.as_string()
                )

            logger.info(f"Email sent to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_bulk(
        self,
        recipients: List[str],
        subject: str,
        body: str,
        is_html: bool = False
    ) -> Dict[str, bool]:
        """
        Send email to multiple recipients.

        Returns:
            Dict mapping email to success status
        """
        results = {}

        with self.smtp:
            for to_email in recipients:
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = f"{self.from_name} <{self.from_email}>"
                    msg["To"] = to_email

                    mime_type = "html" if is_html else "plain"
                    msg.attach(MIMEText(body, mime_type))

                    self.smtp._connection.sendmail(
                        self.from_email,
                        [to_email],
                        msg.as_string()
                    )
                    results[to_email] = True
                    logger.info(f"Sent to {to_email}")

                except Exception as e:
                    logger.error(f"Failed to send to {to_email}: {e}")
                    results[to_email] = False

        return results


from typing import Dict
