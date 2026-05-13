"""
CureMD BA QA Automation Suite - Browser Module
================================================
Browser automation utilities and element handling.

Author: CureMD BA QA Team
Version: 1.0.0
"""

from .driver import BrowserDriver, DriverConfig, BrowserType
from .elements import (
    Element,
    ElementFinder,
    ElementWaiter,
    ElementAction,
    LocatorType
)

__all__ = [
    'BrowserDriver',
    'DriverConfig',
    'BrowserType',
    'Element',
    'ElementFinder',
    'ElementWaiter',
    'ElementAction',
    'LocatorType',
]

__version__ = '1.0.0'