# Quad Cortex screen reconstruction report

Audit date: 2026-09-03
Reference: physical Quad Cortex, CorOS 4.1.0, 800x480 framebuffer corpus

## Executive summary

| Client | Physical corpus rendered | Mean structural match | Mean color similarity |
| --- | ---: | ---: | ---: |
| Windows | 70/70 (100%) | **83.78%** | **97.09%** |
| Android | 70/70 (100%) | **83.78%** | **97.09%** |

These are native-size measurements, not audit estimates. Both hosts render the
same versioned `coros410` scratch-preset fixture through `@ndsp-qc/ui`; each
script asserts that the captured element is exactly 800x480 before comparison.
Structural match is edge F1 with a two-pixel tolerance. Color similarity is
`1 - MAE`. These values are from the interactive app path: the capture driver
opens the Directory, route selectors, and each block editor before taking the
frame. An earlier driver did not wait for asynchronous editor opening and
therefore compared the underlying Grid for seven editor states; those invalid
measurements have been replaced. Both capture drivers now exclude the decorative
host bezel and measure the same raw 800x480 framebuffer; their aggregate
structural scores remain within 0.01 points. The expanded corpus deliberately
includes difficult new I/O, search, browser, Neural Capture editor, and busy-state
frames, so its aggregate is not directly comparable to the earlier 52-frame score.
The live Grid, Directory, routing, and
parameter editor implementations are shared.

The complete product target is larger than the measured corpus. The canonical
inventory contains **104 CorOS screen/state rows** plus **16 Cortex Control-only
rows**. Current canonical CorOS implementation counts are:

| Status | Windows | Android |
| --- | ---: | ---: |
| Built | 104 | 104 |
| Partial | 0 | 0 |
| Shell only | 0 | 0 |
| Missing | 0 | 0 |

“70/70” therefore means every physical regression state has a renderer. All 104
cataloged states are built, and 70 captured device frames now participate in the
physical comparison.

The separate manual-reference smoke corpus now contains **85 states / 170 exact
800x480 host captures** (Windows and Android). These validate shared composition
and framebuffer containment but are intentionally excluded from the physical
similarity percentages until matching device captures exist.

Across the physical and official full-frame corpora, **79 canonical states**
have directly comparable 800x480 evidence. A separate checksummed corpus of
**27 official manual SVG details** supplies scoped control, editor-fragment,
interaction, or hardware-diagram evidence for additional states, bringing the
number with some authoritative visual evidence to **99/104**. Detail assets do
not enter full-screen similarity averages.

Two UI-bearing details now also have crop-level regression measurements. These
scores use each SVG's intrinsic dimensions and are reported separately from
both full-frame corpora.

| Official detail | Windows structural / color | Android structural / color |
| --- | ---: | ---: |
| Power and locking controls | **92.85% / 94.25%** | **92.86% / 94.25%** |
| Scene-assigned parameter editor | **63.90% / 92.50%** | **63.87% / 92.50%** |

## Official manual corpus

The official CorOS 4.1 manual contributes **37 checksummed native 800x480
frames**. Of those, **36 are full-size Quad Cortex screens mapped to the shared
renderer**; the remaining frame is a Quad Cortex mini Support screen and is
tracked as a different device variant rather than forced into the full-size
comparison.

| Client | Official frames rendered | Mean structural match | Mean color similarity |
| --- | ---: | ---: | ---: |
| Windows | 36/36 (100%) | **92.74%** | **97.27%** |
| Android | 36/36 (100%) | **92.74%** | **97.27%** |

This broader corpus is deliberately reported separately from the 70-frame
physical-device regression pack. It adds authoritative coverage for I/O,
Directory, Capture, Settings, Looper, expression assignment, plugin, and Hybrid
Gig View states, while its lower score identifies which nominally Built screens
still need pixel-level reconstruction work.

The Android official-reference driver now neutralizes the same inner-screen
radius and shadow as the physical driver. A fresh 36/36 rerun keeps the host
scores within 0.01 structural points, showing that the remaining material
differences are in the shared renderer rather than capture-shell decoration.
The complete per-state evidence and score join is in
[the canonical coverage matrix](qc-screen-coverage-matrix.md).

### Official-reference screen scores

| Official state | Windows structural match | Android structural match |
| --- | ---: | ---: |
| `official-tuner` | **92.13%** | **92.13%** |
| `official-tempo` | **91.51%** | **91.51%** |
| `official-modes-configuration` | **92.03%** | **92.04%** |
| `official-gig-view-preset` | **95.48%** | **95.48%** |
| `official-gig-view-scene` | **93.54%** | **93.54%** |
| `official-gig-view-stomp` | **89.73%** | **89.73%** |
| `official-gig-view-hybrid` | **90.93%** | **90.93%** |
| `official-io-settings-analog` | **88.68%** | **88.67%** |
| `official-io-settings-usb` | **88.70%** | **88.69%** |
| `official-global-eq` | **91.48%** | **91.50%** |
| `official-grid-brit-2203` | **92.21%** | **92.22%** |
| `official-empty-slot` | **94.00%** | **94.00%** |
| `official-device-browser-amp` | **89.57%** | **89.57%** |
| `official-device-presets` | **89.60%** | **89.59%** |
| `official-device-preset-actions` | **94.66%** | **94.66%** |
| `official-expression-bypass` | **91.89%** | **91.87%** |
| `official-looper` | **90.79%** | **90.79%** |
| `official-directory-presets` | **96.81%** | **96.81%** |
| `official-directory-favorites` | **94.67%** | **94.67%** |
| `official-directory-captures` | **92.66%** | **92.67%** |
| `official-directory-irs` | **93.16%** | **93.22%** |
| `official-directory-plugin-presets` | **96.49%** | **96.49%** |
| `official-directory-search-results` | **92.69%** | **92.68%** |
| `official-directory-nested` | **93.82%** | **93.83%** |
| `official-directory-upload` | **96.19%** | **96.00%** |
| `official-capture-settings` | **92.89%** | **92.89%** |
| `official-capture-process` | **91.03%** | **91.03%** |
| `official-capture-ab-test` | **94.14%** | **94.14%** |
| `official-capture-metadata` | **92.96%** | **92.96%** |
| `official-plugin-devices` | **91.70%** | **91.70%** |
| `official-plugin-folders` | **96.43%** | **96.44%** |
| `official-midi-settings` | **96.16%** | **96.16%** |
| `official-midi-out` | **93.10%** | **93.09%** |
| `official-settings-account` | **93.11%** | **93.11%** |
| `official-settings-system` | **90.80%** | **90.86%** |
| `official-settings-device` | **92.92%** | **92.92%** |

## Measured physical corpus

| Physical state | Windows structural match | Android structural match |
| --- | ---: | ---: |
| `grid-base` | **93.45%** | **93.45%** |
| `grid-scene-selector` | **94.82%** | **94.82%** |
| `grid-context-menu` | **89.73%** | **89.70%** |
| `preset-directory` | **92.47%** | **92.48%** |
| `input-route-selector` | **90.23%** | **90.23%** |
| `output-route-selector` | **91.28%** | **91.27%** |
| `device-browser-root` | **90.83%** | **90.83%** |
| `device-browser-models` | **91.53%** | **91.53%** |
| `device-browser-models-clean` | **92.13%** | **92.13%** |
| `editor-simple-gate` | **92.61%** | **92.60%** |
| `editor-chief-ds1` | **92.37%** | **92.37%** |
| `editor-digital-flanger` | **88.16%** | **88.17%** |
| `editor-ukc30-topboost` | **91.09%** | **91.09%** |
| `editor-ukc30-cab` | **93.17%** | **93.16%** |
| `editor-parametric-8` | **90.98%** | **90.98%** |
| `editor-ambience` | **90.97%** | **90.95%** |
| `gig-view` | **94.51%** | **94.51%** |
| `grid-restored` | **93.45%** | **93.45%** |
| `grid-scene-b` | **93.46%** | **93.46%** |
| `grid-scene-a-restored` | **93.45%** | **93.45%** |
| `tuner` | **90.84%** | **90.85%** |
| `gig-view-preset` | **94.12%** | **94.12%** |
| `gig-view-scene` | **91.25%** | **91.26%** |
| `modes-configuration` | **96.50%** | **96.50%** |
| `save-as-editor` | **89.83%** | **89.83%** |
| `edit-details-editor` | **92.61%** | **92.61%** |
| `copy-scene-destination` | **91.52%** | **91.52%** |
| `swap-scene-destination` | **91.44%** | **91.44%** |
| `preset-midi-out` | **93.06%** | **93.05%** |
| `device-browser-plugin-list` | **90.05%** | **90.05%** |
| `device-browser-plugin-models` | **91.64%** | **91.64%** |
| `device-presets-exotic-z-boost` | **90.39%** | **90.38%** |
| `device-browser-plugin-locked` | **91.78%** | **91.78%** |
| `device-preset-actions` | **96.19%** | **96.19%** |
| `device-presets-user` | **89.80%** | **89.80%** |
| `tempo-metronome` | **90.46%** | **90.46%** |
| `tuner-live-enabled` | **91.02%** | **91.02%** |
| `gig-view-live-tuner` | **94.61%** | **94.61%** |
| `splitter-editor` | **89.60%** | **89.63%** |
| `mixer-editor` | **90.49%** | **90.53%** |
| `input-gate-control` | **90.66%** | **90.66%** |
| `block-context` | **87.93%** | **87.94%** |
| `device-preset-save` | **95.89%** | **95.89%** |
| `onscreen-keyboard` | **95.89%** | **95.89%** |
| `directory-item-context` | **88.93%** | **88.93%** |
| `delete-confirmation` | **90.03%** | **90.03%** |
| `generic-confirmation` | **90.03%** | **90.03%** |
| `settings-support` | **97.08%** | **97.08%** |
| `settings-info` | **93.21%** | **93.21%** |
| `settings-diagnostics` | **97.47%** | **97.47%** |
| `settings-wifi` | **93.92%** | **93.92%** |
| `settings-storage` | **93.31%** | **93.31%** |

## Text validated against the device's own scene graph

Every capture in the corpus is stored with the CorOS graphics tree that produced
it, and until now the tree was only read to classify a capture into a screen
family. It is a stronger oracle than that: it lists every string the device
actually drew, so each one can be *required* to exist in our reconstruction.

`npm run verify:qc-screen-text` (`tools/verify_screen_tree_coverage.py`) does
that check. It reads wording rather than shapes, which is exactly the axis a
structural or colour score cannot see.

**893 device strings across 69 screens; 0 unaccounted for.** Reverting any of
the three fixes below fails the check.

### What it found on its first run

All three sat inside screens already scoring above 97% on colour similarity, and
none of them would ever have shown up as a pixel regression.

| screen | device draws | we drew |
| --- | --- | --- |
| `grid-context-menu` | `Save as...` | `Save as…` — a typographic ellipsis |
| `settings-info` | `Zenjack FW app:` | `Zeniack FW app:` — and four firmware rows missing |
| `output-route-selector` | `USB Output 5/6`, `USB Output 7/8` | absent; only the unpaired 5, 6, 7, 8 |

The device-information screen is the clearest case for the method. It renders a
column of labels and per-unit values; a mis-transcribed label one letter out,
with four rows simply absent below it, is invisible to a whole-frame score and
obvious to a string comparison.

### Where the check is blind

A text oracle can only judge screens that carry text. CorOS draws the Neural
Capture wizard's five connection steps as **images**: their graphics trees
contain no text nodes at all, so every string the check knows about is zero, it
compares nothing, and it passes. Three fixtures survived that way and were
pure invention:

| state | our fixture drew | the device shows |
| --- | --- | --- |
| NC-01 | an orbit graphic, *Create a digital replica of your amplifier...*, a **GET STARTED** button | connection step 1 of 5: the rear panel with **INPUT 1** lit and Send/Return struck through |
| NC-02 | a picker offering **AMP + CAB**, **AMP**, **DRIVE**, **OTHER** | connection step 2 of 5: monitoring, with the headphone jack and Out 1-4 lit |
| NC-03 | a signal path **QC SEND 1 -> AMPLIFIER -> CAB / LOAD -> QC RETURN 1** | connection step 5 of 5: the rear panel summary |

The routing one was not merely a different drawing, it was wrong about the
hardware: the wizard wants **CAPTURE OUT** into the target device and the
target's output into **INPUT 2**, and Send/Return is what step 1 asks you to
*disconnect*. NC-02 was wrong about the product: CorOS 4.1.0 has no capture-type
step at all, and the type is chosen when saving, on the metadata pane NC-07
renders.

All three are replaced by `coros-capture-connections.tsx`, one rear-panel
diagram driven by the five captured framebuffers, with jack coordinates taken
from the device's own 800x480 pixels.

The lesson is not that the oracle is bad but that a green oracle is not
evidence for a screen it cannot see. A capture whose tree has no text needs an
eye on the image.

### What the check deliberately ignores

- Text inside `ModelListCell`, `PluginModelListCell`, `ModelPresetListCell` and
  `WifiTableCell`. Those rows are model, plugin, device-preset and Wi-Fi names
  the unit supplies at runtime, so they belong to the catalog, not to a
  reconstruction. That is 101 of the 119 strings an unfiltered run reports.
- Per-unit values on the device information screen — serial, MAC, kernel and
  bootloader banners, firmware build ids. The **labels** beside them are still
  required, which is what caught `Zenjack`.

Two traps are worth recording because both produced convincing wrong answers
while the check was being written. Matching device text against source has to
ignore layout, since CorOS wraps with newlines and JSX with `<br />`; without
that, `ON PRESET LOAD\nMESSAGE` and the Hybrid Mode help text both looked
missing when they were present and correct. And the check greps source, so a
comment quoting a device string satisfies it — the comment added beside the
`Save as...` fix kept the check green when the fix itself was reverted. Whole-line
comments are now stripped before matching.

### Not extended to icons

The trees also carry each icon's asset path, and 32 of the device's 102 icon
stems have no counterpart name in our sources. That is not a defect list. It is
dominated by per-state and per-theme variants — `copy_dark`/`copy_light`,
`edit_dark`/`edit_light`, `shift_icon_active`/`shift_icon_inactive`,
`fav_inactive`, `toggle_iconOn` — where our reconstruction legitimately uses one
icon plus a CSS state. A check that fires on a sound design decision teaches
people to ignore it, so this stays an observation.

### Coverage

109 of the 116 physical captures carry a tree. The other seven — `block-context`,
`delete-confirmation`, `device-preset-save`, `directory-item-context`,
`generic-confirmation`, `input-gate-control`, `onscreen-keyboard` — predate tree
capture. Their manifest entries record the tap sequences that reached them, but
those sequences assume the preset that was loaded at capture time, so replaying
them now would photograph a different screen under the old name. Re-acquiring
them means restoring that device state first, and the corpus directory is
immutable for its firmware family, so they are left as they are rather than
silently overwritten.

## What the tests are anchored to

`tools/audit_test_evidence.mjs` classifies every test block by what its
assertions rest on:

| anchor | blocks | meaning |
| --- | ---: | --- |
| behaviour | 272 | calls the code and asserts on the result |
| self | 58 | reads our own source and asserts its text |
| contract | 13 | reads `contracts/` or a generated file |
| device | 2 | reads a corpus capture or an extracted descriptor |

Most `self` blocks are legitimate: `deduplication` and `theme` assert
*structural invariants of the repository* - that an icon is wired, that a colour
literal has not been hardcoded - and there is nothing but our own source those
could be anchored to.

The dangerous ones are the `self` blocks in `block-visuals.test.ts`, because
they make claims about **the device** while reading only our stylesheet. A rule
saying the directory item menu is 208px tall passes whether or not the unit
agrees; it detects edits, not errors. That is exactly how the menu stayed 208
tall after the device turned out to have five items rather than four, and how
its `["Edit","Copy","Cut","Delete"]` pin outlived the discovery of *Paste to
replace*.

Every one of those blocks has now been re-measured against the frame it claims.
Nine of the fourteen numbers were already right; five were not:

| claim | pinned | measured on the device |
| --- | --- | --- |
| directory item menu | left 528, width 256, **height 208** | left 528, width 256, **height 260** |
| block context menu | **left 30, width 322** | **left 32, width 320** |
| System brightness values | **right-aligned** | **left-aligned at x=743** |
| System brightness LEDs row | **16 of 32 bars** | **32 of 32** |
| MIDI Out disabled trash fill | **#101510** | **#081008** |
| Reverb category glyph | **isometric hexagon**, ink 30x33.5 | **cabinet projection**, ink 30x30 |
| confirmation dialog | left 190, width 420, height 230 | exact match |
| plugin-folder and directory panels | top 60, content bottom 472 | exact match |
| LIVE TUNER track and ring | 24x48 track, 20x20 ring, 3px stroke | exact match |

The item menu is bottom-anchored at y=472, so its fifth item grew it upward: top
264 became 212 and height 208 became 260.

The brightness column is the one worth dwelling on. `right: 1.75cqw` puts a
two-digit value's right edge at exactly the x the device draws it, so *Screen 16*
and *LEDs 32* agreed to the pixel and the rule looked measured. Only the
single-digit *Dimmed LEDs 2* separates the two alignments, and it begins at 743
like the others rather than ending at 762 like a right-aligned value would. The
frame the test named had the disproof in it the whole time.

`tools/verify_screen_geometry.py` now measures all of these in the captured
frames and compares them with the rules that claim them, so the numbers are
checked against the hardware instead of against themselves. Where a stylesheet
value cannot be placed in screen coordinates - the tuner's offsets are relative
to a footer section no rule positions absolutely - it measures the sizes and
says plainly that it is not checking the offsets, rather than inventing an
anchor. It runs in the release preflight as *Screen geometry against captured
frames*, and each of the five corrections above was put back to confirm the tool
reports it.

Two frames are involved and they are not interchangeable: `plugin-folders.png`
in the physical corpus is the device browser, while `.plugin-folders-official`
reconstructs `official-plugin-folders.png` from the published screenshots. The
first measurement of that panel used the wrong one and read a full-bleed layout
into a rule describing a card with an 8px gutter.

### The second pass, and what it found

The first pass measured the numbers with an obvious frame. A second pass went
through everything left in `block-visuals.test.ts` and found five more values
the device contradicts:

