call "%~dp0\_prologue.cmd"

taskkill /FI "WINDOWTITLE eq %1. tendermint*"
taskkill /FI "WINDOWTITLE eq %1. etherus*"

call _epilogue.cmd
