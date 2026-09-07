# Quad Cortex typography parity — CorOS 4.1.0

Generated from the complete 103-state canonical screen manifest. Every visible text run is measured for resolved face, font availability, size, weight/style, line boxes, position, color, local background, direction, writing mode, wrapping, and line breaks on both Windows and Android.

## Result

- Canonical states measured: 103/103
- Authoritative raster comparisons: 232
- Windows/Android paired measurements: 201
- Cross-host computed-style parity: 100.00%
- Primary face availability: 100.00%
- Mean text-mask structural match: 95.13%
- Mean text-region color match: 98.77%
- Exact reference foreground-palette presence: 70.68%
- Exact reference local-background-palette presence: 86.14%
- Missing canonical states: 0
- Quality gate: PASS

The structural and color scores compare only text-bearing regions, using the paired no-text render to isolate typography from iconography and controls. Palette-presence values are stricter diagnostics: antialiasing and the lack of source metadata in physical screenshots can lower them even when the perceived text color is correct.

## Bundled font availability

- QC CorOS IBM Plex Sans: available (10234 runs)

## Every authoritative screen

| State | Source | Screen | Runs | Structure | Region color | Foreground present | Background present | Host parity |
|---|---|---|---:|---:|---:|---:|---:|---:|
| DB-01 | physical | device-browser-base | 15 | 88.79% | 99.43% | 90.91% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-middle-deep | 27 | 92.27% | 99.39% | 94.12% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-middle-reverb | 28 | 92.97% | 99.36% | 83.33% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-root | 16 | 92.23% | 99.36% | 58.33% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-top | 16 | 90.81% | 99.35% | 58.33% | 100.00% | 100.00% |
| DB-02 | official | official-device-browser-amp | 14 | 99.12% | 99.21% | 100.00% | 92.86% | 100.00% |
| DB-02 | physical | device-browser-models | 21 | 97.96% | 99.00% | 100.00% | 66.67% | 100.00% |
| DB-02 | physical | device-browser-models-clean | 18 | 93.51% | 99.14% | 93.33% | 94.44% | 100.00% |
| DB-03 | physical | device-browser-models-clean | 18 | 93.51% | 99.14% | 93.33% | 94.44% | 100.00% |
| DB-03 | physical | device-browser-neural-capture | 39 | 98.52% | 98.34% | 66.67% | 100.00% | 100.00% |
| DB-04 | physical | device-search | 48 | 95.85% | 99.03% | 55.32% | 6.25% | 100.00% |
| DB-04 | physical | device-search-entry | 51 | 94.63% | 99.17% | 62.00% | 11.76% | 100.00% |
| DB-04 | physical | device-search-results | 12 | 94.59% | 99.44% | 75.00% | 41.67% | 100.00% |
| DB-04 | physical | overlay-error | 12 | 94.59% | 99.44% | 75.00% | 41.67% | 100.00% |
| DB-05 | physical | device-favorites | 9 | 99.40% | 99.40% | 55.56% | 100.00% | 100.00% |
| DB-05 | physical | device-recents | 9 | 99.40% | 99.39% | 66.67% | 100.00% | 100.00% |
| DB-06 | official | official-plugin-folders | 11 | 98.83% | 99.78% | 70.00% | 100.00% | 100.00% |
| DB-07 | official | official-plugin-devices | 28 | 98.51% | 98.95% | 78.57% | 89.29% | 100.00% |
| DB-07 | physical | device-browser-plugin-list | 13 | 89.97% | 98.62% | 61.54% | 100.00% | 100.00% |
| DB-07 | physical | device-browser-plugin-models | 15 | 99.81% | 99.16% | 93.33% | 86.67% | 100.00% |
| DB-07 | physical | plugin-browser-ready | 13 | 91.11% | 98.65% | 61.54% | 100.00% | 100.00% |
| DB-09 | physical | device-browser-plugin-locked | 15 | 99.70% | 98.64% | 93.33% | 86.67% | 100.00% |
| DR-02 | official | official-directory-presets | 40 | 99.49% | 98.34% | 64.10% | 97.50% | 100.00% |
| DR-02 | physical | preset-directory | 47 | 98.61% | 98.74% | 82.93% | 100.00% | 100.00% |
| DR-03 | official | official-directory-captures | 41 | 99.29% | 98.86% | 87.80% | 100.00% | 100.00% |
| DR-04 | official | official-directory-irs | 30 | 97.96% | 99.15% | 66.67% | 100.00% | 100.00% |
| DR-05 | official | official-directory-plugin-presets | 9 | 99.79% | 99.45% | 100.00% | 100.00% | 100.00% |
| DR-06 | official | official-directory-favorites | 24 | 99.12% | 98.98% | 70.83% | 100.00% | 100.00% |
| DR-08 | official | official-directory-search-results | 26 | 96.60% | 98.86% | 61.54% | 76.92% | 100.00% |
| DR-13 | official | official-directory-nested | 40 | 99.21% | 99.05% | 85.00% | 95.00% | 100.00% |
| DR-15 | physical | directory-item-context | 50 | 95.83% | 99.42% | 36.17% | 86.00% | 100.00% |
| DR-16 | official | official-directory-upload | 27 | 99.90% | 98.96% | 88.46% | 88.89% | 100.00% |
| ED-01 | physical | editor-ambience | 26 | 93.11% | 98.49% | 88.46% | 92.31% | 100.00% |
| ED-01 | physical | editor-chief-ds1 | 19 | 92.33% | 98.73% | 84.21% | 89.47% | 100.00% |
| ED-01 | physical | editor-digital-flanger | 37 | 94.46% | 98.70% | 81.08% | 89.19% | 100.00% |
| ED-01 | physical | editor-simple-gate | 15 | 91.59% | 98.91% | 80.00% | 86.67% | 100.00% |
| ED-01 | physical | editor-ukc30-topboost | 26 | 93.20% | 98.54% | 96.15% | 92.31% | 100.00% |
| ED-03 | physical | editor-ukc30-cab | 37 | 97.90% | 98.92% | 90.91% | 97.30% | 100.00% |
| ED-04 | physical | editor-parametric-8 | 40 | 96.54% | 99.36% | 71.43% | 85.00% | 100.00% |
| ED-05 | physical | fixture-editor-capture | 22 | 80.74% | 98.21% | 50.00% | 90.91% | 100.00% |
| ED-06 | official | official-looper | 29 | 90.62% | 97.99% | 72.41% | 96.55% | 100.00% |
| ED-07 | official | official-device-presets | 26 | 99.37% | 98.53% | 69.23% | 80.77% | 100.00% |
| ED-07 | physical | device-presets-exotic-z-boost | 26 | 99.44% | 98.87% | 69.23% | 88.46% | 100.00% |
| ED-08 | physical | device-preset-save | 50 | 97.65% | 99.23% | 52.00% | 100.00% | 100.00% |
| ED-12 | official | official-expression-bypass | 28 | 96.22% | 98.12% | 67.86% | 89.29% | 100.00% |
| ED-13 | physical | block-context | 27 | 99.54% | 99.45% | 56.00% | 92.59% | 100.00% |
| ED-13 | physical | block-context-bottom | 30 | 97.53% | 99.22% | 96.30% | 86.67% | 100.00% |
| ED-16 | official | official-device-preset-actions | 20 | 95.92% | 98.87% | 42.11% | 80.00% | 100.00% |
| ED-16 | physical | device-preset-actions | 30 | 99.63% | 99.23% | 14.81% | 33.33% | 100.00% |
| ED-17 | physical | device-presets-user | 11 | 99.89% | 99.43% | 90.91% | 72.73% | 100.00% |
| GL-04 | official | official-grid-brit-2203 | 13 | 79.41% | 98.25% | 69.23% | 30.77% | 100.00% |
| GL-04 | physical | capture-type | 9 | 72.94% | 97.39% | 66.67% | 88.89% | 100.00% |
| GL-04 | physical | grid-base | 9 | 89.80% | 98.32% | 77.78% | 88.89% | 100.00% |
| GL-04 | physical | grid-restored | 9 | 89.80% | 98.32% | 77.78% | 88.89% | 100.00% |
| GL-05 | physical | grid-scene-b | 9 | 89.84% | 98.32% | 77.78% | 88.89% | 100.00% |
| GL-06 | physical | grid-scene-a-restored | 9 | 89.80% | 98.32% | 77.78% | 88.89% | 100.00% |
| GL-06 | physical | grid-scene-b | 9 | 89.84% | 98.32% | 77.78% | 88.89% | 100.00% |
| GL-07 | physical | grid-scene-selector | 25 | 94.65% | 98.16% | 32.00% | 64.00% | 100.00% |
| GL-08 | physical | grid-context-menu | 17 | 96.13% | 99.04% | 86.67% | 100.00% | 100.00% |
| GL-08 | physical | grid-context-menu-bottom | 16 | 91.54% | 98.87% | 86.67% | 100.00% | 100.00% |
| GL-08 | physical | grid-context-menu-favorite | 17 | 94.64% | 99.13% | 81.25% | 100.00% | 100.00% |
| GL-09 | physical | save-as-editor | 53 | 99.29% | 98.98% | 82.50% | 88.68% | 100.00% |
| GL-10 | physical | edit-details-editor | 53 | 94.84% | 98.39% | 79.25% | 83.02% | 100.00% |
| GL-11 | physical | copy-scene-destination | 19 | 89.31% | 99.07% | 47.37% | 94.74% | 100.00% |
| GL-12 | physical | swap-scene-destination | 19 | 89.49% | 99.07% | 47.37% | 94.74% | 100.00% |
| GL-13 | official | official-midi-out | 14 | 98.85% | 99.48% | 35.71% | 42.86% | 100.00% |
| GL-13 | physical | preset-midi-out | 14 | 98.85% | 99.48% | 78.57% | 42.86% | 100.00% |
| GL-14 | physical | delete-confirmation | 50 | 95.71% | 99.19% | 50.00% | 86.00% | 100.00% |
| GL-15 | official | official-tuner | 18 | 95.59% | 99.24% | 72.22% | 94.44% | 100.00% |
| GL-15 | physical | tuner | 12 | 92.58% | 99.56% | 50.00% | 91.67% | 100.00% |
| GL-16 | physical | gig-view-live-tuner | 19 | 95.96% | 97.86% | 47.37% | 94.74% | 100.00% |
| GL-17 | official | official-tempo | 27 | 95.55% | 98.85% | 40.74% | 92.59% | 100.00% |
| GL-17 | physical | tempo-metronome | 30 | 95.96% | 98.86% | 33.33% | 90.00% | 100.00% |
| GL-18 | official | official-modes-configuration | 13 | 97.15% | 99.00% | 66.67% | 100.00% | 100.00% |
| GL-18 | physical | modes-configuration | 11 | 98.57% | 99.02% | 72.73% | 100.00% | 100.00% |
| GL-19 | official | official-gig-view-preset | 29 | 86.24% | 94.69% | 96.55% | 93.10% | 100.00% |
| GL-19 | physical | gig-view-preset | 28 | 98.10% | 96.85% | 82.14% | 96.43% | 100.00% |
| GL-20 | official | official-gig-view-scene | 31 | 97.57% | 98.17% | 90.32% | 70.97% | 100.00% |
| GL-20 | physical | gig-view-scene | 24 | 96.05% | 98.17% | 75.00% | 95.83% | 100.00% |
| GL-21 | official | official-gig-view-stomp | 32 | 96.96% | 97.39% | 53.12% | 65.62% | 100.00% |
| GL-21 | physical | gig-view | 19 | 96.10% | 98.04% | 47.37% | 94.74% | 100.00% |
| GL-22 | official | official-gig-view-hybrid | 28 | 96.07% | 97.82% | 71.43% | 39.29% | 100.00% |
| GL-24 | physical | tuner-live-enabled | 12 | 92.58% | 99.56% | 66.67% | 91.67% | 100.00% |
| GR-01 | physical | input-route-selector | 19 | 98.50% | 98.57% | 61.11% | 63.16% | 100.00% |
| GR-01 | physical | input-route-selector-top | 19 | 97.84% | 99.14% | 55.56% | 63.16% | 100.00% |
| GR-02 | physical | output-route-selector | 18 | 89.46% | 98.31% | 50.00% | 61.11% | 100.00% |
| GR-02 | physical | output-route-selector-top | 20 | 90.68% | 98.32% | 57.89% | 70.00% | 100.00% |
| GR-03 | physical | splitter-editor | 31 | 95.36% | 99.52% | 70.97% | 80.65% | 100.00% |
| GR-04 | physical | splitter-editor | 31 | 95.36% | 99.52% | 70.97% | 80.65% | 100.00% |
| GR-05 | physical | mixer-editor | 26 | 96.94% | 99.66% | 76.92% | 73.08% | 100.00% |
| GR-06 | official | official-empty-slot | 15 | 97.20% | 99.59% | 53.33% | 86.67% | 100.00% |
| IO-01 | physical | io-overview | 41 | 96.31% | 98.74% | 58.54% | 100.00% | 100.00% |
| IO-02 | official | official-io-settings-analog | 34 | 94.89% | 98.93% | 61.76% | 100.00% | 100.00% |
| IO-03 | physical | io-output | 47 | 96.41% | 98.53% | 53.19% | 100.00% | 100.00% |
| IO-04 | physical | io-send-return | 27 | 95.76% | 99.16% | 62.96% | 100.00% | 100.00% |
| IO-05 | official | official-io-settings-usb | 49 | 95.27% | 98.48% | 63.27% | 100.00% | 100.00% |
| IO-06 | physical | io-headphones | 27 | 96.15% | 99.07% | 72.00% | 100.00% | 100.00% |
| IO-07 | official | official-global-eq | 28 | 95.82% | 99.46% | 57.14% | 39.29% | 100.00% |
| IO-08 | physical | input-gate-control | 21 | 94.10% | 99.07% | 61.90% | 90.48% | 100.00% |
| NC-04 | official | official-capture-settings | 37 | 99.33% | 97.48% | 90.91% | 97.30% | 100.00% |
| NC-05 | official | official-capture-process | 13 | 91.04% | 98.44% | 69.23% | 100.00% | 100.00% |
| NC-06 | official | official-capture-ab-test | 10 | 97.51% | 98.70% | 70.00% | 80.00% | 100.00% |
| NC-07 | official | official-capture-metadata | 10 | 90.04% | 99.50% | 80.00% | 80.00% | 100.00% |
| OV-01 | physical | onscreen-keyboard | 52 | 97.65% | 99.23% | 50.00% | 100.00% | 100.00% |
| OV-02 | physical | generic-confirmation | 52 | 95.71% | 99.19% | 48.72% | 84.62% | 100.00% |
| OV-03 | physical | device-browser-plugin-locked | 15 | 99.70% | 98.64% | 93.33% | 86.67% | 100.00% |
| OV-04 | physical | overlay-busy | 13 | 91.06% | 98.48% | 61.54% | 100.00% | 100.00% |
| ST-01 | official | official-settings-account | 18 | 96.80% | 98.94% | 77.78% | 100.00% | 100.00% |
| ST-02 | official | official-settings-system | 28 | 94.16% | 97.26% | 85.71% | 100.00% | 100.00% |
| ST-03 | official | official-settings-device | 31 | 93.68% | 97.41% | 96.77% | 100.00% | 100.00% |
| ST-04 | physical | settings-support | 17 | 97.61% | 97.90% | 100.00% | 100.00% | 100.00% |
| ST-05 | physical | settings-wifi | 18 | 98.69% | 98.77% | 66.67% | 83.33% | 100.00% |
| ST-07 | physical | settings-storage | 18 | 96.51% | 98.50% | 72.22% | 100.00% | 100.00% |
| ST-08 | official | official-midi-settings | 40 | 99.14% | 98.05% | 52.50% | 100.00% | 100.00% |
| ST-09 | physical | settings-info | 22 | 97.59% | 98.12% | 95.45% | 100.00% | 100.00% |
| ST-10 | physical | settings-diagnostics | 12 | 99.07% | 99.32% | 100.00% | 100.00% | 100.00% |

## Reproduce

1. Capture both hosts with the Windows and Android corpus drivers plus the official/manual drivers.
2. Run `npm run verify:qc-typography`.
3. Run `npm run compare:qc-typography`.
4. Run `npm run report:qc-typography`.
