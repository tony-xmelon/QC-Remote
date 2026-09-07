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
- Mean glyph-shape match (placement normalized): 87.47%
- Mean placement match: 61.43%
- Mean foreground-color match: 97.29%
- Mean local-background-color match: 96.85%
- Missing canonical states: 0
- Quality gate: FAIL
- Gate failures: mean verified glyph shape is below 90%; mean verified text placement is below 80%

These dimensions are intentionally independent. Content identity uses screenshot-verified anchor tokens from the manifest; screens without explicit anchors are marked unverified. ZenUI object-tree token coverage remains a separate diagnostic because the tree can contain hidden labels. Glyph shape is scored after normalizing position, placement compares text bounds, and foreground/background color scores compare their palettes separately. The older combined masked-region scores remain in the JSON only for historical trend continuity and are not presented as fidelity scores.

## Bundled font availability

- QC CorOS IBM Plex Sans: available (10250 runs)

## Every authoritative screen

| State | Source | Screen | Runs | Identity | Content | Glyph shape | Placement | Foreground | Background | Host parity |
|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| DB-01 | physical | device-browser-base | 15 | unverified | — | 87.80% | 78.85% | 97.96% | 99.30% | 100.00% |
| DB-01 | physical | device-browser-middle-deep | 27 | unverified | — | 81.82% | 73.41% | 98.42% | 99.04% | 100.00% |
| DB-01 | physical | device-browser-middle-reverb | 28 | unverified | — | 83.93% | 75.44% | 98.17% | 99.07% | 100.00% |
| DB-01 | physical | device-browser-root | 16 | unverified | — | 83.71% | 77.24% | 97.62% | 99.34% | 100.00% |
| DB-01 | physical | device-browser-top | 16 | unverified | — | 87.17% | 78.80% | 97.62% | 99.34% | 100.00% |
| DB-02 | official | official-device-browser-amp | 14 | unverified | — | 92.50% | 77.66% | 99.50% | 98.31% | 100.00% |
| DB-02 | physical | device-browser-models | 21 | unverified | — | 91.55% | 85.73% | 98.91% | 98.57% | 100.00% |
| DB-02 | physical | device-browser-models-clean | 18 | unverified | — | 86.17% | 83.21% | 97.90% | 99.24% | 100.00% |
| DB-03 | physical | device-browser-models-clean | 18 | unverified | — | 86.17% | 83.21% | 97.90% | 99.24% | 100.00% |
| DB-03 | physical | device-browser-neural-capture | 39 | unverified | — | 85.68% | 42.91% | 87.64% | 100.00% | 100.00% |
| DB-04 | physical | device-search | 48 | unverified | — | 94.51% | 55.21% | 93.75% | 96.43% | 100.00% |
| DB-04 | physical | device-search-entry | 51 | verified | 100.00% | 93.41% | 54.29% | 97.07% | 96.49% | 100.00% |
| DB-04 | physical | device-search-results | 12 | unverified | — | 88.12% | 46.80% | 96.34% | 96.65% | 100.00% |
| DB-04 | physical | overlay-error | 12 | unverified | — | 88.12% | 46.80% | 96.34% | 96.65% | 100.00% |
| DB-05 | physical | device-favorites | 9 | unverified | — | 94.90% | 88.77% | 97.97% | 100.00% | 100.00% |
| DB-05 | physical | device-recents | 9 | unverified | — | 94.90% | 88.77% | 98.17% | 100.00% | 100.00% |
| DB-06 | official | official-plugin-folders | 11 | unverified | — | 86.73% | 69.14% | 98.26% | 100.00% | 100.00% |
| DB-07 | official | official-plugin-devices | 28 | unverified | — | 81.86% | 58.27% | 97.23% | 96.23% | 100.00% |
| DB-07 | physical | device-browser-plugin-list | 13 | unverified | — | 86.51% | 81.98% | 93.14% | 100.00% | 100.00% |
| DB-07 | physical | device-browser-plugin-models | 15 | unverified | — | 94.73% | 85.29% | 98.55% | 98.25% | 100.00% |
| DB-07 | physical | plugin-browser-ready | 13 | unverified | — | 83.37% | 76.27% | 93.14% | 100.00% | 100.00% |
| DB-09 | physical | device-browser-plugin-locked | 15 | unverified | — | 97.25% | 86.29% | 98.38% | 98.25% | 100.00% |
| DR-02 | official | official-directory-presets | 40 | unverified | — | 94.91% | 68.01% | 95.08% | 99.74% | 100.00% |
| DR-02 | physical | preset-directory | 47 | unverified | — | 96.57% | 77.92% | 98.44% | 99.44% | 100.00% |
| DR-03 | official | official-directory-captures | 41 | unverified | — | 79.35% | 53.97% | 98.35% | 100.00% | 100.00% |
| DR-04 | official | official-directory-irs | 30 | unverified | — | 89.34% | 64.82% | 97.82% | 100.00% | 100.00% |
| DR-05 | official | official-directory-plugin-presets | 9 | unverified | — | 93.03% | 84.25% | 100.00% | 100.00% | 100.00% |
| DR-06 | official | official-directory-favorites | 24 | unverified | — | 91.59% | 49.42% | 96.60% | 100.00% | 100.00% |
| DR-08 | official | official-directory-search-results | 26 | unverified | — | 83.11% | 63.56% | 91.86% | 97.25% | 100.00% |
| DR-13 | official | official-directory-nested | 40 | unverified | — | 78.02% | 51.44% | 98.31% | 99.69% | 100.00% |
| DR-15 | physical | directory-item-context | 50 | unverified | — | 94.61% | 62.44% | 96.40% | 99.17% | 100.00% |
| DR-16 | official | official-directory-upload | 27 | unverified | — | 97.26% | 72.36% | 98.95% | 98.83% | 100.00% |
| ED-01 | physical | editor-ambience | 26 | unverified | — | 87.73% | 65.43% | 98.11% | 96.02% | 100.00% |
| ED-01 | physical | editor-chief-ds1 | 19 | unverified | — | 90.89% | 67.06% | 97.94% | 94.56% | 100.00% |
| ED-01 | physical | editor-digital-flanger | 37 | unverified | — | 90.77% | 62.84% | 96.51% | 98.57% | 100.00% |
| ED-01 | physical | editor-simple-gate | 15 | unverified | — | 87.70% | 68.64% | 97.75% | 93.10% | 100.00% |
| ED-01 | physical | editor-ukc30-topboost | 26 | unverified | — | 90.17% | 66.62% | 98.39% | 96.02% | 100.00% |
| ED-03 | physical | editor-ukc30-cab | 37 | unverified | — | 61.89% | 44.73% | 97.99% | 99.71% | 100.00% |
| ED-04 | physical | editor-parametric-8 | 40 | unverified | — | 81.98% | 53.09% | 97.19% | 99.18% | 100.00% |
| ED-05 | physical | fixture-editor-capture | 22 | verified | 100.00% | 82.85% | 50.80% | 96.24% | 94.06% | 100.00% |
| ED-06 | official | official-looper | 29 | unverified | — | 87.78% | 50.97% | 97.92% | 99.83% | 100.00% |
| ED-07 | official | official-device-presets | 26 | unverified | — | 95.51% | 74.15% | 96.33% | 99.01% | 100.00% |
| ED-07 | physical | device-presets-exotic-z-boost | 26 | unverified | — | 94.53% | 72.79% | 95.11% | 99.54% | 100.00% |
| ED-08 | physical | device-preset-save | 50 | unverified | — | 96.29% | 64.97% | 97.16% | 99.90% | 100.00% |
| ED-12 | official | official-expression-bypass | 28 | unverified | — | 85.76% | 59.41% | 96.79% | 99.31% | 100.00% |
| ED-13 | physical | block-context | 27 | unverified | — | 88.54% | 67.01% | 97.71% | 98.09% | 100.00% |
| ED-13 | physical | block-context-bottom | 30 | unverified | — | 84.74% | 66.63% | 99.21% | 97.45% | 100.00% |
| ED-16 | official | official-device-preset-actions | 20 | unverified | — | 94.47% | 66.09% | 97.35% | 98.75% | 100.00% |
| ED-16 | physical | device-preset-actions | 30 | unverified | — | 97.97% | 78.93% | 81.45% | 97.82% | 100.00% |
| ED-17 | physical | device-presets-user | 11 | unverified | — | 94.54% | 80.51% | 97.89% | 98.91% | 100.00% |
| GL-04 | official | official-grid-brit-2203 | 13 | unverified | — | 80.24% | 67.53% | 97.68% | 92.47% | 100.00% |
| GL-04 | physical | capture-type | 9 | verified | 100.00% | 79.72% | 64.52% | 97.93% | 91.63% | 100.00% |
| GL-04 | physical | grid-base | 9 | unverified | — | 81.03% | 66.11% | 97.76% | 91.63% | 100.00% |
| GL-04 | physical | grid-restored | 9 | unverified | — | 81.03% | 66.11% | 97.76% | 91.63% | 100.00% |
| GL-05 | physical | grid-scene-b | 9 | unverified | — | 78.99% | 65.28% | 98.61% | 91.63% | 100.00% |
| GL-06 | physical | grid-scene-a-restored | 9 | unverified | — | 80.80% | 65.50% | 98.37% | 91.63% | 100.00% |
| GL-06 | physical | grid-scene-b | 9 | unverified | — | 78.99% | 65.28% | 98.61% | 91.63% | 100.00% |
| GL-07 | physical | grid-scene-selector | 25 | unverified | — | 81.04% | 52.96% | 96.12% | 78.69% | 100.00% |
| GL-08 | physical | grid-context-menu | 17 | unverified | — | 89.61% | 80.30% | 98.86% | 99.40% | 100.00% |
| GL-08 | physical | grid-context-menu-bottom | 16 | unverified | — | 89.60% | 81.83% | 99.10% | 99.36% | 100.00% |
| GL-08 | physical | grid-context-menu-favorite | 17 | unverified | — | 92.10% | 78.50% | 95.78% | 99.40% | 100.00% |
| GL-09 | physical | save-as-editor | 53 | unverified | — | 96.67% | 63.73% | 97.88% | 99.43% | 100.00% |
| GL-10 | physical | edit-details-editor | 53 | unverified | — | 97.95% | 60.04% | 98.12% | 98.34% | 100.00% |
| GL-11 | physical | copy-scene-destination | 19 | unverified | — | 87.49% | 64.95% | 95.18% | 99.71% | 100.00% |
| GL-12 | physical | swap-scene-destination | 19 | unverified | — | 87.07% | 63.97% | 95.11% | 99.71% | 100.00% |
| GL-13 | official | official-midi-out | 14 | unverified | — | 96.61% | 72.18% | 97.67% | 96.71% | 100.00% |
| GL-13 | physical | preset-midi-out | 14 | unverified | — | 96.61% | 72.18% | 98.08% | 96.71% | 100.00% |
| GL-14 | physical | delete-confirmation | 50 | unverified | — | 93.01% | 56.58% | 96.54% | 99.17% | 100.00% |
| GL-15 | official | official-tuner | 18 | unverified | — | 96.65% | 62.54% | 98.14% | 98.72% | 100.00% |
| GL-15 | physical | tuner | 12 | unverified | — | 93.67% | 50.21% | 96.80% | 98.10% | 100.00% |
| GL-16 | physical | gig-view-live-tuner | 19 | unverified | — | 94.06% | 69.09% | 85.68% | 96.47% | 100.00% |
| GL-17 | official | official-tempo | 27 | unverified | — | 80.68% | 61.96% | 95.56% | 98.26% | 100.00% |
| GL-17 | physical | tempo-metronome | 30 | unverified | — | 79.89% | 57.28% | 93.82% | 96.21% | 100.00% |
| GL-18 | official | official-modes-configuration | 13 | unverified | — | 80.13% | 46.56% | 96.89% | 99.30% | 100.00% |
| GL-18 | physical | modes-configuration | 11 | unverified | — | 89.91% | 59.70% | 97.71% | 100.00% | 100.00% |
| GL-19 | official | official-gig-view-preset | 37 | verified | 100.00% | 86.89% | 76.70% | 99.27% | 97.99% | 100.00% |
| GL-19 | physical | gig-view-preset | 28 | unverified | — | 84.72% | 77.22% | 98.37% | 97.51% | 100.00% |
| GL-20 | official | official-gig-view-scene | 31 | unverified | — | 62.78% | 44.16% | 99.09% | 97.39% | 100.00% |
| GL-20 | physical | gig-view-scene | 24 | unverified | — | 74.03% | 51.39% | 97.58% | 97.21% | 100.00% |
| GL-21 | official | official-gig-view-stomp | 32 | unverified | — | 93.06% | 78.75% | 93.67% | 96.87% | 100.00% |
| GL-21 | physical | gig-view | 19 | unverified | — | 94.07% | 70.20% | 85.68% | 96.47% | 100.00% |
| GL-22 | official | official-gig-view-hybrid | 28 | unverified | — | 76.64% | 60.13% | 93.69% | 96.42% | 100.00% |
| GL-24 | physical | tuner-live-enabled | 12 | unverified | — | 93.34% | 50.25% | 97.68% | 98.10% | 100.00% |
| GR-01 | physical | input-route-selector | 19 | unverified | — | 79.39% | 65.47% | 90.27% | 95.76% | 100.00% |
| GR-01 | physical | input-route-selector-top | 19 | unverified | — | 79.38% | 67.53% | 90.01% | 95.76% | 100.00% |
| GR-02 | physical | output-route-selector | 18 | unverified | — | 75.20% | 59.61% | 86.43% | 97.65% | 100.00% |
| GR-02 | physical | output-route-selector-top | 20 | unverified | — | 84.42% | 75.77% | 86.77% | 98.83% | 100.00% |
| GR-03 | physical | splitter-editor | 31 | unverified | — | 90.12% | 59.76% | 96.47% | 97.21% | 100.00% |
| GR-04 | physical | splitter-editor | 31 | unverified | — | 90.12% | 59.76% | 96.47% | 97.21% | 100.00% |
| GR-05 | physical | mixer-editor | 26 | unverified | — | 94.88% | 64.06% | 97.32% | 96.55% | 100.00% |
| GR-06 | official | official-empty-slot | 15 | unverified | — | 92.80% | 69.48% | 93.05% | 98.28% | 100.00% |
| IO-01 | physical | io-overview | 41 | unverified | — | 84.72% | 56.53% | 94.50% | 100.00% | 100.00% |
| IO-02 | official | official-io-settings-analog | 34 | unverified | — | 84.75% | 54.89% | 96.35% | 100.00% | 100.00% |
| IO-03 | physical | io-output | 47 | unverified | — | 82.07% | 53.73% | 94.69% | 100.00% | 100.00% |
| IO-04 | physical | io-send-return | 27 | unverified | — | 82.43% | 51.05% | 93.31% | 100.00% | 100.00% |
| IO-05 | official | official-io-settings-usb | 49 | unverified | — | 83.06% | 51.06% | 96.37% | 100.00% | 100.00% |
| IO-06 | physical | io-headphones | 27 | verified | 100.00% | 88.52% | 58.97% | 97.50% | 100.00% | 100.00% |
| IO-07 | official | official-global-eq | 28 | verified | 100.00% | 91.48% | 60.24% | 94.62% | 97.81% | 100.00% |
| IO-08 | physical | input-gate-control | 21 | unverified | — | 88.50% | 71.01% | 95.46% | 95.33% | 100.00% |
| NC-04 | official | official-capture-settings | 37 | unverified | — | 89.36% | 72.43% | 99.12% | 99.82% | 100.00% |
| NC-05 | official | official-capture-process | 13 | unverified | — | 92.96% | 77.59% | 98.59% | 100.00% | 100.00% |
| NC-06 | official | official-capture-ab-test | 10 | unverified | — | 89.47% | 67.35% | 98.00% | 99.26% | 100.00% |
| NC-07 | official | official-capture-metadata | 10 | unverified | — | 94.51% | 45.73% | 98.39% | 98.75% | 100.00% |
| OV-01 | physical | onscreen-keyboard | 52 | unverified | — | 95.22% | 64.27% | 97.13% | 99.90% | 100.00% |
| OV-02 | physical | generic-confirmation | 52 | unverified | — | 93.20% | 56.80% | 96.49% | 99.12% | 100.00% |
| OV-03 | physical | device-browser-plugin-locked | 15 | unverified | — | 97.25% | 86.29% | 98.38% | 98.25% | 100.00% |
| OV-04 | physical | overlay-busy | 13 | unverified | — | 82.36% | 75.23% | 93.34% | 100.00% | 100.00% |
| ST-01 | official | official-settings-account | 18 | unverified | — | 91.18% | 60.42% | 98.59% | 99.90% | 100.00% |
| ST-02 | official | official-settings-system | 28 | verified | 100.00% | 89.43% | 64.47% | 98.39% | 100.00% | 100.00% |
| ST-03 | official | official-settings-device | 31 | unverified | — | 92.36% | 52.28% | 99.15% | 100.00% | 100.00% |
| ST-04 | physical | settings-support | 17 | unverified | — | 93.82% | 85.59% | 98.91% | 100.00% | 100.00% |
| ST-05 | physical | settings-wifi | 18 | unverified | — | 91.58% | 66.17% | 97.31% | 99.16% | 100.00% |
| ST-07 | physical | settings-storage | 18 | unverified | — | 93.00% | 71.21% | 97.88% | 100.00% | 100.00% |
| ST-08 | official | official-midi-settings | 40 | unverified | — | 94.74% | 63.57% | 96.57% | 99.91% | 100.00% |
| ST-09 | physical | settings-info | 22 | unverified | — | 94.70% | 79.50% | 99.20% | 100.00% | 100.00% |
| ST-10 | physical | settings-diagnostics | 12 | unverified | — | 95.57% | 65.73% | 99.48% | 100.00% | 100.00% |

## Reproduce

1. Capture both hosts with the Windows and Android corpus drivers plus the official/manual drivers.
2. Run `npm run verify:qc-typography`.
3. Run `npm run compare:qc-typography`.
4. Run `npm run report:qc-typography`.
