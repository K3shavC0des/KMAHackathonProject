# Farm Moisture Watch

NASA Space Apps Ottawa 2026 scouting map for exploring local NISAR surface-moisture change. The opening screen explains the evidence and leads into observed analysis squares for Nagapattinam, Ludhiana, and Ahmedabad, plus a separately labeled synthetic example. These squares are not verified farm boundaries, and the inspection order is not irrigation advice.

From the repository root, launch the integrated sample demo:

```powershell
.\.tools\node-v24.15.0-win-x64\node.exe frontend\map\serve.mjs
```

Open `http://127.0.0.1:8000/` for a short explanation of NISAR. Choose **Show me on the map** for a guided tour on the live map, with play, pause, next, back, and skip controls. **Explore without tutorial** opens the map directly; **About** returns to the introduction. If Node 22+ is on PATH, `node frontend/map/serve.mjs` works as well. The same server exposes `GET /api/rank` and the canonical `contracts/sample-areas.json`. Run `node --test frontend/map/map-data.test.mjs frontend/map/observations.test.mjs tests/integration/map-api.test.mjs` for focused checks. Read [the demo and NASA page draft](docs/hackathon/SUBMISSION_DRAFT.md) and [the checkpoint](docs/hackathon/STATE.md) for the current evidence and limits.

## L/S radar and conditional irrigation check

Open `/radar.html` from the map's inspector link to compare L/S backscatter
when verified GCOV evidence is available and evaluate an entered root-zone
measurement against a documented crop/soil irrigation trigger. The field check
works independently of radar loading and defaults to a labelled scenario.
Actual L/S GCOV files and field validation remain outstanding; the shipped
radar artifact explicitly reports unavailable. See [data preparation and limits](data/radar/README.md).

Run `node --test tests/integration/radar.test.mjs` for the recommendation,
radar contract and API/static integration checks.

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
