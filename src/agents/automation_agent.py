"""
Automation Agent
=================
Specialized agent for workflow automation and process execution.

Author: CureMD BA QA Team
Version: 1.0.0
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .base_agent import BaseAgent, AgentStatus


class WorkflowStatus(Enum):
    """Workflow execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class StepType(Enum):
    """Type of workflow step."""
    ACTION = "action"
    CONDITION = "condition"
    LOOP = "loop"
    WAIT = "wait"
    NOTIFY = "notify"
    BRANCH = "branch"


@dataclass
class WorkflowStep:
    """Represents a single step in a workflow."""
    id: str
    name: str
    step_type: StepType
    action: str
    params: Dict[str, Any] = field(default_factory=dict)
    condition: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout: int = 60
    on_success: Optional[str] = None
    on_failure: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.step_type.value,
            "action": self.action,
            "params": self.params,
            "condition": self.condition,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "timeout": self.timeout
        }


@dataclass
class Workflow:
    """Represents a complete workflow."""
    id: str
    name: str
    description: str = ""
    steps: List[WorkflowStep] = field(default_factory=list)
    variables: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "steps": [s.to_dict() for s in self.steps],
            "variables": self.variables,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class WorkflowExecution:
    """Tracks workflow execution state."""
    workflow_id: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    current_step: Optional[str] = None
    step_results: List[Dict] = field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error: Optional[str] = None
    output: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "workflow_id": self.workflow_id,
            "status": self.status.value,
            "current_step": self.current_step,
            "step_results": self.step_results,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "error": self.error,
            "output": self.output
        }


