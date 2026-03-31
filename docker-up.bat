@echo off
REM docker-up.bat — docker compose up -d (non applicabile: server stdio)
REM Per mongo-grid-mcp: usa docker start -i <container> tramite Claude Desktop MCP
REM Per rebuild: docker-build.bat
echo [mcp-server-mongodb-gridfs] Questo progetto e' un server MCP stdio.
echo I container vengono avviati da Claude Desktop: docker start -i local-gridfs-mcp
echo Per rebuild usa: docker-build.bat
echo Per avvio manuale test: docker run -i --rm -e MONGODB_URI=mongodb://admin:secret@host.docker.internal:27017 -e MONGODB_DB=gridfs_store --add-host host.docker.internal:host-gateway mongo-grid-mcp
