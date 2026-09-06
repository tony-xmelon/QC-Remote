# Quad Cortex canonical screen coverage matrix

Generated from the CorOS 4.1.0 executable coverage ledger. This report distinguishes implemented render paths from authoritative visual evidence; a smoke-only row has no defensible visual-match percentage yet.

## Coverage summary

- Canonical device states: **103/103** routed through the shared Windows/Android surface.
- Full-frame authoritative evidence: **84/103** states.
- Official-detail-only evidence: **14/103** states.
- Smoke-only evidence gaps: **5/103** states.
- Exact-size dual-host capture paths: **103/103** states.

| Corpus | Windows structural | Windows color | Android structural | Android color |
| --- | ---: | ---: | ---: | ---: |
| Physical device | 83.78% | 97.09% | 83.78% | 97.09% |
| Official manual | 92.74% | 97.27% | 92.74% | 97.27% |

Scores are edge-F1 structural match with a two-pixel tolerance and `1 - MAE` color similarity. A canonical state that references multiple frames reports their mean. Detail evidence is scoped and therefore never promoted into a full-frame score.

Thirteen captures were added from hardware in the CorOS 4.1.0 session of 2026-09-06: `directory-categories`, `-captures`, `-irs`, `-plugins`, `-favorites`, `-search`, `-search-results`, `-sort`, `-arrange`, plus `cpu-monitor`, `settings-account`, `settings-device` and `settings-midi`. They moved five states (DR-01, DR-07, DR-09, DR-11, GL-23) from detail-only to full-frame, which the summary counts above reflect.

Two things below are **not** refreshed for them, because both come from a scored dual-host render pass that has not been run: the score table, and the per-state `Evidence` column, which still reads `official detail` for the promoted states. Their wording has been checked against the device's own scene graph with `npm run verify:qc-screen-text`; their pixels have not been scored.

## Evidence by family

| Family | States | Full frame | Detail only | Smoke only |
| --- | ---: | ---: | ---: | ---: |
| Lifecycle | 3 | 0 | 3 | 0 |
| Grid | 8 | 6 | 0 | 2 |
| Preset | 5 | 5 | 0 | 0 |
| MIDI | 1 | 1 | 0 | 0 |
| Performance | 5 | 5 | 0 | 0 |
| Gig View | 4 | 4 | 0 | 0 |
| Monitoring | 1 | 1 | 0 | 0 |
| I/O | 8 | 8 | 0 | 0 |
| Routing | 5 | 5 | 0 | 0 |
| Device browser | 9 | 8 | 1 | 0 |
| Editor | 9 | 8 | 1 | 0 |
| Assignment | 4 | 1 | 3 | 0 |
| Virtual Device preset | 2 | 2 | 0 | 0 |
| Directory | 16 | 13 | 3 | 0 |
| Capture V1 | 7 | 4 | 2 | 1 |
| Settings | 10 | 9 | 0 | 1 |
| Recovery | 2 | 0 | 1 | 1 |
| System overlay | 4 | 4 | 0 | 0 |

## All canonical device states

