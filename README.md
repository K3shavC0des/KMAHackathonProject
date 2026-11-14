# KMA Hackathon Project

The repository currently contains team tooling and setup scripts. Application development starts after the team supplies the challenge, deadline and idea.

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
