"""
CureMD BA QA Automation Suite - Super App
Central Configuration Module
=========================================
Unified config for all 40+ AI agent frameworks merged into one monolith app.

Author: Muhammad Haris Saeed
Purpose: Healthcare IT BA/QA Automation + General AI Super App
"""

import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field, asdict
from enum import Enum
import yaml


# ============================================================================
# APP METADATA
# ============================================================================

APP_NAME = "CureMD BA QA Super App"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = """
AI Super App for Healthcare IT BA/QA Automation
Merged from 40+ open-source AI agent frameworks including:
- OpenManus, MetaGPT, AutoGPT, BabyAGI, OpenHands
- browser-use, LaVague, stagehand, skyvern, agent-browser
- LangChain, LangGraph, aider, sweep, devika
- And 30+ more...
"""


# ============================================================================
# PATHS
# ============================================================================

BASE_DIR = Path(__file__).parent.parent.parent.absolute()
SRC_DIR = BASE_DIR / "src"
CONFIG_DIR = BASE_DIR / "src" / "config"
MODULES_DIR = SRC_DIR / "src_modules"
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
CACHE_DIR = BASE_DIR / "cache"
TEMP_DIR = BASE_DIR / "temp"

# Create directories if they don't exist
for d in [DATA_DIR, LOGS_DIR, CACHE_DIR, TEMP_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# ============================================================================
# ENVIRONMENT CONFIG
# ============================================================================

class EnvConfig:
    """Environment variables and secrets management."""
    
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/superapp.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # API Endpoints
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    LM_STUDIO_URL: str = os.getenv("LM_STUDIO_URL", "http://localhost:1234")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Paths
    WORKSPACE_DIR: str = os.getenv("WORKSPACE_DIR", str(BASE_DIR / "workspace"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
    
    @classmethod
    def from_env_file(cls, filepath: str = ".env") -> "EnvConfig":
        """Load config from .env file."""
        env_path = Path(filepath)
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        if hasattr(cls, key):
                            setattr(cls, key, value)
        return cls
    
    @classmethod
    def to_dict(cls) -> Dict[str, Any]:
        """Export to dict (excluding secrets)."""
        return {k: v for k, v in asdict(cls).items() if not k.endswith("_KEY")}


# ============================================================================
# LLM PROVIDER CONFIG
# ============================================================================

class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    OLLAMA = "ollama"
    LM_STUDIO = "lm_studio"
    GROQ = "groq"
    MISTRAL = "mistral"


@dataclass
class LLMConfig:
    """LLM Provider Configuration."""
    provider: LLMProvider = LLMProvider.OPENAI
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    timeout: int = 120
    retry_attempts: int = 3
    base_url: Optional[str] = None
    
    # Provider-specific settings
    openai_model: str = "gpt-4"
    anthropic_model: str = "claude-3-sonnet-20240229"
    google_model: str = "gemini-pro"
    ollama_model: str = "llama3"
    lm_studio_model: str = "local-model"
    
    # Cost tracking
    track_costs: bool = True
    
    def get_effective_model(self) -> str:
        """Get the model based on provider."""
        if self.provider == LLMProvider.OPENAI:
            return self.openai_model
        elif self.provider == LLMProvider.ANTHROPIC:
            return self.anthropic_model
        elif self.provider == LLMProvider.GOOGLE:
            return self.google_model
        elif self.provider == LLMProvider.OLLAMA:
            return self.ollama_model
        elif self.provider == LLMProvider.LM_STUDIO:
            return self.lm_studio_model
        return self.model


# ============================================================================
# AGENT CONFIG
# ============================================================================

@dataclass
class AgentConfig:
    """Configuration for AI agents."""
    
    # Supervisor Agent
    supervisor_max_iterations: int = 50
    supervisor_delegate_threshold: float = 0.7
    
    # Coder Agent
    coder_max_file_size: int = 100_000  # 100KB
    coder_enable_syntax_guardrails: bool = True
    coder_auto_format: bool = True
    
    # Browser Agent
    browser_headless: bool = True
    browser_timeout: int = 30
    browser_max_steps: int = 20
    browser_screenshot_quality: int = 80
    
    # Researcher Agent
    researcher_max_sources: int = 10
    researcher_include_images: bool = True
    researcher_cite_sources: bool = True
    
    # Memory
    memory_max_entries: int = 10_000
    memory_embeddings_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Orchestration
    max_concurrent_agents: int = 5
    task_timeout: int = 300
    enable_checkpoints: bool = True


# ============================================================================
# BROWSER AUTOMATION CONFIG
# ============================================================================

@dataclass
class BrowserConfig:
    """Browser automation settings."""
    
    # Browser type
    browser: str = "chromium"  # chromium, firefox, webkit
    headless: bool = True
    
    # Viewport
    viewport_width: int = 1920
    viewport_height: int = 1080
    
    # Timeouts (seconds)
    navigation_timeout: int = 30
    element_timeout: int = 10
    script_timeout: int = 30
    
    # User agent
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    # Downloads
    downloads_path: str = str(DATA_DIR / "downloads")
    accept_downloads: bool = True
    
    # Proxy
    proxy_server: Optional[str] = None
    proxy_bypass: Optional[str] = None
    
    # Vision settings
    enable_vision: bool = True
    vision_confidence: float = 0.8
    
    # Loop detection
    max_loop_iterations: int = 5
    loop_detection_enabled: bool = True
    
    # Stealth mode
    stealth_mode: bool = True
    disable_web_security: bool = False
    
    # Screenshots
    screenshot_dir: str = str(DATA_DIR / "screenshots")
    full_page_screenshot: bool = True


# ============================================================================
# TOOL CONFIGURATIONS
# ============================================================================

@dataclass
class ToolConfig:
    """Configuration for tools and integrations."""
    
    # File tools
    allow_file_write: bool = True
    allowed_directories: List[str] = field(default_factory=lambda: [str(BASE_DIR)])
    denied_directories: List[str] = field(default_factory=lambda: [".git", "node_modules"])
    max_file_size: int = 10_000_000  # 10MB
    
    # Shell tools
    allow_shell: bool = True
    shell_timeout: int = 300
    allowed_commands: List[str] = field(default_factory=list)  # Empty = all allowed
    
    # Git tools
    allow_git: bool = True
    git_author_name: str = "Super App Bot"
    git_author_email: str = "bot@superapp.local"
    
    # Web tools
    allow_web_search: bool = True
    search_engine: str = "google"  # google, bing, duckduckgo
    max_search_results: int = 10
    
    # Docker tools
    allow_docker: bool = False
    docker_timeout: int = 600
    
    # MCP (Model Context Protocol)
    mcp_enabled: bool = True
    mcpServers: Dict[str, Any] = field(default_factory=dict)


# ============================================================================
# HEALTHCARE IT SPECIFIC CONFIG
# ============================================================================

@dataclass
class HealthcareConfig:
    """Configuration for Healthcare IT specific features."""
    
    # FHIR Settings
    fhir_base_url: str = os.getenv("FHIR_BASE_URL", "http://localhost:8080/fhir")
    fhir_version: str = "R4"
    fhir_timeout: int = 60
    
    # HL7 Settings
    hl7_mllp_port: int = 2575
    hl7_ack_mode: str = "auto"
    
    # EHR Integration
    ehr_enabled: bool = False
    epic_client_id: str = ""
    epic_client_secret: str = ""
    
    # Testing
    test_data_dir: str = str(DATA_DIR / "healthcare" / "test_data")
    generate_test_patients: bool = False
    
    # HIPAA compliance
    hipaa_mode: bool = False
    audit_log_enabled: bool = True


# ============================================================================
# LOGGING CONFIG
# ============================================================================

@dataclass
class LoggingConfig:
    """Logging configuration."""
    
    level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    format: str = "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
    date_format: str = "%Y-%m-%d %H:%M:%S"
    
    # File logging
    file_enabled: bool = True
    file_path: str = str(LOGS_DIR / "superapp.log")
    file_max_bytes: int = 10_000_000  # 10MB
    file_backup_count: int = 5
    
    # Console logging
    console_enabled: bool = True
    console_color: bool = True
    
    # JSON logging (for structured logs)
    json_logging: bool = False
    json_log_path: str = str(LOGS_DIR / "superapp.json")
    
    # Log levels per module
    module_levels: Dict[str, str] = field(default_factory=lambda: {
        "agents": "DEBUG",
        "browser": "DEBUG",
        "orchestration": "INFO",
        "tools": "INFO",
    })


# ============================================================================
# API SERVER CONFIG
# ============================================================================

@dataclass
class APIServerConfig:
    """FastAPI server configuration."""
    
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False
    workers: int = 1
    
    # CORS
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = field(default_factory=lambda: ["*"])
    cors_allow_headers: List[str] = field(default_factory=lambda: ["*"])
    
    # Rate limiting
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_period: int = 60  # seconds
    
    # Authentication
    auth_enabled: bool = False
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiration: int = 3600  # seconds


# ============================================================================
# DATABASE CONFIG
# ============================================================================

@dataclass
class DatabaseConfig:
    """Database configuration."""
    
    url: str = f"sqlite:///{DATA_DIR}/superapp.db"
    echo: bool = False
    
    # Connection pool
    pool_size: int = 5
    max_overflow: int = 10
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # Redis (for caching/celery)
    redis_url: str = "redis://localhost:6379"
    redis_enabled: bool = False


# ============================================================================
# SUPER APP MASTER CONFIG
# ============================================================================

@dataclass
class SuperAppConfig:
    """
    Master configuration class that combines all configs.
    This is the single source of truth for the entire Super App.
    """
    
    # Version info
    app_name: str = APP_NAME
    app_version: str = APP_VERSION
    base_dir: Path = field(default_factory=lambda: BASE_DIR)
    
    # Environment
    env: EnvConfig = field(default_factory=EnvConfig)
    
    # LLM
    llm: LLMConfig = field(default_factory=LLMConfig)
    
    # Agents
    agents: AgentConfig = field(default_factory=AgentConfig)
    
    # Browser
    browser: BrowserConfig = field(default_factory=BrowserConfig)
    
    # Tools
    tools: ToolConfig = field(default_factory=ToolConfig)
    
    # Healthcare IT
    healthcare: HealthcareConfig = field(default_factory=HealthcareConfig)
    
    # Logging
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    
    # API Server
    api: APIServerConfig = field(default_factory=APIServerConfig)
    
    # Database
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    
    # Feature flags
    features: Dict[str, bool] = field(default_factory=lambda: {
        "multi_agent": True,
        "browser_automation": True,
        "code_editing": True,
        "research": True,
        "memory": True,
        "event_streaming": True,
        "checkpoints": True,
        "healthcare_it": False,
    })
    
    # Merged modules registry
    merged_modules: Dict[str, Dict[str, Any]] = field(default_factory=lambda: {
        "multi_agent_system": {"source": "babyagi, MetaGPT, ChatDev", "status": "active"},
        "autonomous_agent": {"source": "AutoGPT, SuperAGI, OpenHands", "status": "active"},
        "browser_automation": {"source": "browser-use, LaVague, agent-browser", "status": "active"},
        "code_editing": {"source": "aider, sweep, devika", "status": "active"},
        "research": {"source": "storm, deep-research, dananswer", "status": "active"},
        "knowledge_base": {"source": "anything-llm, khoj", "status": "active"},
        "orchestration": {"source": "LangGraph, LangChain", "status": "active"},
    })
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            "app_name": self.app_name,
            "app_version": self.app_version,
            "features": self.features,
            "merged_modules": self.merged_modules,
            "llm": asdict(self.llm),
            "agents": asdict(self.agents),
            "browser": asdict(self.browser),
            "tools": asdict(self.tools),
            "healthcare": asdict(self.healthcare),
            "logging": asdict(self.logging),
            "api": asdict(self.api),
            "database": asdict(self.database),
        }
    
    def save(self, filepath: str = None) -> None:
        """Save config to YAML file."""
        if filepath is None:
            filepath = str(CONFIG_DIR / "config.yaml")
        with open(filepath, "w") as f:
            yaml.dump(self.to_dict(), f, default_flow_style=False)
    
    @classmethod
    def load(cls, filepath: str = None) -> "SuperAppConfig":
        """Load config from YAML file."""
        if filepath is None:
            filepath = str(CONFIG_DIR / "config.yaml")
        if Path(filepath).exists():
            with open(filepath) as f:
                data = yaml.safe_load(f)
            return cls(**data)
        return cls()


# ============================================================================
# GLOBAL CONFIG INSTANCE
# ============================================================================

config = SuperAppConfig()


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_config() -> SuperAppConfig:
    """Get the global config instance."""
    return config


def update_config(**kwargs) -> None:
    """Update config values."""
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)


def reload_config(filepath: str = None) -> SuperAppConfig:
    """Reload config from file."""
    global config
    config = SuperAppConfig.load(filepath)
    return config


__all__ = [
    "APP_NAME", "APP_VERSION", "APP_DESCRIPTION",
    "BASE_DIR", "SRC_DIR", "CONFIG_DIR", "MODULES_DIR",
    "EnvConfig", "LLMConfig", "AgentConfig", "BrowserConfig",
    "ToolConfig", "HealthcareConfig", "LoggingConfig", 
    "APIServerConfig", "DatabaseConfig", "SuperAppConfig",
    "config", "get_config", "update_config", "reload_config",
]
