@ECHO OFF

call "%~dp0\_prologue.cmd"

SET "NUM=4"
CALL run.cmd

call _epilogue.cmd
