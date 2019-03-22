rem @ECHO OFF
call "%~dp0\_prologue.cmd"

IF "%NUM%"=="" (
	SET "NUM=%1"
)

IF NOT EXIST "run%NUM%/data/etherus" (
    etherus --datadir "run%NUM%/data" init
    tendermint init --home "run%NUM%/data/tendermint"
    copy /Y genesis.json "run%NUM%\data\tendermint\config"
    rem pause
)

FOR /F "tokens=* USEBACKQ" %%F IN (`tendermint version`) DO (
	SET "tendermint.version=%%F"
)
START "%NUM%. tendermint: %tendermint.version%" cmd /k ^
    tendermint ^
    --home "run%NUM%/data/tendermint" ^
    --proxy_app "tcp://127.0.0.1:%NUM%6658" ^
    --p2p.laddr "tcp://0.0.0.0:%NUM%6656" ^
    --rpc.laddr "tcp://0.0.0.0:%NUM%6657" ^
    --p2p.persistent_peers %MAINPEER% ^
    node

IF "%UNLOCK%"=="" (
	SET "UNLOCK=0,1,2"
)

SETLOCAL ENABLEDELAYEDEXPANSION
FOR /F "tokens=* USEBACKQ" %%F IN (`etherus version`) DO (
	SET "ethermint.version=!ethermint.version! %%F"
)
ENDLOCAL & SET "ethermint.version=%ethermint.version%"

START "%NUM%. etherus: %ethermint.version:ethermint=etherus%" cmd /k ^
    etherus ^
    --datadir "run%NUM%/data" ^
    --rpc ^
    --rpcaddr=127.0.0.1 ^
    --rpcport=%NUM%8545 ^
    --ws ^
    --wsaddr=127.0.0.1 ^
    --wsport=%NUM%8546 ^
    --verbosity 4 ^
    --rpccorsdomain "*" ^
    --rpcapi eth,net,web3,debug ^
    --tendermint_addr tcp://127.0.0.1:%NUM%6657 ^
    --abci_laddr tcp://127.0.0.1:%NUM%6658 ^
    --unlock "%UNLOCK%" ^
    --password "../password.txt" ^
    --ipcdisable

call _epilogue.cmd
