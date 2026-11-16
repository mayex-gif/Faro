@echo off
rem Genera "Manual de usuario FARO.pdf" a partir de manual.html, con Microsoft Edge (viene con Windows).
rem Uso: doble clic en este archivo, o desde la carpeta docs\manual:  generar-pdf.cmd
setlocal
set "AQUI=%~dp0"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" (
  echo No se encontro Microsoft Edge. Abri manual.html en el navegador e imprimilo como PDF.
  exit /b 1
)
"%EDGE%" --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files --virtual-time-budget=5000 ^
  --print-to-pdf="%AQUI%Manual de usuario FARO.pdf" "file:///%AQUI:\=/%manual.html"
echo Listo: "%AQUI%Manual de usuario FARO.pdf"
