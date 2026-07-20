---
"@tooka/core": patch
---

Stop `tooka dev` from hanging under Turbo/CI: the skills-drift check now prints a non-blocking warning instead of an interactive prompt when run by an orchestrator that can't forward keystrokes.
