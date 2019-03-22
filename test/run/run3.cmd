@ECHO OFF

call "%~dp0\_prologue.cmd"

SET "NUM=3"
SET "UNLOCK=0,1,2,3,4,5"
CALL run.cmd

call _epilogue.cmd
