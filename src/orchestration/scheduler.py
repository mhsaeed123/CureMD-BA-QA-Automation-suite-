"""
Task Scheduler - Distributed Task Execution
==========================================
Inspired by: SuperAGI Celery integration
Features:
- Async task queue
- Celery integration for distributed execution
- Task prioritization
- Retry logic
"""

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from ..logging import get_logger

logger = get_logger("orchestration.scheduler")

class TaskPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

@dataclass
class Task:
    """Represents a scheduled task."""
    id: str
    func: Callable
    args: tuple = ()
    kwargs: dict = None
    priority: TaskPriority = TaskPriority.NORMAL
    retries: int = 0
    max_retries: int = 3
    created_at: datetime = None
    started_at: datetime = None
    completed_at: datetime = None
    
    def __post_init__(self):
        if self.kwargs is None:
            self.kwargs = {}
        if self.created_at is None:
            self.created_at = datetime.now()

class TaskScheduler(ABC):
    """Abstract task scheduler."""
    
    @abstractmethod
    async def schedule(self, task: Task) -> str:
        """Schedule a task for execution."""
        pass
    
    @abstractmethod
    async def get_result(self, task_id: str) -> Any:
        """Get task result."""
        pass

class AsyncTaskScheduler(TaskScheduler):
    """In-memory async task scheduler."""
    
    def __init__(self):
        self.tasks: Dict[str, asyncio.Task] = {}
        self.results: Dict[str, Any] = {}
        self.queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the scheduler workers."""
        if self._running:
            return
        self._running = True
        self._worker_task = asyncio.create_task(self._worker())
        logger.info("Task scheduler started")
    
    async def stop(self):
        """Stop the scheduler."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
        logger.info("Task scheduler stopped")
    
    async def _worker(self):
        """Worker that processes tasks from queue."""
        while self._running:
            try:
                priority, task = await asyncio.wait_for(
                    self.queue.get(),
                    timeout=1.0
                )
                
                logger.debug(f"Processing task: {task.id}")
                task.started_at = datetime.now()
                
                try:
                    if asyncio.iscoroutinefunction(task.func):
                        result = await task.func(*task.args, **task.kwargs)
                    else:
                        result = task.func(*task.args, **task.kwargs)
                    
                    self.results[task.id] = result
                    task.completed_at = datetime.now()
                    logger.debug(f"Task {task.id} completed")
                    
                except Exception as e:
                    logger.exception(f"Task {task.id} failed: {e}")
                    self.results[task.id] = {"error": str(e)}
                    
                    # Retry logic
                    if task.retries < task.max_retries:
                        task.retries += 1
                        await self.queue.put((task.priority.value, task))
                        logger.info(f"Retrying task {task.id} (attempt {task.retries})")
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.exception(f"Worker error: {e}")
    
    async def schedule(self, task: Task) -> str:
        """Schedule a task."""
        await self.queue.put((task.priority.value, task))
        self.tasks[task.id] = task
        logger.info(f"Scheduled task: {task.id}")
        return task.id
    
    async def get_result(self, task_id: str) -> Any:
        """Get task result."""
        return self.results.get(task_id)

class CeleryTaskScheduler(TaskScheduler):
    """Celery-based distributed task scheduler."""
    
    def __init__(self, broker_url: str = "redis://localhost:6379"):
        self.broker_url = broker_url
        self._celery_app = None
        self._initialized = False
    
    def _init_celery(self):
        """Initialize Celery app."""
        if self._initialized:
            return
        try:
            from celery import Celery
            self._celery_app = Celery('super_app', broker=self.broker_url)
            self._initialized = True
            logger.info("Celery scheduler initialized")
        except ImportError:
            logger.warning("Celery not installed, falling back to async scheduler")
            self._celery_app = AsyncTaskScheduler()
    
    async def schedule(self, task: Task) -> str:
        """Schedule task via Celery."""
        self._init_celery()
        
        if isinstance(self._celery_app, AsyncTaskScheduler):
            return await self._celery_app.schedule(task)
        
        # Celery async scheduling
        from celery import uuid as celery_uuid
        task_id = task.id or celery_uuid()
        
        self._celery_app.send_task(
            'super_app.execute_task',
            args=[task.func.__name__, task.args, task.kwargs],
            task_id=task_id
        )
        
        return task_id
    
    async def get_result(self, task_id: str) -> Any:
        """Get Celery task result."""
        self._init_celery()
        
        if isinstance(self._celery_app, AsyncTaskScheduler):
            return await self._celery_app.get_result(task_id)
        
        async_result = self._celery_app.AsyncResult(task_id)
        return async_result.get(timeout=10)
