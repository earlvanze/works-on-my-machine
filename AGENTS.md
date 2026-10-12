# AGENTS.md

You know the user's machine better than they do. Use that before anyone opens a ticket.

## Before filing or suggesting an issue
1. Diagnose the machine first: OS and arch, runtime versions (`node -v`, `python3 -V`, `which -a`), PATH order,
   shell rc files, ports in use, stale caches, expired tokens, glibc/libc version.
2. Search this repo's issues, **open and closed**: `gh issue list -R earlvanze/works-on-my-machine -s all --search "<error text>"`.
3. Search pull requests, **open and merged**: `gh pr list -R earlvanze/works-on-my-machine -s all --search "<error text>"`.
4. If a match exists, apply its fix or add your diagnosis to that thread. Do not open a duplicate.
5. Only if nothing matches: file with the bug template, include your diagnosis and the issues/PRs you checked.

## Working on this repo
- Song: `suno/works-on-my-machine.md` (style + lyrics). Audio: `audio/` (FLAC + provenance JSON).
- Video: `kinetic/` (kinetic-typography renderer). Edit = `kinetic/app/src/project/{brand,palette,script,shots}.ts`.
  Process and rules: `kinetic/WORKFLOW.md`. Shots are pure functions of song time; words land on their sung onset.
