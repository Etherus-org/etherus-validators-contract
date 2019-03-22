@ECHO OFF
call "%~dp0\_prologue.cmd"

SET "NUM=1"
CALL run.cmd

call _epilogue.cmd
