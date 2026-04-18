@echo off
chcp 65001 >nul
title CureMD BA QA Automation Suite - Super App
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════════════╗
echo  ║         CureMD BA QA Automation Suite - Super App              ║
echo  ║              AI Super App v1.0.0                              ║
echo  ╚═══════════════════════════════════════════════════════════════╝
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.9+
    pause
    exit /b 1
)

:: Check if we're in the right directory
if not exist "src\super_app.py" (
    echo [ERROR] Please run this from the project root directory!
    pause
    exit /b 1
)

:menu
echo.
echo  ┌─────────────────────────────────────────────────────────────┐
echo  │                        MAIN MENU                           │
echo  ├─────────────────────────────────────────────────────────────┤
echo  │  1. Install Dependencies                                   │
echo  │  2. Interactive Mode (Chat with AI)                        │
echo  │  3. Run Single Task                                        │
echo  │  4. Start API Server (http://localhost:8000)               │
echo  │  5. Run Tests                                              │
echo  │  6. Browse URL                                             │
echo  │  7. Show Configuration                                     │
echo  │  8. Setup Git & Push to GitHub                            │
echo  │  9. Open API Docs (http://localhost:8000/docs)             │
echo  │  10. Exit                                                  │
echo  └─────────────────────────────────────────────────────────────┘
echo.

set /p choice="Enter your choice (1-10): "

if "%choice%"=="1" goto install
if "%choice%"=="2" goto interactive
if "%choice%"=="3" goto task
if "%choice%"=="4" goto server
if "%choice%"=="5" goto tests
if "%choice%"=="6" goto browse
if "%choice%"=="7" goto config
if "%choice%"=="8" goto git
if "%choice%"=="9" goto docs
if "%choice%"=="10" goto end

echo [ERROR] Invalid choice!
goto menu

:install
echo.
echo [INFO] Installing dependencies...
pip install -r requirements.txt
echo.
echo [DONE] Dependencies installed!
echo.
pause
goto menu

:interactive
echo.
echo [INFO] Starting Interactive Mode...
echo [INFO] Type 'quit' to exit, 'help' for commands
echo.
python -c "import sys; sys.path.insert(0, 'src'); from super_app import main; main()"
goto menu

:task
echo.
set /p task="Enter your task: "
echo.
echo [INFO] Running task: %task%
python -c "import sys; sys.path.insert(0, 'src'); from super_app import main; main()"
goto menu

:server
echo.
echo [INFO] Starting API Server at http://localhost:8000
echo [INFO] Press Ctrl+C to stop
echo.
python -m uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
goto menu

:tests
echo.
echo [INFO] Running tests...
pytest tests/ -v --tb=short
echo.
pause
goto menu

:browse
echo.
set /p url="Enter URL to browse: "
echo.
echo [INFO] Browsing: %url%
python -c "import sys; sys.path.insert(0, 'src'); from super_app import SuperApp; import asyncio; asyncio.run(SuperApp().browse('%url%'))"
echo.
pause
goto menu

:config
echo.
python cli.py --config
echo.
pause
goto menu

:git
echo.
echo [INFO] Setting up Git...
echo.
git init 2>nul
echo.
set /p remote="Enter GitHub repo URL (or press Enter to skip): "
if not "%remote%"=="" (
    git remote add origin %remote%
    echo [INFO] Remote added: %remote%
)
echo.
echo [INFO] Staging all files...
git add .
echo.
set /p commitmsg="Enter commit message: "
if "%commitmsg%"=="" set commitmsg=Initial commit - Super App v1.0.0
git commit -m "%commitmsg%"
echo.
set /p push="Push to remote? (y/n): "
if /i "%push%"=="y" (
    echo [INFO] Pushing to remote...
    git push -u origin master --force
)
echo.
pause
goto menu

:docs
echo.
echo [INFO] Opening API documentation...
start http://localhost:8000/docs
goto menu

:end
echo.
echo [INFO] Goodbye!
echo.
exit /b 0