| ID | Family | Screen/state | Evidence | Windows | Android | Physical structural W/A | Physical color W/A | Official structural W/A | Official color W/A |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| GL-01 | Lifecycle | Power-on / boot progress | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-02 | Lifecycle | Power-off confirmation | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-03 | Lifecycle | Screen lock / power overlay | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-04 | Grid | Clean preset Grid | physical frame + official frame | Built | Built | 82.33% / 82.33% | 96.54% / 96.54% | 92.21% / 92.22% | 96.08% / 96.08% |
| GL-05 | Grid | Modified preset Grid | physical frame | Built | Built | 93.46% / 93.46% | 97.21% / 97.21% | — / — | — / — |
| GL-06 | Grid | Alternate active scene | physical frame | Built | Built | 93.45% / 93.45% | 97.21% / 97.21% | — / — | — / — |
| GL-07 | Grid | Scene selector | physical frame + official detail | Built | Built | 94.82% / 94.82% | 97.16% / 97.16% | — / — | — / — |
| GL-08 | Grid | Grid contextual menu | physical frame | Built | Built | 80.60% / 80.58% | 95.88% / 95.88% | — / — | — / — |
| GL-09 | Preset | Save As editor | physical frame | Built | Built | 89.83% / 89.83% | 98.23% / 98.23% | — / — | — / — |
| GL-10 | Preset | Edit Details / preset name editor | physical frame | Built | Built | 92.61% / 92.61% | 98.08% / 98.08% | — / — | — / — |
| GL-11 | Preset | Copy Scene destination | physical frame | Built | Built | 91.52% / 91.52% | 99.06% / 99.06% | — / — | — / — |
| GL-12 | Preset | Swap Scene destination | physical frame | Built | Built | 91.44% / 91.44% | 99.05% / 99.05% | — / — | — / — |
| GL-13 | MIDI | Preset MIDI Out | physical frame + official frame | Built | Built | 93.06% / 93.05% | 97.63% / 97.63% | 93.10% / 93.09% | 97.61% / 97.61% |
| GL-14 | Preset | Delete confirmation | physical frame | Built | Built | 90.03% / 90.03% | 98.52% / 98.52% | — / — | — / — |
| GL-15 | Performance | Tuner | physical frame + official frame | Built | Built | 90.84% / 90.85% | 97.82% / 97.82% | 92.13% / 92.13% | 97.50% / 97.50% |
| GL-16 | Performance | Live tuner / Gig View tuner | physical frame | Built | Built | 94.61% / 94.61% | 96.47% / 96.47% | — / — | — / — |
| GL-17 | Performance | Tempo & Metronome | physical frame + official frame | Built | Built | 90.46% / 90.46% | 97.68% / 97.68% | 91.51% / 91.51% | 97.74% / 97.74% |
| GL-18 | Performance | Modes Configuration | physical frame + official frame | Built | Built | 96.50% / 96.50% | 98.59% / 98.59% | 92.03% / 92.04% | 96.76% / 96.76% |
| GL-19 | Gig View | PRESET mode | physical frame + official frame | Built | Built | 94.12% / 94.12% | 95.66% / 95.66% | 95.48% / 95.48% | 96.23% / 96.23% |
| GL-20 | Gig View | SCENE mode | physical frame + official frame | Built | Built | 91.25% / 91.26% | 96.96% / 96.96% | 93.54% / 93.54% | 95.83% / 95.83% |
| GL-21 | Gig View | STOMP mode | physical frame + official frame | Built | Built | 94.51% / 94.51% | 96.37% / 96.37% | 89.73% / 89.73% | 93.71% / 93.71% |
| GL-22 | Gig View | HYBRID mode | official frame | Built | Built | — / — | — / — | 90.93% / 90.93% | 94.77% / 94.77% |
| GL-23 | Monitoring | CPU Monitor | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-24 | Performance | Tuner with Live Tuner enabled | physical frame | Built | Built | 91.02% / 91.02% | 97.82% / 97.82% | — / — | — / — |
| IO-01 | I/O | I/O Settings overview | physical frame + official detail | Built | Built | 73.89% / 73.87% | 96.54% / 96.54% | — / — | — / — |
| IO-02 | I/O | Analog input detail | official frame | Built | Built | — / — | — / — | 88.68% / 88.67% | 97.56% / 97.56% |
| IO-03 | I/O | Analog output detail | physical frame | Built | Built | 72.26% / 72.25% | 96.00% / 96.00% | — / — | — / — |
| IO-04 | I/O | Send/Return detail | physical frame | Built | Built | 80.88% / 80.87% | 96.70% / 96.70% | — / — | — / — |
| IO-05 | I/O | USB I/O detail | official frame | Built | Built | — / — | — / — | 88.70% / 88.69% | 96.74% / 96.74% |
| IO-06 | I/O | Headphones detail | physical frame | Built | Built | 74.15% / 74.14% | 96.70% / 96.70% | — / — | — / — |
| IO-07 | I/O | Global EQ | official frame | Built | Built | — / — | — / — | 91.48% / 91.50% | 96.39% / 96.38% |
| IO-08 | I/O | Global input gate and bypass | physical frame | Built | Built | 90.66% / 90.66% | 97.56% / 97.56% | — / — | — / — |
| GR-01 | Routing | Input route selector | physical frame | Built | Built | 90.23% / 90.23% | 96.53% / 96.53% | — / — | — / — |
| GR-02 | Routing | Output route selector | physical frame | Built | Built | 91.28% / 91.27% | 96.48% / 96.48% | — / — | — / — |
| GR-03 | Routing | Splitter/Mixer placement handles | physical frame | Built | Built | 89.60% / 89.63% | 97.46% / 97.46% | — / — | — / — |
| GR-04 | Routing | Splitter parameter editor | physical frame | Built | Built | 89.60% / 89.63% | 97.46% / 97.46% | — / — | — / — |
| GR-05 | Routing | Mixer parameter editor | physical frame | Built | Built | 90.49% / 90.53% | 97.54% / 97.54% | — / — | — / — |
| GR-06 | Grid | Empty-slot target | official frame | Built | Built | — / — | — / — | 94.00% / 94.00% | 98.47% / 98.47% |
| DB-01 | Device browser | Category root | physical frame | Built | Built | 79.60% / 79.60% | 97.11% / 97.11% | — / — | — / — |
| DB-02 | Device browser | Guitar/Bass model list | physical frame + official frame | Built | Built | 91.83% / 91.83% | 97.58% / 97.58% | 89.57% / 89.57% | 98.29% / 98.29% |
| DB-03 | Device browser | First-use device-preset tooltip | physical frame | Built | Built | 68.03% / 68.03% | 95.57% / 95.57% | — / — | — / — |
| DB-04 | Device browser | Search results | physical frame | Built | Built | 30.93% / 30.93% | 94.01% / 94.00% | — / — | — / — |
| DB-05 | Device browser | Favorites / Recent models | physical frame | Built | Built | 66.74% / 66.74% | 97.61% / 97.61% | — / — | — / — |
| DB-06 | Device browser | Plugin device folders | official frame | Built | Built | — / — | — / — | 96.43% / 96.44% | 99.21% / 99.21% |
| DB-07 | Device browser | Plugin device list / license state | physical frame + official frame | Built | Built | 89.41% / 89.41% | 97.49% / 97.49% | 91.70% / 91.70% | 98.23% / 98.23% |
| DB-08 | Device browser | Plugin refresh state | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DB-09 | Device browser | Locked plugin / license-not-found models | physical frame | Built | Built | 91.78% / 91.78% | 96.20% / 96.20% | — / — | — / — |
| ED-01 | Editor | Standard rotary parameter editor | physical frame | Built | Built | 91.04% / 91.04% | 97.42% / 97.42% | — / — | — / — |
| ED-02 | Editor | Multi-page parameter editor | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-03 | Editor | Cab editor | physical frame | Built | Built | 93.17% / 93.16% | 97.74% / 97.74% | — / — | — / — |
| ED-04 | Editor | Parametric EQ editor | physical frame | Built | Built | 90.98% / 90.98% | 98.23% / 98.23% | — / — | — / — |
| ED-05 | Editor | Neural Capture block editor | physical frame | Built | Built | 19.75% / 19.74% | 93.52% / 93.52% | — / — | — / — |
| ED-06 | Editor | Looper X editor | official frame | Built | Built | — / — | — / — | 90.79% / 90.79% | 97.15% / 97.15% |
| ED-07 | Editor | Virtual Device preset browser | physical frame + official frame | Built | Built | 90.39% / 90.38% | 97.55% / 97.55% | 89.60% / 89.59% | 96.98% / 96.98% |
| ED-08 | Editor | Save Virtual Device preset | physical frame | Built | Built | 95.89% / 95.89% | 98.71% / 98.71% | — / — | — / — |
| ED-09 | Assignment | STOMP assignment | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-10 | Assignment | Scene assignment / scene-safe controls | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-11 | Assignment | Expression parameter assignment | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-12 | Assignment | Expression bypass assignment | official frame | Built | Built | — / — | — / — | 91.89% / 91.87% | 96.94% / 96.94% |
| ED-13 | Editor | Block contextual actions | physical frame | Built | Built | 87.93% / 87.94% | 98.53% / 98.53% | — / — | — / — |
| ED-14 | Grid | I/O clipping warning | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ED-15 | Grid | DSP/side-chain limit warning | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ED-16 | Virtual Device preset | Factory preset row actions | physical frame + official frame | Built | Built | 96.19% / 96.19% | 96.58% / 96.58% | 94.66% / 94.66% | 97.73% / 97.73% |
| ED-17 | Virtual Device preset | Empty User preset tab | physical frame | Built | Built | 89.80% / 89.80% | 98.34% / 98.34% | — / — | — / — |
| DR-01 | Directory | Category chooser | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-02 | Directory | Presets browser | physical frame + official frame | Built | Built | 92.47% / 92.48% | 97.73% / 97.73% | 96.81% / 96.81% | 98.04% / 98.04% |
| DR-03 | Directory | Neural Captures browser | official frame | Built | Built | — / — | — / — | 92.66% / 92.67% | 97.65% / 97.65% |
| DR-04 | Directory | Impulse Responses browser | official frame | Built | Built | — / — | — / — | 93.16% / 93.22% | 97.97% / 97.97% |
| DR-05 | Directory | Plugin Presets browser | official frame | Built | Built | — / — | — / — | 96.49% / 96.49% | 98.53% / 98.53% |
| DR-06 | Directory | Favorites and Recent | official frame | Built | Built | — / — | — / — | 94.67% / 94.67% | 97.88% / 97.88% |
| DR-07 | Directory | Search entry | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-08 | Directory | Search results | official frame | Built | Built | — / — | — / — | 92.69% / 92.68% | 97.42% / 97.42% |
| DR-09 | Directory | Sort menu | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-10 | Directory | Filter menu | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-11 | Directory | Arrange / multiselect mode | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-12 | Directory | Multiselect copy destination | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-13 | Directory | Nested folder browser | official frame | Built | Built | — / — | — / — | 93.82% / 93.83% | 97.89% / 97.89% |
| DR-14 | Directory | New folder / setlist editor | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-15 | Directory | Item contextual menu | physical frame | Built | Built | 88.93% / 88.93% | 98.87% / 98.87% | — / — | — / — |
| DR-16 | Directory | Cortex Cloud upload mode | official frame | Built | Built | — / — | — / — | 96.19% / 96.00% | 98.34% / 98.34% |
| NC-01 | Capture V1 | Capture introduction | official detail | Built | Built | — / — | — / — | — / — | — / — |
| NC-02 | Capture V1 | Capture type selection | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| NC-03 | Capture V1 | Connection and routing | official detail | Built | Built | — / — | — / — | — / — | — / — |
| NC-04 | Capture V1 | Calibration settings | official frame | Built | Built | — / — | — / — | 92.89% / 92.89% | 95.46% / 95.46% |
| NC-05 | Capture V1 | Capture process / progress | official frame | Built | Built | — / — | — / — | 91.03% / 91.03% | 97.22% / 97.22% |
| NC-06 | Capture V1 | A/B result | official frame | Built | Built | — / — | — / — | 94.14% / 94.14% | 97.94% / 97.94% |
| NC-07 | Capture V1 | Metadata and save | official frame | Built | Built | — / — | — / — | 92.96% / 92.96% | 98.31% / 98.31% |
| ST-01 | Settings | Account settings | official frame | Built | Built | — / — | — / — | 93.11% / 93.11% | 98.44% / 98.44% |
| ST-02 | Settings | System settings | official frame | Built | Built | — / — | — / — | 90.80% / 90.86% | 96.73% / 96.73% |
| ST-03 | Settings | Device settings | official frame | Built | Built | — / — | — / — | 92.92% / 92.92% | 96.37% / 96.38% |
| ST-04 | Settings | Support settings | physical frame | Built | Built | 97.08% / 97.08% | 95.96% / 95.96% | — / — | — / — |
| ST-05 | Settings | Wi-Fi/network chooser | physical frame | Built | Built | 93.92% / 93.92% | 97.69% / 97.69% | — / — | — / — |
| ST-06 | Settings | Update availability/progress | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ST-07 | Settings | Storage and factory reset | physical frame | Built | Built | 93.31% / 93.31% | 97.39% / 97.39% | — / — | — / — |
| ST-08 | Settings | MIDI settings | official frame | Built | Built | — / — | — / — | 96.16% / 96.16% | 97.44% / 97.44% |
| ST-09 | Settings | Device information | physical frame | Built | Built | 93.21% / 93.21% | 97.20% / 97.20% | — / — | — / — |
| ST-10 | Settings | Diagnostics/report flow | physical frame | Built | Built | 97.47% / 97.47% | 98.52% / 98.52% | — / — | — / — |
| RC-01 | Recovery | Recovery Mode entry | official detail | Built | Built | — / — | — / — | — / — | — / — |
| RC-02 | Recovery | Recovery options | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| OV-01 | System overlay | On-screen keyboard / text entry | physical frame | Built | Built | 95.89% / 95.89% | 98.71% / 98.71% | — / — | — / — |
| OV-02 | System overlay | Generic confirmation | physical frame | Built | Built | 90.03% / 90.03% | 98.52% / 98.52% | — / — | — / — |
| OV-03 | System overlay | Error / unavailable state | physical frame | Built | Built | 91.78% / 91.78% | 96.20% / 96.20% | — / — | — / — |
| OV-04 | System overlay | Busy / progress state | physical frame | Built | Built | 84.57% / 84.58% | 97.26% / 97.26% | — / — | — / — |