| claim | pinned | measured on the device |
| --- | --- | --- |
| item menu entry pitch | **54px buttons in a 260px menu**, three per-entry nudges | **52px**, five entries exactly filling it |
| EQ underlay rule above the footer | **1px line 45px above it** | **nothing is drawn there** |
| EQ underlay confirm fill | **#202421** | **#292c29** |
| tuner footer fill | **#282c28** | **#292c29** |
| active plugin rail tile | **#000** | **#102818** |

The item menu is the same defect as its height, one layer down. Five 54px
buttons need 270px and the menu is 260, so the last entry was clipped; the
`translateY(-1px)`, `-3px` and `-6px` on entries two, three and five were
pulling the overflow back into view. The device simply uses a 52px pitch, which
is 260 divided by five, and the nudges disappear with it.

Fourteen further numbers were measured and **agree**: the block context menu's
57px icon column and its `rgba(71,74,71,.92)` scrim, the directory Done button
at left 694 width 98, the EQ underlay's 98px confirm button and its footer band,
the plugin underlay's row rule, empty-slot tile, add tile and plus strokes, the
licence padlock, the on-screen keyboard's key fill, and the expression pedal's
clip path - whose taper the treadle in `preset-midi-out.png` follows to within
2px over its height.

`tools/verify_screen_geometry.py` now takes **74 measurements**, and each of the
nine corrections was put back to confirm the tool reports it, along with
thirteen other single-value regressions - 22 in all. The glyph checks predict
the ink a piece of artwork paints from its own path data, so they catch a
wrong-shaped glyph and not merely a wrong-sized one; the parser understands
lines and elliptical arcs and refuses anything else rather than guessing.

### What is still only pinned

Three numbers stay pins rather than evidence, and are worth naming rather than
leaving to be rediscovered:

- **The tuner's FREQ encoder** and **the splitter's parameter knobs.** We draw
  each as a bordered disc or a gradient annulus; the device draws a ring with a
  pointer and an arc. Measured across its widest scan-line the tuner knob is
  63px against the declared 62; measured down its tallest column it is 59,
  because its lower edge fades into the footer fill. The two renderings have no
  shared boundary at the precision the claims assert, so no measurement was
  added rather than one picked for agreeing. The splitter knob's *centre* does
  check out by hand - x=436 against the 436.7 its `left: 73.375%` predicts - but
  pinning that needs the cell grid modelled, which the tool does not do.
- **`.directory-fixture-folders .folder-number`.** The only frame showing this
  fixture has it behind a 92% scrim, and recovering a fill through that
  multiplies the error by 12.5; the frame cannot settle the value either way.
- **The input-gate title's margins.** A 12.6px margin between two 48px glyphs
  is smaller than the side bearings around it; the measured ink gap is 23px,
  which is consistent with the declared margin but does not pin it.

`framebuffer capture drivers disable host LCD text artifacts` and the vendored
sprite checksum are self-anchored by nature - one asserts a flag in our capture
tools, the other pins a vendored asset's bytes - and are correctly classified as
such rather than being device claims at all.

### The third pass: the underlay, and a renderer

Three colour values were *reverted* during the second pass. `.plugin-grid-underlay`
declares base fills that the plugin-list fixture overrides in the only frame
that shows them; correcting the base rules to what that frame measures would
have been changing values on the strength of a frame that does not exercise
them.

The second pass also left the block context underlay drawing the wrong screen:
`.physical-eq-underlay` painted a full-screen EQ editor, while `block-context.png`
shows the Grid above an editor's action bar with an **empty parameter area**
below. Both are real CorOS layouts; only one is behind that menu. It is now
rebuilt as `.physical-grid-underlay`, and its grid header turns out to be the
one in `input-gate-control.png` pixel for pixel, down to the preset name.

Measured from `block-context.png`, the layout is:

| element | geometry |
| --- | --- |
| Grid area | y 0..195, black |
| preset title | number cap rows 28..76, name cap rows 31..74, name from x=114 |
| header actions | four 24px icons on a 48px pitch, right edge 776, y 12..35 |
| mode row | 21px glyph, 12px gap, STOMP ending at x=764, y 64..82 |
| signal row | 44x76 pills at x 8 and 750, y 109..184; 2px cable at y 146 |
| action bar | four cards, 8px gaps, right edge 792, y 204..247, widths 66/132/66/66 |
| parameter area | y 248..479, one flat colour - nothing is drawn there |

**This pass could check its work, which the earlier ones could not.** Playwright's
bundled browser is not installed, but `QC_BROWSER_EXECUTABLE` accepts the Chrome
already on the machine, so `tools/capture_qc_ui_screen.mjs` renders a fixture
against a dev server and the render can be measured with the same predicates as
the frame:

```
cd apps/windows && npx vite --host 127.0.0.1 --port 1473 --strictPort
QC_BROWSER_EXECUTABLE="C:/Program Files/Google/Chrome/Application/chrome.exe"   node tools/capture_qc_ui_screen.mjs http://127.0.0.1:1473/ out.png block-context
```

Port 1420 is often taken by another worktree's dev server, which would serve
that worktree's code. Every number above was iterated that way rather than reasoned about:
the title now lands within 2px of the device's, the cable is exact, and the
action bar's cards, badge, bypass and confirm all land within 1px.

That is also how the next defect surfaced. With bright content finally under it,
the scrim was obviously wrong:

| under the scrim | device shows | `rgba(71,74,71,.92)` gives |
| --- | --- | --- |
| page `#101010` | `#424542` | `#424542` |
| confirm card `#292c29` | `#4a4d4a` | `#444744` |
| scene badge `#ffd331` | `#84794a` | `#555445` |
| white glyph `#f8fcf8` | `#848684` | `#555855` |

The old value reproduced the page background *exactly* and crushed everything
brighter, which is why it survived every check: they all sampled the background.
Fitted across those five elements the scrim is `rgba(85,88,85,.72)`, within two
values everywhere. The verifier now samples the composite over two different
under-colours, because one sample cannot separate a scrim's tint from its alpha -
any pair that reproduces the background will pass.

The device does not composite the way a CSS alpha layer does: fitting the two
dark samples exactly puts the bright ones 8-10 values out, and vice versa. The
colour comparison through a scrim therefore allows three values, and says so.

### The fourth pass: every fixture against its frame

With a renderer available, all 119 frames were put next to our drawing of them.
**94 are addressable from a URL**; the other 25 are reached by touch from
another screen (a context menu, a route selector, a device browser opened from
the Grid), and rendering the screen they are reached *from* would compare two
different screens, so they are not scored. Each render is measured against its
frame with `tools/visual-regression/qc_compare.py` - mean absolute error and
2px edge agreement.

**Six of the 94 were not defects at all: the corpus and the fixtures use the
same name for different screens.** Scoring each frame against every render, not
just the one its name suggests, separated them:

| frame | view of that name draws | the view that actually draws it | edge f1 |
| --- | --- | --- | --- |
| `overlay-busy` | a "Saving preset" toast | `plugin-refresh` | 0.82 |
| `overlay-error` | a different overlay | `device-search` | 0.70 |
| `device-search` | the search results | `overlay-keyboard` | 0.70 |
| `plugin-folders` | the folder browser | `plugin-list` | 0.81 |
| `directory-new-folder` | the name dialog | `overlay-keyboard` | 0.76 |
| `directory-search` | the search screen | `overlay-keyboard` | 0.75 |

Mean error alone cannot make that call - two dark screens agree on it - which is
why the match is decided on edge agreement.

Across the remaining 88, four defects were found and fixed:

| screen | was | frame shows |
| --- | --- | --- |
| confirmation dialog | `#101110` panel, `#efefef` copy | **`#ff594a`** panel, black copy, `#1838ff` confirm |
| `empty-slot` | category list left, Grid right | **the other way round** |
| directory sort/filter/category/paste menus | grey `#252a26`, no scrim | **black over a dimmed list** |
| (and the block context underlay, above) | | |

The confirmation dialog is the one worth noting: the overlay check has been
measuring that panel's box against the stylesheet since the first pass and
passing, because it measured *where* the panel is and never *what colour it is*
- its own fill predicate looks for red pixels, so the evidence that the device
draws it salmon was inside the check the whole time.

`generic-confirmation.png` and `delete-confirmation.png` are byte-identical: the
corpus holds one frame under two names.

After that pass the 88 sat at median 0.0301 mean absolute error, 42 under 0.03.
Thirteen remained at 0.06 or worse, and the next pass took them:

| frame | mae | edge f1 | what is different |
| --- | --- | --- | --- |
| `stomp-assignment` | 0.158 | 0.24 | dialog is small and low-right; the frame centres it |
| `generic-confirmation` | 0.125 | 0.57 | underlay is the Directory; the frame shows the Grid |
| `delete-confirmation` | 0.125 | 0.57 | same frame as above, same cause |
| `directory-copy` | 0.111 | 0.39 | paste dialog smaller than the frame's |
| `cloud-upload-overwrite` | 0.120 | 0.61 | same dialog family |
| `cpu-monitor` | 0.107 | 0.18 | not investigated |
| `directory-filter` | 0.091 | 0.39 | menu narrower than the frame's |
| `scene-assignment` | 0.087 | 0.17 | not investigated |
| `capture-connect-input-2` | 0.081 | 0.71 | not investigated |
| `directory-sort` | 0.070 | 0.46 | menu narrower than the frame's |
| `looper-editor` | 0.067 | 0.81 | structure agrees; a tone difference |
| `expression-parameter` | 0.065 | 0.12 | not investigated |
| `capture-sanity-error` | 0.062 | 0.61 | not investigated |

The four menu fills were corrected from renders; the release gate does not
measure them, so they are held only by this comparison.

### The fifth pass: the thirteen

Each of the thirteen was then taken in turn. Nine more defects came out of it:

| screen | was | frame shows |
| --- | --- | --- |
| delete confirmation | Directory behind it, one scrim for both variants | **the Grid**, dimmed far harder (`rgba(45,44,45,.74)`) |
| overwrite confirmation | salmon panel | **`#101010` with white copy** - the two variants are not the same colour |
| `cpu-monitor` | a CPU Monitor page | **the Grid with a 180x78 readout at x 606, y 12** |
| directory sort / filter / category / paste menus | at `right: 10%`, `left: 23%` | **x 371, 300, 8 and 164** - all four boxes were wrong |
| paste dialog type | 1.5cqw body | **2.5cqw** - the dialog is half again the size |
| `stomp-assignment` | a message panel replacing the editor | **the editor, dimmed, with a 418x286 dialog at x 191, y 97** |
| `scene-assignment` | a seven-knob amp editor with a hand cursor | **UTILITY / Adaptive Gate, one NOISE REDUCTION parameter** |
| assignment knobs | red arcs | **grey** |
| `expression-parameter` | a pedal-assignment screen | **the parameter chooser with MIN and MAX RANGE** |
| capture progress panels | `height: 51.5cqw` | **running to y=471**, the same fixed height the directory panels had |
| `capture-sanity-error` | Training ticked | **Training not run** |

`cpu-monitor` is worth singling out: `cpu-monitor.tree.txt` has `zenUI::Grid` at
its root, so the device has no CPU Monitor page at all - the whole screen was
invented, like the Capture screens found in the first pass. Removing the
expression pedal-assignment screen dropped another: with both expression frames
served by the chooser, that screen was unreachable and no capture shows it.

**And one systematic error.** The looper's card band read `#282c28` against the
device's `#292c29`, the same one-off already corrected in the tuner footer.
Replacing all 33 occurrences across ten stylesheets moved the median across the
88 from 0.0301 to 0.0275 and took two more screens under 0.03, with nothing
regressing - which is the check that the hypothesis was right rather than
merely plausible.

Four remain at 0.06 or worse, all with their structure agreeing:

| frame | mae | edge f1 | what is left |
| --- | --- | --- | --- |
| `capture-connect-input-2` | 0.081 | 0.71 | rear-panel jack rows offset; the warning box is narrower |
| `directory-copy` | 0.080 | 0.45 | dialog rows still shorter than the frame's |
| `looper-editor` | 0.067 | 0.81 | bands and tiles match; the residual is spread across glyphs |
| `capture-sanity-error` | 0.063 | 0.61 | body text about 7px high |

These are catalogued rather than fixed. The dialog-size family (`directory-copy`,
`directory-filter`, `directory-sort`, `cloud-upload-overwrite`,
`stomp-assignment`) looks like one cause and is the obvious next thread; the
confirmation underlay is the same rebuild the block context menu needed.

### Two more, in the fixture next door

`input-gate-control.png` is the frame the grid header came from, and comparing
our render of that screen with it found two more:

- its preset letter is drawn **blue** (`#427184`), not the red `#e61723` the
  stylesheet declared - `#69b5d4` before the fixture's 0.62 dimming;
- its preset name is nearly as large as the number (cap rows 31..74 against
  28..76), not the half-height face `font-size: 4.45cqw` produces.

Correcting the size made the fixture's own preset name wrap, because it carried
a placeholder (`QC-MCP-TEST-mtniwbfb-R`) rather than the name in the frame it
reconstructs. The name now matches the capture, and the render's glyph columns
land within 7px of the device's across the whole title.

### The sixth pass: the last four, and what they uncovered

The four screens the fifth pass catalogued were taken, and finishing them
opened a second front. **All 94 addressable frames now score under 0.06** - the
gap list is empty for the first time. The median is 0.0251, 65 sit under 0.03,
88 under 0.04, and 90 of the 94 agree on 70% or more of their edges.

| frame | before | after | what was wrong |
| --- | --- | --- | --- |
| `looper-editor` | 0.067 / 0.81 | **0.017 / 0.89** | six of the eight tiles are unassigned: `#080c08` with their ink at 7.5% |
| `directory-copy` | 0.067 / 0.63 | **0.031 / 0.92** | wrong underlay, and `<b>` became a flex item so each option split into three columns |
| `capture-sanity-error` | 0.062 / 0.61 | 0.057 / 0.75 | body copy and panel height |
| `capture-connect-input-2` | 0.081 / 0.71 | 0.056 / 0.82 | jack rows and warning box |

**Five frames were being compared with the wrong screen.** Their own CorOS
trees say what they are: `overlay-error.tree.txt` is a `SearchResultsDialog`,
`device-search.tree.txt` a `SearchDialog`, `overlay-busy` and `plugin-folders`
are both `Grid` + device browser. They were captured under the name of the step
being exercised rather than of the screen the unit showed. Pointing each at the
view that draws it is the whole fix:

| frame | was scored against | actually drawn by | mae | edge f1 |
| --- | --- | --- | --- | --- |
| `overlay-busy` | the Saving-preset toast | `plugin-refresh` | 0.172 -> **0.026** | 0.06 -> **0.85** |
| `overlay-error` | the Action-unavailable dialog | `device-search` | 0.133 -> **0.024** | 0.01 -> **0.70** |
| `plugin-folders` | the plugin folder browser | `plugin-list` | 0.088 -> **0.030** | 0.12 -> **0.81** |
| `device-search` | the results list | `device-search-suggestions` | 0.106 -> **0.020** | 0.18 -> **0.79** |
| `directory-search` | a list with a search field | `device-search-entry` | 0.070 -> **0.014** | 0.20 -> **0.84** |

`device-search-entry.png` and `directory-search.png` are the same screen to the
pixel apart from one column: the caret's phase. That is what made the sixth
mislabelled frame - `directory-new-folder` - decidable too: naming a folder is
not a dialog on the unit, it is the full keyboard with the name selected in
`#42fb63` on `#102818`, a close at the left and a `#1838ff` save at the right.
The NAME / CANCEL / CREATE dialog was an invention; it is gone, and the frame
went 0.077 / 0.24 to **0.016 / 0.87**.

**Every USB-captured directory frame draws the same layout.** `directory-sort`,
`directory-categories`, `directory-copy` and `directory-arrange` were drawing
the manual's compact list while their frames show what `directory-item-context`
shows - 60px folder rows, a 2x7 bank grid, 52px preset rows, all of them
captured in bank 4 of My Presets. Two claims that had been pinned by the visual
contract turned out to record inventions rather than the frames, and both pins
were re-pointed at the evidence:

- the header's second slot is a plain white cloud-upload glyph in all six of
  those frames, not the red signal-error icon `PhysicalDirectoryStatusIcon`
  drew;
- the preset rows are `4A`..`4H`, not `2A`..`2G`.

Multi Select is a header, not a bottom bar: a 98x44 select-all tile at x 8, the
title in `#42fb63` from x 115, then 64x44 actions on a 74px pitch ending at 674
and a done tick at 694. `directory-copy` is the same mode with one action fewer,
which is why the actions are placed from the right.

| frame | before | after |
| --- | --- | --- |
| `directory-arrange` | 0.043 / 0.36 | **0.031 / 0.86** |
| `directory-categories` | 0.050 / 0.47 | **0.028 / 0.83** |
| `directory-sort` | 0.028 / 0.52 | **0.021 / 0.78** |
| `directory-filter` | 0.035 / 0.45 | **0.019 / 0.81** |
| `directory-irs` | 0.056 / 0.40 | **0.011 / 0.75** |
| `directory-item-context` | 0.014 / 0.88 | **0.013 / 0.92** |

`directory-filter` was over the wrong directory entirely: the funnel was
captured in Neural Captures, inside the Fuzz folder. `directory-irs` was
captured inside an empty My IRs, so the pane holds only the placeholder
waveform - the seven IR rows with tick and trash buttons were invented.

**The assignment screens are the block-context screen.** `scene-assignment` and
`stomp-assignment` were drawing four outlined empty slots - the device browser's
placeholder grid - where the frames show the Grid, its preset title and the
editor action bar, with the block's own card at the left of the bar and a strip
of five 156px parameter cells between y 256 and 363. The underlay is now one
component shared with `block-context`, which is unchanged at 0.018 / 0.97.

| frame | before | after |
| --- | --- | --- |
| `scene-assignment` | 0.051 / 0.26 | **0.020 / 0.80** |
| `stomp-assignment` | 0.041 / 0.49 | **0.038 / 0.69** |

**Four more came out of the same reading.** Once the structure was right the
remaining screens were mostly showing the wrong *state*:

| frame | before | after | what the frame shows |
| --- | --- | --- | --- |
| `directory-favorites` | 0.032 / 0.59 | **0.014 / 0.93** | one favourite, `Fender Deluxe 212`, and no A-Z rail |
| `io-headphones` | 0.038 / 0.66 | **0.028 / 0.78** | two 107px panels from y 257, not one 248px block from 225 |
| `global-eq` | 0.056 / 0.70 | **0.051 / 0.79** | the EQ is off and every band flat - a straight line with the nodes on it |
| `cloud-upload-overwrite` | 0.034 / 0.62 | **0.033 / 0.71** | upload mode: a green-bordered cloud, one tool, upload tiles on the rows |

