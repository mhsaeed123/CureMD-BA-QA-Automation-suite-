"""
Test Builder
============
Builder pattern for creating structured test cases and suites.

Author: CureMD BA QA Team
Version: 1.0.0
"""

import logging
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


logger = logging.getLogger("coder.test_builder")


# ============================================================================
# ENUMS
# ============================================================================

class TestType(Enum):
    """Type of test."""
    UI = "ui"
    API = "api"
    UNIT = "unit"
    INTEGRATION = "integration"
    E2E = "e2e"
    PERFORMANCE = "performance"
    SECURITY = "security"


class AssertionType(Enum):
    """Type of assertion."""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    EXISTS = "exists"
    NOT_EXISTS = "not_exists"
    IS_TRUE = "is_true"
    IS_FALSE = "is_false"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    REGEX_MATCH = "regex_match"
    CUSTOM = "custom"


class StepType(Enum):
    """Type of test step."""
    ACTION = "action"
    NAVIGATION = "navigation"
    VERIFICATION = "verification"
    WAIT = "wait"
    CONDITION = "condition"


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class Assertion:
    """An assertion in a test step."""
    type: AssertionType
    actual: str
    expected: str = ""
    message: str = ""
    custom_func: Optional[str] = None
    negate: bool = False
    
    def to_dict(self) -> Dict:
        return {
            "type": self.type.value,
            "actual": self.actual,
            "expected": self.expected,
            "message": self.message,
            "negate": self.negate
        }


@dataclass
class Step:
    """A single step in a test."""
    id: str
    name: str
    step_type: StepType
    action: str
    params: Dict[str, Any] = field(default_factory=dict)
    assertions: List[Assertion] = field(default_factory=list)
    timeout: int = 30000
    retry_count: int = 0
    on_failure: str = "continue"  # continue, abort, retry
    order: int = 0
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.step_type.value,
            "action": self.action,
            "params": self.params,
            "assertions": [a.to_dict() for a in self.assertions],
            "timeout": self.timeout,
            "retry_count": self.retry_count
        }


@dataclass
class TestCase:
    """A complete test case."""
    id: str
    name: str
    description: str = ""
    test_type: TestType = TestType.UI
    priority: int = 2  # 1=critical, 5=low
    tags: List[str] = field(default_factory=list)
    steps: List[Step] = field(default_factory=list)
    setup: Optional[str] = None
    teardown: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "type": self.test_type.value,
            "priority": self.priority,
            "tags": self.tags,
            "steps": [s.to_dict() for s in self.steps],
            "setup": self.setup,
            "teardown": self.teardown,
            "data": self.data,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class TestSuite:
    """A collection of related test cases."""
    id: str
    name: str
    description: str = ""
    test_cases: List[TestCase] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "test_cases": [tc.to_dict() for tc in self.test_cases],
            "tags": self.tags,
            "config": self.config,
            "created_at": self.created_at.isoformat()
        }


# ============================================================================
# STEP BUILDER
# ============================================================================

class StepBuilder:
    """Builder for creating test steps."""
    
    def __init__(self, step_id: str, name: str, step_type: StepType = StepType.ACTION):
        self._step = Step(
            id=step_id,
            name=name,
            step_type=step_type,
            action=""
        )
    
    def action(self, action: str, **params) -> 'StepBuilder':
        """Set the action to perform."""
        self._step.action = action
        self._step.params = params
        return self
    
    def with_timeout(self, timeout: int) -> 'StepBuilder':
        """Set step timeout in ms."""
        self._step.timeout = timeout
        return self
    
    def with_retry(self, count: int) -> 'StepBuilder':
        """Set retry count."""
        self._step.retry_count = count
        return self
    
    def on_failure(self, behavior: str) -> 'StepBuilder':
        """Set failure behavior (continue, abort, retry)."""
        self._step.on_failure = behavior
        return self
    
    def assert_that(
        self,
        actual: str,
        assertion_type: AssertionType,
        expected: str = "",
        message: str = "",
        negate: bool = False
    ) -> 'StepBuilder':
        """Add an assertion."""
        self._step.assertions.append(Assertion(
            type=assertion_type,
            actual=actual,
            expected=expected,
            message=message,
            negate=negate
        ))
        return self
    
    def order(self, order: int) -> 'StepBuilder':
        """Set execution order."""
        self._step.order = order
        return self
    
    def build(self) -> Step:
        """Build and return the step."""
        return self._step


