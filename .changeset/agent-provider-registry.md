---
"@tooka/core": patch
---

Consolidate AI agent providers into one shared registry so the dev-server routes and the app UI (connect cards + compose picker) share a single source of truth for provider id, label, auth mode, and env key.