`INPUT 1` carried a white ring on every I/O page; the frames ring it only on the
input page, and in `#42fb63` rather than white.

One thing the frames cannot settle: CorOS shrinks a long preset name to fit, so
`Top 3 Acoustic Sims` sets its header at 66/47px against block-context's 71/58.
That is fitted from the two frames, not derived.

And one wrap the fixtures cannot reproduce. The paste dialog's body breaks after
`paste` on the unit, which needs a measure of about 376px; in our face the
second line then needs 409px, and no single size makes both true, because our
bold is wider relative to the roman than the device's. The measure is set so the
paragraph takes two lines with a break one word later - closer than the three
lines an exact-width box produced.

### The audit: every frame against every render

The sixth pass was then audited from a clean tree - fresh server, renders
deleted, all 94 drawn again - and each frame scored against **every** render
rather than only its own. Mean error alone cannot make that call, so the
shortlist is taken on mean error and the verdict on 2px edge agreement, which is
what separated the mislabelled captures in the first place.

**Three frames in the corpus are stored twice under different names.** Byte for
byte:

| | | |
| --- | --- | --- |
| `generic-confirmation` | = | `delete-confirmation` |
| `overlay-error` | = | `device-search-results` |
| `onscreen-keyboard` | = | `device-preset-save` |

So the 94 mapped frames are 91 distinct images, and the pairs that tie in the
audit tie because they are the same picture, not because two views collide.

**Two frames were matched better by another view, and both were defects.**

`empty-slot` scored 0.731 against its own view and 0.792 against
`device-browser-root`'s. Its Grid pane had been squeezed into the left 400px,
which pushed the toolbar and Multi Out into the open half - on the unit they sit
behind the list at x 610 and 748 - and left no room for the preset title the
frame shows at full size. Redrawn as the whole 800px Grid with the list over its
right half, measured off the frame (44x76 route tiles at x 8 on a 94px pitch
from y 109, a 70px `#101010` slot at (152, 112), the cable at y 146): **0.023 /
0.727**, and it is now its own closest match.

`fixture-editor-capture` scored 0.705 against its own view and 0.721 against
`editor-chief-ds1`'s - a near-identical screen drawn more accurately. Two causes:
its header's undo and save glyphs had no fill or stroke rule, so they were
invisible, and its editor was a rounded panel wrapping bar and parameters
together where the frame has the same bar and five-cell strip the assignment
screens use. **0.041 / 0.731**, and it now beats `editor-chief-ds1` on the frame
it belongs to.

Everything else that surfaced is explained: `copy-scene-destination` and
`swap-scene-destination` are 0.0009 apart because the two screens differ by a
word, `device-search` and `directory-new-folder` by 0.006 because both are the
keyboard, and the I/O pages by 0.005 because they share one layout. **No mapping
errors remain.** After the audit the 94 sit at a 0.0251 median, worst 0.0574,
65 under 0.03, 88 under 0.04, and 90 agreeing on 70% or more of their edges.

### The seventh pass: the last four below 70% edge agreement

The four frames still under 0.7 edge agreement were taken, and every one was a
layout the unit draws in its standard five-cell strip:

| frame | before | after | what the frame shows |
| --- | --- | --- | --- |
| `expression-parameter` | 0.054 / 0.66 | **0.024 / 0.86** | the same 156px cells as the other editors, not three columns of 46/27/27 |
| `device-recents` | 0.030 / 0.69 | **0.017 / 0.80** | search and close only, rows on one line, the pane's zigzag placeholder |
| `device-favorites` | 0.030 / 0.69 | **0.018 / 0.79** | the rail and pane are `#181c18`, not `#151a16` |
| `stomp-assignment` | 0.038 / 0.69 | **0.025 / 0.81** | the latch pills butt together, 128 and 152 wide from x 260 |

`expression-bypass` came with them - the parameter grid had been forcing its
second tile onto a new row, so NOISE REDUCTION and BYPASS stood one above the
other on both screens where the frames have them side by side: 0.033 / 0.79 to
**0.028 / 0.86**.

**All 94 addressable frames now agree on 70% or more of their edges**, 74 on 80%
or more and 42 on 90% or more. The median is 0.0243 and the worst 0.0569.

#### A class of silent failure, and a check for it

The stomp dialog would not take its measurements however specific the selector
got. The cause is `@scope`: **scoping proximity is settled before specificity**,
so a rule written after the block loses to any scoped rule that declares the
same property on the same element, whatever the selectors say. The probe that
settled it is worth keeping:

```
.capture-official-error > main > nav div.is-pending b     unscoped, (0,3,4)
.capture-official-progress > main > nav div:last-child b  scoped,   (0,2,4)  <- wins
```

An earlier pass in this session had reached the opposite conclusion, because the
case that prompted it turned out to be an unterminated brace. The reading now
has a machine behind it: `audit_scope.mjs` renders every fixture, walks the
stylesheets, and reports any unscoped declaration whose property is decided by a
scoped rule instead. It found four, two of them defects:

- the sanity-error screen's Training stage kept the progress screen's white
  badge instead of its own `#606460` - the rules have been moved inside the
  block, and `capture-sanity-error` went 0.057 / 0.75 to **0.057 / 0.78**;
- the preset row in view lost its green whenever the slot was also unsaved,
  which is exactly the row (`4F`) four directory frames were captured on.

The other two are deliberate scoped overrides - the settings screens' `display`
and the block context's darker page - and the check now reports none besides.

Re-running the frame-against-every-render audit afterwards found no mapping
errors: only the near-ties that are screens differing by a word
(`copy-scene-destination`), by a caret (`device-search`), or by one I/O page's
contents, plus the three frames the corpus stores twice.

### Completing the audit: all 119 frames against all 120 views

The sweep had been scoring 94 of the 119 frames; the other 25 were set aside as
"reached by touch". Rendering **every declared view** - all 112 plus the seven
parameter editors and the preset directory - and scoring each unscored frame
against all of them settles what is really missing.

**Ten of the 25 were already drawn**, and were out of the sweep only because
their names do not match a view's:

| frame | view that draws it | mae / edge f1 |
| --- | --- | --- |
| `capture-calibration` | `capture-calibration` | 0.046 / 0.93 |
| `grid-base`, `grid-restored`, `grid-scene-a-restored`, `grid-scene-b` | `grid` | 0.030 / 0.92 |
| `device-browser-top`, `device-browser-base` | `corpus-device-browser-root` | 0.022 / 0.87, 0.028 / 0.73 |
| `plugin-browser-ready` | `plugin-list` | 0.024 / 0.85 |
| `block-context-bottom` | `block-context` | 0.032 / 0.68 |
| `fixture-editor-pages` | (see below) | |

The sweep now scores **104 frames**: median 0.0251, worst 0.0569, all under
0.06, 77 under 0.03, and 103 of the 104 agreeing on 70% or more of their edges
(83 on 80%, 47 on 90%).

**`fixture-editor-pages` was drawing the wrong screen.** Its frame is the shared
Grid and action bar with GUITAR AMP / Brit 2203 in red and seven parameters over
two 107px strips; the view fell through to the Ambience detail editor - a real
CorOS layout, but the manual's. Rebuilt on the shared underlay it went 0.094 /
0.13 to **0.031 / 0.82**.

**The scope failure again, and a second catch.** Rebuilding it exposed that the
assignment screens' strips had never taken the measurements written for them:
`.assignment-parameters` and `.assignment-knob` still had rules *inside* the
`@scope` block from the panel those screens used before they moved onto the
shared underlay, and proximity let them beat everything written after it. The
markup no longer uses that panel, so the rules were dead weight that was still
winning. Deleting them let the measured layout through:

| frame | before | after |
| --- | --- | --- |
| `fixture-editor-pages` | 0.048 / 0.69 | **0.031 / 0.82** |
| `scene-assignment` | 0.021 / 0.80 | **0.020 / 0.83** |
| `stomp-assignment` | 0.025 / 0.81 | **0.025 / 0.82** |

That is the same class the previous pass documented, found a second time by the
same check - which is the argument for keeping the check rather than the lesson.

**Fifteen frames are screens no fixture draws.** They are not defects; they are
the remaining reconstruction work, and each is a panel over a Grid the sweep's
Grid does not hold:

| frames | what they are | closest view |
| --- | --- | --- |
| `grid-context-menu`, `-bottom`, `-favorite` | the Grid's own menu: FILE / Create New / Save as... over QUAD CORTEX / New Neural Capture / Tempo / CPU Monitor / Settings | 0.51, 0.31, 0.30 |
| `input-route-selector`, `-top` | the input list - MONO over Input 1/2, Return 1/2, USB inputs, Not In Use | 0.52, 0.29 |
| `output-route-selector`, `-top` | the output list - STEREO over Multiple Outputs, Output 1/2, Send 1/2, USB, Row 3/4 | 0.53, 0.35 |
| `grid-scene-selector` | eight scene rows with amber badges, 232x416 at (454, 44) | `grid` 0.078 / 0.69 |
| `gig-view-preset`, `-scene`, `-hybrid` | the GIG view in the unit's own content; hybrid is a preset row over a scene row, not the scenes-over-stomps the manual shows | 0.31, 0.51, 0.31 |
| `device-browser-middle-deep`, `-middle-reverb`, `-neural-capture` | the browser scrolled, and its model menu | 0.54, 0.55, 0.52 |
| `capture-type` | the capture type picker, the one Capture V1 screen never captured | 0.59 |

Each needs its own Grid content read off the frame, which is why they are listed
rather than approximated: mapping them to a view that draws a different Grid
would report coverage the reconstruction does not have.

### The last fifteen: the whole corpus is scored

The fifteen screens no fixture drew have been built, read off the captures and
their graphics trees. **All 119 corpus frames now render and score** - median
0.0251, worst 0.0633, every one under 0.07, 85 under 0.03, and 116 of the 119
agreeing on 70% or more of their edges (92 on 80%, 49 on 90%).

**Eight are one widget.** The preset menu, the two route lists and the scene
selector are the same 270px panel over the Grid, scrolled by whole cells, under
an `rgba(89,89,89,.74)` scrim - fitted from two samples, the page at `#424142`
and white text at `#848684`. Their rows come from the frames' own trees; the
scene selector raises no scrim, which is how its page stays `#000000`.

| frame | closest view before | after |
| --- | --- | --- |
| `grid-context-menu` | 0.51 | **0.014 / 0.86** |
| `grid-context-menu-favorite` | 0.37 | **0.015 / 0.85** |
| `grid-context-menu-bottom` | 0.41 | **0.017 / 0.85** |
| `input-route-selector` | 0.52 | **0.022 / 0.76** |
| `input-route-selector-top` | 0.29 | **0.016 / 0.81** |
| `output-route-selector` | 0.53 | **0.019 / 0.76** |
| `output-route-selector-top` | 0.35 | **0.021 / 0.77** |
| `grid-scene-selector` | 0.69 | **0.027 / 0.82** |

Two things the frames settled that guesswork would not: the 32H chain runs
**seven** blocks, which is only knowable because `input-route-selector.png`
shows slots 3 to 6 where `grid-scene-selector.png` shows 0 to 4; and CorOS fits
the preset name to the room it has - `pyquadcortex scratch` sets 40px where
`QC MCP TEST_2` sets 58.

**Three are the GIG view in its other modes**, which the existing view already
knew how to draw:

| frame | before | after |
| --- | --- | --- |
| `gig-view-preset` | 0.089 / 0.31 | **0.044 / 0.94** |
| `gig-view-scene` | 0.098 / 0.32 | **0.033 / 0.91** |
| `gig-view-hybrid` | 0.141 / 0.31 | **0.063 / 0.83** |

Hybrid is the one worth recording: the unit puts **presets over scenes**, not
the scenes-over-stomps the manual shows, and its scene row keeps the
footswitch's own letter and colour while taking its name from the preset's
first four scenes - so the badge reads F while the lit tile is `stereo`. The
preset in view also takes its preset's colour: 7B is `#0875e7` where 32H is
`#ff2421`.

**Four more.** `capture-type.tree.txt` has `zenUI::Grid` at its root and nothing
else - the type picker never came up, so that capture is simply the Grid in 2F
(0.59 -> **0.034 / 0.75**). `device-browser-neural-capture` is the browser with
the Captures Library open (0.52 -> **0.031 / 0.86**). The two
`device-browser-middle-*` frames are its category list scrolled seven and three
of its 78px rows; the list now matches row for row, but they were captured in
3C over a four-row Grid the browser's snapshot does not hold, so they sit at
**0.040 / 0.56** and **0.042 / 0.57** - the last two frames below 70%, and the
residual is that Grid, not the browser.

## Improvements in this pass

- Ran Neural Captures on the unit with the owner's approval and recorded
  every distinct frame of them, which closed the whole Capture V1 family
  except the type picker. The wizard's stages are **Calibration, Recording
  Signals, Sanity Check, Training**.
  - The first run failed the **Sanity Check** at 30% with *No signal
    detected, or signal too low* - correct behaviour, since nothing was
    patched into INPUT 2. That recoverable failure screen was a state the
    canonical inventory did not have at all, and is now **NC-08**
    (`capture-sanity-error`) with its own fixture.
  - The owner then patched CAPTURE OUT into INPUT 2, which is enough for the
    wizard: it checks for signal, not for a real amplifier. The second run
    completed, giving hardware evidence for **NC-05** (Training stage),
    **NC-06** (the A/B result, *CORTEX* against *REFERENCE*) and **NC-07**
    (the save metadata). All three matched their existing manual-derived
    fixtures with zero unmatched strings, so the reconstructions built from
    the official manual are now confirmed against the device itself.
  - `zenUI::NCSaveDialog` has three panes behind one header: a folder
    chooser, a name pane carrying the standard on-screen keyboard (already
    canonical as OV-01) and the metadata pane that NC-07 renders. Nothing
    was saved: closing the dialog returns to the A/B result, and closing
    that returns to the Grid without a discard prompt, so no capture was
    left on the unit.
  - A one-shot sequence cannot be re-staged to catch a screen that was
    missed, so `qc_screen_driver.py` gained a `record` verb that writes every
    changed frame with its graphics tree, and `promote_recorded_frame.py`
    moves a reviewed frame into the corpus through the same manifest writer
    a live capture uses. It refuses to overwrite an existing capture unless
    told to, because `capture-type` was destroyed earlier in this session by
    writing a new screenshot over a slug that was already another state's
    reference.
- Collapsed the CorOS screen classifier, which existed twice - once in
  `verify-qc-ui-corpora.mjs` and once in `verify_qc_ui_corpus.py` - into
  `tools/qc-tree-classifier.mjs`, which both now use. The copies had drifted:
  the Python one was missing six rules, so `capture-progress` was written into
  the manifest as `unknown` while the verifier called it `busy-progress`, and
  a capture failed verification the instant it was taken.

- Captured five additional physical Settings framebuffers directly from CorOS:
  Support, Device Information, Diagnostics, Wi-Fi, and Device Storage. Serial,
  MAC, IP, SSID, and BSSID regions are deterministically redacted in the public
  corpus while the raw originals remain outside the repository. Replaced their
  generic desktop sidebar with the measured shared CorOS two-pane shell and
  reconstructed each detail view. Structural match rises from **13.04–18.20%**
  to **97.08% Support**, **93.21% Device Information**, **97.47% Diagnostics**,
  **93.92% Wi-Fi**, and **93.31% Device Storage** on both Windows and Android.
  The expanded 52-frame corpus measures **92.16% structural / 97.55% color**
  on both hosts, with **70/103** canonical states backed by full frames and
  **90/103** backed by some authoritative visual evidence.
- Aligned the physical Block Context menu's icon/text column boundary by the
  measured one pixel and switched its labels to the captured Roboto metrics.
  The screen rises from **87.34% to 87.93% on Windows** and from **87.35% to
  87.94% on Android**, with **98.53% color similarity** on both hosts. The
  complete physical corpus now measures **91.86% structural / 97.57% color**.
- Scoped the Amp Browser to its measured white navigation, red selection, and
  black selected/add-tile palette while keeping Plugin Devices independent.
  The frame rises from **89.55% to 89.57% structural** and from **98.23% to
  98.29% color** on both hosts. The complete official corpus now measures
  **92.74% structural / 97.27% color**.
- Matched System Settings to the manual's Roboto typography and exact
  `#101010` / `#282c28` / `#181c18` surfaces plus `#40f860` brightness bars.
  Structural similarity rises from **90.78% to 90.80% Windows** and **90.79% to
  90.86% Android**, while color similarity rises from **96.48% to 96.73%** on
  both hosts.
- Replaced the I/O screen's inherited near-black header gradient with the
  measured uniform CorOS `#101010` surface. Analog color similarity rises from
  **97.33% to 97.56%** and USB from **96.50% to 96.74%** on both hosts while the
  aggregate structural score remains **92.74%**. A larger encoder experiment
  reduced structural fidelity and was discarded. The complete official corpus
  now measures **92.74% structural / 97.26% color** on both hosts.
- Recovered the official Plugin Devices screen's sampled CorOS palette instead
  of using approximate browser colors: its black header, white navigation and
  list content, green active outline, dim Grid controls, and seven category
  borders now use the measured framebuffer values. The state rises from
  **89.61% to 91.70% structural** and from **97.83% to 98.23% color** on both
  hosts. The complete official corpus now measures **92.74% structural / 97.24%
  color** on both hosts.
- Split the official Virtual Device Preset states by their observed palettes:
  Factory retains the standard CorOS green tint and yellow Guitar marker, while
  the action-menu capture now uses its measured grayscale dim state. Factory
  rises from **89.13% to 89.60% Windows / 89.59% Android** and from **96.68% to
  96.98% color**. The action menu rises from **90.06% to 94.66% structural** and
  from **96.10% to 97.73% color** on both hosts. The complete official corpus
  now measures **92.68% structural / 97.23% color** on both hosts.
- Matched the official Global EQ's 50px tab strip, four-pixel inter-panel gap,
  lower control-panel baseline, and encoder diameter and centers. The frame
  rises from **90.55% to 91.48% on Windows** and from **90.51% to 91.50% on
  Android**. The complete official corpus now measures **92.54% structural /
  97.18% color** on both hosts.
