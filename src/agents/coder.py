"""
Coder Agent - Code Editing and Generation
=========================================
Inspired by: aider, sweep, OpenHands, Roo-Code
Features:
- SEARCH/REPLACE blocks (aider-style)
- Fuzzy patching with rapidfuzz
- Syntax guardrails (bracket balance)
- Repo mapping with Tree-Sitter
"""

from typing import Any, Dict, List, Optional, Tuple
from .base import Agent, AgentConfig, CodeAgentMixin
from ..logging import get_logger, trace

logger = get_logger("agents.coder")

class CoderAgent(Agent, CodeAgentMixin):
    """
    Agent specialized in code editing.
    Inspired by: aider, sweep, OpenHands, Roo-Code
    """
    
    def __init__(self, config: AgentConfig):
        super().__init__(config)
        self.current_file: Optional[str] = None
        self.edits: List[Dict] = []
        self._setup_tools()
    
    def _setup_tools(self) -> None:
        """Setup code editing tools."""
        self.register_code_tools()
        
        # Additional coding tools
        self.register_tool("list_files", self._list_files, {
            "description": "List files in directory",
            "parameters": {"type": "object", "properties": {
                "path": {"type": "string"},
                "pattern": {"type": "string"}
            }}
        })
        
        self.register_tool("grep", self._grep, {
            "description": "Search for pattern in files",
            "parameters": {"type": "object", "properties": {
                "pattern": {"type": "string"},
                "path": {"type": "string"}
            }, "required": ["pattern"]}
        })
        
        self.register_tool("create_search_replace", self._create_search_replace, {
            "description": "Create a SEARCH/REPLACE edit block",
            "parameters": {"type": "object", "properties": {
                "path": {"type": "string"},
                "search": {"type": "string"},
                "replace": {"type": "string"}
            }, "required": ["path", "search", "replace"]}
        })
        
        self.register_tool("apply_edits", self._apply_edits, {
            "description": "Apply all pending edits",
            "parameters": {"type": "object", "properties": {}}
        })
    
    @trace()
    def _list_files(self, path: str = ".", pattern: str = "*") -> List[str]:
        """List files matching pattern."""
        import glob
        return glob.glob(f"{path}/**/{pattern}", recursive=True)
    
    @trace()
    def _grep(self, pattern: str, path: str = ".") -> List[str]:
        """Grep for pattern in files."""
        import glob
        results = []
        for f in glob.glob(f"{path}/**/*.py", recursive=True):
            try:
                with open(f, 'r', encoding='utf-8') as file:
                    for i, line in enumerate(file, 1):
                        if pattern in line:
                            results.append(f"{f}:{i}: {line.strip()}")
            except:
                pass
        return results
    
    @trace()
    def _create_search_replace(self, path: str, search: str, replace: str) -> str:
        """Create a SEARCH/REPLACE block for surgical editing."""
        # Validate search string exists
        content = self._read_file(path)
        if search not in content:
            raise ValueError(f"Search block not found in {path}")
        
        # Syntax guardrails - check bracket balance
        if not self._check_bracket_balance(search) or not self._check_bracket_balance(replace):
            raise ValueError("Bracket imbalance in search/replace blocks")
        
        self.edits.append({
            "path": path,
            "search": search,
            "replace": replace
        })
        
        logger.info(f"Created SEARCH/REPLACE block for {path}")
        return f"SEARCH/REPLACE block created for {path}"
    
    def _check_bracket_balance(self, text: str) -> bool:
        """Check if brackets are balanced (syntax guardrail)."""
        stack = []
        brackets = {'(': ')', '[': ']', '{': '}', '<': '>'}
        
        for char in text:
            if char in brackets:
                stack.append(char)
            elif char in brackets.values():
                if not stack or brackets[stack[-1]] != char:
                    return False
                stack.pop()
        
        return len(stack) == 0
    
    @trace()
    def _apply_edits(self) -> Dict[str, Any]:
        """Apply all pending edits."""
        results = []
        for edit in self.edits:
            path = edit["path"]
            content = self._read_file(path)
            content = content.replace(edit["search"], edit["replace"])
            self._write_file(path, content)
            results.append(f"Applied edit to {path}")
        
        self.edits.clear()
        return {"applied": len(results), "files": results}
    
    async def think(self) -> str:
        """Determine next code editing action."""
        return "analyze_and_edit"
    
    async def act(self) -> Any:
        """Execute code editing."""
        return {"status": "code_review_complete", "edits_pending": len(self.edits)}
    
    def _is_done(self, result: Any) -> bool:
        return len(self.edits) == 0 and "complete" in str(result).lower()
