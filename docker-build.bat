@echo off
REM docker-build.bat — build image + ricrea containers
cd /d "%~dp0"
echo [mcp-server-mongodb-gridfs] Building image mongo-grid-mcp...
docker build -t mongo-grid-mcp .
if %ERRORLEVEL% neq 0 (
    echo Build FAILED
    exit /b %ERRORLEVEL%
)
echo Build OK. Recreating containers...

REM Ferma e rimuovi container esistenti
docker stop local-gridfs-mcp nuc-proxy-gridfs-mcp 2>nul
docker rm local-gridfs-mcp nuc-proxy-gridfs-mcp 2>nul

REM Ricrea local (stdio, no restart policy)
docker create --name local-gridfs-mcp ^
    -e MONGODB_URI=mongodb://admin:secret@host.docker.internal:27017 ^
    -e MONGODB_DB=gridfs_store ^
    --add-host host.docker.internal:host-gateway ^
    mongo-grid-mcp

REM Ricrea nuc-proxy
docker create --name nuc-proxy-gridfs-mcp ^
    -e MONGODB_URI=mongodb://admin:secret@nuc.home:27017 ^
    -e MONGODB_DB=gridfs_store ^
    --add-host nuc.home:192.168.1.113 ^
    mongo-grid-mcp

echo.
echo Containers created (stopped, ready for Claude Desktop).
docker ps -a --filter name=gridfs --format "  {{.Names}}: {{.Status}}"
echo.
echo Riavvia Claude Desktop per caricare i nuovi tool.