- Replaced the official Amp browser's four Unicode add symbols with measured
  two-stroke controls centered on the underlying Grid cells, raising the frame
  from **88.91% / 88.92% to 89.55%** on Windows / Android. Added the one-pixel
  assignment line observed across the applicable STOMP device glyphs, raising
  official STOMP from **88.98% to 89.73%** and Hybrid from **90.68% to 90.93%**
  on both hosts while also reducing color error. The complete official corpus
  now measures **92.51% structural / 97.18% color** on both hosts.
- Separated the current physical Tempo state from the older official-manual
  state instead of forcing both references through one approximation. The
  physical renderer now preserves its scene selector, Preset mode, and first
  beat; the official renderer uses the documented Global mode, second beat,
  hidden scene selector, and observed beat-tail marker. Physical Tempo rises
  from **89.83% to 90.46%** and official Tempo from **90.83% to 91.51%** on
  both hosts. The complete physical corpus now measures **91.84% structural /
  97.57% color** on both hosts; at that checkpoint the official corpus measured
  **92.47% / 97.18% on Windows** and **92.46% / 97.18% on Android**.
- Reconstructed the dimmed Grid add controls beneath the physical plugin-device
  browser with measured box, route-line, and two-stroke plus geometry. The
  plugin-list frame rises from **88.96% to 90.05%** on both hosts after also
  matching the six lock bounds to the captured filled-padlock geometry. A complete
  47-frame rerun also incorporates the verified MIDI pedal reconstruction into
  the physical benchmark: Preset MIDI Out rises from **89.82% to 93.06%
  Windows / 93.05% Android**. Replacing the three physical preset-browser close
  placeholders with measured two-stroke actions raises Factory, User, and the
  action-overlay frames to **90.39% / 90.38%**, **89.80%**, and **96.19%**.
  Aggregate physical structural match advances from **91.73% to 91.83%** on
  both hosts while color remains **97.57%**.
- Replaced the Amp browser's Unicode PRESET placeholder with a measured vector
  matrix glyph and aligned the primary add slot to the official framebuffer,
  raising that screen from **87.84% / 87.85% to 88.91% / 88.92%** on Windows /
  Android. Reconstructed Capture Process's close action and progress spinner,
  corrected the Training-step color, and changed the progress fill from an
  approximate 32% to the measured 31.25%; that screen rises from **90.64% to
  91.03%** on both hosts. The complete 36-frame official corpus now measures
  **92.45% structural / 97.17% color on Windows** and **92.44% / 97.17% on
  Android**.
- Reconstructed the Tuner's Live Tuner control as the observed single vertical
  switch, aligned its labels and action buttons, and raised the official frame
  from **89.09% / 89.10% to 92.13%** on both hosts. Tapered both MIDI expression
  pedals and their inset tread surfaces to the hardware geometry, raising
  Preset MIDI Out from **89.94% to 93.10% / 93.09%**. Corrected an absolute-
  positioning override that had attached the System brightness values to their
  labels instead of the right edge, raising that frame from **90.10% / 90.11%
  to 90.78% / 90.79%**. The complete official corpus now measures **92.41%
  structural / 97.17% color** on both Windows and Android.
- Refined the official Amp browser's category glyph and measured model-row
  typography, raising it from **87.06% / 87.07% to 87.84% / 87.85%** on
  Windows / Android. Moved the MIDI port labels to their observed lower
  captions and corrected the selected analog-port treatment, raising Analog
  I/O from **87.82% / 87.81% to 88.69% / 88.68%** and USB I/O from
  **88.08% / 88.07% to 88.70%** on both hosts. Reconstructed Capture A/B's
  target alignment, close action, headphone-level label, encoder geometry,
  and reference-button baseline; that frame rises from **88.45% to 94.14%**.
  Corrected the Virtual Device preset header actions and replaced outlined
  preset-layer placeholders with the observed filled stack glyph, raising its
  official frame from **88.49% to 89.13%**. At that checkpoint the complete
  official corpus measured **92.22% structural / 97.17% color** on both hosts.
- Rebuilt the physical Directory item menu beneath its overlay with the
  observed 52px row pitch, compact preset labels, numbered folder glyphs,
  measured header actions, and corrected menu baselines. Its structural match
  rises from **72.74% to 88.93%**, while the two confirmation states that reuse
  the composition rise from **82.90% / 82.91% to 90.03%** on both hosts.
  Replaced the block action drawer's seven Unicode placeholders with shared
  measured SVG controls for change, copy, paste, reset, save, expression, and
  bypass, then reconstructed the visible EQ graph, scene controls, save action,
  confirm action, nodes, and editor divider beneath its scrim. The state rises
  from **84.29% / 84.30% to 87.34% / 87.35%**. Corrected shared Directory
  strokes and the physical folder numbering as well; that full official
  rerun reached **91.98% structural / 97.16% color**. The resulting complete
  physical benchmark is **91.73% structural / 97.57% color** on both Windows
  and Android.
- Shifted the physical Input Gate preset title onto its captured baseline and
  reduced the gate waveform to the observed amplitude, raising that screen
  from **89.46% to 90.66% structural**. Replaced plugin-license outline
  placeholders with the captured solid lock body and outlined shackle, and
  replaced the single Unicode refresh mark with the shared two-arrow vector.
  The plugin-list color similarity rises from **97.27% to 97.87%**; its
  edge-only score changes from **89.38% to 88.96%** because the filled interior
  intentionally adds the pixels present in the device reference.
- Standardized all physical and official capture drivers on grayscale glyph
  antialiasing and cleared browser focus/selection state before capture. This
  removes host LCD color fringes that are absent from native QC framebuffers.
  At that checkpoint complete reruns measured **91.01% structural / 97.55% color** for
  both 47-frame physical corpora and **91.97% / 97.16%** for both 36-frame
  official corpora. Aligned the Splitter route diagram and encoder centers,
  raising that physical state from **89.28% / 89.31% to 89.60% / 89.63%**.
  Reconstructed Preset MIDI Out's expression-pedal ribs from the observed dark
  4px-on-10px texture, raising its physical match from **89.33% to 89.82%** on
  both hosts. Corrected the physical plugin browser's selected category from a
  green-tinted cell to the observed neutral rail with a black icon well, raising
  that state from **88.65% / 88.66% to 89.38%** on Windows / Android.
- Captured six additional native 800x480 hardware states: the block action
  drawer, Virtual Device naming keyboard, Directory item menu, delete dialog,
  and their shared keyboard/confirmation overlay mappings. Reconstructed all
  six in the shared Windows/Android renderer. The expanded physical corpus is
  complete at **47/47**. Full-frame authoritative
  coverage rises from **59 to 65 canonical states**, leaving **18 smoke-only
  acquisition gaps**. Reusing the captured physical Directory composition
  beneath both confirmation mappings raises each from **69.41% to 82.92%**;
  the Directory action state reaches **72.90%**. Matching the captured block
  drawer's near-opaque scrim and true black surface raises it from **31.10% to
  84.22% structural** and to **98.47% color**.
  Sampling the physical keyboard palette and row bounds raises both keyboard
  mappings from **87.40% / 97.18% structural/color to 95.86% / 98.70%**.
  Correcting the browser-only preset name's measured 11px baseline error raises
  Device Browser Root from **87.92% to 90.83%** and Models Clean from **89.10%
  to 92.09%** without changing the normal Grid title.
- Aligned Preset MIDI Out's disabled trash action and title baseline to the
  official framebuffer. The frame rises from **89.44% to 90.47% structural**
  and from **97.50% to 97.57% color** on both hosts, bringing the complete
  official corpus to **91.94% structural**.
- Replaced the Device Preset Actions screen's tiny fallback diamond with the
  full wireframe sixth-category glyph observed in the official frame. The
  screen rises from **89.09% to 89.97% structural** on both hosts, bringing the
  complete official corpus to **91.91% structural** on Windows and Android.
- Matched the official Tuner's larger, lower 440 Hz encoder without changing
  the physical Tuner state. The frame rises from **88.62% / 88.63% to 88.87% /
  88.88% structural** on Windows / Android, and the complete official corpus
  now reaches **91.89% structural** on both hosts.
- Extended the shared official Directory canvas through the measured bottom
  edge, while retaining Plugin Presets' distinct 8 px inset. All seven affected
  authoritative frames improve on both hosts: Presets reaches **96.73%**,
  Favorites **94.58%**, Captures **92.53% / 92.54%**, IRs **93.14% / 93.15%**,
  Search Results **92.72% / 92.71%**, Nested **93.71% / 93.72%**, and Cloud
  Upload **96.01% / 95.82%**. The complete official corpus rises again from
  **91.11% to 91.88% structural** and from **97.12% to 97.15% color** on both
  hosts, with Plugin Presets preserved at **96.42%**.
- Corrected the official Plugin Folders browser so both content panels fill the
  physical framebuffer instead of stopping at mid-screen. The frame rises from
  **87.92% / 87.91% to 96.44% / 96.44% structural** and from **99.05% to
  99.21% color** on Windows / Android. A complete 36-frame official-manual
  rerun raises that corpus from **90.88% / 90.87% to 91.11% / 91.11%**
  structural with no missing renders.
- Replaced Digital Flanger's rotated constant encoder shadows with normalized
  280-degree progress arcs while preserving the measured Rate and Delay pointer
  angles. The frame rises from **87.66% / 87.68% to 88.10% / 88.11%** on
  Windows / Android, with color improving from **97.52% to 97.54%**. Aligned
  Parametric-8's selector, values, and bypass control to the physical baseline,
  reconstructed the LO SHELF glyph, and restored the 0 dB Gain encoder's
  half-range sweep. Parametric-8 rises from **88.59% to 90.94% structural** and
  from **98.16% to 98.22% color** on both hosts. A complete rerun reaches
  **91.55% Windows / 91.54% Android structural and 97.39% color** across all
  **41/41** physical frames, with no missing renders.
- Hid the Grid's routing connector badges beneath the physical device-browser
  overlay, matching all three captured browser states. Root rises from **87.48%
  / 87.50% to 87.92% / 87.94%**, Models from **91.05% to 91.49%**, and Models
  Clean from **88.64% to 89.10%** on Windows / Android. Resizing and anchoring
  only Analog I/O's encoder wells also raises that official frame from **87.73%
  to 87.81%** on both hosts without changing USB I/O. Complete reruns reach
  **91.49% Windows / 91.47% Android structural and 97.39% color** across the
  41-frame physical corpus, plus **90.88% / 90.87% structural and 97.12% color**
  across the 36-frame official corpus, with no missing renders.
- Rebuilt Looper X's instruction spacing and action glyph geometry from the
  official 800x480 reference, including the One Shot loop, numeric half-speed
  mark, playback/reverse triangles, and Undo arrow. Looper rises from **87.36%
  to 90.72% Windows / 90.73% Android structural match**, while color improves
  from **96.95% to 97.16%**. Digital Flanger's measured two-page header also
  rises from **87.41% / 87.43% to 87.66% / 87.68%**. The complete official
  benchmark reaches **90.87% structural / 97.12% color** on both hosts; the
  physical benchmark remains **91.45% Windows / 91.44% Android structural** and
  **97.39% color**.
- Reconstructed the physical device browser's selected empty slot, corrected
  the dimmed Grid opacity, restored the eight-pixel category scrollbar gutter,
  and aligned the centered `New` badge. A browser-specific header variant now
  preserves the physical scratch preset's condensed title and red `H` without
  changing the official Brit preset's full-size green `A`. Browser Root rises
  from **86.04% / 86.05% to 87.48% / 87.50%**, Models from **89.75% to
  91.05%**, and Models Clean from **87.11% to 88.64%** structural match on
  Windows / Android. Their mean rises from **87.45% to 89.06%**, while mean
  color similarity rises from **96.10% to 97.49%**. The complete physical
  benchmark reaches **91.45% / 97.39%** on Windows and **91.43% / 97.39%** on
  Android; the independently rendered official Grid also improves to **92.25%
  / 92.26%**.
- Consolidated all physical parameter-editor measurements into the
  always-loaded shared stylesheet and removed competing rules from the lazy
  fixture bundle. This also makes editor appearance independent of whether a
  fixture screen was visited earlier. Cab rises from **85.19% to 93.18%**,
  Digital Flanger from **83.08% to 87.27%**, Simple Gate from **90.64% to
  92.56%**, Chief DS1 from **90.93% to 92.33%**, UK C30 TopBoost from **89.03%
  to 91.06%**, Ambience from **88.88% to 90.88%**, and Parametric-8 from
  **88.41% to 88.50%** structural match on both hosts. The complete 41-frame
  benchmark rises to **91.23% structural / 97.30% color** on Windows and
  Android; no non-editor frame changed.
- Reconstructed Input Gate Control's dimmed Grid and lower editor from its
  physical framebuffer with shared vector glyphs, measured CorOS title metrics,
  exact route geometry, and aligned control/value baselines. The state rises
  from **74.23% to 89.48% structural** and from **95.92% to 97.22% color** on
  both hosts. The complete 41-frame physical benchmark consequently rises from
  **90.38% to 90.75% Windows / 90.76% Android structural**, with **97.25% color
  similarity** and no regressions in the other 40 frames.
- Moved measured parameter-editor geometry out of a reference-only stylesheet
  and into the shared editor that both applications actually render. Digital
  Flanger rises from **71.40% to 83.08%**, UK C30 TopBoost from **79.55% to
  89.03%**, Ambience from **80.38% to 88.88%**, the UK C30 cabinet from
  **81.14% to 85.19%**, and Parametric-8 from **85.53% to 88.41%** structural
  match on both Windows and Android. A complete rerun found no regressions in
  the other 36 physical frames and raises the 41-frame benchmark from
  **89.49% to 90.38% structural**, with **97.22% color similarity**. The
  independent 36-frame official corpus remains unchanged at **90.79%
  structural / 97.11% color** on both hosts.
- Added the first physical Input Gate Control framebuffer, replacing a
  speculative full-page settings mock with CorOS's actual lower editor over a
  dimmed Grid. Measured structural match rose from **47.22% to 74.23% on
  Windows** and **47.24% to 74.25% on Android**, while color similarity rose
  from **94.32% to 95.92%**. The expanded physical corpus now covers **41/41**
  frames and measures **89.49% structural / 97.16% color** on both hosts; the
  independent 36-frame official corpus remains green at **90.79% structural /
  97.11% color**. This closes IO-08 and leaves **24** smoke-only acquisition
  gaps.
- Removed the obsolete scene selector from the official Tempo header and
  aligned the three control dials to the CorOS 4.1 framebuffer. Tempo rises
  from **87.72% / 87.62% to 90.80%** structural match on Windows / Android.
  Rebuilt the distinct Captures and IRs directory toolbars with native-sized
  vector actions, then replaced Favorites' text-symbol controls with heart,
  clock, binocular, and remove-favorite vectors. Captures rises from **87.94% /
  87.86% to 89.12% / 89.13%**, IRs from **88.99% / 88.89% to 89.70% /
  89.72%**, and Favorites from **88.37% / 88.29% to 91.21% / 91.20%**.
  Analog I/O's independently measured column and value geometry also rises to
  **87.73%** on both hosts without changing USB. The complete official-manual
  Enlarging and positioning Capture A/B's level dial against its measured
  bounds also raises that screen from **88.17% / 88.03% to 88.50%** on both
  hosts. The complete official-manual benchmark now reaches **90.78% Windows /
  90.77% Android** structural and **97.11%** color similarity.
- Corrected Plugin Devices' route rails and block surfaces, aligned its
  scene/header controls, restored the clipped row number, normalized the six
  category glyph bounds, and preserved list indentation when a plugin has no
  availability dot. Plugin Devices rises from **87.24% / 87.25% to 89.61%**
  structural match on Windows / Android, and the shared header correction also
  raises the Amp browser from **86.68% / 86.69% to 87.13%**. The complete
  official-manual benchmark reached **90.55% Windows / 90.54% Android**
  structural and **97.10%** color similarity at that checkpoint.
- Reconstructed Empty Slot's scene, save, overflow, and PRESET controls from
  native-sized vector primitives; corrected the category-tile dimensions and
  glyph bounds; and restored the exact category-pane, icon-well, scrollbar,
  and signal-line colors. The frame rises from **87.18% / 87.19% to 94.03%**
  structural match on Windows / Android, while color similarity rises from
  **97.72% to 98.46%**. At that checkpoint, the complete 36-screen
  official-manual benchmark reached **90.47% / 97.09%** on both hosts.
- Restored Directory — Plugin Presets' full-height 412px content panels,
  native toolbar spacing and vector icons, aligned its directory labels, and
  resized the plugin glyph and centered logo against the official frame. The
  screen rises from **87.14% to 96.42%** structural match on both hosts, while
  color similarity improves from **98.35% to 98.53%**. At that checkpoint, the
  complete 36-screen official-manual benchmark reached **90.28% / 97.07%** on
  both hosts.
- Refit Global EQ's response trace against the native curve, restored the
  measured 4px filter-tab gutters, and raised the three parameter values to
  their device baselines. The screen rises from **86.79% to 90.55% Windows /
  86.78% to 90.52% Android** structural match, while color similarity improves
  from **96.19% to 96.41%**. At that checkpoint, the complete 36-screen
  official-manual benchmark reached **90.02% / 97.06%** on both hosts.
- Rebuilt the official Brit 2203 Grid header as the continuous, native-scale
  **1A Brit 2203** title instead of three disconnected runs, restored the
  scene-green slot color, and added the three missing signal-row connector
  markers. The frame rises from **84.97% to 92.25% Windows / 92.26% Android**
  structural match, while color similarity rises from **94.67% to 96.08%**.
  At that checkpoint, the complete official-manual benchmark reached **89.92%
  / 97.05%** on Windows and **89.91% / 97.05%** on Android.
- Replaced Settings — Device's Unicode icon stand-ins with measured vector
  device, bypass, timing, scene, and model glyphs; aligned the navigation and
  model-card geometry; and matched the explanatory copy's physical type scale.
  The screen rises from **85.81% to 92.86%** structural match on both hosts,
  while color similarity rises from **96.10% to 96.36%**. The complete
  36-screen official-manual benchmark reaches **89.71% / 97.02%** structural
  and color similarity on both Windows and Android.
- Replaced Save As's fractional repeated-card layout with the physical 53px and
  51px row cadence, then aligned its folder labels, right-pane padding, header
  title, grid glyph, dropdown caret, and close mark. The screen rises from
  **88.97% to 89.50%** on both hosts with **98.22% color similarity**; complete-
  corpus recomparison reaches **91.59% / 97.32%** on Windows and **91.58% /
  97.32%** on Android.