# ============================================================================
# TEST CASE BUILDER
# ============================================================================

class TestCaseBuilder:
    """Builder for creating test cases."""
    
    def __init__(self, test_id: str, name: str, test_type: TestType = TestType.UI):
        self._test = TestCase(
            id=test_id,
            name=name,
            test_type=test_type
        )
    
    def description(self, description: str) -> 'TestCaseBuilder':
        """Set test description."""
        self._test.description = description
        return self
    
    def priority(self, priority: int) -> 'TestCaseBuilder':
        """Set priority (1=critical, 5=low)."""
        self._test.priority = priority
        return self
    
    def tags(self, *tags: str) -> 'TestCaseBuilder':
        """Add tags."""
        self._test.tags.extend(tags)
        return self
    
    def with_data(self, **data) -> 'TestCaseBuilder':
        """Add test data."""
        self._test.data.update(data)
        return self
    
    def step(self, step: Step) -> 'TestCaseBuilder':
        """Add a step."""
        self._test.steps.append(step)
        return self
    
    def add_step(
        self,
        step_id: str,
        name: str,
        action: str,
        step_type: StepType = StepType.ACTION,
        **params
    ) -> 'TestCaseBuilder':
        """Add a step using builder."""
        step = StepBuilder(step_id, name, step_type).action(action, **params).build()
        self._test.steps.append(step)
        return self
    
    def navigate(self, url: str, step_id: str = None) -> 'TestCaseBuilder':
        """Add a navigation step."""
        step_id = step_id or f"nav_{len(self._test.steps)}"
        self._test.steps.append(StepBuilder(
            step_id, f"Navigate to {url}", StepType.NAVIGATION
        ).action("navigate", url=url).build())
        return self
    
    def click(self, selector: str, step_id: str = None) -> 'TestCaseBuilder':
        """Add a click step."""
        step_id = step_id or f"click_{len(self._test.steps)}"
        self._test.steps.append(StepBuilder(
            step_id, f"Click {selector}", StepType.ACTION
        ).action("click", selector=selector).build())
        return self
    
    def type(self, selector: str, text: str, step_id: str = None) -> 'TestCaseBuilder':
        """Add a type step."""
        step_id = step_id or f"type_{len(self._test.steps)}"
        self._test.steps.append(StepBuilder(
            step_id, f"Type into {selector}", StepType.ACTION
        ).action("type", selector=selector, text=text).build())
        return self
    
    def verify(self, selector: str, step_id: str = None) -> 'TestCaseBuilder':
        """Add a verification step."""
        step_id = step_id or f"verify_{len(self._test.steps)}"
        self._test.steps.append(StepBuilder(
            step_id, f"Verify {selector}", StepType.VERIFICATION
        ).action("verify", selector=selector).build())
        return self
    
    def wait(self, seconds: float, step_id: str = None) -> 'TestCaseBuilder':
        """Add a wait step."""
        step_id = step_id or f"wait_{len(self._test.steps)}"
        self._test.steps.append(StepBuilder(
            step_id, f"Wait {seconds}s", StepType.WAIT
        ).action("wait", seconds=seconds).build())
        return self
    
    def assert_equals(self, actual: str, expected: str, message: str = "") -> 'TestCaseBuilder':
        """Add an equals assertion to the last step."""
        if self._test.steps:
            self._test.steps[-1].assertions.append(Assertion(
                type=AssertionType.EQUALS,
                actual=actual,
                expected=expected,
                message=message
            ))
        return self
    
    def setup(self, setup_func: str) -> 'TestCaseBuilder':
        """Set setup function."""
        self._test.setup = setup_func
        return self
    
    def teardown(self, teardown_func: str) -> 'TestCaseBuilder':
        """Set teardown function."""
        self._test.teardown = teardown_func
        return self
    
    def metadata(self, **kwargs) -> 'TestCaseBuilder':
        """Add metadata."""
        self._test.metadata.update(kwargs)
        return self
    
    def build(self) -> TestCase:
        """Build and return the test case."""
        # Sort steps by order
        self._test.steps.sort(key=lambda s: s.order)
        return self._test


