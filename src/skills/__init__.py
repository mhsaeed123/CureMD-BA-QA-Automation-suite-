"""
CureMD BA QA Super App - Skills & MCP Integration Module
Fetches, builds, and integrates skills/recipes/MCP tools from the internet
"""
import json
import importlib.util
import inspect
import ast
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class Skill:
    """A reusable skill that can be converted to a module"""
    id: str
    name: str
    description: str
    source: str  # github, npm, pypi, mcp, remote
    source_url: str
    code: str
    language: str  # python, typescript, javascript
    dependencies: List[str] = field(default_factory=list)
    config_schema: dict = field(default_factory=dict)
    category: str = "generalist"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    usage_count: int = 0

@dataclass
class MCPServer:
    """Model Context Protocol Server"""
    id: str
    name: str
    command: str
    args: List[str] = field(default_factory=list)
    env: Dict[str, str] = field(default_factory=dict)
    tools: List[dict] = field(default_factory=list)
    enabled: bool = True

@dataclass
class Recipe:
    """A workflow recipe combining multiple skills"""
    id: str
    name: str
    description: str
    steps: List[dict]  # step: {skill_id, params, condition}
    variables: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

# ============================================================================
# SKILL BUILDER - Converts skills to native modules
# ============================================================================

class SkillBuilder:
    """Converts external skills to native Super App modules"""
    
    def __init__(self, db, modules_dir: Path):
        self.db = db
        self.modules_dir = modules_dir
        self.modules_dir.mkdir(parents=True, exist_ok=True)
    
    def build_from_python_code(self, skill: Skill) -> str:
        """Convert Python skill code to a module"""
        module_code = f'''"""
{skill.name} - Auto-generated from {skill.source}
Source: {skill.source_url}
Generated: {datetime.now().isoformat()}
"""
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class {self._to_class_name(skill.name)}:
    """{skill.description}"""
    
    def __init__(self, config: dict = None):
        self.config = config or {{}}
        self.name = "{skill.name}"
        self.skill_id = "{skill.id}"
        logger.info(f"Initialized {{self.name}}")
    
    async def execute(self, params: Dict[str, Any]) -> Any:
        """Execute the skill"""
        try:
            # Your skill logic here
            logger.info(f"Executing {{self.name}} with params: {{params}}")
            result = await self._run(params)
            return {{"success": True, "result": result}}
        except Exception as e:
            logger.error(f"Error in {{self.name}}: {{e}}")
            return {{"success": False, "error": str(e)}}
    
    async def _run(self, params: Dict[str, Any]) -> Any:
        """Skill-specific implementation"""
        # Parse and execute the original skill code
        # This is a template - actual skill code will be injected
        pass

# Agent function for direct execution
async def run(params: Dict[str, Any], config: dict = None) -> Any:
    """Run {skill.name} as an agent function"""
    skill = {self._to_class_name(skill.name)}(config)
    return await skill.execute(params)
'''
        return module_code
    
    def _to_class_name(self, name: str) -> str:
        """Convert skill name to valid Python class name"""
        # Remove special chars, capitalize words
        import re
        name = re.sub(r'[^a-zA-Z0-9]', '_', name)
        return ''.join(word.capitalize() for word in name.split('_'))
    
    def save_module(self, skill: Skill) -> Path:
        """Save skill as a native module file"""
        module_code = self.build_from_python_code(skill)
        module_name = self._to_safe_filename(skill.name)
        module_path = self.modules_dir / f"{module_name}.py"
        
        with open(module_path, 'w', encoding='utf-8') as f:
            f.write(module_code)
        
        logger.info(f"Module saved: {module_path}")
        return module_path
    
    def _to_safe_filename(self, name: str) -> str:
        """Convert name to safe filename"""
        import re
        return re.sub(r'[^a-zA-Z0-9]', '_', name.lower())
    
    def register_as_module(self, skill: Skill) -> dict:
        """Register skill as a module in the database"""
        from src.db import Module
        
        module = Module(
            id=f"skill_{skill.id}",
            name=skill.name,
            category=skill.category,
            type="skill",
            code=skill.code,
            config=skill.config_schema,
            enabled=True,
            created_at=skill.created_at
        )
        
        # Save to database
        self.db.register_module(module)
        
        # Save as file
        self.save_module(skill)
        
        return {"module_id": module.id, "file": str(self.modules_dir / f"{skill.id}.py")}

# ============================================================================
# MCP CLIENT
# ============================================================================