- Matched SCENE Gig View's right-anchored header controls, scene-name scale and
  baselines, active red surface, and enlarged three-action tool glyphs. The
  screen rises from **88.75% Windows / 88.76% Android to 91.15%** on both
  hosts, while color similarity rises from **96.10% to 96.95%**. Complete-
  corpus recomparison reaches **91.57% / 97.32%** on Windows and **91.56% /
  97.32%** on Android.
- Corrected the plugin model browser's cascade so model-lock overlays retain
  their physical **18x24px** bounds instead of inheriting the **70x70px** block
  tile size. Matched the toolbar vectors, close control, active rail treatment,
  and category-tinted model interiors. The unlocked model screen rises from
  **90.50% to 91.84%**, and the locked screen from **88.42% to 91.84%**, on
  both hosts; locked-screen color similarity rises from **94.43% to 96.00%**.
  Complete-corpus recomparison reaches **91.51% / 97.30%** on Windows and
  **91.50% / 97.30%** on Android.
- Restored the physical plugin browser rail's green-black active surface,
  neutral white category artwork, 68px selected target, and measured plug
  proportions. The screen rises from **87.32% Windows / 87.33% Android to
  88.61%** on both hosts, while color similarity rises from **97.76% to
  97.85%**. Complete-corpus recomparison reaches **91.39% / 97.25%** on
  Windows and **91.38% / 97.25%** on Android.
- Fixed Digital Flanger's dead page-cell selectors so the live `<button>`
  controls receive the physical active/inactive colors, matched their measured
  bounds, aligned the confirmation control, and corrected the two-line title's
  scale and baseline. The screen rises from **86.60% to 88.43% Windows / 86.61%
  to 88.44% Android**, while color similarity rises from **97.69% to 97.75%**.
  The complete benchmark reaches **91.36% / 97.25%** on Windows and **91.35% /
  97.25%** on Android.
- Matched Parametric-8's four measured graph-node bounds and colors, replaced
  its approximate striped preset mark with the stacked vector glyph, and
  corrected the title scale. The editor rises from **88.33% to 89.45%**
  structural match on both hosts, with **98.21% color similarity**. A complete
  40-screen rerun raises the physical benchmark to **91.32% / 97.24%**
  structural/color on Windows and **91.31% / 97.25%** on Android.
- Fixed Preset MIDI Out's browser-dependent serif fallback, matched the
  expression-label offsets and pedal tread cadence, and tightened footswitch
  and preset-message typography. The screen rises from **88.29% to 89.33%**
  structural match on both hosts.
- Matched the Splitter panel's physical top edge and rotary-control bounds,
  and replaced the Splitter/Mixer single-character scene arrows with measured
  double chevrons. Splitter rises from **87.61% to 89.28% Windows / 87.65% to
  89.31% Android** and Mixer from **89.85% to 90.48% / 89.89% to 90.52%**.
  Corrected the shared standard-editor bypass glyph and removed erroneous
  14px header offsets from TopBoost and Ambience. The four affected editors
  gain 0.62–1.95 structural points; all seven physical editors now average
  **90.11% structural match**.
- Replaced Digital Flanger's incorrect bypass blob with the linked-control
  glyph visible in the physical editor, raising structural match from
  **85.91% to 86.60% Windows / 85.92% to 86.61% Android**. Restored the
  plugin-list Grid underlay's distinct endpoint tiles and black add-device
  target, raising that screen from **86.22% to 87.32% / 87.33%**.
- Reconstructed the Cab editor's four independently positioned parameter
  columns, measured per-control value bars, microphone targets, footer sizing,
  and stacked-preset glyph. Cab structural match rises from **85.59% to
  92.99%** with **97.69% color similarity** on both hosts; the seven physical
  editor screens now average **89.29% structural match**.
- Corrected the shared live Grid header against the physical framebuffer: the
  active preset slot is red rather than green, Undo and Save use their measured
  coordinates, the scene badge is 25px rather than 31px, and the mode icon and
  label no longer drift left. Grid base rises from **90.26% to 93.42%** and the
  fix propagates through route pickers and standard editors; the seven captured
  editors now average **88.23%** structural match.
- Restored the physical device browser's independently sized bank code, red
  slot letter, and 40px preset title instead of stretching one 64px text run
  across the dimmed Grid. Aligned its category rail and model typography and
  replaced the placeholder favorite diamond with a vector pushpin. The root,
  tipped-model, and clean-model frames rise to **89.66%**, **90.41%**, and
  **90.77%** on Windows (within 0.01 point on Android).
- Reconstructed physical STOMP Gig View typography, header geometry, device
  glyph scale, vector edit affordances, and per-tile label placement. The base
  frame rises from **83.30% to 94.41%** structural match and its Live Tuner
  variant from **84.88% to 94.50%**, identically on Windows and Android. Scoped
  capture filters now skip unrelated navigation, reducing two-screen probes
  from roughly a minute to a few seconds.
- Replaced the desktop-style white selection ring with the QC's thick
  category-colored block border, pinned standard editor header actions to their
  measured framebuffer positions, and matched the 24px scene badge plus filled
  double-triangle arrows. Corrected Flanger's DRIVE rotary, knob positions, and
  value precision; removed leaked draggable-mic markers from the C30 cab; and
  fixed Ambience's captured TRAILS, filter, and knob states. The seven editor
  frames reached **86.82%**, up from **84.46%**, with every editor improved in
  that pass.
- Parked the benchmark pointer outside the framebuffer before every capture so
  transient desktop hover artwork can no longer contaminate physical-device
  comparisons.
- Matched the physical scene-copy and scene-swap overlays: exact dimmed block,
  rail, title, modal, and button geometry lifts both states from about 80% to
  **91.4–91.8% structural match** on both hosts.
- Corrected the output route list's measured 18px type, 8px vertical offset,
  and opposing row-flow arrows, raising it from **77.76% to 90.74% Windows**
  and **78.90% to 90.76% Android**.
- Removed the Android host's decorative rounded glass overlay from framebuffer
  benchmarking. Both capture paths now isolate the same raw 800x480 UI output,
  eliminating a systematic measurement artifact without changing the app UI.

- Matched the live Directory's measured 60px folder cadence, 52px bank tiles
  on an 8px vertical rhythm, 51px preset rows, and exact physical panel colors.
  The shared Directory rises from **77.89% to 92.36% Windows** and **77.82% to
  92.28% Android**, while its color error falls to 1.95% on both hosts.
- Shifted the standard editor encoders to the physical right-hand control
  positions, corrected their 64px geometry and panel colors, and made the
  scratch corpus preserve ModelRepo-style binary switches for Boost, Sync,
  Polarity, Drive, and Trails. The canonical Grid palette now keeps Overdrive
  orange distinct from the yellow physical Drive footswitch lamp. The four
  affected non-flanger editors rise
  by 1.9–7.0 structural points, and their dimmed Grid underlay now matches the
  physical screen instead of remaining at full brightness.
- Replaced the live Grid's older approximate block and row coordinates with
  the measured 86px block cadence and 94px signal-row cadence already recorded
  in the physical corpus, restored the six empty-row plus targets, and removed
  a false input-connection indicator from the reference preset. Base Grid
  structural match rises from **68.94% to 90.24% Windows / 68.31% to 89.97%
  Android**; the scene and context overlays exceed 91%. The same shared geometry
  raises the input/output route selectors to **85.55% / 77.76% Windows** and
  **86.99% / 78.90% Android**.
- Matched Parametric-8's logarithmic frequency grid to all 26 measured vertical
  positions, corrected its background and tab tones, and aligned the shared
  footswitch, double-scene-arrow, bypass, and confirmation header controls.
  Parametric-8 rises from **63.35% to 88.33%**; the seven physical editor
  screens reached **86.82% structural match** in that pass. The latest complete
  physical benchmark reached **91.29% / 97.24% structural/color on Windows**
  and **91.28% / 97.24% on Android** in that pass.
- Restored the omitted right-hand model column in the two physical plugin
  browser fixtures, including the selected Plini and locked Cory Wong device
  lists, block artwork, preset controls, and license locks. The model screen
  rises from **54.61% to 90.72% Windows / 53.50% to 87.23% Android**; the
  locked screen rises from **51.68% to 88.50% / 50.70% to 85.52%**. The
  complete physical benchmark consequently reaches **81.87% / 96.55%**
  structural/color on Windows and **80.71% / 96.42%** on Android.
- Moved the physical benchmark onto the real interactive Grid path and added
  deterministic waits for all seven asynchronous block editors. The shared
  Windows/Android reconstruction now uses measured standard, Cab, and
  Parametric-8 editor layouts; the captured Directory's 19–32 bank window and
  complete visible setlists; physical scene and context menus; and the measured
  route focus mask and list scale. Directory structural match rises from
  **48% to 77.89%** and both route screens fall from roughly **40% pixel error
  to 3.7%**. The corrected complete physical benchmark is **80.04% / 96.33%**
  structural/color on Windows and **78.99% / 96.21%** on Android before the
  plugin-model correction above.
- Reconstructed Directory — Nested folders with the manual's outline folder
  glyphs, repeated rounded hierarchy elbows, Capture category mark, funnel
  control, and asymmetric final toolbar gap. The toolbar correction aligns four
  controls at once. Structural match rises from **87.23% to 90.10% Windows /
  87.14% to 90.02% Android**, while color similarity improves from **97.40% to
  97.69%**. The complete pass131 benchmark reaches **89.68% Windows / 89.60%
  Android** structural match and **97.03%** mean color similarity.
- Reconstructed Preset MIDI Out's two expression pedals as recessed housings
  with separately inset tread surfaces and aligned groove fields, raising the
  screen from **87.03% to 88.72% Windows / 86.93% to 88.62% Android** and
  improving its color similarity from **97.32% to 97.52%**. Plugin Devices now
  uses the official four-cell scene mark and closer gate, waveform, and paired
  speaker glyphs, lifting it to **87.29% / 87.38%**. The complete pass130
  benchmark reaches **89.60% Windows / 89.52% Android** structural match and
  **97.02%** mean color similarity.
- Replaced USB I/O's fragile fixed whitespace with the measured three-cell
  reading cadence, aligned all eight channel labels and values to the official
  rows, shifted the asymmetric cell inset by one pixel, and aligned the lower
  meter bars. USB I/O rises from **84.57% to 88.08% Windows / 84.52% to
  88.02% Android**, while color similarity improves from **96.34% to 96.48%**.
  The complete pass129 benchmark reaches **89.55% Windows / 89.47% Android**
  structural match and **97.02%** mean color similarity.
- Sampled Settings — Device's surfaces and bypass controls directly from the
  official frame, reduced its device cards from 70px to the measured 66px,
  and aligned its row labels and switches. Structural match rises from
  **86.66% to 87.07% Windows / 86.59% to 87.00% Android**, while color
  similarity improves from **95.69% to 95.96%**. Replacing the remaining undo
  and save text placeholders with shared vector controls raises Empty Slot to
  **87.30% / 87.36%** and Amp Browser to **87.36% / 87.54%**. The complete
  pass128 benchmark reaches **89.45% Windows / 89.37% Android** structural
  match and **97.01%** mean color similarity.
- Replaced the SCENE and HYBRID tiles' browser-dependent Unicode edit, swap,
  and copy placeholders with shared measured vector controls, and reconstructed
  the SCENE mode's four-cell A/B/C/D header mark. SCENE rises from **86.90% to
  93.50% Windows / 86.83% to 93.42% Android**; HYBRID rises from **87.74% to
  90.68% / 87.67% to 90.60%**. The complete pass127 benchmark reaches
  **89.41% Windows / 89.33% Android** structural match and **97.01%** mean
  color similarity.
- Matched Global EQ's three independent parameter values by rotating the GAIN,
  FREQ, and Q pointers to their measured 0°, -90°, and -135° positions. Its
  header now uses the measured title and power-button columns, compact green
  status rail, and vector bypass control. Structural match rises from **86.51%
  to 87.39% Windows / 86.40% to 87.29% Android**. Corrected the Amp browser's
  four output targets to the same 94px cadence found in the official frame
  without altering its central add target, raising it from **86.19% to 86.93%
  / 86.37% to 87.12%**. The complete pass126 benchmark reaches **89.15%
  Windows / 89.07% Android** structural match and **97.01%** mean color
  similarity.
- Restored Empty Slot's omitted Row 4 output target, aligned the complete
  four-row stack to the official 94px cadence, and sampled the distinct grid
  and target-button colors from the framebuffer. Structural match rises from
  **85.92% to 86.78% Windows / 86.04% to 86.84% Android**, while color
  similarity rises from **96.62% to 97.68%**. Matched the I/O title and Global
  EQ typography and replaced USB's nested-square placeholder with the actual
  framed connector symbol. Analog I/O reaches **87.52% / 87.43%** and USB I/O
  reaches **84.57% / 84.52%**. The complete pass125 benchmark reaches
  **89.10% Windows / 89.02% Android** structural match and **97.00%** mean
  color similarity.
- Matched Capture Settings' measured 23px instruction-line rhythm instead of
  the browser's loose list defaults. Structural match rises from **84.68% to
  92.87% Windows / 84.61% to 92.79% Android**. Reconstructed the Plugin
  Presets mark as the manual's stroked waveform rather than a filled polygon,
  raising that screen from **85.81% to 87.11% / 85.64% to 86.93%**. Preset
  MIDI Out now uses the measured title scale, fixed-width header actions, and
  18px inter-button gap, improving to **87.03% / 86.93%**. The complete pass124
  benchmark reaches **89.06% Windows / 88.98% Android** structural match and
  **96.98%** mean color similarity.
- Restored the second stacked meter bar in all eight USB channels and matched
  their asymmetric cell padding. USB I/O rises from **81.37% to 84.19%
  Windows / 81.32% to 84.14% Android**, while color similarity improves from
  **96.02% to 96.35%**.
- Rescaled Analog I/O's TYPE, PHANTOM 48V, and GROUND LIFT rows to the measured
  16px labels and 20px radio controls, restored the lower panel divider and
  `IN 1 LEVEL` label, and aligned its value and meter width. Structural match
  rises from **84.13% to 87.17% Windows / 84.05% to 87.09% Android**, with
  color similarity improving to **97.32%**.
- Corrected Global EQ's three control-knob diameters and centers, value insets,
  TYPE selector bounds, and BYPASS vertical anchor. The screen rises from
  **85.84% to 86.51% Windows / 85.74% to 86.40% Android**. Separated the Amp
  and Plugin device-browser control stacks after detecting a shared-selector
  regression; Amp recovers from **82.79% to 86.19% / 82.98% to 86.37%** while
  Plugin Devices retains **87.25% / 87.34%**. The complete pass123 benchmark
  reaches **88.79% Windows / 88.71% Android** structural match and **96.97%**
  mean color similarity.
- Reconstructed Capture Metadata's capture-kind cards from sampled framebuffer
  geometry: 70px cards on 83px centers, a 3px black outer frame, 4px inset
  category outlines, and the exact gray, red, purple, and orange device colors.
  Structural match rises from **82.97% to 92.95% Windows / 82.82% to 92.80%
  Android**, while color similarity improves from **98.22% to 98.30%**.
- Removed seven invented full-width row separators from Directory Presets after
  regional scoring isolated its right pane at only 66.70% structural match.
  The screen rises from **80.97% to 91.97% Windows / 80.89% to 91.86%
  Android**, and color similarity improves to **97.85%**.
- Restored Plugin Folders' single measured preset-row separator, raising the
  screen from **82.00% to 88.15% Windows / 81.80% to 87.95% Android**. Fixed
  Directory Search Results' inherited generic-search margin and grid layout,
  then aligned its search field, tabs, toolbar gaps, and proper search glyph;
  that screen rises from **85.21% to 88.38% / 85.12% to 88.30%**. The complete
  pass122 benchmark reaches **88.51% Windows / 88.44% Android** structural
  match and **96.95%** mean color similarity.
- Corrected Plugin Devices' grid-control model: child-position selectors now
  address the controls independently of the seven preceding device blocks, and
  the center add control plus the complete Row 3 / Multi Out stack occupy their
  measured locations. Structural match rises from **84.45% to 87.25% Windows /
  84.83% to 87.34% Android**, while color similarity rises from **97.20% to
  97.41%** on both hosts.
- Restored the USB, MIDI OUT, and MIDI IN connector stems omitted from the USB
  I/O reconstruction. Structural match rises from **80.93% to 81.37% Windows /
  80.87% to 81.32% Android**. Replacing Capture Settings' two placeholder
  bullets with the measured circular information controls raises that screen
  from **83.81% to 84.68% / 83.74% to 84.61%**. The complete pass121 benchmark
  reaches **87.67% Windows / 87.60% Android** structural match and **96.94%**
  mean color similarity.
- Matched USB I/O's 109px Global EQ header control and replaced the headphone
  placeholder with a measured headset glyph shared by the Analog and USB views.
  USB structural match rises from **80.26% to 80.93% Windows / 80.21% to
  80.87% Android**; Analog I/O rises from **83.82% to 84.13% / 83.74% to
  84.05%**. Replacing Directory Captures' tiny header placeholder with a
  correctly bounded striped capture mark raises that screen again to
  **87.94% / 87.86%**. The complete pass120 benchmark reaches **87.65% Windows
  / 87.58% Android** structural match and **96.95%** mean color similarity.
- Added the missing Directory Captures alphabet index, moved row counts and
  action menus to their measured column, prevented child-folder labels from
  wrapping, aligned their 2px text offset, and replaced the Captures Library
  placeholder with a purpose-built glyph. Structural match rises from
  **83.50% to 87.47% Windows / 83.43% to 87.39% Android**, while MAE improves
  from **0.0272 to 0.0254**. A complete 36-screen rerun advances the official
  benchmark to **87.61% / 87.54%** structural and **96.95%** color similarity.
- Corrected Plugin Folders' measured header and navigation anchors: the Plugins
  label moves 12px right, every folder label moves 2px left, and the plugin
  glyph is scaled to its reference bounds. Structural match rises from
  **81.53% to 82.00% Windows / 81.34% to 81.80% Android**, while MAE improves
  from **0.0098 to 0.0092**. The complete 36-screen official benchmark now
  reaches **87.50% / 87.43%** structural match with **96.94%** mean color
  similarity.
