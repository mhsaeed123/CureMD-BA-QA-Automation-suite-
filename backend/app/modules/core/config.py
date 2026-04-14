"""
Unified Configuration Management
Merged from Projects/Scripts/config.py and Projects/Scripts/settings.py
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional, List
import os
import socket
from pathlib import Path


def find_available_port(start_port: int = 8000, max_attempts: int = 100) -> int:
    """Find an available port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return start_port


class Settings(BaseSettings):
    """Unified application settings pulled from environment variables."""

    # Application Identity
    app_name: str = "CureMD BA Super App"
    app_version: str = "1.0.0"
    app_description: str = "Unified QA Automation and AI Super App"
    debug: bool = Field(default=True)

    # Server Configuration
    host: str = "127.0.0.1"
    port_start: int = 8000

    # CORS Configuration
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    cors_credentials: bool = True
    cors_methods: List[str] = ["*"]
    cors_headers: List[str] = ["*"]

    # Jules API Configuration
    jules_api_key: str = ""
    jules_api_url: str = "https://jules.google/api/v1"

    # GitHub Configuration
    github_token: str = ""
    github_username: str = ""

    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4"

    # Ollama Configuration
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"

    # Keycloak Configuration
    keycloak_base_url: str = ""
    keycloak_realm: str = ""
    keycloak_client_id: str = ""
    keycloak_client_secret: str = ""

    # Storage Paths
    sessions_dir: str = "./data/sessions"
    context_files_dir: str = "./data/context_files"
    output_dir: str = "./data/output"
    temp_dir: str = "./data/temp"

    # Database
    database_url: str = "sqlite:///./data/database.db"

    # Security
    secret_key: str = "change-this-in-production-use-env-var"
    access_token_expire_minutes: int = 30

    # SMTP/Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # FHIR Configuration
    fhir_base_url: str = ""
    fhir_username: str = ""
    fhir_password: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "allow"  # Allow extra fields from env

    def get_available_port(self) -> int:
        """Get an available port for the application."""
        return find_available_port(self.port_start)

    def ensure_directories(self):
        """Create necessary directories if they don't exist."""
        dirs = [
            self.sessions_dir,
            self.context_files_dir,
            self.output_dir,
            self.temp_dir,
        ]
        for d in dirs:
            Path(d).mkdir(parents=True, exist_ok=True)


# Global settings instance
try:
    settings = Settings()
    settings.ensure_directories()
except Exception:
    settings = Settings(_env_file=None)
    settings.ensure_directories()
