# Farm Moisture Watch

NASA Space Apps Ottawa 2026 sample demo for prioritizing farm scouting visits. It compares illustrative local NISAR surface-moisture change with regional SMAP context and explains whether adding NISAR changes the first area to check. The fixture is synthetic; no Indian pilot has passed the real-data quality gate yet. This is not irrigation advice.

From the repository root, launch the integrated sample demo:

```powershell
.\.tools\node-v24.15.0-win-x64\node.exe frontend\map\serve.mjs
```

Open `http://127.0.0.1:8000/`. If Node 22+ is on PATH, `node frontend/map/serve.mjs` works as well. The same server exposes `GET /api/rank` and the canonical `contracts/sample-areas.json`. Run `node --test backend/rank.test.mjs frontend/map/observations.test.mjs` for the focused checks. Read [the demo and NASA page draft](docs/hackathon/SUBMISSION_DRAFT.md) and [the checkpoint](docs/hackathon/STATE.md) for the current evidence and limits.

## Teammate tooling

For Windows x64, clone both repositories into sibling folders:

```powershell
git clone https://github.com/K3shavC0des/KMAHackathonSkills.git
git clone https://github.com/K3shavC0des/KMAHackathonProject.git
cd KMAHackathonSkills
python install.py --project "..\KMAHackathonProject"
python install.py --project "..\KMAHackathonProject" --check
cd ..\KMAHackathonProject
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/setup-aux-skills.ps1
```

Prerequisites: Git, Python 3.10+, a recent Codex CLI and repository access. If Codex is not on PATH, pass its executable path with the installer's `--codex` option. Each teammate uses their own Codex sign-in. Review ECC hook trust after restarting Codex.

Start memory explicitly with `.\scripts\memory.ps1 start`. Launch a wrapped Codex CLI with `.\codex-headroom.cmd` or use `codex` directly. See [TOOLS.md](TOOLS.md) for verification boundaries and remaining integration steps. OmniRoute is excluded.