- Rebuilt the Power and Locking overlay from its 652x93 official SVG geometry:
  exact 157px action widths, 404x38 lock control, 8px gaps, measured radii,
  colors, typography, and a real lock glyph. Its scoped structural/color match
  rises from **48.80% / 86.50% to 92.85% / 94.25% on Windows** and from
  **48.81% / 86.50% to 92.86% / 94.25% on Android**.
- Replaced the invented full-screen Scene Assignment dialog with the actual
  lower parameter-editor interaction: device header, Scene selector, bypass
  and confirm controls, two measured parameter rows, assigned MID outline, and
  touch gesture. Against the official 800x283 editor fragment, structural
  match rises from **7.70% to 63.90% Windows / 7.70% to 63.87% Android** and
  color similarity rises from **90.60% / 90.59% to 92.50% on both hosts**.
- Added reproducible official-detail rasterization and crop comparison tools.
  Transparent SVG pixels remain outside the evidence scope, while visible
  controls receive masked color error and two-pixel edge-F1 measurements.
- Added the official-manual detail corpus with **27 source-preserving SVGs**,
  intrinsic geometry, checksums, evidence scopes, and bidirectional canonical
  state mappings. This raises authoritative visual coverage from **58 to 78 of
  103 states** while retaining **58** as the honest full-frame count. The
  coverage verifier now rejects missing, orphaned, or mis-mapped detail assets.
- Hardened physical corpus acquisition after a live-device probe exposed a
  stale first framebuffer. Static `capture` now requires two consecutive
  byte-identical device reads, preset identity reads retry transient protocol
  timeouts, and unstable screens are rejected instead of silently entering the
  corpus. A guarded live QC run verified the settled capture path at 800x480;
  animated states remain available only through explicit `capture-now`.
- Reconstructed the official Brit 2203 Grid title as separate, measured bank,
  scene, and preset-name runs, corrected its scene color, and replaced eight
  incorrect fixture block categories with the devices visible in the reference.
  Structural match rises from **84.35% to 88.21% Windows / 84.28% to 88.13%
  Android**, while MAE falls from **0.0553 to 0.0428**.
- Replaced Gig View's STOMP and HYBRID placeholder characters with the measured
  device tiles, including the plugin, wah, drive, looper, transpose, grouped-
  device, and room artwork. STOMP rises from **84.79% to 88.85% Windows /
  84.74% to 88.79% Android**; HYBRID rises from **86.62% to 87.74% Windows /
  86.55% to 87.67% Android**. The complete official benchmark now reaches
  **87.49% / 87.42%** structural match and **96.94%** color similarity.
- Refit Global EQ's response curve to the manual trace, enlarged the selected
  and unselected graph nodes to their measured radii, and aligned the remaining
  node centers. Structural match rises from **82.60% to 85.84% Windows / 82.51%
  to 85.74% Android**, with MAE improving from **0.0397 to 0.0382**.
- Corrected Capture Training's step-list offset, content spacing, and progress
  spinner anchor. Structural match rises from **82.97% to 90.61% Windows /
  82.89% to 90.50% Android**, while MAE falls from **0.0302 to 0.0281**.
- Aligned Capture Settings' three level dials with the measured control centers,
  lifting it from **83.57% to 83.81% Windows / 83.49% to 83.74% Android**.
- Added the missing selected-preset background in Directory Presets. Its
  structural score is unchanged at **80.97% / 80.89%**, but MAE improves from
  **0.0234 to 0.0218**. A six-font sweep confirmed Arial remains the strongest
  available match for this screen. The full official benchmark now reaches
  **87.23% / 87.17%** structural match and **96.90%** color similarity.
- Moved and resized the shared device-browser category rail to its measured
  framebuffer anchor. The Amp browser rises from **81.00% to 86.08% Windows /
  81.19% to 86.27% Android**, and Plugin Devices rises from **80.66% to 84.45%
  / 81.12% to 84.83%**. Both screens also reduce MAE.
- Corrected Plugin Presets' right-pane and refresh-control colors, aligned its
  Neural DSP mark, and replaced the category placeholder with the plugin glyph.
  Structural match rises from **83.92% to 85.81% Windows / 83.72% to 85.64%
  Android**, while MAE drops sharply from **0.0511 to 0.0167**.
- Aligned Plugin Folders' preset-row text and shortcut column. Structural match
  rises from **81.06% to 81.53% Windows / 80.87% to 81.34% Android** while
  retaining **0.0098 MAE**.
- Expanded the Analog I/O Global EQ control to its measured width without
  applying the change to USB, where it regressed edge agreement. Analog I/O
  rises again from **83.27% to 83.82% Windows / 83.19% to 83.74% Android**.
  The USB meter style was restored byte-for-byte to its stronger accepted frame
  after detecting an incomplete experimental revert. The complete official
  benchmark now reaches **86.93% / 86.86%** structural match and **96.89%**
  color similarity.
- Repositioned the Analog I/O TYPE, PHANTOM 48V, and GROUND LIFT switch rows to
  the measured vertical and horizontal anchors. Structural match rises from
  **81.33% to 83.27% Windows / 81.25% to 83.19% Android**, while MAE improves
  from **0.0280 to 0.0275**.
- Corrected Capture Metadata's folder-icon spacing and the two section-label
  baselines. Structural match rises from **82.05% to 82.97% Windows / 81.90%
  to 82.82% Android**, and MAE falls from **0.0189 to 0.0178**.
- Scoped the measured Roboto sizing to the Amp browser's model list. Structural
  match rises from **80.79% to 81.00% Windows / 80.94% to 81.19% Android**,
  with MAE improving from **0.0195 to 0.0191 / 0.0192**. Together these retained
  corrections bring the complete official benchmark to **86.57% / 86.51%**
  structural match and **96.79%** color similarity.
- Matched Empty Slot's Roboto text metrics and moved its scrollbar from the
  inset content edge to the measured panel boundary. Structural match rises
  from **83.30% to 85.92% Windows / 83.42% to 86.04% Android**, and MAE falls
  from **0.0344 to 0.0338**.
- Replaced Plugin Folders' remaining outlined/Unicode plugin and export marks
  with the filled plugin glyph and vector export action shown in the manual.
  Structural match rises from **80.33% to 81.06% Windows / 80.14% to 80.87%
  Android**, with MAE improving from **0.0099 to 0.0098**. The complete official
  benchmark now reaches **86.51% / 86.45%**.
- Rebuilt the official Modes Configuration header controls and mode tiles with
  vector glyphs, then expanded its undersized Quad Cortex silhouette to the
  measured chassis, display, encoder, and footswitch coordinates. Structural
  match rises from **82.58% to 91.84% Windows / 82.44% to 91.71% Android**,
  with MAE improving from **0.0336 to 0.0325**.
- Scoped the bundled Roboto face to Settings — Device, matching the manual's
  line wrapping and glyph widths without changing the higher-scoring Account
  and System states. Its structural match rises from **82.59% to 86.66%
  Windows / 82.53% to 86.59% Android**. A custom icon replacement was measured
  and rejected because it reduced edge agreement. The full official benchmark
  now reaches **86.42% / 86.36%** with **96.78%** color similarity.
- Corrected the evidence ledger so the official Amp browser is attached to the
  Guitar/Bass model-list state, Plugin Devices to the plugin license-list state,
  and the official Brit 2203 Grid to the base Grid state. The verifier now
  rejects any orphaned physical image or comparable official frame. This
  corrects the direct-evidence count from **59 to 58 canonical states**; all 36
  comparable official frames and all 40 physical frames are explicitly
  represented without misclassifying Search as the Amp browser.
- Matched Capture Metadata's folder/name control widths and header spacing.
  Structural match rises from **81.61% to 82.05% Windows / 81.47% to 81.90%
  Android**, while MAE falls from **0.0197 to 0.0189**.
- Moved the shared I/O connector row to the measured vertical anchors. Analog
  I/O rises from **80.96% to 81.33% Windows / 80.88% to 81.25% Android**; USB
  rises from **79.96% to 80.26% / 79.91% to 80.21%**.
- Replaced Plugin Devices' refresh, undo, export, overflow, and mode Unicode
  stand-ins with vector controls. Plugin Devices rises from **80.33% to 80.66%
  Windows / 80.81% to 81.12% Android**. The same change was measured and
  rejected for the Amp browser, so it remains scoped to the plugin state. The
  complete official benchmark reaches **86.05% / 85.99%**.
- Reconstructed Expression bypass's switch tracks, selected-ring placement,
  delay dial, text weights, and assignment-button baselines. Structural match
  rises from **80.23% to 91.73% Windows / 80.17% to 91.66% Android** and MAE
  improves from **0.0341 to 0.0305**.
- Replaced Capture Settings' Unicode input selectors with the manual's vertical
  Mic/Instrument switch geometry. Structural match rises from **81.76% to
  83.57% Windows / 81.68% to 83.49% Android**, while MAE improves from
  **0.0478 to 0.0469 / 0.0470**.
- Corrected Global EQ typography, graph-node coordinates, TYPE and BYPASS
  control placement, and dial scale. Structural match rises from **80.05% to
  82.60% Windows / 79.97% to 82.51% Android**, and MAE falls from **0.0417 to
  0.0397**. With all retained changes, the full official benchmark reaches
  **86.01% / 85.95%** structural match and **96.78%** color similarity.
- Matched the official Plugin Folders typography to the Roboto face bundled by
  both clients. This raises the weakest official state from **79.93% to 80.33%
  Windows / 79.75% to 80.14% Android** and lowers its MAE from **0.0103 to
  0.0099**. The complete official benchmark reaches **85.57% / 85.51%**
  structural match while retaining **96.76%** color similarity.
- Replaced Capture Metadata's close, destination-folder, note, and save font
  symbols with outlined SVG controls and matched its state-specific canvas,
  capture-tile, note, save, and instrument-button colors. Structural match
  rises from **81.01% to 81.61% Windows / 80.89% to 81.47% Android**, while MAE
  falls from **0.0235 to 0.0197**. The complete official benchmark reaches
  **85.56% / 85.50%** structural match and **96.76%** color similarity.
- Replaced the Directory Captures, IRs, and Plugin Presets placeholder square
  folder marks with measured outline SVG folders. Plugin Presets rises from
  **80.76% to 83.92% Windows / 80.57% to 83.72% Android**, Captures from
  **82.73% to 83.50% / 82.66% to 83.43%**, and IRs from **88.68% to 88.99% /
  88.58% to 88.89%**. The rule is deliberately excluded from Nested Folders,
  where an independent comparison showed a small regression. The complete
  official benchmark reaches **85.54% / 85.48%** structural match.
- Separated the official manual's active-note Tuner state from the physical
  neutral 422 Hz fixture. The new authoritative renderer adds the manual's
  −1.4-cent reading, adjacent pitch arrows, D♯/E♭–E–F note display, green target,
  440 Hz dial, and enabled Live Tuner state without changing any physical tuner
  capture. Official Tuner rises from **81.55% to 88.59% Windows / 81.35% to
  88.39% Android**. The complete official benchmark reaches **85.42% / 85.36%**
  structural match and **96.75%** color similarity.
- Corrected I/O dial-value baselines by ten pixels, moved the impedance dial to
  its measured horizontal center, and retained the filled primary-input
  connector treatment. Analog I/O rises from **80.08% to 80.96% Windows /
  80.01% to 80.88% Android**, with MAE improving from **0.0283 to 0.0279**; USB
  rises from **79.42% to 79.96% / 79.37% to 79.91%** and reaches **0.0400 MAE**.
  A replacement switch-control DOM was measured and rejected because its text
  anchors reduced parity. The complete official benchmark now reaches
  **85.23% / 85.17%** structural match with **96.74%** color similarity.
- Corrected Looper X's full-width timeline split from the approximate 50% to
  the measured 52% boundary and matched its `#101010`, `#181c18`, and `#282c28`
  surfaces plus recording red. That removes a four-pixel-wide horizontal
  mismatch across the framebuffer: structural match rises from **80.45% to
  87.37% Windows / 80.42% to 87.30% Android**, while MAE falls from **0.0410 to
  0.0305**.
- Replaced Expression Bypass's close, save, bypass-power, and parameter-link
  font symbols with outlined SVG controls and matched its measured canvas,
  panel, selected-row, and green accent colors. Structural match rises from
  **80.16% to 80.23% Windows / 80.12% to 80.17% Android**, while MAE falls from
  **0.0353 to 0.0341**. Together with the retained prior pass, the complete
  official benchmark reaches **85.19% / 85.13%** structural match and
  **96.74%** color similarity on both hosts after refreshing the shared Amp
  browser, whose MAE falls from **0.0315 to 0.0195**.
- Replaced the official Plugin Folders toolbar's five font-symbol stand-ins
  with shared outlined SVG controls for back, plugin category, arrange, search,
  and done. Structural match rises from **79.58% to 79.93% Windows / 79.40% to
  79.75% Android** with its already improved **0.0103 MAE** preserved.
- Matched the official analog/USB I/O canvases, panels, selector buttons, dial
  tracks, and active Input 1 connector to sampled framebuffer colors. Analog
  MAE falls from **0.0369 to 0.0283** and USB from **0.0490 to 0.0402** while
  structural scores stay within 0.08 points. A more aggressive Global EQ graph
  recoloring was measured and rejected because it suppressed reference edges;
  the retained control-palette correction keeps structure flat and lowers MAE.
  With all retained changes, the complete official corpus reaches **84.99%
  Windows / 84.94% Android** structural match and **96.68%** color similarity.
- Replaced the official Plugin Devices screen's seven placeholder Unicode block
  marks with purpose-built vector gate, amp, capture, cab, modulation, IR, and
  dual-cab glyphs, and matched the dimmed Grid palette sampled from the manual.
  Plugin Devices rises from **79.22% to 80.33% Windows / 79.33% to 80.81%
  Android**, while MAE falls from **0.0410 to 0.0293**. Matching Plugin Folders'
  exact panel palette also lowers its MAE from **0.0127 to 0.0103**. Together
  these changes raise the complete 36-screen official benchmark to **84.99% /
  84.93%** structural match and **96.63%** color similarity on both hosts.
- Corrected the official Directory bank controls so their numeric labels are
  centered instead of inheriting the parent folder-navigation grid, and matched
  the manual's exact shared canvas, panel, and selected-row colors. Presets rises
  from **79.02% to 80.97% Windows / 78.94% to 80.89% Android** and Cloud Upload
  from **88.80% to 91.02% / 88.68% to 90.89%**. Across all eight official
  Directory screens, mean color error falls without changing their geometry;
  the complete 36-screen official benchmark reaches **84.96% / 84.89%**
  structural match and **96.59%** color similarity on both hosts.
- Reconstructed the shared Grid preset title with the embedded device typeface
  and a measured 418-unit SVG length, selected through an in-memory font/weight/
  length sweep rather than visual estimation. Clean Grid rises from **88.26% to
  90.14% Windows / 88.15% to 90.02% Android**; the same correction improves
  scene, routing, browser, and parameter-editor overlays by roughly 0.8–1.9
  points. The independent official Brit 2203 Grid also rises from **83.33% to
  84.35% / 83.26% to 84.28%**. A fresh 40-screen rerun reaches **89.66% Windows /
  89.58% Android**, with **97.16% / 97.15%** mean color similarity and no missing
  renders.
- Replaced filled unavailable-plugin silhouettes with the physical outlined
  padlock treatment and matched the plugin header canvas. The plugin list rises
  from **85.87% to 86.36% Windows / 85.84% to 86.33% Android**, plugin models
  from **90.69% to 91.08% / 90.66% to 91.05%**, and the locked-model screen from
  **90.70% to 91.05% / 90.67% to 91.03%**. The complete benchmark reaches
  **89.21% / 89.13%** structural match; the extra icon contours move aggregate
  MAE by **0.0001** to **0.0296**, reported rather than hidden.
- Reconstructed the physical Preset Directory palette from sampled framebuffer
  colors and corrected the folder icon-to-label and category-header gaps. The
  selected folder/current row retain their measured contrasting surfaces so
  structural boundaries remain intact. Structural match rises from **85.49% to
  87.55% Windows / 85.00% to 87.03% Android**, while MAE falls from **0.0269 to
  0.0215 / 0.0216**. Recomparison of all 40 physical states raises the benchmark
  to **89.18% / 89.10%**, with **97.05%** mean color similarity on both hosts.
- Corrected the bypass compositing model for the physical Digital Flanger
  control surface. Its pre-dim canvas, dial faces, toggle tracks, cell dividers,
  and two-row separator now resolve to the sampled framebuffer colors instead
  of the generic editor's near-black palette. Structural match rises from
  **82.81% to 84.84% Windows / 82.74% to 84.78% Android**, while MAE falls from
  **0.0337 to 0.0267**. Recomparison of all 40 physical states raises the
  benchmark to **89.12% / 89.05%**, with **97.03%** mean color similarity on
  both hosts. A measured preset-title scaling experiment was rejected because
  it reduced structural accuracy despite improving the apparent bounding box.
- Aligned the physical Virtual Device model browser's category rail to the
  framebuffer's vertical cadence and corrected the pinned-device mark without
  affecting the root browser or plugin drawers. The clean model list rises from
  **85.47% to 86.78% Windows / 85.45% to 86.77% Android**, and the onboarding-tip
  state rises from **85.90% to 87.09% / 85.87% to 87.07%**. Recomparison of all
  40 physical states raises the benchmark to **89.07% Windows / 89.00% Android**,
  with mean color similarity of **97.02% / 97.01%**.
- Reconstructed the physical Splitter and Mixer editors around their shared
  full-width `#101010` panel, inset rounded control surface, measured header
  groups, explicit Mixer mark, exact signal-path colors, and the physical
  bypass treatment for Digital Flanger. Splitter rises from **85.42% to 87.61%
  Windows / 85.34% to 87.53% Android**; Mixer rises from **87.46% to 89.84%
  Windows / 87.37% to 89.75% Android**. Their MAE falls to **0.0263 / 0.0249**,
  and a complete 40-screen rerun raises the physical benchmark to **89.01% /
  88.94%**, with **97.01%** mean color similarity on both hosts. The other 38
  physical screen scores remain unchanged.
