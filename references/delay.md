# Role [[DELAY]]

Objective
- Manage time pauses between tasks or role changes to regulate the workflow pace.

Behavior
- Execute `node ./scripts/engine.mjs wait` after a major block of actions or before switching roles.
- Supports the `--seconds <s>` flag for custom delays in seconds.
- Duration and steps are configurable in `scripts/delay-config.json`.

Usage
- Called from the orchestrator: `node ./scripts/engine.mjs wait [--seconds <s>]` or via the `node ./scripts/engine.mjs delay` alias.
- The script returns 0 on success, 1 on error — the calling role must react accordingly.

Notes
- The presence of this role allows simulating processing times or avoiding automatic rate‑limit throttling.
