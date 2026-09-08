# Visual references

The large-device layout was evaluated against official Neural DSP reference
material current on 2026-08-30. By publisher direction, QC Remote retains exact
functional vectors, measured geometry, the top-panel overlay, and the visual
reference evidence needed to prevent user-facing divergence. Personal test data
and manufacturer support/contact content are not retained in release fixtures.

## Hardware

- [Quad Cortex product page](https://neuraldsp.com/quad-cortex) — graphite anodized-aluminum finish, stainless rotary footswitch construction, screen glass/bezel treatment, and physical product photography.
- [Official Quad Cortex manual](https://neuraldsp.com/manual/quad-cortex) — 29 × 19.5 cm top-panel drawing and exact placement of Master Volume, power, screen, navigation, A–H, Bank, Mode, Tempo, and Tuner labels.
- [Near-top-down retail photograph](https://www.tonefestguitargallery.com/products/neural-dsp-quad-cortex) — direct visual comparison for chassis color, rear connector silhouettes, actuator depth, label offsets, and screen-to-enclosure proportions.

The CSS surface uses normalized landmarks traced from Neural DSP's official top-panel SVG. Its panel outline is treated as 1096 × 718 units; the screen spans x 252.8–844.2 and y 78.1–411.9, and the five control columns are centered at approximately 5.9%, 27.9%, 50%, 72.1%, and 94.1%. It is an orthographic recreation of the top panel only; rear connectors and side-wall perspective are intentionally excluded.

## CorOS Grid

The manual’s current CorOS 4.1 screenshots define the screen treatment:

- black display canvas fitted to the official top-panel screen opening;
- large preset bank/slot and name at upper left;
- undo, active Scene, save, contextual menu, and Mode at upper right;
- four routing rows with thin light signal paths, with the upper rows populated and lower rows left visually empty;
- compact rounded device blocks with colored outlines and white category glyphs;
- input/output and add-row pills on the left and right rails;
- a dark eight-item Scene dropdown opened from the Scene indicator.

The Windows and Android hardware renderers share the same measured layout,
neutral chassis SVG, IBM Plex font files, semantic palette, and TypeScript SVG
vector registry from `@qc-remote/theme`. No manufacturer screenshot, block
sprite, or external image is shipped by either client.

Device, toolbar, routing, directory, and parameter-screen glyphs are clean
vector geometry rendered by the shared UI package. Plugin badges remain a
separate generated text-and-color layer rather than being baked into block
artwork. The repository asset ledger fingerprints the canonical physical files
and every source file that owns vector geometry; local comparison captures and
their private measurement manifests remain ignored development evidence.