- Reconstructed the physical input-route selector while preserving the actual
  translucent Grid composite: exact `#101010` panel layers, regular embedded
  typography, measured header/list gaps, 32-pixel USB route marks, correctly
  sized FX/unused marks, a dedicated two-lane stereo-input SVG, and the
  persistent 2-pixel scrollbar that Chromium otherwise hides. Structural match
  rises from **84.88% to 91.15% Windows / 84.87% to 91.14% Android**, while MAE
  falls from **0.0263 to 0.0212 / 0.0213**. The complete corpus confirms the
  other 39 physical scores are unchanged and raises the benchmark to **88.90% /
  88.82%**, with **96.99%** mean color similarity on both hosts.
- Reconstructed the physical 212 UK C30 65 (M) Cab editor with exact
  header/panel/footer colors, embedded device typography, a measured fixed-cell
  scene selector, the physical 24-pixel scene badge, corrected speaker radial
  regions and microphone markers, and one-pixel footer sizing. Structural match
  rises from **84.34% to 86.61% Windows / 84.29% to 86.55% Android**, while MAE
  falls from **0.0302 to 0.0246**. The full dual-host corpus confirms the other
  39 screen scores are unchanged and raises the benchmark to **88.74% / 88.67%**,
  with **96.98% / 96.97%** mean color similarity.
- Reconstructed the physical Edit Details keyboard with the sampled
  `#101010` canvas, `#212421` key field, `#181c18` special keys, `#102818`
  name field, exact header control colors, embedded device typography, and a
  separately scaled/positioned preset-name layer. Structural match rises from
  **84.43% to 92.54% Windows / 84.62% to 92.49% Android**, while MAE falls from
  **0.0345 to 0.0182**. A complete dual-host rerun confirms the other 39
  physical scores are unchanged and raises the benchmark to **88.68% / 88.61%**,
  with **96.96%** mean color similarity on both hosts.
- Reconstructed the bypassed Digital Flanger editor's physical header framing
  and scene control without changing the other parameter editors. The shared
  header now has semantic arrow elements, while Flanger receives its measured
  fixed arrow cells, divider lines, exact 24-pixel yellow scene badge, page
  treatment, and sampled `#101010` framing. Structural match rises from
  **81.61% to 82.81% Windows / 81.55% to 82.74% Android**, while MAE falls from
  **0.0372 to 0.0337**. A complete rerun confirms the other 39 physical screen
  scores are unchanged and raises the benchmark to **88.48% / 88.41%**, with
  **96.92%** mean color similarity on both hosts.
- Reconstructed the shared Copy Scene and Swap Scene destination overlay using
  the physical dimmed-frame composite color, exact modal canvas and action
  button colors, and measured content/button offsets. Copy rises from **82.53%
  to 87.05% Windows / 82.54% to 87.07% Android**; Swap rises from **82.59% to
  87.09% Windows / 82.61% to 87.12% Android**. Their MAE falls from
  **0.0255/0.0252 to 0.0123/0.0119**, and the complete 40-screen benchmark rises
  to **88.45% / 88.38%**, with **96.91%** mean color similarity on both hosts.
  The other 38 physical screen scores remain unchanged.
- Reconstructed the physical Save As destination's exact canvas, folder,
  selected-folder, bank, preset-list, and active-preset colors; corrected the
  bank column width; matched the 51-pixel preset-row cadence; embedded the
  device typography; and aligned the header and folder-label baselines.
  Structural match rises from **84.10% to 89.73% Windows / 84.05% to 89.64%
  Android**, while MAE falls from **0.0286 to 0.0155 / 0.0156**. The fresh
  40-screen rerun raises the physical benchmark to **88.23% / 88.16%**, with
  mean color similarity of **96.85% / 96.84%**; every other physical screen is
  unchanged.
- Reconstructed physical PRESET Gig View with the framebuffer's exact canvas,
  tile, active-state, and header-control colors; embedded device typography;
  measured control widths; lighter and earlier preset numbers; and the smaller
  active-preset label. Structural match rises from **84.08% to 96.84% Windows /
  84.03% to 96.75% Android**, while MAE falls from **0.0555 to 0.0288**. The
  complete 40-screen rerun raises the physical benchmark to **88.08% / 88.02%**
  and mean color similarity to **96.81%** on both hosts; all other physical
  screen scores remain unchanged.
- Reconstructed Modes Configuration from the physical framebuffer: exact
  `#101010` canvas and `#292c29` cards, measured header/control and card
  positions, the missing cycle arrowheads, embedded typography, a real info
  glyph, and the shared canonical PRESET/SCENE/STOMP SVG marks. Structural match
  rises from **82.61% to 96.74% Windows / 82.39% to 96.52% Android**, while MAE
  falls from **0.0312 to 0.0138**. The fresh all-screen rerun raises the complete
  physical benchmark to **87.77% / 87.70%** and mean color similarity to
  **96.75%** on both hosts; the separately reconstructed official-manual Modes
  variant remains scoped and unchanged.
- Reconstructed the Grid contextual menu's visible FILE section with six
  purpose-built SVG action glyphs, embedded device typography, measured icon
  and label spacing, the physical `#101010` panel, and its visible scroll track.
  Structural match rises from **82.79% to 88.61% Windows / 82.91% to 88.65%
  Android**, while MAE falls from **0.0429 to 0.0315**. A fresh 40/40 dual-host
  run raises the complete physical benchmark to **87.41% / 87.35%**, with
  **96.70%** mean color similarity on both clients and no regression in the
  closed Grid or other menu interactions.
- Reconstructed the scrolled output-route selector using the physical panel
  color, capitalization, embedded typography, 32-pixel route symbols, and exact
  left alignment, then corrected the repeated 10-pixel vertical offset after
  the `OTHER` heading. Structural match rises from **82.54% to 89.59% Windows /
  82.46% to 89.59% Android**, while MAE falls from **0.0259 to 0.0211**. The
  combined 40-state rerun, which also includes the scene-selector work below,
  reaches **87.27% / 87.20%** structural match and **96.67%** mean color
  similarity on both hosts with no missing render.
- Rebuilt the Grid scene selector around its physical open state: a dark active
  row, 24-pixel scene badges, exact content padding, embedded device typography,
  an open-state grey header badge, and no browser hover/focus decoration. Its
  structural match rises from **82.58% to 90.63% Windows / 82.50% to 90.53%
  Android**, and MAE falls from **0.0483 to 0.0359** on both. The complete
  physical benchmark now reaches **87.09% / 87.02%**, with **96.66%** mean
  color similarity on both hosts; a fresh 40/40 dual-host rerun verifies that
  the closed Grid and the other 38 states remain unchanged.
- Reconstructed physical SCENE Gig View from sampled framebuffer colors and
  geometry. The shared renderer now exposes the large A-H background letters
  that a later host stylesheet had suppressed, uses exact per-tile background
  and letter colors, replaces Unicode approximations with edit/swap/copy SVG
  controls, embeds the device font, and aligns the title and scene labels.
  Structural match rises from **81.89% to 90.47% on Windows** and from **81.85%
  to 90.18% on Android**, while MAE falls from **0.0416 to 0.0310** on both.
  A fresh all-screen rerun confirms the other 39 physical states are unchanged
  and raises the complete benchmark to **86.89% / 86.82%**, with **96.63%**
  mean color similarity on both hosts.
- Matched the physical Virtual Device browser's inset Guitar/Bass tabs,
  60-pixel model-row cadence, panel colors, text padding, and favorite-pin
  spacing. Its tipped state rises from **82.86% to 85.90% Windows / 82.84% to
  85.87% Android**, and the clean state from **82.12% to 85.47% / 82.10% to
  85.45%**. Copy/Swap Scene now use the embedded device font, omit the false
  desktop shadow, and reproduce the short first-row Grid cell; Copy reaches
  **82.53% / 82.54%** and Swap **82.59% / 82.61%**. The fresh 40-frame
  benchmark is **86.67% Windows / 86.61% Android**, with **96.61% / 96.60%**
  mean color similarity. Physical-corpus capture tools also accept an optional
  `QC_CAPTURE_IDS` filter and report the actual capture count, making focused
  parity work deterministic without weakening full-corpus verification. The
  complete **85-state / 170-frame** dual-host smoke pack was regenerated after
  these changes and completed without a missing or mis-sized framebuffer.
- Embedded the exact Roboto face used by Preset MIDI Out instead of relying on
  the host operating system's font inventory, then matched its header, load-dot,
  footswitch, and expression-pedal geometry. Physical MIDI Out rises from
  **81.63% to 86.75% on Windows** and from **81.53% to 86.65% on Android**;
  the independent official reference reaches **86.88% / 86.78%**. A fresh
  all-screen rerun raises the complete physical benchmark to **86.47% / 86.41%**
  and the 36-frame official benchmark to **84.81% / 84.74%**, while retaining
  **96.57% / 96.52%** mean color similarity respectively. The font is scoped so
  the already-tuned TopBoost and Save As typography remains unchanged, and the
  85-state smoke pack again completes all **170/170** exact dual-host captures.
- Removed renderer-only row separators and matched sampled CorOS surfaces in
  Preset Directory, the plugin list, and Virtual Device preset browsers.
  Preset Directory rises from **79.37% to 85.49% Windows / 79.00% to 85.00%
  Android**; the plugin list reaches **85.87% / 85.84%**; Exotic Z Boost reaches
  **90.42% / 90.49%**; User presets reach **89.82% / 89.91%**; and preset
  actions reach **96.06% / 96.05%**. Reconstructed Ambience's actual two-row
  proportions, stepped Size control, filter angles, and value baselines raise it
  from **78.92% / 78.87%** to **87.31% / 87.26%**. Equivalent measured editor
  corrections raise Digital Flanger to **81.61% / 81.55%** and TopBoost to
  **86.27% / 86.22%**. Canonical Gig View mode glyphs and exact vertical tile
  gaps improve all four measured Gig states, while Scene prompt underlays now
  use the real STOMP mark and header geometry. The complete physical benchmark
  is now **86.35% Windows / 86.28% Android**, with **96.57%** color similarity.
  The independent 36-frame official benchmark also improves to **84.67% /
  84.60%**; its Virtual Device preset screen reaches **88.56% / 88.62%**.
- Fixed the focused capture utility so `preset-directory` opens and captures
  the actual Directory state rather than silently measuring Grid. The full
  dual-host rerun still captures all **40/40** physical states and reports no
  per-screen regressions against the preceding checkpoint.
- Rebuilt the UK C30 cabinet header around the physical control geometry and
  aligned its parameter-value cadence, speaker targets, and title treatment.
  The cabinet editor rises from **77.97% to 84.34% on Windows** and from
  **77.93% to 84.29% on Android**. Save As rises from **77.87% / 77.79%** to
  **84.10% / 84.05%** after reconstructing its folder/list rows and header.
  The Copy and Swap Scene prompts now include their actual Grid underlay state,
  normal dialog typography, preset-letter coloring, and header spacing; Copy is
  **78.99% / 78.87%** and Swap is **79.13% / 79.02%**. Together these changes
  raise the complete 40-frame physical benchmark to **84.78% Windows / 84.72%
  Android**, while retaining **96.46%** mean color similarity on both hosts.
- Reconstructed the Parametric-8 logarithmic graph from measured physical
  coordinates, including its full-width frequency grid, unequal active/inactive
  nodes, axis labels, stacked-EQ mark, and power glyph. Its structural match
  rises from **75.50% to 88.88% on Windows** and from **75.45% to 88.89% on
  Android**. Replacing the false white selected-block rectangle with CorOS's
  category-colored in-place border also improves Simple Gate, Chief DS1,
  TopBoost, and Ambience. Matching the two-row Flanger value cadence and its
  independent lower-row dial offset raises that editor from **75.29% / 75.24%**
  to **79.46% / 79.41%**. The complete 40-frame benchmark is now **84.41% /
  84.35%**, with **96.46%** color similarity on both hosts.
- Strengthened the executable coverage proof: all **103/103** canonical states
  now have a verified exact-size capture path on both Windows and Android. The
  general smoke pack covers 84 states; the remaining 19 are exercised by the
  physical-device or official-manual dual-host regression packs. This corrects
  the prior report's undercount without inflating authoritative evidence, which
  is now correctly counted as **58** states.
- Expanded the authoritative physical corpus from **39 to 40** frames with the
  Mixer editor and corrected the routing-state taxonomy against the official
  manual and a guarded physical probe. CorOS opens the temporary S/M placement
  handles inside the routing editor; it does not show the previously mocked
  instructional choice page. Replacing that mock and the generic Mixer renderer
  raises Mixer from **14.22% to 87.46% Windows / 87.37% Android**, while shared
  Grid and header corrections raise Splitter from **83.74% / 83.67%** to
  **85.42% / 85.34%**. The evidence ledger has **58** authoritative
  canonical states. Across the expanded 40-frame denominator, the physical
  benchmark is **83.95% / 83.89%** with **96.44%** color similarity on both
  hosts. The preset was recalled after the probe and its clean Grid framebuffer
  matched the pre-probe SHA-256 exactly.
- Aligned model-specific dial centers with the physical parameter editors and
  removed the false selection ring from the bypassed Flanger. TopBoost rises
  from **76.90% to 81.75%**, Ambience from **76.02% to 78.75%**, Chief DS1
  from **83.19% to 85.87%**, Simple Gate from **84.91% to 85.88%**, and
  Digital Flanger from **74.76% to 75.29%** on Windows, with equivalent
  Android gains. At that intermediate checkpoint, the physical benchmark was
  **83.82% Windows / 83.76% Android**.
- Removed frames that the physical ModelMenu does not draw around unselected
  category glyphs, raising its tipped/clean states from **76.05% / 75.00%** to
  **82.81% / 82.06%** on Windows (82.79% / 82.04% on Android). Matching the
  measured STOMP tile colors and icon/text geometry raises physical Gig View
  from **77.07% to 87.00%** and Live Tuner Gig View from **78.32% to 87.38%**.
  The complete physical benchmark is now **83.51% Windows / 83.45% Android**;
  the refreshed official benchmark is **84.51% / 84.44%**. A new focused
  capture utility makes individual 800x480 screen iterations reproducible on
  both hosts without regenerating the entire corpus.
- Matched the physical Virtual Device preset-browser header cadence and row
  controls, lifting Exotic Z Boost from **74.75% to 80.30%**, preset actions
  from **80.91% to 85.83%**, and User presets from **80.85% to 84.60%** on
  Windows, with equivalent Android gains. Rebuilding the Parametric-8 axis,
  mode offsets, completion control, and EQ dial arc raises it to **75.50%**;
  correcting the bypassed-editor hierarchy raises Digital Flanger to
  **74.76%**. That pass brought the physical benchmark to **82.65% Windows /
  82.59% Android**, with **96.25%** mean color similarity on both hosts.
- Separated the physical plugin-model browser from the unrelated Directory
  Plugin Folders renderer, closing a route alias that the freshly regenerated
  physical corpus exposed. The licensed and missing-license model screens now
  score **90.56%** and **90.58%** on Windows (90.53% / 90.56% on Android), and
  the then-current physical benchmark rose to **82.16% / 82.10%**. The shared smoke
  corpus now contains **85 states / 170 exact host captures**.
- Added an executable evidence ledger for all **103/103** canonical device
  states. It verifies exact inventory membership, shared renderer routing,
  reference IDs, and dual-host capture routes; **58** states currently have
  authoritative physical/manual image evidence and all **103** have verified
  Windows plus Android capture paths (84 through the general smoke pack and 19
  through the physical or official regression packs). Correcting full-width action columns raises Directory
  IRs from **78.25% to 88.68%** and removing false row separators raises Cloud
  Upload from **75.47% to 88.80%** on Windows. Adding USB channel selectors and
  combo-output geometry lifts USB I/O to **79.50%** and Analog I/O to
  **80.13%**. Together these changes move the complete official benchmark to
  **84.33% Windows / 84.26% Android**.
- Raised the complete official-reference benchmark from **82.40% to 83.60% on
  Windows** and from **82.33% to 83.54% on Android**. Favorites now reproduces
  its heart/recents toolbar, full-size row actions, and alphabet index and rises
  to **88.38%**; Nested Captures gains its true folder-tree view and reaches
  **87.22%**. Correcting the accumulating one-pixel Presets cadence raises it to
  **79.02%**, Cloud Upload's repeated action-column offset to **75.47%**, Capture
  Settings to **81.76%**, and Empty Slot to **82.99%**.
- Advanced the complete official-reference benchmark from **81.90% to 82.40%
  on Windows** and from **81.84% to 82.33% on Android**. Reconstructing the
  missing Latch Emulation column raises Expression Bypass to **80.16%**;
  rebuilding the Plugin Devices underlay header raises it to **79.28%**; and
  independently aligning the two Global Bypass device rows raises Device
  Settings to **82.59%**. Directory Search Results also improves from 83.43%
  to **85.21%** through shared row alignment.
- Raised the freshly rendered official-reference benchmark again, from
  **80.02% to 81.90% on Windows** and from **79.94% to 81.84% on Android**.
  Measured geometry corrections bring System Settings to **90.03%**, SCENE to
  **86.90%**, HYBRID to **86.62%**, STOMP to **84.79%**, the Amp browser to
  **80.85%**, Looper to **80.45%**, Global EQ to **80.04%**, Analog I/O to
  **79.01%**, and USB I/O to **78.11%** on Windows. Matching scene colors also
  raises the corpus-wide color similarity from 96.11% to **96.40%**.
- Raised the full official-reference benchmark from **77.77% to 80.02% on
  Windows** and from **77.70% to 79.94% on Android**, with every one of the 36
  mapped full-size frames freshly rendered at 800x480. Account Settings now
  reaches **93.09%**, Virtual Device presets **79.23%**, STOMP Gig View
  **78.53%**, Plugin folders **78.33%**, and Device Settings **75.48%** on
  Windows. The retained changes were selected by measured regression runs;
  geometry experiments that reduced the score were reverted.
- Raised the official 36-screen benchmark from **66.56% to 77.77% on
  Windows** and from **66.50% to 77.70% on Android**. MIDI Settings now reaches
  **96.08%**, PRESET Gig View **95.61%**, Capture Metadata **81.01%**, Plugin
  Presets **80.78%**, and Capture Settings **76.99%** on Windows.
- Added content-specific official variants where the manual intentionally shows
  a different preset or interaction state from the physical scratch corpus.
  Brit 2203 Grid reaches **83.33%**, Modes Configuration **82.58%**, and Virtual
  Device preset actions **86.45%**, while the physical fixtures remain separate.
