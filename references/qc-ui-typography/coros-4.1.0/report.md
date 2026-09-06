# Quad Cortex typography parity — CorOS 4.1.0

Generated from the complete 103-state canonical screen manifest. Every visible text run is measured for resolved face, font availability, size, weight/style, line boxes, position, color, local background, direction, writing mode, wrapping, and line breaks on both Windows and Android.

## Result

- Canonical states measured: 103/103
- Authoritative raster comparisons: 232
- Windows/Android paired measurements: 201
- Cross-host computed-style parity: 100.00%
- Primary face availability: 100.00%
- Mean text-mask structural match: 95.23%
- Mean text-region color match: 98.72%
- Exact reference foreground-palette presence: 70.58%
- Exact reference local-background-palette presence: 83.19%
- Missing canonical states: 0
- Quality gate: PASS

The structural and color scores compare only text-bearing regions, using the paired no-text render to isolate typography from iconography and controls. Palette-presence values are stricter diagnostics: antialiasing and the lack of source metadata in physical screenshots can lower them even when the perceived text color is correct.

## Bundled font availability

- Arimo Variable: available (8320 runs)
- Roboto Variable: available (1736 runs)

## Every authoritative screen

| State | Source | Screen | Runs | Structure | Region color | Foreground present | Background present | Host parity |
|---|---|---|---:|---:|---:|---:|---:|---:|
| DB-01 | physical | device-browser-base | 15 | 89.08% | 99.44% | 81.82% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-middle-deep | 15 | 90.78% | 99.36% | 72.73% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-middle-reverb | 16 | 91.71% | 99.38% | 83.33% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-root | 16 | 91.47% | 99.38% | 66.67% | 100.00% | 100.00% |
| DB-01 | physical | device-browser-top | 16 | 90.88% | 99.34% | 66.67% | 100.00% | 100.00% |
| DB-02 | official | official-device-browser-amp | 14 | 97.49% | 99.15% | 100.00% | 92.86% | 100.00% |
| DB-02 | physical | device-browser-models | 21 | 96.23% | 98.93% | 100.00% | 66.67% | 100.00% |
| DB-02 | physical | device-browser-models-clean | 18 | 93.18% | 99.15% | 93.33% | 94.44% | 100.00% |
| DB-03 | physical | device-browser-models-clean | 18 | 93.18% | 99.15% | 93.33% | 94.44% | 100.00% |
| DB-03 | physical | device-browser-neural-capture | 9 | 86.50% | 99.20% | 55.56% | 66.67% | 100.00% |
| DB-04 | physical | device-search | 36 | 87.40% | 98.81% | 61.76% | 8.33% | 100.00% |
| DB-04 | physical | device-search-entry | 39 | 90.91% | 99.01% | 64.86% | 15.38% | 100.00% |
| DB-04 | physical | device-search-results | 12 | 94.51% | 99.42% | 66.67% | 41.67% | 100.00% |
| DB-04 | physical | overlay-error | 12 | 94.51% | 99.42% | 66.67% | 41.67% | 100.00% |
| DB-05 | physical | device-favorites | 9 | 86.52% | 99.26% | 66.67% | 100.00% | 100.00% |
| DB-05 | physical | device-recents | 9 | 86.56% | 99.25% | 66.67% | 100.00% | 100.00% |
| DB-06 | official | official-plugin-folders | 11 | 98.70% | 99.70% | 50.00% | 100.00% | 100.00% |
| DB-07 | official | official-plugin-devices | 28 | 98.09% | 99.00% | 75.00% | 82.14% | 100.00% |
| DB-07 | physical | device-browser-plugin-list | 13 | 89.45% | 98.38% | 61.54% | 100.00% | 100.00% |
| DB-07 | physical | device-browser-plugin-models | 15 | 99.52% | 98.99% | 86.67% | 86.67% | 100.00% |
| DB-07 | physical | plugin-browser-ready | 13 | 89.89% | 98.39% | 61.54% | 100.00% | 100.00% |
| DB-09 | physical | device-browser-plugin-locked | 15 | 99.16% | 98.45% | 93.33% | 86.67% | 100.00% |
| DR-02 | official | official-directory-presets | 40 | 99.19% | 98.52% | 66.67% | 97.50% | 100.00% |
| DR-02 | physical | preset-directory | 47 | 98.09% | 98.76% | 82.93% | 100.00% | 100.00% |
| DR-03 | official | official-directory-captures | 41 | 99.19% | 98.51% | 97.56% | 100.00% | 100.00% |
| DR-04 | official | official-directory-irs | 30 | 97.90% | 98.89% | 66.67% | 76.67% | 100.00% |
| DR-05 | official | official-directory-plugin-presets | 9 | 99.37% | 99.03% | 100.00% | 100.00% | 100.00% |
| DR-06 | official | official-directory-favorites | 24 | 99.34% | 99.01% | 87.50% | 100.00% | 100.00% |
| DR-08 | official | official-directory-search-results | 26 | 95.72% | 98.63% | 57.69% | 76.92% | 100.00% |
| DR-13 | official | official-directory-nested | 40 | 99.14% | 98.80% | 95.00% | 95.00% | 100.00% |
| DR-15 | physical | directory-item-context | 50 | 96.28% | 99.37% | 44.68% | 86.00% | 100.00% |
| DR-16 | official | official-directory-upload | 27 | 99.65% | 99.20% | 80.77% | 88.89% | 100.00% |
| ED-01 | physical | editor-ambience | 26 | 95.54% | 98.69% | 96.15% | 92.31% | 100.00% |
| ED-01 | physical | editor-chief-ds1 | 19 | 94.76% | 98.92% | 94.74% | 89.47% | 100.00% |
| ED-01 | physical | editor-digital-flanger | 37 | 95.96% | 98.90% | 81.08% | 89.19% | 100.00% |
| ED-01 | physical | editor-simple-gate | 15 | 94.46% | 99.08% | 86.67% | 86.67% | 100.00% |
| ED-01 | physical | editor-ukc30-topboost | 26 | 95.38% | 98.78% | 96.15% | 92.31% | 100.00% |
| ED-03 | physical | editor-ukc30-cab | 37 | 97.30% | 98.93% | 84.85% | 94.59% | 100.00% |
| ED-04 | physical | editor-parametric-8 | 40 | 94.46% | 99.37% | 74.29% | 85.00% | 100.00% |
| ED-05 | physical | fixture-editor-capture | 29 | 86.69% | 98.01% | 35.71% | 72.41% | 100.00% |
| ED-06 | official | official-looper | 29 | 93.97% | 97.89% | 72.41% | 96.55% | 100.00% |
| ED-07 | official | official-device-presets | 26 | 97.83% | 98.20% | 65.38% | 80.77% | 100.00% |
| ED-07 | physical | device-presets-exotic-z-boost | 26 | 98.48% | 98.55% | 50.00% | 88.46% | 100.00% |
| ED-08 | physical | device-preset-save | 50 | 98.32% | 99.10% | 70.00% | 100.00% | 100.00% |
| ED-12 | official | official-expression-bypass | 28 | 97.31% | 97.86% | 75.00% | 89.29% | 100.00% |
| ED-13 | physical | block-context | 27 | 99.36% | 99.25% | 90.91% | 92.59% | 100.00% |
| ED-13 | physical | block-context-bottom | 27 | 96.42% | 99.21% | 83.33% | 74.07% | 100.00% |
| ED-16 | official | official-device-preset-actions | 20 | 98.71% | 98.63% | 52.63% | 80.00% | 100.00% |
| ED-16 | physical | device-preset-actions | 30 | 98.80% | 99.07% | 14.81% | 33.33% | 100.00% |
| ED-17 | physical | device-presets-user | 11 | 99.18% | 99.34% | 81.82% | 72.73% | 100.00% |
| GL-04 | official | official-grid-brit-2203 | 13 | 89.59% | 98.69% | 69.23% | 30.77% | 100.00% |
| GL-04 | physical | capture-type | 9 | 90.20% | 98.52% | 77.78% | 88.89% | 100.00% |
| GL-04 | physical | grid-base | 9 | 93.01% | 98.70% | 77.78% | 88.89% | 100.00% |
| GL-04 | physical | grid-restored | 9 | 93.01% | 98.70% | 77.78% | 88.89% | 100.00% |
| GL-05 | physical | grid-scene-b | 9 | 93.05% | 98.71% | 77.78% | 88.89% | 100.00% |
| GL-06 | physical | grid-scene-a-restored | 9 | 93.01% | 98.71% | 77.78% | 88.89% | 100.00% |
| GL-06 | physical | grid-scene-b | 9 | 93.05% | 98.71% | 77.78% | 88.89% | 100.00% |
| GL-07 | physical | grid-scene-selector | 25 | 96.24% | 98.24% | 32.00% | 64.00% | 100.00% |
| GL-08 | physical | grid-context-menu | 17 | 94.13% | 98.35% | 33.33% | 23.53% | 100.00% |
| GL-08 | physical | grid-context-menu-bottom | 17 | 90.45% | 97.86% | 46.67% | 23.53% | 100.00% |
| GL-08 | physical | grid-context-menu-favorite | 18 | 86.02% | 98.27% | 46.67% | 27.78% | 100.00% |
| GL-09 | physical | save-as-editor | 53 | 99.23% | 98.88% | 87.50% | 88.68% | 100.00% |
| GL-10 | physical | edit-details-editor | 53 | 95.85% | 98.45% | 94.34% | 77.36% | 100.00% |
| GL-11 | physical | copy-scene-destination | 19 | 94.08% | 99.14% | 42.11% | 94.74% | 100.00% |
| GL-12 | physical | swap-scene-destination | 19 | 94.04% | 99.14% | 42.11% | 94.74% | 100.00% |
| GL-13 | official | official-midi-out | 14 | 98.87% | 99.43% | 57.14% | 42.86% | 100.00% |
| GL-13 | physical | preset-midi-out | 14 | 98.87% | 99.43% | 71.43% | 42.86% | 100.00% |
| GL-14 | physical | delete-confirmation | 50 | 97.30% | 99.12% | 50.00% | 86.00% | 100.00% |
| GL-15 | official | official-tuner | 18 | 96.19% | 99.12% | 77.78% | 94.44% | 100.00% |
| GL-15 | physical | tuner | 12 | 94.99% | 99.51% | 75.00% | 91.67% | 100.00% |
| GL-16 | physical | gig-view-live-tuner | 19 | 96.30% | 97.67% | 47.37% | 94.74% | 100.00% |
| GL-17 | official | official-tempo | 27 | 94.43% | 98.70% | 40.74% | 92.59% | 100.00% |
| GL-17 | physical | tempo-metronome | 30 | 94.79% | 98.70% | 43.33% | 90.00% | 100.00% |
| GL-18 | official | official-modes-configuration | 13 | 96.22% | 98.82% | 83.33% | 92.31% | 100.00% |
| GL-18 | physical | modes-configuration | 11 | 98.07% | 98.83% | 63.64% | 100.00% | 100.00% |
| GL-19 | official | official-gig-view-preset | 29 | 98.28% | 97.00% | 96.55% | 93.10% | 100.00% |
| GL-19 | physical | gig-view-preset | 28 | 98.04% | 97.51% | 82.14% | 96.43% | 100.00% |
| GL-20 | official | official-gig-view-scene | 31 | 96.96% | 97.56% | 93.55% | 74.19% | 100.00% |
| GL-20 | physical | gig-view-scene | 24 | 96.85% | 98.21% | 79.17% | 95.83% | 100.00% |
| GL-21 | official | official-gig-view-stomp | 32 | 95.58% | 96.73% | 53.12% | 65.62% | 100.00% |
| GL-21 | physical | gig-view | 19 | 96.41% | 97.59% | 47.37% | 94.74% | 100.00% |
| GL-22 | official | official-gig-view-hybrid | 33 | 96.22% | 97.25% | 72.73% | 48.48% | 100.00% |
| GL-24 | physical | tuner-live-enabled | 12 | 94.99% | 99.51% | 75.00% | 91.67% | 100.00% |
| GR-01 | physical | input-route-selector | 19 | 97.60% | 98.34% | 61.11% | 63.16% | 100.00% |
| GR-01 | physical | input-route-selector-top | 19 | 96.50% | 98.88% | 55.56% | 63.16% | 100.00% |
| GR-02 | physical | output-route-selector | 18 | 91.27% | 98.43% | 55.56% | 66.67% | 100.00% |
| GR-02 | physical | output-route-selector-top | 20 | 90.73% | 98.29% | 57.89% | 70.00% | 100.00% |
| GR-03 | physical | splitter-editor | 31 | 95.80% | 99.52% | 70.97% | 80.65% | 100.00% |
| GR-04 | physical | splitter-editor | 31 | 95.80% | 99.52% | 70.97% | 80.65% | 100.00% |
| GR-05 | physical | mixer-editor | 26 | 97.19% | 99.66% | 80.77% | 73.08% | 100.00% |
| GR-06 | official | official-empty-slot | 15 | 98.23% | 99.67% | 46.67% | 86.67% | 100.00% |
| IO-01 | physical | io-overview | 35 | 88.21% | 98.89% | 66.67% | 100.00% | 100.00% |
| IO-02 | official | official-io-settings-analog | 35 | 97.64% | 98.96% | 71.43% | 100.00% | 100.00% |
| IO-03 | physical | io-output | 30 | 90.72% | 98.95% | 62.07% | 100.00% | 100.00% |
| IO-04 | physical | io-send-return | 30 | 87.95% | 98.93% | 40.74% | 100.00% | 100.00% |
| IO-05 | official | official-io-settings-usb | 50 | 97.08% | 98.49% | 76.00% | 100.00% | 100.00% |
| IO-06 | physical | io-headphones | 29 | 89.04% | 98.89% | 60.00% | 93.10% | 100.00% |
| IO-07 | official | official-global-eq | 28 | 94.83% | 99.46% | 57.14% | 39.29% | 100.00% |
| IO-08 | physical | input-gate-control | 21 | 95.42% | 98.82% | 61.90% | 90.48% | 100.00% |
| NC-04 | official | official-capture-settings | 37 | 97.72% | 96.39% | 84.85% | 97.30% | 100.00% |
| NC-05 | official | official-capture-process | 13 | 97.70% | 98.31% | 69.23% | 76.92% | 100.00% |
| NC-06 | official | official-capture-ab-test | 10 | 96.89% | 98.47% | 60.00% | 80.00% | 100.00% |
| NC-07 | official | official-capture-metadata | 10 | 99.44% | 99.56% | 80.00% | 80.00% | 100.00% |
| OV-01 | physical | onscreen-keyboard | 52 | 98.32% | 99.10% | 67.31% | 100.00% | 100.00% |
| OV-02 | physical | generic-confirmation | 52 | 97.30% | 99.12% | 51.28% | 84.62% | 100.00% |
| OV-03 | physical | device-browser-plugin-locked | 15 | 99.16% | 98.45% | 93.33% | 86.67% | 100.00% |
| OV-04 | physical | overlay-busy | 13 | 89.96% | 98.21% | 61.54% | 100.00% | 100.00% |
| ST-01 | official | official-settings-account | 18 | 95.84% | 98.78% | 72.22% | 100.00% | 100.00% |
| ST-02 | official | official-settings-system | 28 | 98.84% | 97.50% | 85.71% | 100.00% | 100.00% |
| ST-03 | official | official-settings-device | 31 | 97.79% | 97.57% | 83.87% | 100.00% | 100.00% |
| ST-04 | physical | settings-support | 17 | 98.52% | 97.45% | 94.12% | 100.00% | 100.00% |
| ST-05 | physical | settings-wifi | 18 | 97.86% | 98.62% | 72.22% | 83.33% | 100.00% |
| ST-07 | physical | settings-storage | 18 | 96.14% | 98.35% | 82.35% | 100.00% | 100.00% |
| ST-08 | official | official-midi-settings | 40 | 98.61% | 97.99% | 52.50% | 100.00% | 100.00% |
| ST-09 | physical | settings-info | 22 | 96.99% | 97.81% | 90.91% | 100.00% | 100.00% |
| ST-10 | physical | settings-diagnostics | 12 | 98.52% | 99.03% | 100.00% | 100.00% | 100.00% |

## Reproduce

1. Capture both hosts with the Windows and Android corpus drivers plus the official/manual drivers.
2. Run `npm run verify:qc-typography`.
3. Run `npm run compare:qc-typography`.
4. Run `npm run report:qc-typography`.
