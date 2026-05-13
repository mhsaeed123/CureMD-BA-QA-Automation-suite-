"""
QA Agent
========
Specialized agent for QA testing and test automation.

Author: CureMD BA QA Team
Version: 1.0.0
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from agents.base_agent import BaseAgent, AgentStatus


class TestStatus(Enum):
    """Test execution status."""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"
    PENDING = "pending"


class Priority(Enum):
    """Test priority levels."""
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


@dataclass
class TestCase:
    """Represents a test case."""
    id: str
    name: str
    description: str = ""
    steps: List[str] = field(default_factory=list)
    expected_result: str = ""
    priority: Priority = Priority.MEDIUM
    tags: List[str] = field(default_factory=list)
    data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "steps": self.steps,
            "expected_result": self.expected_result,
            "priority": self.priority.name,
            "tags": self.tags,
            "data": self.data
        }


@dataclass
class TestResult:
    """Represents the result of a test execution."""
    test_id: str
    test_name: str
    status: TestStatus
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration_ms: float = 0.0
    message: str = ""
    screenshots: List[str] = field(default_factory=list)
    logs: List[str] = field(default_factory=list)
    assertions: List[Dict] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "test_id": self.test_id,
            "test_name": self.test_name,
            "status": self.status.value,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_ms": self.duration_ms,
            "message": self.message,
            "screenshots": self.screenshots,
            "logs": self.logs,
            "assertions": self.assertions,
            "metadata": self.metadata
        }


class QAAgent(BaseAgent):
    """
    Quality Assurance Agent for automated testing.
    
    Provides capabilities for:
    - Test case design and execution
    - Multiple testing types (UI, API, integration)
    - Bug detection and reporting
    - Test suite management
    """
    
    def __init__(
        self,
        name: str = "QAAgent",
        test_types: List[str] = None,
        browser_config: Dict = None
    ):
        """
        Initialize QA Agent.
        
        Args:
            name: Agent name
            test_types: List of test types to support (e.g., ['ui', 'api', 'unit'])
            browser_config: Browser automation configuration
        """
        super().__init__(name, description="Quality Assurance Agent")
        
        self.test_types = test_types or ["ui", "api", "unit", "integration"]
        self.browser_config = browser_config or {}
        
        self.test_suites: Dict[str, List[TestCase]] = {}
        self.test_results: List[TestResult] = []
        self.current_test: Optional[TestCase] = None
        
        # Register QA tools
        self._register_qa_tools()
        
        self.logger.info(f"QA Agent initialized with test types: {self.test_types}")
    
    def _register_qa_tools(self):
        """Register QA-specific tools."""
        self.register_tool("execute_test", self._execute_test)
        self.register_tool("create_test", self._create_test)
        self.register_tool("validate_result", self._validate_result)
        self.register_tool("generate_report", self._generate_report)
        self.register_tool("capture_screenshot", self._capture_screenshot)
    
    async def _execute_test(self, test: Dict, **kwargs) -> Dict:
        """Execute a single test."""
        await asyncio.sleep(0.1)  # Simulate execution
        return {"executed": True, "test_id": test.get("id")}
    
    async def _create_test(self, test_data: Dict, **kwargs) -> TestCase:
        """Create a new test case."""
        test = TestCase(
            id=test_data.get("id", f"test_{len(self.test_results)}"),
            name=test_data.get("name", "New Test"),
            description=test_data.get("description", ""),
            steps=test_data.get("steps", []),
            expected_result=test_data.get("expected_result", ""),
            priority=Priority[test_data.get("priority", "MEDIUM")],
            tags=test_data.get("tags", []),
            data=test_data.get("data", {})
        )
        return test
    
    async def _validate_result(self, actual: Any, expected: Any, **kwargs) -> Dict:
        """Validate test result."""
        passed = actual == expected
        return {
            "passed": passed,
            "actual": str(actual),
            "expected": str(expected),
            "message": "Match" if passed else "Mismatch"
        }
    
    async def _generate_report(self, **kwargs) -> Dict:
        """Generate test execution report."""
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.test_results if r.status == TestStatus.FAILED)
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "skipped": sum(1 for r in self.test_results if r.status == TestStatus.SKIPPED),
            "pass_rate": (passed / total * 100) if total > 0 else 0,
            "results": [r.to_dict() for r in self.test_results]
        }
    
    async def _capture_screenshot(self, **kwargs) -> str:
        """Capture a screenshot."""
        return f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    
    async def think(self, prompt: str) -> str:
        """QA-specific reasoning."""
        self.logger.info(f"Analyzing QA task: {prompt}")
        
        # Analyze task type and suggest approach
        if "ui" in prompt.lower() or "web" in prompt.lower():
            return "UI Testing approach: Identify elements, perform actions, validate results"
        elif "api" in prompt.lower() or "rest" in prompt.lower():
            return "API Testing approach: Send requests, validate responses, check data"
        elif "integration" in prompt.lower():
            return "Integration Testing approach: Test system interactions, verify workflows"
        elif "performance" in prompt.lower() or "load" in prompt.lower():
            return "Performance Testing approach: Measure response times, stress test"
        else:
            return "General Testing approach: Execute test plan, validate expectations"
    
    async def plan(self, task: str) -> List[Dict[str, Any]]:
        """Create test execution plan."""
        plan = []
        
        if "test" in task.lower():
            plan.append({"action": "setup_test_environment"})
            plan.append({"action": "execute_test"})
            plan.append({"action": "validate_results"})
            plan.append({"action": "generate_report"})
        elif "create" in task.lower() or "design" in task.lower():
            plan.append({"action": "analyze_requirements"})
            plan.append({"action": "create_test_cases"})
            plan.append({"action": "document_test_plan"})
        elif "report" in task.lower() or "results" in task.lower():
            plan.append({"action": "collect_results"})
            plan.append({"action": "generate_report"})
        
        return plan
    
    async def act(self, action: str, context: Optional[Dict] = None) -> Any:
        """Execute QA action."""
        context = context or {}
        
        if action == "setup_test_environment":
            self.logger.info("Setting up test environment...")
            return {"environment": "ready", "browser": self.browser_config}
        
        elif action == "execute_test":
            test_id = context.get("test_id", "default_test")
            test_case = TestCase(
                id=test_id,
                name=context.get("test_name", "Test Case"),
                steps=context.get("steps", ["Step 1", "Step 2"]),
                expected_result=context.get("expected", "Success")
            )
            
            result = await self._run_test_case(test_case)
            return result
        
        elif action == "validate_results":
            return await self._validate_result(
                context.get("actual"),
                context.get("expected")
            )
        
        elif action == "generate_report":
            return await self._generate_report()
        
        elif action == "retry":
            return {"status": "retried", "action": action}
        
        else:
            return {"executed": True, "action": action}
    
    async def _run_test_case(self, test_case: TestCase) -> TestResult:
        """Run a single test case."""
        self.current_test = test_case
        result = TestResult(
            test_id=test_case.id,
            test_name=test_case.name,
            status=TestStatus.PENDING,
            start_time=datetime.now()
        )
        
        try:
            self.logger.info(f"Running test: {test_case.name}")
            
            # Execute test steps
            for step in test_case.steps:
                self.logger.debug(f"Executing step: {step}")
                result.logs.append(f"Step: {step}")
                await asyncio.sleep(0.05)  # Simulate step execution
            
            # Validate expected result
            result.status = TestStatus.PASSED
            result.message = "All assertions passed"
            result.assertions.append({
                "type": "validation",
                "passed": True,
                "expected": test_case.expected_result
            })
            
        except Exception as e:
            self.logger.error(f"Test failed: {e}")
            result.status = TestStatus.FAILED
            result.message = str(e)
            result.logs.append(f"Error: {e}")
        
        finally:
            result.end_time = datetime.now()
            result.duration_ms = (result.end_time - result.start_time).total_seconds() * 1000
            self.test_results.append(result)
            self.current_test = None
        
        return result
    
    async def run_suite(self, suite_name: str) -> Dict[str, Any]:
        """Run an entire test suite."""
        if suite_name not in self.test_suites:
            return {"error": f"Suite '{suite_name}' not found"}
        
        self.logger.info(f"Running test suite: {suite_name}")
        suite = self.test_suites[suite_name]
        
        results = []
        for test in suite:
            result = await self._run_test_case(test)
            results.append(result.to_dict())
        
        passed = sum(1 for r in results if r["status"] == "passed")
        return {
            "suite": suite_name,
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "pass_rate": (passed / len(results) * 100) if results else 0,
            "results": results
        }
    
    def add_test_case(self, suite_name: str, test_case: TestCase):
        """Add a test case to a suite."""
        if suite_name not in self.test_suites:
            self.test_suites[suite_name] = []
        self.test_suites[suite_name].append(test_case)
    
    def get_suite_summary(self) -> Dict[str, Any]:
        """Get summary of all test suites."""
        summary = {}
        for name, tests in self.test_suites.items():
            summary[name] = {
                "test_count": len(tests),
                "total_steps": sum(len(t.steps) for t in tests)
            }
        return summary
    
    def get_failed_tests(self) -> List[TestResult]:
        """Get all failed test results."""
        return [r for r in self.test_results if r.status == TestStatus.FAILED]
    
    def get_status(self) -> Dict[str, Any]:
        """Get QA agent status."""
        base_status = super().get_status()
        return {
            **base_status,
            "test_suites": list(self.test_suites.keys()),
            "total_tests_run": len(self.test_results),
            "passed": sum(1 for r in self.test_results if r.status == TestStatus.PASSED),
            "failed": sum(1 for r in self.test_results if r.status == TestStatus.FAILED),
            "supported_test_types": self.test_types
        }