- Corrected Directory bank sizing, upload-toolbar placement, Plugin Preset
  chrome, I/O port artwork, USB metering, and MIDI row geometry. Presets now
  measures **68.26%**, Cloud Upload **63.51%**, Plugin Presets **80.78%**,
  Analog/USB I/O **72.65% / 73.88%**, and MIDI Settings **96.08%** on Windows.

- Rebuilt seven Directory references with their actual two- and three-pane
  content instead of generic placeholder folders. Search reaches **83.43%**,
  Captures **82.68%**, IRs **77.70%**, Nested folders **77.31%**, Favorites
  **76.56%**, Plugin Presets **68.57%**, and Presets **49.80%**.
- Split official manual examples from physical scratch-preset fixtures where
  their content genuinely differs. Amp Browser rises from 27.65% to **72.93%**
  and Plugin Devices from 30.16% to **60.04%**, without changing the existing
  physical plugin regression states.
- Added content-accurate official Gig View variants while retaining the live
  physical PRESET/SCENE/STOMP renderers. The official modes now measure
  **66.62% PRESET, 79.13% SCENE, 70.36% STOMP, and 62.17% HYBRID**.
- Corrected the I/O port topology from ten flattened controls to twelve
  physical columns with paired jacks. Analog I/O rises to **55.06%** and USB
  I/O to **51.50%**. Further EQ and Looper tuning raises those screens to
  **44.60%** and **56.82%**, and Capture Calibration reaches **68.95%**.
- Across these changes, the official-manual benchmark advances from **37.78%**
  at import to **66.56% Windows / 66.50% Android**, with **95.24%** mean color
  similarity on both hosts.
- Reconstructed the four official Neural Capture V1 frames as their actual
  device layouts rather than a generic wizard. Calibration/Settings rises from
  20.24% to **40.22%**, Training from 16.79% to **82.97%**, A/B from 16.41% to
  **50.35%**, and Metadata from 13.33% to **56.82%** structural match.
- Rebuilt four additional low-scoring official states with screen-specific
  shared layouts: Expression Bypass rises from 11.12% to **76.72%**, Empty Slot
  from 11.89% to **51.47%**, MIDI Settings from 18.33% to **49.31%**, and Plugin
  Folders from 19.03% to **72.56%**. Together with the Settings and I/O work,
  the 36-screen official benchmark rises from 37.78% at import to **52.63%** on
  Windows and **52.59%** on Android.
- Imported every native 800x480 UI frame exposed by the official CorOS 4.1
  manual into a reproducible, checksummed corpus: 37 source frames, 36 mapped
  full-size Quad Cortex comparisons, and one explicitly separated Quad Cortex
  mini frame. Both applications render all 36 mapped screens at exact native
  size. This converts broad manual-only coverage into measurable visual debt.
- Rebuilt the Account, System/Brightness, and Device/Global Bypass Settings
  screens around their official geometry and content. Their Windows structural
  matches rose from 13.01%, 16.47%, and 19.60% to **60.51%, 76.50%, and
  71.40%** respectively (Android is effectively identical), lifting the whole
  36-screen official corpus from 38.39% to **42.81%** on Windows.
- Corrected I/O editor and Global EQ vertical geometry against native official
  frames. Analog I/O rose from 37.65% to **45.53%**, USB I/O from 37.44% to
  **43.43%**, and Global EQ from 28.71% to **36.59%** on Windows.
- Captured the Live Tuner preference enabled on the physical Tuner and the
  resulting Gig View state, then restored Live Tuner to No and verified the
  scratch preset remained clean. The shared renderer now switches the correct
  radio state and reproduces the otherwise easy-to-miss 16-pixel dormant live
  tuner band. The new states measure 90.92% / 90.67% and 78.32% / 78.27%
  structural match on Windows / Android. This expands the canonical inventory
  to 103 states, the physical corpus to 38, and the manual host corpus to 83
  states / 166 exact captures.
- Captured the physical Tempo & Metronome screen through the documented double
  Tap Tempo MIDI gesture, including its scene selector, beat indicators, two-row
  control panel, dial geometry, and exact transient BPM. Replacing the compact
  manual approximation raises structural match from 32.94% to 90.43% on Windows
  and from 32.90% to 90.33% on Android. The capture tool now supports immediate
  framebuffer draining and guards both preset identity and dirty state during
  touchscreen probes. The physical corpus expands from 35 to 36 states.
- Added the physical Virtual Device preset row-action menu and the empty User
  preset tab as ED-16 and ED-17. Their shared reconstructions measure 80.91% /
  80.93% and 80.85% / 80.94% structural match on Windows / Android. Matching
  the modal dim layer cut the action-menu mean pixel error from 7.00% to 3.20%.
  This expands the canonical inventory to 102 states, the physical corpus to 35,
  and the manual host corpus to 82 states / 164 exact 800x480 captures.
- Discovered and added DB-09 rather than freezing the inventory at 99 rows: the
  physical locked-plugin branch includes the license-not-found header, selected
  locked suite, Cory Wong model list, and per-model lock overlays. It measures
  71.78% on Windows and 71.76% on Android, expands the canonical inventory to
  100 states, and expands physical regression coverage from 32 to 33 states.
- Captured the physical Exotic Z Boost Virtual Device Preset browser without
  selecting a preset or adding a block. Replacing the generic manual fixture
  with its exact category, device, tab, and factory-preset data raises this
  screen from 45.08% to 74.75% on Windows and from 45.17% to 74.81% on Android,
  while physical regression coverage expands from 31 to 32 states.
- Opened the licensed Archetype: Plini X device folder without selecting or
  adding a model, captured its physical three-column browser, and reconstructed
  the exact plugin/model rows on both hosts. Reusing the verified CorOS block
  sprite raises the reconstruction to 72.23% Windows / 72.20% Android and
  expands physical coverage to 31 states.
- Captured the physical Neural DSP plugin-list drawer, including its dimmed Grid
  underlay, two-column navigation, exact licensed-device names, lock states, and
  row geometry. Replacing the prior manual-only approximation raises this screen
  from 17.84% to 79.89% on Windows and 79.87% on Android, and expands physical
  regression coverage from 29 to 30 states.
- Captured the physical Preset MIDI Out editor through a verified, reversible
  Grid-menu path and restored Grid afterward. The capture exposed a 40.62%
  manual-only reconstruction; measured panel, switch, message-target, and pedal
  geometry raise it to 81.63% on Windows and 81.53% on Android. Physical
  coverage expands from 28 to 29 states without modifying the preset.
- Corrected the physical 60-pixel folder-row cadence in Directory and Save As,
  replaced the remaining font-folder approximations with shared numbered SVGs,
  and aligned their overflow columns. Directory rises from 73.41% to 79.37%
  on Windows, while Save As rises from 70.63% to 77.87%.
- Rebuilt the dimmed Grid geometry behind Copy/Swap Scene: its four route rows
  now use the physical 94-pixel cadence and its preset heading has the measured
  size. Copy Scene rises from 72.46% to 77.93% and Swap Scene from 72.63% to
  78.09%, bringing the complete corpus to 81.55% Windows / 81.48% Android.
- Rebuilt the shared Grid header against the physical framebuffer, removed
  nonexistent cables from empty rows, restored empty-row plus controls, matched
  the active-slot target, corrected Simple Gate and overdrive colors, and
  removed Android's decorative bezel from the measured framebuffer. Grid rises
  from 71.82% to 88.26% on Windows and from 71.72% to 88.15% on Android; the
  complete 28-state corpus rises to 80.34% and 80.28% respectively.
- Matched STOMP Gig View's fixed eight-pixel tile grid, bypassed-device panel,
  device-specific colors, edit affordances, adaptive labels, and empty tile.
  Its structural score rises from 73.37% to 77.07% on Windows and from 73.31%
  to 77.02% on Android, lifting the complete corpus to 80.47% and 80.41%.
- Added a repeatable font-family sweep and used measured, screen-local choices
  for Save As and the editor families. Replaced Directory's approximate cloud
  and folder symbols with numbered vector icons and corrected its toolbar
  proportions. Directory rises to 73.41% on Windows and 73.08% on Android; the
  complete corpus reaches 80.63% and 80.58%.
- Aligned Digital Flanger's physical knob centers and header control groups,
  raising it from 71.75% to 72.70% on Windows. Tightened the Copy/Swap Scene
  prompt and button geometry as well; the complete corpus reaches 80.70% on
  Windows and 80.64% on Android.
- Reactivated dormant CorOS framebuffer sessions through a tested, reversible
  Gig View wake/restore handshake. This enabled real Copy Scene and Swap Scene
  destination captures, expanding physical coverage from 26 to 28 states. The
  inferred tile chooser was replaced with the physical footswitch-prompt modal;
  its new Windows matches are 72.04% and 72.21% respectively.
- Corrected three measured cross-screen geometry issues: Digital Flanger's
  two-page header, mono/stereo input-route grouping and scroll position, and
  right-aligned standard-editor dials. Directory tool spacing and typography
  now match the physical layout as well. Input routing rises from 66.98% to
  76.52%, Directory from 67.92% to 71.80%, and the original 26-state Windows
  subset from 74.63% to 75.82% (Android: 74.49% to 75.68%).
- Closed the remaining twelve canonical gaps with dedicated shared states for
  boot and shutdown, Copy/Swap Scene destinations, delete confirmation, global
  input gate/bypass, multi-page/Cab/Parametric EQ/Neural Capture editors, and
  clipping/DSP warnings. This brought renderer coverage to 99 of the now 100
  hosts; physical-reference coverage is separately reported above.
- Added both Recovery Mode states and four reusable system overlays: the
  on-screen keyboard, confirmation, error, and busy/progress states. All six
  have exact-size Windows and Android captures, bringing shared Built coverage
  to 87 of the now 100 states.
- Completed the seven-state Neural Capture V1 workflow on both hosts, including
  introduction, capture type, connection routing, calibration, capture progress,
  A/B comparison, and metadata/save. The state-driven shared renderer adds 14
  exact-size host captures and raised complete canonical coverage to 81 of 100.
- Completed the ten-state Settings family on both hosts. The shared reconstruction
  now covers Account, System, Device, Support, Wi-Fi, update progress, storage and
  factory reset, MIDI, device information, and diagnostics. These add 20 exact-size
  host captures and raised complete canonical coverage to 74 of 100 states without
  changing the separately measured physical-corpus similarity score.
- Completed the 16-row Directory family on both hosts. A single shared
  three-pane renderer now covers category selection, Presets, Neural Captures,
  IRs, Plugin Presets, Favorites/Recent, search entry/results, sort and filter,
  arrange/multiselect, copy destination, nested folders, folder/setlist naming,
  item actions, and Cortex Cloud upload. Fifteen new variants add 30 exact-size
  host captures and raised complete canonical coverage to 64 of 100 states.
- Added the official full-screen Looper X layout, two-column Virtual Device
  Preset browser, save editor, STOMP and Scene assignment views, both Expression
  assignment variants, and block contextual actions. The shared layouts retain
  every control inside the 800x480 framebuffer on both hosts and raise complete
  canonical coverage to 49 of 100 states per host.
- Reconstructed the five previously absent Device Browser states for search,
  Favorites/Recent, plugin folders, licensed/locked plugin devices, and license
  refresh. The plugin layouts are grounded in the official 800x480 CorOS
  screenshots; the refresh and lock behavior follows the 4.1.0 manual. All five
  now have exact-size Windows and Android smoke captures, raising complete
  canonical coverage to 41 of 100 states per host.
- Added four exact-size shared routing fixtures: empty-slot selection, documented
  long-press Splitter/Mixer placement, Splitter parameters, and Mixer parameters.
  They reproduce the official blue `S` and pink `M` tokens, parallel-path
  geometry, conditional Balance splitter controls, and the complete Mixer
  control set. All four are captured on Windows and Android, bringing complete
  canonical coverage to 36 of 100 states on each host at that stage.
- Added the Power & Locking Functions overlay and the Gig View Live Tuner strip
  from their manual references. The lock overlay and Live Tuner are complete;
  shutdown is conservatively Partial until its post-tap state is captured.
- Reconstructed the shared I/O Settings family from the official Analog, USB,
  and Global EQ screen references. The fixed port map is interactive and drives
  dedicated input, output, Send/Return, USB, and headphones editors; Global EQ
  opens from the same header. Seven inventory rows moved to Built on both hosts,
  while global input-gate/bypass behavior moved to Partial because the CPU
  screen exposes its status but not yet its complete editor.
- Added shared, dedicated Tempo & Metronome, Preset MIDI Out, and CPU Monitor
  reconstructions from the official CorOS 4.1.0 manual. All three are routed
  and rendered by both Windows and Android, increasing complete canonical
  coverage from 20 to 23 of 100 states on each host. These manual-reference
  screens are smoke-captured separately and do not inflate the 36-state
  physical-corpus score.
- Replaced the unrelated generic demo data in visual tests with a shared,
  versioned fixture matching `32H pyquadcortex scratch`, its seven blocks,
  STOMP assignments, active scene, routes, and bank 32 directory contents.
- Expanded Android automation from five hand-picked views to all 36 captured
  states, including selectors, menus, browsers, seven block editors, and all
  captured Gig View modes.
- Expanded Windows automation to the same 36 states and added an isolated
  native-size capture layout, eliminating chassis scaling from CorOS metrics.
- Added a whole-corpus comparator that emits per-screen overlays, differences,
  edge visualizations, JSON, Markdown, missing-render detection, and aggregate
  metrics.
- Corrected modal dimming and route-picker dimensions. This reduced whole-corpus
  Android MAE from 0.1084 to 0.0597 in one pass.
- Rebuilt the Parametric-8 graph geometry and control row, raising its Android
  edge score from 40.55% to 51.62%.
- Corrected Tuner scale and footer geometry, raising its Android edge score from
  46.48% to 90.52%.
- Corrected Directory bank/folder data and typography, raising its Android edge
  score from 50.64% to 67.65%.
- Corrected PRESET and SCENE Gig View content and placement. PRESET rose from
  56.52% to 81.99%; SCENE now measures 80.71%.
- Captured the physical Edit Details flow, identified its actual state as a
  preset-name keyboard editor, implemented it once in the shared renderer, and
  added it to both complete-host capture runs. Keyboard and header alignment now
  measure 84.4% on both hosts.
- Replaced generic parameter fixtures with the physical model-specific control
  sets, values, units, toggles, bypass state, and one/two-row layouts. Simple
  Gate now measures 80.3%, Chief DS1 76.7%, and Ambience 70.5% on Windows.
- Replaced browser text glyphs with shared vector category/preset icons and
  corrected its two physical surface colors. Browser root rose to 81.1%.
- Rebuilt the EQ frequency grid with its physical logarithmic line positions;
  Parametric-8 rose from 51.7% to 72.6%.
- Added the Cab parameter bars, mirrored microphone placement, phase and enable
  controls; Cab rose from 64.8% to 78.0%.
- Matched the contextual-menu row rhythm and the captured route-list scroll
  states. Grid menu rose from 64.0% to 74.7%, and output routing to 73.4%.

## Device synchronization

Tuner, Modes Configuration, and Save As have reversible physical commands with
graphics-tree readback. Tuner uses MIDI CC #45. Modes Configuration uses a
verified long press on the mode indicator. Save As opens through the physical
Grid menu and closes through its close control. The Windows reconstruction only
changes to those screens after the gateway confirms the corresponding graphics
tree marker.

The latest confirmed device tree is the Grid. A fresh connection can leave the
framebuffer broadcast dormant even while graphics-tree reads remain available;
the gateway now wakes that stream by briefly opening Gig View, captures a frame,
then restores Grid. This reversible handshake was verified on the device and is
covered by a gateway test. No preset content was changed.

## Remaining priorities

1. Expand physical references from 52 toward all 103 cataloged CorOS states,
   starting with the seven remaining safe-navigation acquisitions.
2. Rebuild the remaining lowest-scoring authoritative states, beginning with
   physical Support and Device Information and the lowest official frames.
3. Replace placeholder glyphs with traced or source-equivalent CorOS icons.
4. Deepen specialized EQ, Cab, splitter, mixer, Looper X, assignment, Directory,
   Settings, Neural Capture, lifecycle, and recovery interactions beyond their
   complete static screen compositions.
5. Add visual thresholds once deliberately variable content and font rendering
   have per-family tolerances.

The 13 states with smoke-only evidence have a checked physical-acquisition
ledger at
`references/qc-ui-coverage/coros-4.1.0/physical-capture-plan.json`. It separates
7 safe navigation captures from 4 controlled transient captures, 1 scheduled
disruptive Recovery capture, and 1 update-progress state that must be collected
only during a user-initiated supported update or from an official full-frame
source. Every entry defines its semantic route, exact capture checkpoint, and
restoration proof; exact tap coordinates remain intentionally dependent on a
fresh framebuffer.

## Reproduce

Run either host, capture its corpus, then compare:

```powershell
$env:CODEX_WORKSPACE_NODE_MODULES = '<bundled-or-installed-node-modules>'
$env:QC_BROWSER_EXECUTABLE = '<chromium-or-edge-executable>'
node tools/capture_android_ui.mjs http://127.0.0.1:5173/ .artifacts/ui-android-corpus
node tools/capture_windows_ui.mjs http://127.0.0.1:1420/ .artifacts/ui-windows-corpus
python tools/compare_qc_ui_corpus.py --coros 4.1.0 --renderer .artifacts/ui-android-corpus --output .artifacts/ui-diff/android-corpus --require-all
python tools/compare_qc_ui_corpus.py --coros 4.1.0 --renderer .artifacts/ui-windows-corpus --output .artifacts/ui-diff/windows-corpus --require-all
```

## Focused port onto the native shared architecture

The corpus renderer is now an optional, query-selected layer in the current
shared `@ndsp-qc/ui` surface. Normal Windows and Android launches retain the
Rust/native live-state and workflow ownership from `codex/parity-hardening`;
`?fixture=coros410&screen=<renderer>` selects deterministic reconstruction data
for capture and comparison only. Legacy layout rules and measured color
literals are isolated under `.qc-screen-fixture-root`, so they cannot override
the live Grid.

Fresh 800×480 captures verify all 36 mapped official-manual frames and all 52
physical-corpus frames on both hosts. The current shared renderer measures
92.74% structural / 97.27% color against the official full-frame corpus and
92.16% structural / 97.55% color against the physical corpus on both Windows
and Android. The remaining visual debt is concentrated in a few detailed icon
and typography treatments rather than host-specific composition.
