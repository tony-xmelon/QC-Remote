# Git history consolidation

This ledger records the full local-history review performed before the final
QC Remote `main` consolidation. It exists so a non-ancestral branch cannot be
mistaken for lost work merely because an equivalent patch was rebased or a
publication-clean merge intentionally omitted private evidence.

## Integrated or patch-equivalent work

- `codex/qc-full-parity` was reconciled through the final parity merge, including
  its post-merge Account, MIDI, selection-control, and USB I/O refinements.
- `worktree-windows-ui-items` was reconciled screen by screen. Private framebuffer
  PNGs, graphics-tree dumps, and private coverage manifests remain ignored local
  evidence. Its final Factory Reset implementation (`c6c20a78`) was ported as the
  neutral public implementation `b5ced78b`.
- `codex/ir-import-capture` commit `63396ba2` is patch-equivalent to committed
  work on `main`.
- `codex/usb-gateway-python-parity` commits `8c30ffe5` and `f5845fad` are
  patch-equivalent to committed work on `main`.
- `codex/usb-python-parity` commit `56577676` is patch-equivalent to committed
  work on `main`.
- The asset, iconography, typography, broker follow-up, gateway-diagnostics, and
  session-keepalive branches are already ancestors of `main`.

## Deliberately retained research

`codex/pyquadcortex-metadata-refresh` commit `8993d4f1` is not silently lost. It
contains a firmware-profile policy prototype, but its CorOS 4.1 profile marks
every operation unverified while its CorOS 4.0.1 profile treats every future
operation as verified. Both claims are too broad for the current hardware
evidence and the module is not consumed by either native runtime. In line with
the earlier decision to document speculative upstream work for later, this
prototype remains a research branch until a firmware-by-operation evidence
matrix can be generated from physical conformance reports. It must not be
cherry-picked unchanged.

## Unreachable objects

The unreachable-commit review classified the dangling tips as rebased
alternatives, dropped stash snapshots, superseded Rust-parity drafts, and
sanitized publication snapshots. Confirmed examples include `9c069cb8`, which
is byte-for-byte equivalent to committed `8751f413`, and the old sixth-pass UI
stash `994167f0`, superseded by the later screen-audit sequence. No live stash
or tag contains additional product work. Git garbage collection is intentionally
left to normal expiry; deleting unreachable objects provides no source-tree
benefit and would remove recovery options.

Run `npm run audit:history` from `main` before deleting old branch or worktree
refs. The audit accepts patch-equivalent commits and the two explicit decisions
above, and fails when a new unique live-branch commit has no recorded outcome.
