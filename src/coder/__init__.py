"""
CureMD BA QA Automation Suite - Coder Module
=============================================
Code generation and test building for QA automation.

Author: CureMD BA QA Team
Version: 1.0.0
"""

from .code_generator import (
    CodeGenerator,
    Language,
    CodeTemplate,
    generate_test_script
)
from .test_builder import (
    TestBuilder,
    TestCase,
    TestSuite,
    Step,
    Assertion
)

__all__ = [
    'CodeGenerator',
    'Language',
    'CodeTemplate',
    'generate_test_script',
    'TestBuilder',
    'TestCase',
    'TestSuite',
    'Step',
    'Assertion',
]

__version__ = '1.0.0'