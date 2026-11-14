# Project agent guidance

Use the local skills in `.agents/skills/` when relevant:

- `headroom`: keep tool output bounded; prefer `rg`, targeted reads, and summaries over full logs.
- `mem-search`: search memory first, then timeline, then fetch only selected observations.
- `task-observer`: record repeatable workflow improvements without interrupting the task.

Codex agents are bundled in `.codex/agents/`. Anyone who obtains the KMAHackathonSkills/project bundle gets these agents automatically when working from the project root. The bundle includes architecture, planning, exploration, documentation research, code/security review, TDD/E2E testing, Python and ML, React/TypeScript, React build debugging, database, performance, and documentation agents.

For token efficiency, batch independent checks, cap command output, avoid rereading unchanged files, and report evidence briefly. Never expose secrets or include `.tools/` and `.local/` in commits.
