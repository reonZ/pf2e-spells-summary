@echo off
if "%1" == "" goto errorarg
set DIR=%~dp0
set RELEASE=%DIR%releases\%1
if not exist %RELEASE% mkdir %RELEASE%
xcopy %DIR%\module.json %RELEASE%\
winrar.exe a -r -afzip -m5 -ep1 -x@ignore.txt %RELEASE%\module.zip %DIR%\
goto end
:errorarg
echo error - missing version argument
:end