# ============================================================================
# TEST SUITE BUILDER
# ============================================================================

class TestSuiteBuilder:
    """Builder for creating test suites."""
    
    def __init__(self, suite_id: str, name: str):
        self._suite = TestSuite(id=suite_id, name=name)
    
    def description(self, description: str) -> 'TestSuiteBuilder':
        """Set suite description."""
        self._suite.description = description
        return self
    
    def tags(self, *tags: str) -> 'TestSuiteBuilder':
        """Add tags."""
        self._suite.tags.extend(tags)
        return self
    
    def config(self, **config) -> 'TestSuiteBuilder':
        """Set suite configuration."""
        self._suite.config.update(config)
        return self
    
    def add_test(self, test: TestCase) -> 'TestSuiteBuilder':
        """Add a test case."""
        self._suite.test_cases.append(test)
        return self
    
    def create_test(
        self,
        test_id: str,
        name: str,
        test_type: TestType = TestType.UI,
        priority: int = 2
    ) -> TestCaseBuilder:
        """Create and add a test case using builder."""
        builder = TestCaseBuilder(test_id, name, test_type)
        builder._test.priority = priority
        return builder
    
    def build(self) -> TestSuite:
        """Build and return the suite."""
        return self._suite


# ============================================================================
# TEST BUILDER (MAIN FACADE)
# ============================================================================

