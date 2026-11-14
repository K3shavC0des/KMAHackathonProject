# Project tools

The project keeps auxiliary runtimes under `.tools/` and runtime data under `.local/`. Both are ignored by Git.

For a new teammate, clone `KMAHackathonSkills` first, then this repository. From the skills checkout, install into this project and verify:

```powershell
python install.py --project "..\KMAHackathonProject"
python install.py --project "..\KMAHackathonProject" --check
```

Open this project in Codex and restart Codex. OmniRoute is intentionally excluded from the toolkit and requires no setup.

For a new Windows teammate, run this once from the repository root:

```powershell
.\scripts\setup-aux-skills.ps1
```

The script installs the project-local runtimes and packages, installs Headroom and Graphify with a project-local `uv` cache, and prepares Claude Mem for Codex. It is safe to rerun. Add `-Actor your-handle` to initialize the shared Hackathon Autopilot board.

Each teammate installs ECC using the Skills installer; it is not supplied by Codex itself. Review hook trust after restarting Codex. Claude Code Setup is a read-only recommender and needs no runtime. Task Observer is bundled, but its checkout does not include the activation scripts required for automatic observation setup. Automatic Task Observer logging is not enabled.

Claude Mem is configured for the Codex provider and runs on port `37778`:

```powershell
.\scripts\memory.ps1 status
.\scripts\memory.ps1 start
```

The worker health endpoint is `http://127.0.0.1:37778/api/health`. The project Codex MCP configuration is in `.codex/config.toml`. Start the worker explicitly before using memory tools. This configuration provides memory tools; it does not install automatic session-recording hooks. Worker health does not prove that Codex-backed observations succeed. The Codex observer previously reported a Windows sandbox restriction; automatic recording remains unverified.

Use your own Codex sign-in. No credentials belong in Git.

From the project root, launch Codex through Headroom with:

```powershell
.\codex-headroom.cmd
```

Pass Codex arguments after `--`, for example `.\codex-headroom.cmd -- --model MODEL_NAME`. Headroom may update the active Codex configuration to register its proxy and retrieval MCP server. Its CLI starts successfully here; live compression and quota savings have not been measured. Run `codex` directly if a wrapped session fails.

For a free local code map, use `.\.tools\uv-tools\graphifyy\Scripts\graphify.exe . --code-only`. This intentionally excludes documents. Outputs are under the ignored `graphify-out/` folder.
