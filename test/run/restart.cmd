call "%~dp0\_prologue.cmd"

call stop_all.cmd

ping 127.0.0.1 -n 2 > nul

call clean_all.cmd

call run_on_desktops.cmd

call _epilogue.cmd
