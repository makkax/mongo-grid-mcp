@echo off
REM docker-down.bat — ferma i container MCP gridfs (se running per errore)
cd /d "%~dp0"
echo [mcp-server-mongodb-gridfs] Stopping gridfs containers if running...
docker stop local-gridfs-mcp nuc-proxy-gridfs-mcp 2>nul
echo Done. Containers back to stopped state (ready for Claude Desktop start -i).
