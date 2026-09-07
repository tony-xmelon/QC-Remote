# Quad Cortex typography parity — CorOS 4.1.0

Generated from the complete 103-state canonical screen manifest. Every visible text run is measured for resolved face, font availability, size, weight/style, line boxes, position, color, local background, direction, writing mode, wrapping, and line breaks on both Windows and Android.

## Result

- Canonical states measured: 103/103
- Authoritative raster comparisons: 232
- Windows/Android paired measurements: 201
- Cross-host computed-style parity: 100.00%
- Primary face availability: 100.00%
- Independent-score population: content-identity-verified comparisons only
- Content identity: 14 verified / 0 mismatch / 218 unverified
- Mean reference-content coverage: 100.00%
- Mean glyph-shape match (placement normalized): 88.18%
- Mean placement match: 90.80%
- Mean foreground-color match: 97.07%
- Mean local-background-color match: 96.93%
- Missing canonical states: 0
- Quality gate: FAIL
- Gate failures: mean verified glyph shape is below 90%

These dimensions are intentionally independent. Content identity uses screenshot-verified anchor tokens from the manifest; screens without explicit anchors are marked unverified. ZenUI object-tree token coverage remains a separate diagnostic because the tree can contain hidden labels. Glyph shape is scored after normalizing position; placement is measured from localized glyph-template x/y displacement at the native 800×480 scale; and foreground/background color scores compare their palettes separately. Purely symbolic runs do not influence typography means. The older combined masked-region scores remain in the JSON only for historical trend continuity and are not presented as fidelity scores.

## Bundled font availability

- QC CorOS IBM Plex Sans: available (10250 runs)

## Every authoritative screen