## Authoritative evidence gaps

These states are implemented and captured on both hosts, but only against deterministic reconstruction fixtures. They require a physical framebuffer or an official visual before a visual-match percentage is meaningful.

| ID | Family | Screen/state | Renderer | Capture tier | Readiness | Dual-host smoke view |
| --- | --- | --- | --- | --- | --- | --- |
| ED-14 | Grid | I/O clipping warning | `fixture-warning-clip` | controlled-transient | requires-trigger | `fixture-warning-clip` |
| ED-15 | Grid | DSP/side-chain limit warning | `fixture-warning-dsp` | controlled-transient | requires-disposable-preset | `fixture-warning-dsp` |
| NC-02 | Capture V1 | Capture type selection | `capture-type` | safe-navigation | ready | `capture-type` |
| ST-06 | Settings | Update availability/progress | `settings-update` | external-evidence | do-not-trigger | `settings-update` |
| RC-02 | Recovery | Recovery options | `recovery-options` | disruptive | requires-scheduled-session | `recovery-options` |

## Score source files

- Physical Windows: `.artifacts/ui-parameter-parity-final/windows-comparison/summary.json`
- Physical Android: `.artifacts/ui-parameter-parity-final/android-comparison/summary.json`
- Official Windows: `.artifacts/ui-official-parity-final/windows-comparison/summary.json`
- Official Android: `.artifacts/ui-official-parity-final/android-comparison/summary.json`
