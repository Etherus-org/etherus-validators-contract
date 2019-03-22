call "%~dp0\_prologue.cmd"

vdesk on:2 noswitch:true run:cmd /C run2.cmd

ping 127.0.0.1 -n 4 > nul

vdesk on:3 noswitch:true run:cmd /C run3.cmd

ping 127.0.0.1 -n 4 > nul

vdesk on:4 noswitch:true run:cmd /C run4.cmd

ping 127.0.0.1 -n 4 > nul

vdesk on:5 noswitch:true run:cmd /C run5.cmd

call _epilogue.cmd