| State | Source | Screen | Runs | Identity | Content | Glyph shape | Placement | Foreground | Background | Host parity |
|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| DB-01 | physical | device-browser-base | 15 | unverified | — | 88.59% | 93.64% | 98.55% | 99.30% | 100.00% |
| DB-01 | physical | device-browser-middle-deep | 27 | unverified | — | 87.85% | 90.02% | 98.57% | 99.04% | 100.00% |
| DB-01 | physical | device-browser-middle-reverb | 28 | unverified | — | 85.15% | 90.36% | 98.04% | 96.72% | 100.00% |
| DB-01 | physical | device-browser-root | 16 | unverified | — | 85.01% | 94.17% | 97.92% | 95.22% | 100.00% |
| DB-01 | physical | device-browser-top | 16 | unverified | — | 84.96% | 93.56% | 97.92% | 95.22% | 100.00% |
| DB-02 | official | official-device-browser-amp | 14 | unverified | — | 95.86% | 94.18% | 99.50% | 99.52% | 100.00% |
| DB-02 | physical | device-browser-models | 21 | unverified | — | 90.40% | 97.19% | 98.68% | 90.87% | 100.00% |
| DB-02 | physical | device-browser-models-clean | 18 | unverified | — | 90.60% | 95.82% | 98.10% | 99.17% | 100.00% |
| DB-03 | physical | device-browser-models-clean | 18 | unverified | — | 90.60% | 95.82% | 98.10% | 99.17% | 100.00% |
| DB-03 | physical | device-browser-neural-capture | 39 | unverified | — | 78.88% | 90.72% | 86.81% | 99.73% | 100.00% |
| DB-04 | physical | device-search | 48 | unverified | — | 93.80% | 91.66% | 93.30% | 95.38% | 100.00% |
| DB-04 | physical | device-search-entry | 51 | verified | 100.00% | 88.62% | 89.51% | 96.64% | 95.66% | 100.00% |
| DB-04 | physical | device-search-results | 12 | unverified | — | 87.41% | 88.15% | 96.40% | 90.32% | 100.00% |
| DB-04 | physical | overlay-error | 12 | unverified | — | 87.41% | 88.15% | 96.40% | 90.32% | 100.00% |
| DB-05 | physical | device-favorites | 9 | unverified | — | 96.09% | 92.36% | 97.97% | 100.00% | 100.00% |
| DB-05 | physical | device-recents | 9 | unverified | — | 96.09% | 92.36% | 98.17% | 100.00% | 100.00% |
| DB-06 | official | official-plugin-folders | 11 | unverified | — | 77.64% | 96.49% | 97.61% | 96.15% | 100.00% |
| DB-07 | official | official-plugin-devices | 28 | unverified | — | 92.63% | 91.88% | 96.79% | 99.61% | 100.00% |
| DB-07 | physical | device-browser-plugin-list | 13 | unverified | — | 89.31% | 97.92% | 92.66% | 100.00% | 100.00% |
| DB-07 | physical | device-browser-plugin-models | 15 | unverified | — | 93.92% | 95.38% | 98.55% | 97.96% | 100.00% |
| DB-07 | physical | plugin-browser-ready | 13 | unverified | — | 91.14% | 97.87% | 92.66% | 100.00% | 100.00% |
| DB-09 | physical | device-browser-plugin-locked | 15 | unverified | — | 96.83% | 95.26% | 98.38% | 97.96% | 100.00% |
| DR-02 | official | official-directory-presets | 40 | unverified | — | 95.24% | 91.76% | 95.08% | 97.78% | 100.00% |
| DR-02 | physical | preset-directory | 47 | unverified | — | 95.63% | 88.89% | 98.59% | 97.50% | 100.00% |
| DR-03 | official | official-directory-captures | 41 | unverified | — | 77.45% | 97.93% | 97.33% | 98.97% | 100.00% |
| DR-04 | official | official-directory-irs | 30 | unverified | — | 84.07% | 98.08% | 97.54% | 97.13% | 100.00% |
| DR-05 | official | official-directory-plugin-presets | 9 | unverified | — | 92.12% | 98.50% | 100.00% | 97.65% | 100.00% |
| DR-06 | official | official-directory-favorites | 24 | unverified | — | 91.94% | 94.17% | 96.60% | 99.12% | 100.00% |
| DR-08 | official | official-directory-search-results | 26 | unverified | — | 69.42% | 89.76% | 91.05% | 93.05% | 100.00% |
| DR-13 | official | official-directory-nested | 40 | unverified | — | 73.00% | 97.92% | 97.17% | 98.42% | 100.00% |
| DR-15 | physical | directory-item-context | 50 | unverified | — | 98.42% | 89.24% | 96.20% | 99.36% | 100.00% |
| DR-16 | official | official-directory-upload | 27 | unverified | — | 95.30% | 94.11% | 98.95% | 96.87% | 100.00% |
| ED-01 | physical | editor-ambience | 26 | unverified | — | 85.64% | 90.18% | 98.32% | 96.33% | 100.00% |
| ED-01 | physical | editor-chief-ds1 | 19 | unverified | — | 89.29% | 87.38% | 97.75% | 96.09% | 100.00% |
| ED-01 | physical | editor-digital-flanger | 37 | unverified | — | 85.87% | 90.24% | 96.86% | 99.30% | 100.00% |
| ED-01 | physical | editor-simple-gate | 15 | unverified | — | 89.63% | 90.73% | 98.24% | 96.46% | 100.00% |
| ED-01 | physical | editor-ukc30-topboost | 26 | unverified | — | 88.50% | 90.51% | 98.22% | 97.14% | 100.00% |
| ED-03 | physical | editor-ukc30-cab | 37 | unverified | — | 78.71% | 92.38% | 97.89% | 97.03% | 100.00% |
| ED-04 | physical | editor-parametric-8 | 40 | unverified | — | 80.99% | 86.94% | 97.39% | 95.33% | 100.00% |
| ED-05 | physical | fixture-editor-capture | 22 | verified | 100.00% | 86.89% | 89.27% | 96.03% | 97.98% | 100.00% |
| ED-06 | official | official-looper | 29 | unverified | — | 88.94% | 81.73% | 97.74% | 98.02% | 100.00% |
| ED-07 | official | official-device-presets | 26 | unverified | — | 93.05% | 93.94% | 95.97% | 99.11% | 100.00% |
| ED-07 | physical | device-presets-exotic-z-boost | 26 | unverified | — | 91.74% | 93.96% | 94.97% | 99.71% | 100.00% |
| ED-08 | physical | device-preset-save | 50 | unverified | — | 95.30% | 94.37% | 95.37% | 98.10% | 100.00% |
| ED-12 | official | official-expression-bypass | 28 | unverified | — | 89.77% | 88.92% | 99.18% | 96.34% | 100.00% |
| ED-13 | physical | block-context | 27 | unverified | — | 89.92% | 97.53% | 97.64% | 97.24% | 100.00% |
| ED-13 | physical | block-context-bottom | 30 | unverified | — | 93.87% | 91.28% | 98.71% | 96.78% | 100.00% |
| ED-16 | official | official-device-preset-actions | 20 | unverified | — | 94.07% | 90.70% | 97.35% | 98.75% | 100.00% |
| ED-16 | physical | device-preset-actions | 30 | unverified | — | 97.77% | 94.80% | 81.72% | 97.91% | 100.00% |
| ED-17 | physical | device-presets-user | 11 | unverified | — | 94.12% | 93.34% | 97.89% | 99.31% | 100.00% |
| GL-04 | official | official-grid-brit-2203 | 13 | unverified | — | 89.58% | 90.61% | 98.05% | 96.14% | 100.00% |
| GL-04 | physical | capture-type | 9 | verified | 100.00% | 85.54% | 85.82% | 97.36% | 98.61% | 100.00% |
| GL-04 | physical | grid-base | 9 | unverified | — | 92.07% | 88.14% | 97.39% | 98.61% | 100.00% |
| GL-04 | physical | grid-restored | 9 | unverified | — | 92.07% | 88.14% | 97.39% | 98.61% | 100.00% |
| GL-05 | physical | grid-scene-b | 9 | unverified | — | 90.51% | 89.08% | 98.61% | 98.61% | 100.00% |
| GL-06 | physical | grid-scene-a-restored | 9 | unverified | — | 91.26% | 89.08% | 98.37% | 98.61% | 100.00% |
| GL-06 | physical | grid-scene-b | 9 | unverified | — | 90.51% | 89.08% | 98.61% | 98.61% | 100.00% |
| GL-07 | physical | grid-scene-selector | 25 | unverified | — | 76.99% | 94.96% | 95.77% | 98.62% | 100.00% |
| GL-08 | physical | grid-context-menu | 17 | unverified | — | 96.76% | 92.28% | 98.86% | 99.33% | 100.00% |
| GL-08 | physical | grid-context-menu-bottom | 16 | unverified | — | 94.96% | 92.54% | 98.98% | 99.29% | 100.00% |
| GL-08 | physical | grid-context-menu-favorite | 17 | unverified | — | 97.04% | 93.27% | 99.11% | 99.33% | 100.00% |
| GL-09 | physical | save-as-editor | 53 | unverified | — | 96.82% | 96.23% | 97.81% | 98.84% | 100.00% |
| GL-10 | physical | edit-details-editor | 53 | unverified | — | 96.18% | 89.40% | 96.13% | 96.44% | 100.00% |
| GL-11 | physical | copy-scene-destination | 19 | unverified | — | 95.02% | 85.15% | 95.06% | 99.67% | 100.00% |
| GL-12 | physical | swap-scene-destination | 19 | unverified | — | 94.40% | 84.62% | 94.99% | 99.67% | 100.00% |
| GL-13 | official | official-midi-out | 14 | unverified | — | 93.73% | 94.31% | 97.93% | 95.95% | 100.00% |
| GL-13 | physical | preset-midi-out | 14 | unverified | — | 93.73% | 94.31% | 98.45% | 95.95% | 100.00% |
| GL-14 | physical | delete-confirmation | 50 | unverified | — | 99.41% | 90.78% | 96.56% | 97.18% | 100.00% |
| GL-15 | official | official-tuner | 18 | unverified | — | 92.61% | 88.82% | 97.89% | 92.17% | 100.00% |
| GL-15 | physical | tuner | 12 | unverified | — | 87.41% | 88.30% | 94.91% | 89.88% | 100.00% |
| GL-16 | physical | gig-view-live-tuner | 19 | unverified | — | 96.66% | 89.23% | 85.68% | 95.92% | 100.00% |
| GL-17 | official | official-tempo | 27 | unverified | — | 77.00% | 93.64% | 96.34% | 94.82% | 100.00% |
| GL-17 | physical | tempo-metronome | 30 | unverified | — | 81.57% | 92.06% | 94.80% | 94.40% | 100.00% |
| GL-18 | official | official-modes-configuration | 13 | unverified | — | 88.64% | 87.69% | 97.36% | 90.83% | 100.00% |
| GL-18 | physical | modes-configuration | 11 | unverified | — | 95.88% | 89.47% | 98.11% | 100.00% | 100.00% |
| GL-19 | official | official-gig-view-preset | 37 | verified | 100.00% | 96.72% | 98.84% | 99.05% | 97.84% | 100.00% |
| GL-19 | physical | gig-view-preset | 28 | unverified | — | 93.48% | 91.54% | 98.75% | 94.47% | 100.00% |
| GL-20 | official | official-gig-view-scene | 31 | unverified | — | 72.56% | 97.34% | 99.02% | 97.34% | 100.00% |
| GL-20 | physical | gig-view-scene | 24 | unverified | — | 69.23% | 96.07% | 97.70% | 93.76% | 100.00% |
| GL-21 | official | official-gig-view-stomp | 32 | unverified | — | 97.79% | 93.03% | 93.79% | 96.44% | 100.00% |
| GL-21 | physical | gig-view | 19 | unverified | — | 96.84% | 91.34% | 85.68% | 93.22% | 100.00% |
| GL-22 | official | official-gig-view-hybrid | 28 | unverified | — | 84.49% | 95.50% | 93.79% | 96.36% | 100.00% |
| GL-24 | physical | tuner-live-enabled | 12 | unverified | — | 90.21% | 84.95% | 97.47% | 89.88% | 100.00% |
| GR-01 | physical | input-route-selector | 19 | unverified | — | 90.32% | 90.76% | 89.21% | 96.41% | 100.00% |
| GR-01 | physical | input-route-selector-top | 19 | unverified | — | 93.81% | 95.52% | 89.67% | 97.40% | 100.00% |
| GR-02 | physical | output-route-selector | 18 | unverified | — | 76.28% | 80.59% | 86.26% | 97.61% | 100.00% |
| GR-02 | physical | output-route-selector-top | 20 | unverified | — | 85.54% | 91.91% | 86.96% | 98.79% | 100.00% |
| GR-03 | physical | splitter-editor | 31 | unverified | — | 78.34% | 87.89% | 97.81% | 98.22% | 100.00% |
| GR-04 | physical | splitter-editor | 31 | unverified | — | 78.34% | 87.89% | 97.81% | 98.22% | 100.00% |
| GR-05 | physical | mixer-editor | 26 | unverified | — | 91.96% | 90.19% | 97.94% | 97.88% | 100.00% |
| GR-06 | official | official-empty-slot | 15 | unverified | — | 92.89% | 93.12% | 93.05% | 99.40% | 100.00% |
| IO-01 | physical | io-overview | 41 | unverified | — | 83.25% | 89.10% | 94.43% | 97.57% | 100.00% |
| IO-02 | official | official-io-settings-analog | 34 | unverified | — | 81.59% | 90.76% | 95.49% | 97.88% | 100.00% |
| IO-03 | physical | io-output | 47 | unverified | — | 80.79% | 90.04% | 94.03% | 97.43% | 100.00% |
| IO-04 | physical | io-send-return | 27 | unverified | — | 82.60% | 90.09% | 92.72% | 97.88% | 100.00% |
| IO-05 | official | official-io-settings-usb | 49 | unverified | — | 81.64% | 90.79% | 95.73% | 96.37% | 100.00% |
| IO-06 | physical | io-headphones | 27 | verified | 100.00% | 84.08% | 92.63% | 97.45% | 98.03% | 100.00% |
| IO-07 | official | official-global-eq | 28 | verified | 100.00% | 80.99% | 92.11% | 94.56% | 93.47% | 100.00% |
| IO-08 | physical | input-gate-control | 21 | unverified | — | 87.76% | 92.48% | 95.53% | 96.17% | 100.00% |
| NC-04 | official | official-capture-settings | 37 | unverified | — | 86.87% | 93.63% | 99.31% | 96.99% | 100.00% |
| NC-05 | official | official-capture-process | 13 | unverified | — | 96.10% | 89.38% | 98.47% | 100.00% | 100.00% |
| NC-06 | official | official-capture-ab-test | 10 | unverified | — | 94.11% | 89.21% | 98.00% | 91.47% | 100.00% |
| NC-07 | official | official-capture-metadata | 10 | unverified | — | 95.53% | 76.87% | 98.39% | 87.78% | 100.00% |
| OV-01 | physical | onscreen-keyboard | 52 | unverified | — | 88.44% | 93.81% | 95.41% | 97.99% | 100.00% |
| OV-02 | physical | generic-confirmation | 52 | unverified | — | 99.39% | 91.06% | 96.51% | 97.21% | 100.00% |
| OV-03 | physical | device-browser-plugin-locked | 15 | unverified | — | 96.83% | 95.26% | 98.38% | 97.96% | 100.00% |
| OV-04 | physical | overlay-busy | 13 | unverified | — | 89.66% | 97.45% | 92.86% | 99.19% | 100.00% |
| ST-01 | official | official-settings-account | 18 | unverified | — | 85.91% | 92.71% | 98.35% | 97.79% | 100.00% |
| ST-02 | official | official-settings-system | 28 | verified | 100.00% | 94.45% | 87.42% | 98.39% | 96.95% | 100.00% |
| ST-03 | official | official-settings-device | 31 | unverified | — | 93.76% | 86.71% | 99.22% | 96.69% | 100.00% |
| ST-04 | physical | settings-support | 17 | unverified | — | 96.94% | 92.34% | 99.17% | 98.14% | 100.00% |
| ST-05 | physical | settings-wifi | 18 | unverified | — | 96.74% | 92.26% | 97.31% | 97.30% | 100.00% |
| ST-07 | physical | settings-storage | 18 | unverified | — | 96.62% | 88.65% | 98.19% | 99.41% | 100.00% |
| ST-08 | official | official-midi-settings | 40 | unverified | — | 92.22% | 92.21% | 96.41% | 97.86% | 100.00% |
| ST-09 | physical | settings-info | 22 | unverified | — | 97.05% | 92.82% | 99.20% | 99.52% | 100.00% |
| ST-10 | physical | settings-diagnostics | 12 | unverified | — | 94.06% | 94.42% | 99.48% | 99.12% | 100.00% |

## Reproduce

1. Capture both hosts with the Windows and Android corpus drivers plus the official/manual drivers.
2. Run `npm run verify:qc-typography`.
3. Run `npm run compare:qc-typography`.
4. Run `npm run report:qc-typography`.
