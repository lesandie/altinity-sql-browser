---
name: ship-phase
description: Coordinate shipping a whole roadmap phase (multiple dependent issues) unattended — worker agents implement per-issue on one integration branch, small review per issue, one high-effort review + single PR at the end. Invoke as `/ship-phase <phase|issue-list>` (e.g. /ship-phase 7). The invoking session is the COORDINATOR and must be a capable model (Opus/Fable).
---

# /ship-phase — unattended multi-issue coordinator

You are the **coordinator**. You do not implement issues yourself — you plan waves, spawn
worker/reviewer agents, verify their output with your own commands, integrate commits, and
own everything git-remote-facing. Follow `CLAUDE.md` throughout; `/ship`'s per-issue steps
1–5 are the **worker contract** referenced below.

> Sandbox notes (same as /ship): `grep` is intercepted — `rg PATTERN > "$TMPDIR/out"` then
> Read. Playwright e2e does NOT run locally — e2e signal comes from GitHub Actions on the
> pushed branch. Capture long output to files.

## 0 — Unattended policy

- **No approval gates.** Where /ship says 🛑, do not stop the run: if an issue turns out
  ambiguous or needs an unrecorded decision, **skip it** (leave its commits out), continue
  the rest, and list it in the final report. Never invent architectural decisions.
- Never merge to `main`, never force-push, never edit `main`'s working tree directly.
- The coordinator alone touches: `git merge/push`, `gh pr *`, issue comments, `CHANGELOG.md`
  conflicts, memory writes.

## 1 — Orient

- Read roadmap **#68** for the phase's build order, then `gh issue view` every issue in the
  phase. The issue bodies are the spec — they are deliberately self-contained; do not rely
  on chat history.
- Derive the **wave plan**: sequence the dependency spine; parallelize only issues whose
  planned file footprints are disjoint (judge from the issues' Files sections — when in
  doubt, serialize; a merge conflict costs more than lost parallelism).
- Create the integration branch off the remote default branch:
  `git fetch origin && git checkout -b <type>/phase<N>-<slug> origin/main` (see memory
  [[ship-branch-off-diverged-main]]). Push it immediately so CI runs from the start.

## 2 — Per issue (repeat per wave)

**Spawn a worker** — a fresh agent (`subagent_type: "general-purpose"`, **never `fork`** —
see [[ship-background-finalization]]), `model: "sonnet"` unless the wave plan marks the
issue high-risk (then omit `model` to inherit the coordinator's). Parallel workers get
`isolation: "worktree"`; a solo worker may work in the main tree on a
`wip/<issue>-<slug>` branch off the current integration HEAD.

Worker prompt must contain, explicitly:
- the issue number and instruction to `gh issue view` it and treat Acceptance criteria as
  the definition of done;
- **the mutation boundary**: Edit/Write + local `git commit` on its branch only — **no
  push, no PR, no `gh` mutations, no issue edits, no memory writes, no CHANGELOG beyond its
  own entry, no TaskCreate**;
- follow `/ship` steps 2–5 (plan → implement+tests to the 100/100/100/100 per-file gate →
  `npm test` + `npm run build` green → self-review → CHANGELOG `[Unreleased]` entry);
  commit message `<type>: <summary> (#<ISSUE>)` + the repo footer convention;
- return: plan summary, files touched, test/build output tail, acceptance-criteria
  checklist with each item ticked or explained.

**Verify yourself** (never trust the self-report): `git log`/`git diff` the worker branch,
re-run `npm test` and `npm run build` in that tree.

**Small review**: spawn a **read-only** reviewer agent (`model: "sonnet"`, explicit
boundary: no Edit/Write/git/gh/memory) on the issue's diff vs the integration base, prompted
with the issue's acceptance criteria + CLAUDE.md hard rules. Real findings → send back to
the worker (SendMessage) or a fix agent with the same worker boundary; re-verify.

**Integrate**: merge the worker branch into the integration branch (resolve conflicts
yourself — you are the only writer of the integration branch), re-run `npm test`, push.
Each push gives a CI e2e signal — check it before starting the next wave
(`gh run list --branch <branch>`); a red e2e stops the line until fixed.

## 3 — Finish

1. **Whole-branch high review**: run `/code-review` at **high** effort on the full branch
   diff (and `/security-review` if anything touched auth/config). Apply real findings via a
   fix agent; re-verify; push.
2. Confirm CI fully green (unit + e2e, all engines).
3. **Reconcile**: tick #68's phase checkboxes in one edit; CHANGELOG entries are already
   per-issue — dedupe/merge conflicts only.
4. **One PR** (`gh pr create --base main`), body per the PR template, with one
   `Closes #<n>` line **per completed issue** (skipped issues: `Part of`), a per-issue
   summary table, and the repo PR footer.
5. 🛑 **Merge gate — the only stop.** Report: PR URL, per-issue status (shipped / skipped +
   why), review findings applied, CI status. Do not merge.
6. Friction → memory (coordinator writes it, not a subagent).
