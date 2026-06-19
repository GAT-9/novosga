@echo off
setlocal

echo Baixando voz Leticia RHVoice...

set "URL=https://rhvoice.org/download/RHVoice-Brazilian-Portuguese-voice-Leticia-F123-v4.6.1021.18-setup.exe"
set "INSTALLER=%TEMP%\RHVoice-Leticia-setup.exe"

powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%URL%' -OutFile '%INSTALLER%'"

if not exist "%INSTALLER%" (
  echo Erro: nao foi possivel baixar o instalador.
  pause
  exit /b 1
)

echo Instalando voz Leticia...
start /wait "" "%INSTALLER%"

echo.
echo Instalacao concluida.
echo Feche e abra o navegador novamente.
echo Depois teste no console:
echo speechSynthesis.getVoices().map(v =^> `${v.name} - ${v.lang}`)
echo.

pause
endlocal
