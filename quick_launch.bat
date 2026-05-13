@echo off
title CureMD BA QA Super App - Quick Launcher
color 0A
cls

echo ╔══════════════════════════════════════════════════════════╗
echo ║     CureMD BA QA SUPER APP - QUICK LAUNCHER v1.0         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Install from python.org
    pause
    exit /b 1
)

:: Set paths
set APP_DIR=%~dp0
cd /d "%APP_DIR%"

:: Create venv if not exists
if not exist ".venv\Scripts\python.exe" (
    echo [1/4] Creating Virtual Environment...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create venv
        pause
        exit /b 1
    )
    echo [OK] Virtual Environment created
)

:: Activate venv
set PATH=%APP_DIR%.venv\Scripts;%PATH%

:: Install dependencies if needed
echo [2/4] Checking dependencies...
.venv\Scripts\pip install -q --upgrade pip 2>nul
.venv\Scripts\pip install -q -r requirements.txt 2>nul
if errorlevel 1 (
    echo [WARNING] Some dependencies failed. Run: pip install -r requirements.txt
)

:: Install Playwright browsers
echo [3/4] Checking Playwright...
python -c "import playwright" 2>nul
if errorlevel 1 (
    echo [INFO] Installing Playwright browsers...
    .venv\Scripts\python -m playwright install chromium --with-deps 2>nul
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  SELECT MODE:                                             ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo  [1] Interactive Chat Mode
echo  [2] Single Task Mode
echo  [3] API Server (http://localhost:8000)
echo  [4] Skills/MCP Manager
echo  [5] Module Browser
echo  [6] Guardrails / Authorization Mode
echo  [7] LLM Runtime Manager
echo  [8] Run Tests
echo  [9] Setup GitHub Sync
echo  [0] Exit
echo.
echo ═══════════════════════════════════════════════════════════
echo.

set /p choice="Enter choice [1-9, 0 to exit]: "

if "%choice%"=="1" goto INTERACTIVE
if "%choice%"=="2" goto SINGLETASK
if "%choice%"=="3" goto SERVER
if "%choice%"=="4" goto SKILLS
if "%choice%"=="5" goto MODULES
if "%choice%"=="6" goto GUARDRAILS
if "%choice%"=="7" goto LLM
if "%choice%"=="8" goto TESTS
if "%choice%"=="9" goto GITHUB
if "%choice%"=="0" goto END

echo [ERROR] Invalid choice!
goto END

:INTERACTIVE
echo.
echo [LAUNCHING] Interactive Mode...
echo ═══════════════════════════════════════════════════════════
.venv\Scripts\python cli.py --interactive
goto END

:SINGLETASK
echo.
set /p task="Enter task: "
echo.
echo [LAUNCHING] Task: %task%
echo ═══════════════════════════════════════════════════════════
.venv\Scripts\python cli.py "%task%"
goto END

:SERVER
echo.
echo [LAUNCHING] API Server at http://localhost:8000
echo [INFO] Open http://localhost:8000/docs for Swagger UI
echo ═══════════════════════════════════════════════════════════
.venv\Scripts\python -m uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
goto END

:SKILLS
echo.
echo [MENU] Skills/MCP Manager
echo.
echo  [a] Search Skills
echo  [b] Fetch from GitHub
echo  [c] Suggest Modules for Task
echo  [d] List Available MCP Tools
echo.
set /p skill_choice="Enter choice [a-d]: "
if "%skill_choice%"=="a" set /p query="Search query: " && .venv\Scripts\python -m src.skills search "%query%"
if "%skill_choice%"=="b" set /p url="GitHub URL: " && .venv\Scripts\python -m src.skills fetch "%url%"
if "%skill_choice%"=="c" set /p task="Task description: " && .venv\Scripts\python -m src.skills suggest "%task%"
if "%skill_choice%"=="d" .venv\Scripts\python -c "from src.skills import get_mcp_client; from src.db import get_database; import asyncio; db=get_database(); client=asyncio.run(get_mcp_client(db)); print(client.get_available_tools())"
goto END

:MODULES
echo.
echo [MENU] Module Browser
echo.
echo  [a] List All Modules
echo  [b] List Generalist Modules
echo  [c] List Specialist Modules
echo  [d] List Active Modules
echo.
set /p mod_choice="Enter choice [a-d]: "
if "%mod_choice%"=="a" .venv\Scripts\python -c "from src.db import get_database; db=get_database(); mods=db.get_all_modules(); [print(f'{m.id}: {m.name} [{m.category}]') for m in mods]"
if "%mod_choice%"=="b" .venv\Scripts\python -c "from src.db import get_database; db=get_database(); mods=db.get_modules_by_category('generalist'); [print(f'{m.id}: {m.name}') for m in mods]"
if "%mod_choice%"=="c" .venv\Scripts\python -c "from src.db import get_database; db=get_database(); mods=db.get_modules_by_category('specialist'); [print(f'{m.id}: {m.name}') for m in mods]"
if "%mod_choice%"=="d" .venv\Scripts\python -c "from src.db import get_database; db=get_database(); mods=db.get_all_modules(enabled_only=True); [print(f'{m.id}: {m.name} [{m.category}]') for m in mods]"
goto END

:GUARDRAILS
echo.
echo [LAUNCHING] Guardrails Authorization Mode...
echo ═══════════════════════════════════════════════════════════
.venv\Scripts\python -c "from src.guardrails import GuardrailsSystem; gs=GuardrailsSystem(); print('Guardrails System Active')"
goto END

:LLM
echo.
echo [MENU] LLM Runtime Manager
echo.
echo  [a] List Providers
echo  [b] Show Usage Stats
echo  [c] Configure Provider
echo  [d] Test Provider
echo.
set /p llm_choice="Enter choice [a-d]: "
if "%llm_choice%"=="a" .venv\Scripts\python -c "from src.llm_runtime import get_llm_manager; mgr=get_llm_manager(); print(mgr.get_providers())"
if "%llm_choice%"=="b" .venv\Scripts\python -c "from src.llm_runtime import get_llm_manager; mgr=get_llm_manager(); print(mgr.get_usage_stats())"
if "%llm_choice%"=="c" .venv\Scripts\python -c "from src.llm_runtime import get_llm_manager; mgr=get_llm_manager(); mgr.list_available_providers()"
if "%llm_choice%"=="d" set /p provider="Provider [openai/anthropic/ollama/gemini/claude]: " && .venv\Scripts\python -c "from src.llm_runtime import get_llm_manager; mgr=get_llm_manager(); import asyncio; asyncio.run(mgr.test_provider('%provider%'))"
goto END

:TESTS
echo.
echo [MENU] Test Runner
echo.
echo  [u] Unit Tests
echo  [e] E2E Browser Tests
echo  [a] All Tests
echo.
set /p test_choice="Enter choice [u/e/a]: "
if "%test_choice%"=="u" .venv\Scripts\pytest tests/unit/ -v --tb=short
if "%test_choice%"=="e" .venv\Scripts\pytest tests/browser/ -v --headed --tb=short
if "%test_choice%"=="a" .venv\Scripts\pytest tests/ -v --tb=short
goto END

:GITHUB
echo.
echo [SETUP] GitHub Sync
echo.
git init 2>nul
git remote -v 2>nul | findstr origin >nul
if errorlevel 1 (
    set /p remote_url="GitHub Repo URL: "
    git remote add origin "%remote_url%"
)
echo.
echo [STATUS] Current Git Status:
git status --short
echo.
set /p commit_msg="Commit message [or Enter for default]: "
if "%commit_msg%"=="" set commit_msg=Auto-sync: Super App Update
git add .
git commit -m "%commit_msg%"
git push -u origin master --force
goto END

:END
echo.
echo ═══════════════════════════════════════════════════════════
echo Done! Press any key to exit...
pause >nul