class MCPClient:
    """Model Context Protocol Client - integrates external tools"""
    
    def __init__(self, db):
        self.db = db
        self.servers: Dict[str, MCPServer] = {}
        self.active_tools: Dict[str, Callable] = {}
    
    async def discover_servers(self) -> List[MCPServer]:
        """Discover available MCP servers"""
        # Check configured servers
        servers_config = self.db.get_config("mcp_servers", [])
        discovered = []
        
        for config in servers_config:
            server = MCPServer(**config)
            self.servers[server.id] = server
            discovered.append(server)
        
        logger.info(f"Discovered {len(discovered)} MCP servers")
        return discovered
    
    async def connect_server(self, server: MCPServer) -> bool:
        """Connect to an MCP server"""
        try:
            # In production, this would start the MCP server process
            # For now, we register the tools from config
            self.servers[server.id] = server
            
            for tool in server.tools:
                tool_name = tool.get("name", "")
                self.active_tools[tool_name] = self._create_tool_wrapper(tool)
            
            logger.info(f"Connected to MCP server: {server.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to {server.name}: {e}")
            return False
    
    def _create_tool_wrapper(self, tool: dict) -> Callable:
        """Create a wrapper function for an MCP tool"""
        async def wrapper(**params):
            # This would call the actual MCP tool
            logger.info(f"Calling MCP tool: {tool.get('name')}")
            return {"success": True, "tool": tool.get('name'), "params": params}
        return wrapper
    
    async def call_tool(self, tool_name: str, params: dict) -> Any:
        """Call an MCP tool"""
        if tool_name not in self.active_tools:
            raise ValueError(f"Tool not found: {tool_name}")
        
        tool = self.active_tools[tool_name]
        return await tool(**params)
    
    def get_available_tools(self) -> List[dict]:
        """Get list of available MCP tools"""
        tools = []
        for server in self.servers.values():
            if server.enabled:
                tools.extend(server.tools)
        return tools

# ============================================================================
# SKILL FETCHER - Pulls skills from internet
# ============================================================================

