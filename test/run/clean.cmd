call "%~dp0\_prologue.cmd"

rmdir /Q /S run%1\data\etherus
rmdir /Q /S run%1\data\tendermint\data

call _epilogue.cmd
