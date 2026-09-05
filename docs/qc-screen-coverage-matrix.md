# Quad Cortex canonical screen coverage matrix

Generated from the CorOS 4.1.0 executable coverage ledger. This report distinguishes implemented render paths from authoritative visual evidence; a smoke-only row has no defensible visual-match percentage yet.

## Coverage summary

- Canonical device states: **103/103** routed through the shared Windows/Android surface.
- Full-frame authoritative evidence: **59/103** states.
- Official-detail-only evidence: **20/103** states.
- Smoke-only evidence gaps: **24/103** states.
- Exact-size dual-host capture paths: **103/103** states.

| Corpus | Windows structural | Windows color | Android structural | Android color |
| --- | ---: | ---: | ---: | ---: |
| Physical device | 90.75% | 97.25% | 90.76% | 97.25% |
| Official manual | 90.79% | 97.11% | 90.79% | 97.11% |

Scores are edge-F1 structural match with a two-pixel tolerance and `1 - MAE` color similarity. A canonical state that references multiple frames reports their mean. Detail evidence is scoped and therefore never promoted into a full-frame score.

## Evidence by family

| Family | States | Full frame | Detail only | Smoke only |
| --- | ---: | ---: | ---: | ---: |
| Lifecycle | 3 | 0 | 3 | 0 |
| Grid | 8 | 6 | 0 | 2 |
| Preset | 5 | 4 | 0 | 1 |
| MIDI | 1 | 1 | 0 | 0 |
| Performance | 5 | 5 | 0 | 0 |
| Gig View | 4 | 4 | 0 | 0 |
| Monitoring | 1 | 0 | 1 | 0 |
| I/O | 8 | 4 | 1 | 3 |
| Routing | 5 | 5 | 0 | 0 |
| Device browser | 9 | 6 | 1 | 2 |
| Editor | 9 | 5 | 1 | 3 |
| Assignment | 4 | 1 | 3 | 0 |
| Virtual Device preset | 2 | 2 | 0 | 0 |
| Directory | 16 | 8 | 7 | 1 |
| Capture V1 | 7 | 4 | 2 | 1 |
| Settings | 10 | 4 | 0 | 6 |
| Recovery | 2 | 0 | 1 | 1 |
| System overlay | 4 | 0 | 0 | 4 |

## All canonical device states