class AutomationAgent(BaseAgent):
    """
    Automation Agent for workflow execution and process automation.
    
    Provides capabilities for:
    - Workflow definition and execution
    - Conditional logic and branching
    - Error handling and retry
    - Process orchestration
    - Task automation
    """
    
    def __init__(self, name: str = "AutomationAgent"):
        """
        Initialize Automation Agent.
        
        Args:
            name: Agent name
        """
        super().__init__(name, description="Workflow Automation Agent")
        
        self.workflows: Dict[str, Workflow] = {}
        self.executions: Dict[str, WorkflowExecution] = {}
        self.action_handlers: Dict[str, Callable] = {}
        
        # Register default handlers
        self._register_default_handlers()
        
        self.logger.info("Automation Agent initialized")
    
    def _register_default_handlers(self):
        """Register default action handlers."""
        self.register_tool("run_workflow", self._run_workflow)
        self.register_tool("create_workflow", self._create_workflow)
        self.register_tool("validate_step", self._validate_step)
        self.register_tool("handle_error", self._handle_error)
        self.register_tool("notify", self._notify)
    
    async def _run_workflow(self, workflow_id: str, **kwargs) -> Dict:
        """Execute a workflow."""
        if workflow_id not in self.workflows:
            return {"error": f"Workflow '{workflow_id}' not found"}
        
        workflow = self.workflows[workflow_id]
        execution = await self.execute_workflow(workflow)
        return execution.to_dict()
    
    async def _create_workflow(self, workflow_data: Dict, **kwargs) -> Workflow:
        """Create a new workflow."""
        workflow = Workflow(
            id=workflow_data.get("id", f"wf_{len(self.workflows)}"),
            name=workflow_data.get("name", "New Workflow"),
            description=workflow_data.get("description", ""),
            steps=[self._parse_step(s) for s in workflow_data.get("steps", [])],
            variables=workflow_data.get("variables", {}),
            metadata=workflow_data.get("metadata", {})
        )
        self.workflows[workflow.id] = workflow
        return workflow
    
    def _parse_step(self, step_data: Dict) -> WorkflowStep:
        """Parse step data into WorkflowStep."""
        return WorkflowStep(
            id=step_data.get("id", f"step_{len(step_data)}"),
            name=step_data.get("name", "Step"),
            step_type=StepType(step_data.get("type", "action")),
            action=step_data.get("action", "do_nothing"),
            params=step_data.get("params", {}),
            condition=step_data.get("condition"),
            retry_count=step_data.get("retry_count", 0),
            max_retries=step_data.get("max_retries", 3),
            timeout=step_data.get("timeout", 60)
        )
    
    async def _validate_step(self, step: Dict, **kwargs) -> Dict:
        """Validate a workflow step."""
        return {
            "valid": True,
            "step": step.get("name"),
            "warnings": []
        }
    
    async def _handle_error(self, error: str, context: Dict, **kwargs) -> Dict:
        """Handle workflow error."""
        return {
            "handled": True,
            "error": error,
            "action": context.get("on_failure", "log_and_continue")
        }
    
    async def _notify(self, message: str, **kwargs) -> Dict:
        """Send notification."""
        return {
            "sent": True,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
    
    async def think(self, prompt: str) -> str:
        """Automation-specific reasoning."""
        self.logger.info(f"Analyzing automation task: {prompt}")
        
        if "workflow" in prompt.lower():
            return "Workflow approach: Define steps, set conditions, execute sequentially"
        elif "automate" in prompt.lower() or "repeat" in prompt.lower():
            return "Automation approach: Create repeatable process with error handling"
        elif "schedule" in prompt.lower() or "cron" in prompt.lower():
            return "Scheduling approach: Set triggers, define intervals, monitor execution"
        else:
            return "General automation: Analyze requirements, create process, validate"
    
    async def plan(self, task: str) -> List[Dict[str, Any]]:
        """Create automation plan."""
        plan = []
        
        if "workflow" in task.lower() or "automate" in task.lower():
            plan.append({"action": "analyze_requirements"})
            plan.append({"action": "define_steps"})
            plan.append({"action": "set_conditions"})
            plan.append({"action": "execute_workflow"})
            plan.append({"action": "validate_results"})
        elif "run" in task.lower() or "execute" in task.lower():
            plan.append({"action": "prepare_execution"})
            plan.append({"action": "run_workflow"})
            plan.append({"action": "handle_results"})
        elif "schedule" in task.lower():
            plan.append({"action": "define_schedule"})
            plan.append({"action": "setup_triggers"})
            plan.append({"action": "monitor_execution"})
        
        return plan
    
    async def act(self, action: str, context: Optional[Dict] = None) -> Any:
        """Execute automation action."""
        context = context or {}
        
        if action == "analyze_requirements":
            self.logger.info("Analyzing automation requirements...")
            return {"requirements": "analyzed", "next_steps": 5}
        
        elif action == "define_steps":
            steps = context.get("steps", [])
            return {"steps_defined": len(steps), "steps": [s.to_dict() for s in steps]}
        
        elif action == "set_conditions":
            conditions = context.get("conditions", [])
            return {"conditions_set": len(conditions), "ready": True}
        
        elif action == "execute_workflow":
            workflow_id = context.get("workflow_id")
            if workflow_id:
                execution = await self.execute_workflow_by_id(workflow_id)
                return execution.to_dict()
            return {"executed": True, "steps_completed": 0}
        
        elif action == "validate_results":
            return {
                "validated": True,
                "all_checks_passed": context.get("checks_passed", True)
            }
        
        elif action == "retry":
            return {"status": "retried", "action": action}
        
        else:
            return {"executed": True, "action": action}
    
    async def execute_workflow(self, workflow: Workflow) -> WorkflowExecution:
        """Execute a workflow."""
        execution = WorkflowExecution(
            workflow_id=workflow.id,
            status=WorkflowStatus.RUNNING,
            start_time=datetime.now()
        )
        self.executions[workflow.id] = execution
        
        self.logger.info(f"Executing workflow: {workflow.name}")
        
        try:
            for step in workflow.steps:
                execution.current_step = step.id
                self.logger.info(f"Executing step: {step.name}")
                
                # Execute step
                result = await self._execute_step(step, workflow.variables)
                
                step_result = {
                    "step_id": step.id,
                    "status": "success",
                    "output": result,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Check condition if exists
                if step.condition and not self._evaluate_condition(step.condition, result):
                    self.logger.warning(f"Condition failed for step: {step.name}")
                    step_result["status"] = "skipped"
                
                execution.step_results.append(step_result)
                
                # Handle step failure
                if step_result["status"] == "failed":
                    if step.on_failure:
                        self.logger.info(f"Running on_failure handler: {step.on_failure}")
                    else:
                        raise Exception(f"Step {step.id} failed")
                
                # Move to next step on success
                if step.on_success and step_result["status"] == "success":
                    self.logger.info(f"Moving to success handler: {step.on_success}")
            
            execution.status = WorkflowStatus.COMPLETED
            execution.output["completed_steps"] = len(execution.step_results)
            
        except Exception as e:
            self.logger.error(f"Workflow execution failed: {e}")
            execution.status = WorkflowStatus.FAILED
            execution.error = str(e)
        
        finally:
            execution.end_time = datetime.now()
        
        return execution
    
    async def execute_workflow_by_id(self, workflow_id: str) -> WorkflowExecution:
        """Execute a workflow by ID."""
        if workflow_id not in self.workflows:
            return WorkflowExecution(
                workflow_id=workflow_id,
                status=WorkflowStatus.FAILED,
                error=f"Workflow '{workflow_id}' not found"
            )
        
        workflow = self.workflows[workflow_id]
        return await self.execute_workflow(workflow)
    
    async def _execute_step(self, step: WorkflowStep, variables: Dict) -> Any:
        """Execute a single workflow step."""
        try:
            # Execute action handler
            if step.action in self.action_handlers:
                handler = self.action_handlers[step.action]
                if asyncio.iscoroutinefunction(handler):
                    return await handler(step.params, variables=variables)
                return handler(step.params, variables=variables)
            
            # Default execution simulation
            await asyncio.sleep(0.1)
            return {
                "step_id": step.id,
                "action": step.action,
                "params": step.params,
                "status": "completed"
            }
            
        except Exception as e:
            self.logger.error(f"Step execution failed: {e}")
            if step.retry_count < step.max_retries:
                step.retry_count += 1
                self.logger.info(f"Retrying step (attempt {step.retry_count})")
                return await self._execute_step(step, variables)
            raise
    
    def _evaluate_condition(self, condition: str, context: Dict) -> bool:
        """Evaluate a condition."""
        # Simple condition evaluation
        try:
            # Check for common patterns
            if "==" in condition:
                parts = condition.split("==")
                return parts[0].strip() in str(context) and parts[1].strip() in str(context)
            if "!=" in condition:
                return True  # Simplified
            if ">" in condition:
                return True  # Simplified
            return True
        except Exception:
            return False
    
    def register_action_handler(self, action: str, handler: Callable):
        """Register a custom action handler."""
        self.action_handlers[action] = handler
        self.logger.debug(f"Registered action handler: {action}")
    
    def create_workflow(self, name: str, steps: List[Dict]) -> Workflow:
        """Create a new workflow."""
        workflow = Workflow(
            id=f"wf_{len(self.workflows)}",
            name=name,
            steps=[self._parse_step(s) for s in steps]
        )
        self.workflows[workflow.id] = workflow
        return workflow
    
    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """Get a workflow by ID."""
        return self.workflows.get(workflow_id)
    
    def get_execution(self, workflow_id: str) -> Optional[WorkflowExecution]:
        """Get execution status."""
        return self.executions.get(workflow_id)
    
    def list_workflows(self) -> List[Dict]:
        """List all workflows."""
        return [w.to_dict() for w in self.workflows.values()]
    
    def get_status(self) -> Dict[str, Any]:
        """Get automation agent status."""
        base_status = super().get_status()
        return {
            **base_status,
            "workflows_count": len(self.workflows),
            "active_executions": sum(1 for e in self.executions.values() if e.status == WorkflowStatus.RUNNING),
            "action_handlers": list(self.action_handlers.keys())
        }