"""
Coder Module - Advanced Code Editing (Aider-style)
================================================
Features:
- SEARCH/REPLACE blocks
- Fuzzy patching with rapidfuzz
- Tree-Sitter repo mapping
- Syntax guardrails
"""

from .editor import CodeEditor, SearchReplaceBlock
from .fuzzy import FuzzyPatcher
from .repo_mapper import RepoMapper
from .syntax_guard import SyntaxGuard

__all__ = ["CodeEditor", "SearchReplaceBlock", "FuzzyPatcher", "RepoMapper", "SyntaxGuard"]
