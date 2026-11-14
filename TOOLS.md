# Project tools

The project keeps auxiliary runtimes under `.tools/` and runtime data under `.local/`. Both are ignored by Git.

For a new Windows teammate, run this once from the repository root:

```powershell
.\scripts\setup-aux-skills.ps1
```

The script installs the project-local runtimes and packages, installs Headroom and Graphify with a project-local `uv` cache, and prepares Claude Mem for Codex. It is safe to rerun. Add `-Actor your-handle` to initialize the shared Hackathon Autopilot board.

ECC is already available in the Codex installation. Claude Code Setup is a read-only recommender and needs no runtime. Task Observer is bundled, but its checkout does not include the activation scripts required for automatic observation setup, so use its environment instructions before enabling a persistent log.

Claude Mem is configured for the Codex provider and runs on port `37778`:

```powershell
.\scripts\memory.ps1 status
.\scripts\memory.ps1 start
```

The worker health endpoint is `http://127.0.0.1:37778/api/health`. The project Codex MCP configuration is in `.codex/config.toml`.

No gateway or provider credentials are required by this project setup.
