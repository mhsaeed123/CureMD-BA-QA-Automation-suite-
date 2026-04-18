"""
CureMD BA QA Super App - ALL FEATURES UNIFIED
==============================================

This module contains ALL features from ALL copied open-source AI agent frameworks.

FEATURE MODULES (33 total):
- multi_agent_system     - MetaGPT, ChatDev, AutoGPT, BabyAGI
- manual_agent          - OpenManus
- super_agent           - SuperAGI
- event_agent           - OpenHands
- mega_agent            - MetaGPT (full)
- autonomous_agent      - AutoGPT
- ai_coder             - devika
- research_writer       - storm
- automation_claw       - openclaw
- search_replace_editor - aider
- fuzzy_code_patch      - sweep
- smart_completion      - continue, cline
- code_planning         - plandex
- prompt_engineering    - gpt-engineer
- browser_automation_core - browser-use, LaVague, stagehand, skyvern
- browser_steel         - steel-browser
- simple_browser        - stagehand
- workflow_automation   - skyvern
- web_research          - deep-research
- qa_system             - dananswer
- knowledge_base        - anything-llm
- personal_knowledge    - khoj
- code_executor         - open-interpreter
- ai_web_scraper        - crawl4ai
- llm_orchestration     - LangGraph, LangChain
- collaborative_dev      - ChatDev

TOTAL: 20,000+ Python files merged!
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add all feature paths to sys.path
FEATURES_DIR = Path(__file__).parent

# Feature directories with descriptive names
FEATURE_PATHS = {
    # Multi-Agent Systems
    "multi_agent_system": FEATURES_DIR / "multi_agent_system",
    "manual_agent": FEATURES_DIR / "manual_agent",
    "super_agent": FEATURES_DIR / "super_agent",
    "event_agent": FEATURES_DIR / "event_agent",
    "mega_agent": FEATURES_DIR / "mega_agent",
    "autonomous_agent": FEATURES_DIR / "autonomous_agent",
    "ai_coder": FEATURES_DIR / "ai_coder",
    "research_writer": FEATURES_DIR / "research_writer",
    "automation_claw": FEATURES_DIR / "automation_claw",
    
    # Code Editing
    "search_replace_editor": FEATURES_DIR / "search_replace_editor",
    "fuzzy_code_patch": FEATURES_DIR / "fuzzy_code_patch",
    "smart_completion": FEATURES_DIR / "smart_completion",
    "code_planning": FEATURES_DIR / "code_planning",
    "prompt_engineering": FEATURES_DIR / "prompt_engineering",
    "advanced_editors": FEATURES_DIR / "advanced_editors",
    
    # Browser Automation
    "browser_automation_core": FEATURES_DIR / "browser_automation_core",
    "browser_steel": FEATURES_DIR / "browser_steel",
    "browser_utils": FEATURES_DIR / "browser_utils",
    "simple_browser": FEATURES_DIR / "simple_browser",
    "workflow_automation": FEATURES_DIR / "workflow_automation",
    
    # Research & Knowledge
    "web_research": FEATURES_DIR / "web_research",
    "qa_system": FEATURES_DIR / "qa_system",
    "knowledge_base": FEATURES_DIR / "knowledge_base",
    "personal_knowledge": FEATURES_DIR / "personal_knowledge",
    "research_core": FEATURES_DIR / "research_core",
    
    # Code Execution & Scraping
    "code_executor": FEATURES_DIR / "code_executor",
    "interpreter_core": FEATURES_DIR / "interpreter_core",
    "ai_web_scraper": FEATURES_DIR / "ai_web_scraper",
    "scraping_core": FEATURES_DIR / "scraping_core",
    
    # LLM Orchestration
    "llm_orchestration": FEATURES_DIR / "llm_orchestration",
    "langchain_core": FEATURES_DIR / "langchain_core",
    "langgraph_core": FEATURES_DIR / "langgraph_core",
    
    # Collaborative Development
    "collaborative_dev": FEATURES_DIR / "collaborative_dev",
}

# Add paths to sys.path
for name, path in FEATURE_PATHS.items():
    if path.exists() and str(path) not in sys.path:
        sys.path.insert(0, str(path))


class FeaturesLoader:
    """
    Lazy loader for all merged features.
    Loads features on-demand to avoid import overhead.
    """
    
    def __init__(self):
        self._loaded: Dict[str, Any] = {}
        self._feature_dirs = self._discover_features()
    
    def _discover_features(self) -> Dict[str, Path]:
        """Discover all available features."""
        features = {}
        for item in FEATURES_DIR.iterdir():
            if item.is_dir() and not item.name.startswith('_'):
                features[item.name] = item
        return features
    
    def load(self, feature_name: str) -> Any:
        """Load a specific feature module."""
        if feature_name in self._loaded:
            return self._loaded[feature_name]
        
        if feature_name in self._feature_dirs:
            path = self._feature_dirs[feature_name]
            module_name = f"src.src_modules.{feature_name}"
            try:
                module = __import__(module_name, fromlist=[""])
                self._loaded[feature_name] = module
                return module
            except ImportError as e:
                print(f"Could not load {feature_name}: {e}")
                return None
        
        return None
    
    def list_features(self) -> List[str]:
        """List all available features."""
        return list(self._feature_dirs.keys())
    
    def get_category(self, feature_name: str) -> Optional[str]:
        """Get the category of a feature."""
        categories = {
            "multi_agent_system": "agents",
            "manual_agent": "agents",
            "super_agent": "agents",
            "event_agent": "agents",
            "mega_agent": "agents",
            "autonomous_agent": "agents",
            "ai_coder": "agents",
            "research_writer": "agents",
            "automation_claw": "agents",
            "search_replace_editor": "code_editing",
            "fuzzy_code_patch": "code_editing",
            "smart_completion": "code_editing",
            "code_planning": "code_editing",
            "prompt_engineering": "code_editing",
            "advanced_editors": "code_editing",
            "browser_automation_core": "browser",
            "browser_steel": "browser",
            "browser_utils": "browser",
            "simple_browser": "browser",
            "workflow_automation": "browser",
            "web_research": "research",
            "qa_system": "research",
            "knowledge_base": "research",
            "personal_knowledge": "research",
            "research_core": "research",
            "code_executor": "execution",
            "interpreter_core": "execution",
            "ai_web_scraper": "execution",
            "scraping_core": "execution",
            "llm_orchestration": "orchestration",
            "langchain_core": "orchestration",
            "langgraph_core": "orchestration",
            "collaborative_dev": "collaboration",
        }
        return categories.get(feature_name)


# Global features loader instance
_loader = FeaturesLoader()


def load_feature(name: str) -> Any:
    """Load a feature by name."""
    return _loader.load(name)


def list_all_features() -> List[str]:
    """List all available features."""
    return _loader.list_features()


def list_features_by_category() -> Dict[str, List[str]]:
    """List features grouped by category."""
    categories = {
        "agents": [],
        "code_editing": [],
        "browser": [],
        "research": [],
        "execution": [],
        "orchestration": [],
        "collaboration": [],
    }
    
    for feature in _loader.list_features():
        cat = _loader.get_category(feature)
        if cat and cat in categories:
            categories[cat].append(feature)
    
    return categories


# Export all known feature categories
FEATURE_CATEGORIES = {
    "agents": {
        "description": "AI Agent implementations",
        "sources": ["OpenManus", "MetaGPT", "AutoGPT", "BabyAGI", "OpenHands", "SuperAGI", "ChatDev", "devika", "storm"],
        "features": ["task_planning", "reasoning", "tool_use", "memory", "multi_agent"]
    },
    "browser_automation": {
        "description": "Web browser control and automation",
        "sources": ["browser-use", "LaVague", "stagehand", "skyvern", "steel-browser"],
        "features": ["navigation", "clicking", "typing", "screenshot", "vision", "scraping"]
    },
    "code_editing": {
        "description": "Code generation and editing",
        "sources": ["aider", "sweep", "Roo-Code", "continue"],
        "features": ["SEARCH/REPLACE", "fuzzy_patch", "syntax_guardrails", "repo_mapping"]
    },
    "research": {
        "description": "Research and knowledge gathering",
        "sources": ["deep-research", "danswer", "storm", "anything-llm", "khoj"],
        "features": ["web_search", "content_extraction", "citation", "synthesis", "RAG"]
    },
    "execution": {
        "description": "Code execution environments",
        "sources": ["open-interpreter", "crawl4ai"],
        "features": ["sandbox", "terminal", "computer_control", "web_scraping"]
    },
    "orchestration": {
        "description": "Workflow and task orchestration",
        "sources": ["LangGraph", "LangChain", "SuperAGI", "OpenHands"],
        "features": ["state_management", "checkpoints", "events", "scheduling"]
    },
    "collaboration": {
        "description": "Collaborative development",
        "sources": ["ChatDev"],
        "features": ["multi_role", "code_review", "testing"]
    }
}


# Quick access to most common features
def get_multi_agent():
    """Get multi-agent system."""
    return load_feature("multi_agent_system")

def get_browser_agent():
    """Get browser automation agent."""
    return load_feature("browser_automation_core")

def get_coder_agent():
    """Get code editing agent."""
    return load_feature("search_replace_editor")

def get_research_agent():
    """Get research agent."""
    return load_feature("web_research")

def get_knowledge_base():
    """Get knowledge base."""
    return load_feature("knowledge_base")

def get_llm_orchestrator():
    """Get LLM orchestrator."""
    return load_feature("llm_orchestration")


__all__ = [
    "FeaturesLoader",
    "load_feature",
    "list_all_features",
    "list_features_by_category",
    "FEATURE_CATEGORIES",
    "get_multi_agent",
    "get_browser_agent",
    "get_coder_agent",
    "get_research_agent",
    "get_knowledge_base",
    "get_llm_orchestrator",
]
