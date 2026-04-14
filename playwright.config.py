"""
Pytest Configuration for Playwright
==================================
"""

import pytest

@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    """Add launch arguments for browser."""
    browser_type_launch_args.extend([
        "--disable-blink-features=AutomationControlled",
    ])
    return browser_type_launch_args

def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "e2e: end-to-end tests")
