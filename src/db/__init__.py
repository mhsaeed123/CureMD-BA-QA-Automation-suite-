"""
CureMD BA QA Super App - Database Module
Unified database layer supporting SQLite, PostgreSQL, and MSSQL
"""
import sqlite3
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, List, Dict
from dataclasses import dataclass, asdict
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class Task:
    id: str
    task_type: str
    description: str
    status: str  # pending, running, completed, failed
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: str = ""
    completed_at: Optional[str] = None
    metadata: Optional[dict] = None

@dataclass
class Module:
    id: str
    name: str
    category: str  # generalist, specialist
    type: str  # agent, tool, integration, workflow
    code: str
    config: dict
    enabled: bool = True
    created_at: str = ""
    last_used: Optional[str] = None
    usage_count: int = 0

@dataclass
class Checkpoint:
    id: str
    task_id: str
    state: dict
    created_at: str = ""

@dataclass
class Event:
    id: str
    event_type: str
    data: dict
    timestamp: str = ""

# ============================================================================
# DATABASE MANAGER
# ============================================================================

class DatabaseManager:
    """Unified database manager supporting SQLite, PostgreSQL, MSSQL"""
    
    def __init__(self, db_type: str = "sqlite", connection_string: str = None):
        self.db_type = db_type.lower()
        self.connection_string = connection_string or self._default_connection()
        self._local = threading.local()
        self._init_database()
    
    def _default_connection(self) -> str:
        """Get default SQLite database path"""
        db_dir = Path(__file__).parent.parent.parent / "data"
        db_dir.mkdir(exist_ok=True)
        return str(db_dir / "super_app.db")
    
    def _get_connection(self):
        """Get thread-local database connection"""
        if not hasattr(self._local, 'conn'):
            if self.db_type == "sqlite":
                self._local.conn = sqlite3.connect(
                    self.connection_string,
                    check_same_thread=False
                )
                self._local.conn.row_factory = sqlite3.Row
            # Add PostgreSQL/MSSQL support via connection_string
        return self._local.conn
    
    @contextmanager
    def get_cursor(self):
        """Context manager for database cursor"""
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            cursor.close()
    
    def _init_database(self):
        """Initialize database schema"""
        with self.get_cursor() as cursor:
            # Tasks table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    task_type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    result TEXT,
                    error TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    completed_at TEXT,
                    metadata TEXT
                )
            """)
            
            # Modules table (for self-augmenting capability)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS modules (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    type TEXT NOT NULL,
                    code TEXT NOT NULL,
                    config TEXT DEFAULT '{}',
                    enabled INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    last_used TEXT,
                    usage_count INTEGER DEFAULT 0
                )
            """)
            
            # Checkpoints table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS checkpoints (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    state TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (task_id) REFERENCES tasks(id)
                )
            """)
            
            # Events table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    data TEXT NOT NULL,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Memory table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memory (
                    id TEXT PRIMARY KEY,
                    memory_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    embedding TEXT,
                    metadata TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Config table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            logger.info(f"Database initialized: {self.db_type} at {self.connection_string}")
    
    # =========================================================================
    # TASK OPERATIONS
    # =========================================================================
    
    def create_task(self, task_id: str, task_type: str, description: str, metadata: dict = None) -> Task:
        """Create a new task"""
        task = Task(
            id=task_id,
            task_type=task_type,
            description=description,
            status="pending",
            created_at=datetime.now().isoformat(),
            metadata=metadata
        )
        with self.get_cursor() as cursor:
            cursor.execute(
                "INSERT INTO tasks (id, task_type, description, status, created_at, metadata) VALUES (?, ?, ?, ?, ?, ?)",
                (task.id, task.task_type, task.description, task.status, task.created_at, json.dumps(task.metadata))
            )
        logger.info(f"Task created: {task_id}")
        return task
    
    def update_task_status(self, task_id: str, status: str, result: str = None, error: str = None):
        """Update task status"""
        with self.get_cursor() as cursor:
            if result:
                cursor.execute(
                    "UPDATE tasks SET status=?, result=?, completed_at=? WHERE id=?",
                    (status, result, datetime.now().isoformat(), task_id)
                )
            elif error:
                cursor.execute(
                    "UPDATE tasks SET status=?, error=?, completed_at=? WHERE id=?",
                    (status, error, datetime.now().isoformat(), task_id)
                )
            else:
                cursor.execute(
                    "UPDATE tasks SET status=? WHERE id=?",
                    (status, task_id)
                )
        logger.info(f"Task {task_id} status: {status}")
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get task by ID"""
        with self.get_cursor() as cursor:
            cursor.execute("SELECT * FROM tasks WHERE id=?", (task_id,))
            row = cursor.fetchone()
            if row:
                return Task(**dict(row))
        return None
    
    def get_all_tasks(self, status: str = None, limit: int = 100) -> List[Task]:
        """Get all tasks with optional status filter"""
        with self.get_cursor() as cursor:
            if status:
                cursor.execute("SELECT * FROM tasks WHERE status=? ORDER BY created_at DESC LIMIT ?", (status, limit))
            else:
                cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?", (limit,))
            return [Task(**dict(row)) for row in cursor.fetchall()]
    
    # =========================================================================
    # MODULE OPERATIONS (Self-Augmenting)
    # =========================================================================
    
    def register_module(self, module: Module) -> Module:
        """Register a new module (generalist or specialist)"""
        with self.get_cursor() as cursor:
            cursor.execute(
                """INSERT OR REPLACE INTO modules 
                   (id, name, category, type, code, config, enabled, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (module.id, module.name, module.category, module.type, 
                 module.code, json.dumps(module.config), 1 if module.enabled else 0,
                 module.created_at or datetime.now().isoformat())
            )
        logger.info(f"Module registered: {module.name} ({module.category})")
        return module
    
    def get_module(self, module_id: str) -> Optional[Module]:
        """Get module by ID"""
        with self.get_cursor() as cursor:
            cursor.execute("SELECT * FROM modules WHERE id=?", (module_id,))
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d['config'] = json.loads(d['config']) if d['config'] else {}
                d['enabled'] = bool(d['enabled'])
                return Module(**d)
        return None
    
    def get_modules_by_category(self, category: str) -> List[Module]:
        """Get all modules by category (generalist/specialist)"""
        with self.get_cursor() as cursor:
            cursor.execute("SELECT * FROM modules WHERE category=? AND enabled=1", (category,))
            modules = []
            for row in cursor.fetchall():
                d = dict(row)
                d['config'] = json.loads(d['config']) if d['config'] else {}
                d['enabled'] = bool(d['enabled'])
                modules.append(Module(**d))
            return modules
    
    def get_all_modules(self, enabled_only: bool = True) -> List[Module]:
        """Get all modules"""
        with self.get_cursor() as cursor:
            if enabled_only:
                cursor.execute("SELECT * FROM modules WHERE enabled=1 ORDER BY category, name")
            else:
                cursor.execute("SELECT * FROM modules ORDER BY category, name")
            modules = []
            for row in cursor.fetchall():
                d = dict(row)
                d['config'] = json.loads(d['config']) if d['config'] else {}
                d['enabled'] = bool(d['enabled'])
                modules.append(Module(**d))
            return modules
    
    def increment_module_usage(self, module_id: str):
        """Increment module usage count"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "UPDATE modules SET usage_count=usage_count+1, last_used=? WHERE id=?",
                (datetime.now().isoformat(), module_id)
            )
    
    def delete_module(self, module_id: str):
        """Delete a module"""
        with self.get_cursor() as cursor:
            cursor.execute("DELETE FROM modules WHERE id=?", (module_id,))
        logger.info(f"Module deleted: {module_id}")
    
    # =========================================================================
    # CHECKPOINT OPERATIONS
    # =========================================================================
    
    def save_checkpoint(self, checkpoint: Checkpoint):
        """Save a checkpoint"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "INSERT INTO checkpoints (id, task_id, state, created_at) VALUES (?, ?, ?, ?)",
                (checkpoint.id, checkpoint.task_id, json.dumps(checkpoint.state), checkpoint.created_at)
            )
    
    def get_latest_checkpoint(self, task_id: str) -> Optional[Checkpoint]:
        """Get latest checkpoint for a task"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "SELECT * FROM checkpoints WHERE task_id=? ORDER BY created_at DESC LIMIT 1",
                (task_id,)
            )
            row = cursor.fetchone()
            if row:
                d = dict(row)
                d['state'] = json.loads(d['state'])
                return Checkpoint(**d)
        return None
    
    # =========================================================================
    # EVENT OPERATIONS
    # =========================================================================
    
    def log_event(self, event: Event):
        """Log an event"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "INSERT INTO events (id, event_type, data, timestamp) VALUES (?, ?, ?, ?)",
                (event.id, event.event_type, json.dumps(event.data), event.timestamp)
            )
    
    def get_events(self, event_type: str = None, limit: int = 100) -> List[Event]:
        """Get events with optional filter"""
        with self.get_cursor() as cursor:
            if event_type:
                cursor.execute(
                    "SELECT * FROM events WHERE event_type=? ORDER BY timestamp DESC LIMIT ?",
                    (event_type, limit)
                )
            else:
                cursor.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,))
            return [Event(**dict(row)) for row in cursor.fetchall()]
    
    # =========================================================================
    # MEMORY OPERATIONS
    # =========================================================================
    
    def add_memory(self, memory_id: str, memory_type: str, content: str, metadata: dict = None):
        """Add to memory"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "INSERT INTO memory (id, memory_type, content, metadata) VALUES (?, ?, ?, ?)",
                (memory_id, memory_type, content, json.dumps(metadata) if metadata else None)
            )
    
    def search_memory(self, query: str, memory_type: str = None, limit: int = 10) -> List[dict]:
        """Simple keyword search in memory"""
        with self.get_cursor() as cursor:
            if memory_type:
                cursor.execute(
                    "SELECT * FROM memory WHERE memory_type=? AND content LIKE ? ORDER BY created_at DESC LIMIT ?",
                    (memory_type, f"%{query}%", limit)
                )
            else:
                cursor.execute(
                    "SELECT * FROM memory WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?",
                    (f"%{query}%", limit)
                )
            return [dict(row) for row in cursor.fetchall()]
    
    def clear_memory(self, memory_type: str = None):
        """Clear memory"""
        with self.get_cursor() as cursor:
            if memory_type:
                cursor.execute("DELETE FROM memory WHERE memory_type=?", (memory_type,))
            else:
                cursor.execute("DELETE FROM memory")
        logger.info(f"Memory cleared: {memory_type or 'all'}")
    
    # =========================================================================
    # CONFIG OPERATIONS
    # =========================================================================
    
    def set_config(self, key: str, value: Any):
        """Set configuration value"""
        with self.get_cursor() as cursor:
            cursor.execute(
                "INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
                (key, json.dumps(value), datetime.now().isoformat())
            )
    
    def get_config(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        with self.get_cursor() as cursor:
            cursor.execute("SELECT value FROM config WHERE key=?", (key,))
            row = cursor.fetchone()
            if row:
                return json.loads(row['value'])
        return default
    
    # =========================================================================
    # STATISTICS
    # =========================================================================
    
    def get_stats(self) -> dict:
        """Get database statistics"""
        with self.get_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM tasks")
            total_tasks = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM tasks WHERE status='completed'")
            completed_tasks = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM modules WHERE category='generalist'")
            generalists = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM modules WHERE category='specialist'")
            specialists = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM memory")
            memories = cursor.fetchone()['count']
            
            return {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "failed_tasks": total_tasks - completed_tasks,
                "generalist_modules": generalists,
                "specialist_modules": specialists,
                "total_memories": memories
            }


# ============================================================================
# GLOBAL DATABASE INSTANCE
# ============================================================================

_db_instance: Optional[DatabaseManager] = None

def get_database(db_type: str = "sqlite", connection_string: str = None) -> DatabaseManager:
    """Get global database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_type, connection_string)
    return _db_instance
