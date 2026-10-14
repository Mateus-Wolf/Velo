@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 goto :error
if /i "%~1"=="--backend" goto :backend
if /i "%~1"=="--frontend" goto :frontend

echo ==========================================
echo   VELO - Instalar e iniciar
echo ==========================================
echo.

set "VELO_PY="
py -3.12 -c "import sys" >nul 2>&1
if not errorlevel 1 set "VELO_PY=py -3.12"
if defined VELO_PY goto :python_ready
py -3.11 -c "import sys" >nul 2>&1
if not errorlevel 1 set "VELO_PY=py -3.11"
if defined VELO_PY goto :python_ready
python -c "import sys; sys.exit(0 if (3,11) <= sys.version_info[:2] <= (3,12) else 1)" >nul 2>&1
if not errorlevel 1 set "VELO_PY=python"
if not defined VELO_PY (
    echo Instale Python 3.12, marque Add Python to PATH e execute novamente.
    echo Download: https://www.python.org/downloads/windows/
    goto :error
)

:python_ready
node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit((a===20 && b>=19 || a>=22 && (a>22 || b>=12)) ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    echo Instale Node.js LTS compativel com Vite e execute novamente.
    echo Requisito: Node 20.19+ ou 22.12+.
    echo Download: https://nodejs.org/
    goto :error
)
call npm.cmd --version >nul 2>&1
if errorlevel 1 goto :error
if /i "%~1"=="--check" (
    echo Python e Node.js encontrados. Pre-requisitos verificados.
    exit /b 0
)

echo [1/3] Instalando dependencias do backend...
if not exist "back\.venv\Scripts\python.exe" (
    %VELO_PY% -m venv "back\.venv"
    if errorlevel 1 goto :error
)
"back\.venv\Scripts\python.exe" -c "import sys; sys.exit(0 if (3,11) <= sys.version_info[:2] <= (3,12) else 1)"
if errorlevel 1 (
    echo O ambiente back\.venv e incompativel ou veio de outro computador.
    echo Renomeie essa pasta e execute o script novamente para recria-la.
    goto :error
)
"back\.venv\Scripts\python.exe" -m pip install -r "back\requirements.txt"
if errorlevel 1 goto :error

echo.
echo [2/3] Instalando dependencias do frontend...
cd /d "%~dp0front"
if exist "package-lock.json" (
    call npm.cmd ci
) else (
    call npm.cmd install
)
if errorlevel 1 goto :error
cd /d "%~dp0"
if /i "%~1"=="--install-only" (
    echo Dependencias instaladas. Execute iniciar_velo.bat para iniciar.
    pause
    exit /b 0
)

echo.
echo [3/3] Conferindo configuracao e conexao com o banco...
"back\.venv\Scripts\python.exe" "back\scripts\prepare_local_environment.py"
if errorlevel 2 goto :configure
if errorlevel 1 goto :error
goto :launch

:configure
echo.
echo Preencha DATABASE_URL no arquivo que sera aberto e salve.
echo O PostgreSQL precisa estar rodando e o banco ja deve existir.
echo Se estiver usando dados de outro computador, use a chave clinica original.
start "" /wait notepad.exe "%~dp0back\.env"
"back\.venv\Scripts\python.exe" "back\scripts\prepare_local_environment.py"
if errorlevel 1 goto :error

:launch
start "Velo - Backend" "%ComSpec%" /d /k ""%~f0" --backend"
start "Velo - Frontend" "%ComSpec%" /d /k ""%~f0" --frontend"
echo.
echo Janelas abertas. Aguarde as mensagens de inicializacao.
echo Frontend: http://localhost:5173
echo API:      http://localhost:8000/docs
echo Para parar, pressione Ctrl+C em cada janela.
exit /b 0

:backend
title Velo - Backend
cd /d "%~dp0back"
".venv\Scripts\python.exe" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
exit /b %errorlevel%

:frontend
title Velo - Frontend
cd /d "%~dp0front"
call npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
exit /b %errorlevel%

:error
echo.
echo Nao foi possivel concluir. Veja a mensagem acima e execute novamente.
if /i "%~1"=="--check" exit /b 1
pause
exit /b 1