| ID | Family | Screen/state | Evidence | Windows | Android | Physical structural W/A | Physical color W/A | Official structural W/A | Official color W/A |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| GL-01 | Lifecycle | Power-on / boot progress | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-02 | Lifecycle | Power-off confirmation | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-03 | Lifecycle | Screen lock / power overlay | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-04 | Grid | Clean preset Grid | physical frame + official frame | Built | Built | 93.42% / 93.42% | 97.22% / 97.22% | 92.12% / 92.11% | 96.06% / 96.06% |
| GL-05 | Grid | Modified preset Grid | physical frame | Built | Built | 93.43% / 93.43% | 97.22% / 97.22% | — / — | — / — |
| GL-06 | Grid | Alternate active scene | physical frame | Built | Built | 93.42% / 93.42% | 97.22% / 97.22% | — / — | — / — |
| GL-07 | Grid | Scene selector | physical frame + official detail | Built | Built | 94.82% / 94.82% | 97.16% / 97.16% | — / — | — / — |
| GL-08 | Grid | Grid contextual menu | physical frame | Built | Built | 89.56% / 89.56% | 96.18% / 96.18% | — / — | — / — |
| GL-09 | Preset | Save As editor | physical frame | Built | Built | 89.49% / 89.49% | 98.22% / 98.22% | — / — | — / — |
| GL-10 | Preset | Edit Details / preset name editor | physical frame | Built | Built | 92.66% / 92.66% | 98.08% / 98.08% | — / — | — / — |
| GL-11 | Preset | Copy Scene destination | physical frame | Built | Built | 91.46% / 91.46% | 99.06% / 99.06% | — / — | — / — |
| GL-12 | Preset | Swap Scene destination | physical frame | Built | Built | 91.37% / 91.37% | 99.05% / 99.05% | — / — | — / — |
| GL-13 | MIDI | Preset MIDI Out | physical frame + official frame | Built | Built | 89.34% / 89.31% | 97.52% / 97.52% | 89.46% / 89.43% | 97.50% / 97.50% |
| GL-14 | Preset | Delete confirmation | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| GL-15 | Performance | Tuner | physical frame + official frame | Built | Built | 90.77% / 90.77% | 97.83% / 97.83% | 88.59% / 88.59% | 97.45% / 97.45% |
| GL-16 | Performance | Live tuner / Gig View tuner | physical frame | Built | Built | 94.50% / 94.50% | 96.45% / 96.45% | — / — | — / — |
| GL-17 | Performance | Tempo & Metronome | physical frame + official frame | Built | Built | 89.88% / 89.88% | 97.63% / 97.63% | 90.89% / 90.89% | 97.56% / 97.56% |
| GL-18 | Performance | Modes Configuration | physical frame + official frame | Built | Built | 96.39% / 96.39% | 98.59% / 98.59% | 91.84% / 91.84% | 96.75% / 96.75% |
| GL-19 | Gig View | PRESET mode | physical frame + official frame | Built | Built | 93.96% / 93.96% | 95.65% / 95.65% | 95.61% / 95.61% | 96.22% / 96.22% |
| GL-20 | Gig View | SCENE mode | physical frame + official frame | Built | Built | 90.91% / 90.91% | 96.95% / 96.95% | 93.50% / 93.50% | 95.82% / 95.82% |
| GL-21 | Gig View | STOMP mode | physical frame + official frame | Built | Built | 94.41% / 94.41% | 96.34% / 96.34% | 88.85% / 88.85% | 93.63% / 93.63% |
| GL-22 | Gig View | HYBRID mode | official frame | Built | Built | — / — | — / — | 90.68% / 90.68% | 94.75% / 94.75% |
| GL-23 | Monitoring | CPU Monitor | official detail | Built | Built | — / — | — / — | — / — | — / — |
| GL-24 | Performance | Tuner with Live Tuner enabled | physical frame | Built | Built | 90.92% / 90.92% | 97.83% / 97.83% | — / — | — / — |
| IO-01 | I/O | I/O Settings overview | official detail | Built | Built | — / — | — / — | — / — | — / — |
| IO-02 | I/O | Analog input detail | official frame | Built | Built | — / — | — / — | 87.71% / 87.70% | 97.31% / 97.31% |
| IO-03 | I/O | Analog output detail | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| IO-04 | I/O | Send/Return detail | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| IO-05 | I/O | USB I/O detail | official frame | Built | Built | — / — | — / — | 88.08% / 88.08% | 96.48% / 96.48% |
| IO-06 | I/O | Headphones detail | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| IO-07 | I/O | Global EQ | official frame | Built | Built | — / — | — / — | 90.51% / 90.51% | 96.42% / 96.42% |
| IO-08 | I/O | Global input gate and bypass | physical frame | Built | Built | 89.48% / 89.48% | 97.22% / 97.22% | — / — | — / — |
| GR-01 | Routing | Input route selector | physical frame | Built | Built | 88.26% / 88.31% | 96.51% / 96.51% | — / — | — / — |
| GR-02 | Routing | Output route selector | physical frame | Built | Built | 88.91% / 88.95% | 96.45% / 96.45% | — / — | — / — |
| GR-03 | Routing | Splitter/Mixer placement handles | physical frame | Built | Built | 89.24% / 89.24% | 97.47% / 97.47% | — / — | — / — |
| GR-04 | Routing | Splitter parameter editor | physical frame | Built | Built | 89.24% / 89.24% | 97.47% / 97.47% | — / — | — / — |
| GR-05 | Routing | Mixer parameter editor | physical frame | Built | Built | 90.45% / 90.45% | 97.54% / 97.54% | — / — | — / — |
| GR-06 | Grid | Empty-slot target | official frame | Built | Built | — / — | — / — | 94.02% / 94.02% | 98.46% / 98.46% |
| DB-01 | Device browser | Category root | physical frame | Built | Built | 86.04% / 86.05% | 96.11% / 96.11% | — / — | — / — |
| DB-02 | Device browser | Guitar/Bass model list | physical frame + official frame | Built | Built | 88.43% / 88.43% | 96.50% / 96.50% | 87.14% / 87.14% | 98.22% / 98.22% |
| DB-03 | Device browser | First-use device-preset tooltip | physical frame | Built | Built | 87.11% / 87.11% | 96.57% / 96.57% | — / — | — / — |
| DB-04 | Device browser | Search results | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| DB-05 | Device browser | Favorites / Recent models | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| DB-06 | Device browser | Plugin device folders | official frame | Built | Built | — / — | — / — | 87.91% / 87.91% | 99.05% / 99.05% |
| DB-07 | Device browser | Plugin device list / license state | physical frame + official frame | Built | Built | 90.40% / 90.41% | 97.28% / 97.28% | 89.66% / 89.66% | 97.82% / 97.82% |
| DB-08 | Device browser | Plugin refresh state | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DB-09 | Device browser | Locked plugin / license-not-found models | physical frame | Built | Built | 92.04% / 92.04% | 96.00% / 96.00% | — / — | — / — |
| ED-01 | Editor | Standard rotary parameter editor | physical frame | Built | Built | 88.51% / 88.51% | 97.18% / 97.18% | — / — | — / — |
| ED-02 | Editor | Multi-page parameter editor | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-03 | Editor | Cab editor | physical frame | Built | Built | 85.19% / 85.19% | 97.06% / 97.06% | — / — | — / — |
| ED-04 | Editor | Parametric EQ editor | physical frame | Built | Built | 88.41% / 88.41% | 98.17% / 98.17% | — / — | — / — |
| ED-05 | Editor | Neural Capture block editor | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ED-06 | Editor | Looper X editor | official frame | Built | Built | — / — | — / — | 87.37% / 87.37% | 96.95% / 96.95% |
| ED-07 | Editor | Virtual Device preset browser | physical frame + official frame | Built | Built | 90.42% / 90.42% | 97.49% / 97.49% | 88.56% / 88.55% | 96.61% / 96.61% |
| ED-08 | Editor | Save Virtual Device preset | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ED-09 | Assignment | STOMP assignment | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-10 | Assignment | Scene assignment / scene-safe controls | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-11 | Assignment | Expression parameter assignment | official detail | Built | Built | — / — | — / — | — / — | — / — |
| ED-12 | Assignment | Expression bypass assignment | official frame | Built | Built | — / — | — / — | 91.73% / 91.79% | 96.95% / 96.95% |
| ED-13 | Editor | Block contextual actions | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ED-14 | Grid | I/O clipping warning | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ED-15 | Grid | DSP/side-chain limit warning | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ED-16 | Virtual Device preset | Factory preset row actions | physical frame + official frame | Built | Built | 96.06% / 96.06% | 96.38% / 96.38% | 89.08% / 89.08% | 95.88% / 95.88% |
| ED-17 | Virtual Device preset | Empty User preset tab | physical frame | Built | Built | 89.82% / 89.81% | 98.29% / 98.29% | — / — | — / — |
| DR-01 | Directory | Category chooser | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-02 | Directory | Presets browser | physical frame + official frame | Built | Built | 92.23% / 92.25% | 97.72% / 97.72% | 91.97% / 91.97% | 97.85% / 97.85% |
| DR-03 | Directory | Neural Captures browser | official frame | Built | Built | — / — | — / — | 89.13% / 89.13% | 97.46% / 97.46% |
| DR-04 | Directory | Impulse Responses browser | official frame | Built | Built | — / — | — / — | 89.71% / 89.77% | 97.80% / 97.80% |
| DR-05 | Directory | Plugin Presets browser | official frame | Built | Built | — / — | — / — | 96.39% / 96.38% | 98.53% / 98.53% |
| DR-06 | Directory | Favorites and Recent | official frame | Built | Built | — / — | — / — | 91.22% / 91.22% | 97.72% / 97.72% |
| DR-07 | Directory | Search entry | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-08 | Directory | Search results | official frame | Built | Built | — / — | — / — | 88.38% / 88.38% | 97.28% / 97.28% |
| DR-09 | Directory | Sort menu | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-10 | Directory | Filter menu | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-11 | Directory | Arrange / multiselect mode | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-12 | Directory | Multiselect copy destination | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-13 | Directory | Nested folder browser | official frame | Built | Built | — / — | — / — | 90.10% / 90.10% | 97.69% / 97.69% |
| DR-14 | Directory | New folder / setlist editor | official detail | Built | Built | — / — | — / — | — / — | — / — |
| DR-15 | Directory | Item contextual menu | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| DR-16 | Directory | Cortex Cloud upload mode | official frame | Built | Built | — / — | — / — | 91.02% / 91.01% | 98.16% / 98.16% |
| NC-01 | Capture V1 | Capture introduction | official detail | Built | Built | — / — | — / — | — / — | — / — |
| NC-02 | Capture V1 | Capture type selection | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| NC-03 | Capture V1 | Connection and routing | official detail | Built | Built | — / — | — / — | — / — | — / — |
| NC-04 | Capture V1 | Calibration settings | official frame | Built | Built | — / — | — / — | 92.87% / 92.87% | 95.45% / 95.45% |
| NC-05 | Capture V1 | Capture process / progress | official frame | Built | Built | — / — | — / — | 90.61% / 90.65% | 97.19% / 97.19% |
| NC-06 | Capture V1 | A/B result | official frame | Built | Built | — / — | — / — | 88.57% / 88.57% | 97.89% / 97.89% |
| NC-07 | Capture V1 | Metadata and save | official frame | Built | Built | — / — | — / — | 92.95% / 92.95% | 98.30% / 98.30% |
| ST-01 | Settings | Account settings | official frame | Built | Built | — / — | — / — | 93.09% / 93.09% | 98.43% / 98.43% |
| ST-02 | Settings | System settings | official frame | Built | Built | — / — | — / — | 90.03% / 90.02% | 96.45% / 96.45% |
| ST-03 | Settings | Device settings | official frame | Built | Built | — / — | — / — | 92.85% / 92.85% | 96.37% / 96.37% |
| ST-04 | Settings | Support settings | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ST-05 | Settings | Wi-Fi/network chooser | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ST-06 | Settings | Update availability/progress | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ST-07 | Settings | Storage and factory reset | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ST-08 | Settings | MIDI settings | official frame | Built | Built | — / — | — / — | 96.08% / 96.08% | 97.44% / 97.44% |
| ST-09 | Settings | Device information | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| ST-10 | Settings | Diagnostics/report flow | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| RC-01 | Recovery | Recovery Mode entry | official detail | Built | Built | — / — | — / — | — / — | — / — |
| RC-02 | Recovery | Recovery options | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| OV-01 | System overlay | On-screen keyboard / text entry | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| OV-02 | System overlay | Generic confirmation | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| OV-03 | System overlay | Error / unavailable state | smoke only | Built | Built | — / — | — / — | — / — | — / — |
| OV-04 | System overlay | Busy / progress state | smoke only | Built | Built | — / — | — / — | — / — | — / — |

