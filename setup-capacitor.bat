@echo off
:: Script para automatizar a configuração do Capacitor no ambiente principal
chcp 65001 > nul
echo =======================================================
echo     RECEITA FIT GEN - Inicialização do Capacitor
echo =======================================================
echo.

echo [1/4] Instalando dependências (React + Capacitor)...
call npm install
if %errorlevel% neq 0 (
    echo Erro ao rodar npm install. Verifique se o Node.js está instalado.
    pause
    exit /b %errorlevel%
)
echo.

echo [2/4] Compilando a aplicação Web (gerando a pasta /dist)...
call npm run build
if %errorlevel% neq 0 (
    echo Erro ao rodar a build do Vite.
    pause
    exit /b %errorlevel%
)
echo.

echo [3/4] Adicionando a plataforma Android nativa...
call npx cap add android
if %errorlevel% neq 0 (
    echo A pasta 'android' já existe ou ocorreu um erro. Pulando ou continuando...
)
echo.

echo [4/4] Sincronizando recursos da web para o Android...
call npx cap sync
if %errorlevel% neq 0 (
    echo Erro ao sincronizar com o Capacitor.
    pause
    exit /b %errorlevel%
)
echo.

echo =======================================================
echo  SUCESSO! O Capacitor foi configurado com êxito.
echo.
echo  Próximos passos no seu computador com Android Studio:
echo  1. Abra o Android Studio.
echo  2. Abra a pasta 'android' gerada neste projeto.
echo  3. Siga o guia de publicação em 'play_store_guide.md'.
echo =======================================================
pause