class TestBuilder:
    """
    Main test builder class providing a fluent interface
    for creating test cases and suites.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("coder.test_builder")
        self._current_suite: Optional[TestSuite] = None
    
    def create_suite(self, suite_id: str, name: str) -> TestSuiteBuilder:
        """Create a new test suite."""
        self._current_suite = TestSuiteBuilder(suite_id, name).build()
        return TestSuiteBuilder(suite_id, name)
    
    def create_test(
        self,
        test_id: str,
        name: str,
        test_type: TestType = TestType.UI
    ) -> TestCaseBuilder:
        """Create a new test case."""
        return TestCaseBuilder(test_id, name, test_type)
    
    def create_step(
        self,
        step_id: str,
        name: str,
        step_type: StepType = StepType.ACTION
    ) -> StepBuilder:
        """Create a new step."""
        return StepBuilder(step_id, name, step_type)
    
    def quick_ui_test(
        self,
        test_id: str,
        name: str,
        steps: List[Dict]
    ) -> TestCase:
        """
        Create a quick UI test from step definitions.
        
        Args:
            test_id: Test ID
            name: Test name
            steps: List of step definitions
            
        Returns:
            Test case
        """
        builder = TestCaseBuilder(test_id, name, TestType.UI)
        
        for i, step_def in enumerate(steps):
            action = step_def.get("action", "click")
            selector = step_def.get("selector", "")
            value = step_def.get("value", "")
            
            if action == "navigate":
                builder.navigate(value, f"{test_id}_step_{i}")
            elif action == "click":
                builder.click(selector, f"{test_id}_step_{i}")
            elif action == "type":
                builder.type(selector, value, f"{test_id}_step_{i}")
            elif action == "verify":
                builder.verify(selector, f"{test_id}_step_{i}")
            elif action == "wait":
                builder.wait(value, f"{test_id}_step_{i}")
        
        return builder.build()
    
    def from_spec(self, spec: Dict) -> TestSuite:
        """
        Create test suite from specification.
        
        Args:
            spec: Test specification
            
        Returns:
            Test suite
        """
        suite_builder = TestSuiteBuilder(
            spec.get("id", "suite_1"),
            spec.get("name", "Test Suite")
        ).description(spec.get("description", ""))
        
        # Add tags
        if "tags" in spec:
            suite_builder.tags(*spec["tags"])
        
        # Add config
        if "config" in spec:
            suite_builder.config(**spec["config"])
        
        # Add test cases
        for test_spec in spec.get("tests", []):
            test_builder = suite_builder.create_test(
                test_spec["id"],
                test_spec["name"],
                TestType(test_spec.get("type", "ui"))
            ).description(test_spec.get("description", ""))
            
            # Add priority
            if "priority" in test_spec:
                test_builder.priority(test_spec["priority"])
            
            # Add tags
            if "tags" in test_spec:
                test_builder.tags(*test_spec["tags"])
            
            # Add steps
            for step_spec in test_spec.get("steps", []):
                step_builder = test_builder.step(
                    StepBuilder(
                        step_spec["id"],
                        step_spec["name"],
                        StepType(step_spec.get("type", "action"))
                    ).action(step_spec["action"], **step_spec.get("params", {}))
                )
                
                # Add assertions
                for assertion in step_spec.get("assertions", []):
                    step_builder.assert_that(
                        assertion["actual"],
                        AssertionType(assertion["type"]),
                        assertion.get("expected", ""),
                        assertion.get("message", "")
                    )
            
            suite_builder.add_test(test_builder.build())
        
        return suite_builder.build()
    
    def to_json(self, suite: TestSuite) -> str:
        """Export suite to JSON."""
        import json
        return json.dumps(suite.to_dict(), indent=2)
    
    def from_json(self, json_str: str) -> TestSuite:
        """Import suite from JSON."""
        import json
        data = json.loads(json_str)
        return TestSuite(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            test_cases=[self._dict_to_test_case(tc) for tc in data.get("test_cases", [])],
            tags=data.get("tags", []),
            config=data.get("config", {})
        )
    
    def _dict_to_test_case(self, data: Dict) -> TestCase:
        """Convert dict to TestCase."""
        return TestCase(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            test_type=TestType(data.get("type", "ui")),
            priority=data.get("priority", 2),
            tags=data.get("tags", []),
            steps=[self._dict_to_step(s) for s in data.get("steps", [])],
            setup=data.get("setup"),
            teardown=data.get("teardown"),
            data=data.get("data", {}),
            metadata=data.get("metadata", {})
        )
    
    def _dict_to_step(self, data: Dict) -> Step:
        """Convert dict to Step."""
        return Step(
            id=data["id"],
            name=data["name"],
            step_type=StepType(data.get("type", "action")),
            action=data["action"],
            params=data.get("params", {}),
            assertions=[
                Assertion(
                    type=AssertionType(a["type"]),
                    actual=a["actual"],
                    expected=a.get("expected", ""),
                    message=a.get("message", ""),
                    negate=a.get("negate", False)
                )
                for a in data.get("assertions", [])
            ],
            timeout=data.get("timeout", 30000),
            retry_count=data.get("retry_count", 0)
        )


# ============================================================================
# USAGE EXAMPLES
# ============================================================================

if __name__ == "__main__":
    builder = TestBuilder()
    
    # Create a simple test
    test = builder.create_test("login_test", "User Login Test", TestType.UI) \
        .description("Test user login functionality") \
        .priority(1) \
        .tags("smoke", "auth") \
        .navigate("https://example.com/login") \
        .type("#username", "user@example.com") \
        .type("#password", "password123") \
        .click("button[type='submit']") \
        .verify(".dashboard") \
        .assert_equals("url", "/dashboard", "Should redirect to dashboard") \
        .build()
    
    print(f"Created test: {test.name}")
    print(f"Steps: {len(test.steps)}")
    print(test.to_dict())
    
    # Create a suite
    suite = builder.create_suite("smoke_suite", "Smoke Test Suite") \
        .description("Smoke tests for critical flows") \
        .tags("smoke", "critical") \
        .add_test(test) \
        .build()
    
    print(f"\nSuite: {suite.name}")
    print(f"Tests: {len(suite.test_cases)}")
    
    # Quick UI test
    quick_test = builder.quick_ui_test(
        "quick_checkout",
        "Quick Checkout Test",
        [
            {"action": "navigate", "value": "https://example.com/cart"},
            {"action": "click", "selector": ".checkout-btn"},
            {"action": "type", "selector": "#card-number", "value": "4111111111111111"},
            {"action": "click", "selector": ".pay-btn"}
        ]
    )
    
    print(f"\nQuick test: {quick_test.name}")
    print(f"Steps: {[s.action for s in quick_test.steps]}")