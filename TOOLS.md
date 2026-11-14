# Project tools

The project keeps auxiliary runtimes under `.tools/` and runtime data under `.local/`. Both are ignored by Git.

Claude Mem is configured for the Codex provider and runs on port `37778`:

```powershell
.\scripts\memory.ps1 status
.\scripts\memory.ps1 start
```

The worker health endpoint is `http://127.0.0.1:37778/api/health`. The project Codex MCP configuration is in `.codex/config.toml`.

No gateway or provider credentials are required by this project setup.