## Authoritative evidence gaps

These states are implemented and captured on both hosts, but only against deterministic reconstruction fixtures. They require a physical framebuffer or an official visual before a visual-match percentage is meaningful.

| ID | Family | Screen/state | Renderer | Capture tier | Readiness | Dual-host smoke view |
| --- | --- | --- | --- | --- | --- | --- |
| GL-14 | Preset | Delete confirmation | `fixture-delete` | safe-navigation | ready | `fixture-delete` |
| IO-03 | I/O | Analog output detail | `io-output` | safe-navigation | ready | `io-output` |
| IO-04 | I/O | Send/Return detail | `io-send-return` | safe-navigation | ready | `io-send-return` |
| IO-06 | I/O | Headphones detail | `io-headphones` | safe-navigation | ready | `io-headphones` |
| DB-04 | Device browser | Search results | `device-search` | safe-navigation | ready | `device-search` |
| DB-05 | Device browser | Favorites / Recent models | `device-favorites` | safe-navigation | ready | `device-favorites` |
| ED-05 | Editor | Neural Capture block editor | `fixture-editor-capture` | safe-navigation | requires-content | `fixture-editor-capture` |
| ED-08 | Editor | Save Virtual Device preset | `device-preset-save` | safe-navigation | ready | `device-preset-save` |
| ED-13 | Editor | Block contextual actions | `block-context` | safe-navigation | ready | `block-context` |
| ED-14 | Grid | I/O clipping warning | `fixture-warning-clip` | controlled-transient | requires-trigger | `fixture-warning-clip` |
| ED-15 | Grid | DSP/side-chain limit warning | `fixture-warning-dsp` | controlled-transient | requires-disposable-preset | `fixture-warning-dsp` |
| DR-15 | Directory | Item contextual menu | `directory-item-context` | safe-navigation | ready | `directory-item-context` |
| NC-02 | Capture V1 | Capture type selection | `capture-type` | safe-navigation | ready | `capture-type` |
| ST-04 | Settings | Support settings | `settings-support` | safe-navigation | ready | `settings-support` |
| ST-05 | Settings | Wi-Fi/network chooser | `settings-wifi` | safe-navigation | ready | `settings-wifi` |
| ST-06 | Settings | Update availability/progress | `settings-update` | external-evidence | do-not-trigger | `settings-update` |
| ST-07 | Settings | Storage and factory reset | `settings-storage` | safe-navigation | ready | `settings-storage` |
| ST-09 | Settings | Device information | `settings-info` | safe-navigation | ready | `settings-info` |
| ST-10 | Settings | Diagnostics/report flow | `settings-diagnostics` | safe-navigation | ready | `settings-diagnostics` |
| RC-02 | Recovery | Recovery options | `recovery-options` | disruptive | requires-scheduled-session | `recovery-options` |
| OV-01 | System overlay | On-screen keyboard / text entry | `overlay-keyboard` | safe-navigation | ready | `overlay-keyboard` |
| OV-02 | System overlay | Generic confirmation | `overlay-confirmation` | safe-navigation | ready | `overlay-confirmation` |
| OV-03 | System overlay | Error / unavailable state | `overlay-error` | controlled-transient | recipe-discovery | `overlay-error` |
| OV-04 | System overlay | Busy / progress state | `overlay-busy` | controlled-transient | ready | `overlay-busy` |

## Score source files

- Physical Windows: `.artifacts/ui-input-gate-final/windows-comparison/summary.json`
- Physical Android: `.artifacts/ui-input-gate-final/android-comparison/summary.json`
- Official Windows: `.artifacts/ui-official-shared-editor-fix/windows-comparison/summary.json`
- Official Android: `.artifacts/ui-official-shared-editor-fix/android-comparison/summary.json`
