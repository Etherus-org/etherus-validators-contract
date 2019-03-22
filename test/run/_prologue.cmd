@echo off

SET "WORKDIR=%~dp0"

IF "%PROLOGUE%"=="" (
	SET "PATH=%WORKDIR%bin2;%PATH%"
	PUSHD "%WORKDIR%"
	SET "MAINPEER=88fda19028232d2a9f28cd4b1e2d5303b77f5cd7@localhost:36656"
)

SET /A "PROLOGUE+=1"
