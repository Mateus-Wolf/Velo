@echo off
setlocal

echo ==========================================
echo   Instalador de Dependencias - VELO
echo ==========================================
echo.

:: Backend
echo [1/2] Configurando Backend (Python)...
cd back
if not exist venv (
    echo Criando ambiente virtual...
    python -m venv venv
)
echo Instalando dependencias do Python...
call venv\Scripts\activate
pip install -r requirements.txt
if not exist .env (
    echo Criando arquivo .env a partir do exemplo...
    copy .env.example .env
)
cd ..
echo Backend pronto!
echo.

:: Frontend
echo [2/2] Configurando Frontend (Node.js)...
cd front
echo Instalando dependencias do Node...
call npm install
if not exist .env (
    echo Criando arquivo .env a partir do exemplo...
    copy .env.example .env
)
cd ..
echo Frontend pronto!
echo.

echo ==========================================
echo   Instalacao concluida com sucesso!
echo ==========================================
pause