class SkillFetcher:
    """Fetches skills from GitHub, NPM, PyPI, and other sources"""
    
    def __init__(self, db):
        self.db = db
    
    async def fetch_from_github(self, repo_url: str, skill_path: str = "skill.py") -> Optional[Skill]:
        """Fetch skill from GitHub repository"""
        import re
        
        # Parse GitHub URL
        match = re.match(r'github\.com/([^/]+)/([^/]+)', repo_url)
        if not match:
            logger.error(f"Invalid GitHub URL: {repo_url}")
            return None
        
        owner, repo = match.groups()
        raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/main/{skill_path}"
        
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(raw_url, timeout=30)
                if response.status_code == 200:
                    return Skill(
                        id=f"github_{owner}_{repo}_{skill_path}".replace('/', '_'),
                        name=f"{repo}_{skill_path}".replace('.py', '').replace('_', ' ').title(),
                        description=f"Skill from {repo}",
                        source="github",
                        source_url=repo_url,
                        code=response.text,
                        language="python"
                    )
        except Exception as e:
            logger.error(f"Failed to fetch from GitHub: {e}")
        return None
    
    async def fetch_from_npm(self, package_name: str) -> Optional[Skill]:
        """Fetch skill from NPM package"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://registry.npmjs.org/{package_name}/latest", timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    return Skill(
                        id=f"npm_{package_name}".replace('/', '_'),
                        name=data.get("name", package_name),
                        description=data.get("description", ""),
                        source="npm",
                        source_url=f"https://npmjs.com/package/{package_name}",
                        code=data.get("main", ""),
                        language="javascript"
                    )
        except Exception as e:
            logger.error(f"Failed to fetch from NPM: {e}")
        return None
    
    async def search_skills(self, query: str, sources: List[str] = None) -> List[Skill]:
        """Search for skills across multiple sources"""
        skills = []
        sources = sources or ["github", "npm"]
        
        if "github" in sources:
            # Search GitHub for skill repositories
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://api.github.com/search/repositories",
                        params={"q": f"{query} skill ai agent", "per_page": 10},
                        headers={"Accept": "application/vnd.github.v3+json"},
                        timeout=30
                    )
                    if response.status_code == 200:
                        data = response.json()
                        for item in data.get("items", []):
                            skills.append(Skill(
                                id=f"github_{item['id']}",
                                name=item.get("name", ""),
                                description=item.get("description", ""),
                                source="github",
                                source_url=item.get("html_url", ""),
                                code="",
                                language="python"
                            ))
            except Exception as e:
                logger.error(f"GitHub search failed: {e}")
        
        logger.info(f"Found {len(skills)} skills for query: {query}")
        return skills

# ============================================================================
# MODULE AUGMENTOR - Auto-builds modules from tasks
# ============================================================================

class ModuleAugmentor:
    """Automatically creates specialist modules from user tasks"""
    
    def __init__(self, db, builder: SkillBuilder):
        self.db = db
        self.builder = builder
    
    def analyze_task_for_modules(self, task_description: str) -> List[dict]:
        """Analyze task description to identify needed modules"""
        # Simple keyword-based analysis
        # In production, use LLM for smarter analysis
        
        keywords = {
            "outlook": {"type": "email", "category": "specialist", "name": "Outlook Integration"},
            "elk": {"type": "logging", "category": "specialist", "name": "ELK Stack Analyzer"},
            "database": {"type": "db", "category": "specialist", "name": "Database Connector"},
            "api": {"type": "api", "category": "generalist", "name": "API Client"},
            "web": {"type": "browser", "category": "generalist", "name": "Web Browser"},
            "file": {"type": "filesystem", "category": "generalist", "name": "File Manager"},
            "healthcare": {"type": "healthcare", "category": "specialist", "name": "Healthcare IT"},
            "fhir": {"type": "healthcare", "category": "specialist", "name": "FHIR Handler"},
            "test": {"type": "testing", "category": "generalist", "name": "Test Runner"},
            "report": {"type": "reporting", "category": "generalist", "name": "Report Generator"},
        }
        
        detected = []
        task_lower = task_description.lower()
        
        for keyword, info in keywords.items():
            if keyword in task_lower:
                detected.append({
                    "keyword": keyword,
                    "type": info["type"],
                    "category": info["category"],
                    "suggested_name": info["name"]
                })
        
        return detected
    
    def create_specialist_module(self, name: str, description: str, category: str, code: str) -> dict:
        """Create a new specialist module from task"""
        from src.db import Module
        import uuid
        
        module_id = f"specialist_{uuid.uuid4().hex[:8]}"
        
        module = Module(
            id=module_id,
            name=name,
            category=category,
            type="specialist",
            code=code,
            config={},
            enabled=True,
            created_at=datetime.now().isoformat()
        )
        
        self.db.register_module(module)
        
        # Also save as file
        module_path = self.builder.modules_dir / f"{module_id}.py"
        with open(module_path, 'w', encoding='utf-8') as f:
            f.write(f'"""\n{name} - Specialist Module\nDescription: {description}\nCreated: {datetime.now().isoformat()}\n"""\n\n{code}')
        
        logger.info(f"Created specialist module: {name}")
        return {"module_id": module_id, "name": name}
    
    def suggest_augmentation(self, task_description: str) -> dict:
        """Suggest what modules to build for a task"""
        detected = self.analyze_task_for_modules(task_description)
        
        suggestions = []
        existing_modules = self.db.get_all_modules()
        existing_names = [m.name.lower() for m in existing_modules]
        
        for item in detected:
            already_exists = any(item["suggested_name"].lower() in name for name in existing_names)
            suggestions.append({
                "name": item["suggested_name"],
                "type": item["type"],
                "category": item["category"],
                "already_exists": already_exists,
                "action": "use_existing" if already_exists else "build_new"
            })
        
        return {
            "task": task_description,
            "suggestions": suggestions,
            "can_auto_build": any(s["action"] == "build_new" for s in suggestions)
        }

# ============================================================================
# GLOBAL INSTANCES
# ============================================================================

_mcp_client: Optional[MCPClient] = None
_skill_fetcher: Optional[SkillFetcher] = None
_module_augmentor: Optional[ModuleAugmentor] = None

def get_mcp_client(db) -> MCPClient:
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient(db)
    return _mcp_client

def get_skill_fetcher(db) -> SkillFetcher:
    global _skill_fetcher
    if _skill_fetcher is None:
        _skill_fetcher = SkillFetcher(db)
    return _skill_fetcher

def get_module_augmentor(db, builder) -> ModuleAugmentor:
    global _module_augmentor
    if _module_augmentor is None:
        _module_augmentor = ModuleAugmentor(db, builder)
    return _module_augmentor

# ============================================================================
# CLI COMMANDS
# ============================================================================

async def main():
    """CLI for skill and module management"""
    import sys
    from src.db import get_database
    from pathlib import Path
    
    db = get_database()
    modules_dir = Path(__file__).parent.parent / "modules"
    builder = SkillBuilder(db, modules_dir)
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "search":
            query = sys.argv[2] if len(sys.argv) > 2 else "AI agent skill"
            fetcher = get_skill_fetcher(db)
            skills = await fetcher.search_skills(query)
            print(f"Found {len(skills)} skills:")
            for s in skills:
                print(f"  - {s.name}: {s.description}")
        
        elif command == "fetch":
            url = sys.argv[2]
            fetcher = get_skill_fetcher(db)
            skill = await fetcher.fetch_from_github(url)
            if skill:
                builder.register_as_module(skill)
                print(f"Fetched and registered: {skill.name}")
        
        elif command == "suggest":
            task = " ".join(sys.argv[2:])
            augmentor = get_module_augmentor(db, builder)
            result = augmentor.suggest_augmentation(task)
            print(f"Suggestions for: {result['task']}")
            for s in result['suggestions']:
                status = "EXISTS" if s['already_exists'] else "BUILD"
                print(f"  [{status}] {s['name']} ({s['type']})")
    
    else:
        print("Skills CLI Commands:")
        print("  python -m src.skills search <query>   - Search for skills")
        print("  python -m src.skills fetch <url>     - Fetch skill from GitHub")
        print("  python -m src.skills suggest <task>   - Suggest modules for task")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
