# Physical-device MCP conformance

`tools/hardware-conformance.mjs` is the release gate for the complete public MCP
device-action surface. It reads `contracts/qc-actions.v1.json`; adding or removing
an action without updating the physical case registry fails the ordinary test
suite.

Run it twice before distributing an MCP release: once while the Windows app is
the paired device owner and once while the Android app is the paired device
owner. The `mcp-http` transport exercises OAuth, the public MCP server, relay,
platform adapter, shared Rust planner/protocol, USB device, and authoritative
readback. `gateway-stdio` is available to isolate the Windows broker locally.

## Safety model

The command is a dry run by default. It cannot mutate hardware unless both a
mutation flag and the exact environment acknowledgement are supplied. Persistent
tests additionally require two explicitly disposable preset slots distinct from
the source scratch preset. They overwrite those two slots and record them in the
evidence report; the suite cannot restore their previous contents because the
public contract intentionally has no arbitrary preset-import operation.

Create a dedicated stored preset whose name begins with `QC MCP TEST`. Give it:

- a writable parameter with a reversible normalized test value;
- two empty Grid cells for add/move/remove testing;
- a signal row whose alternate input, output, split, and mixer routes are safe;
- no valuable unsaved edits.

Choose a harmless touchscreen coordinate and its explicit recovery coordinate.
Disconnect Cortex Control before either app claims the QC USB interfaces.

`load_ir` needs one disposable IR already present in the QC library; the public
MCP intentionally does not implement host-to-device IR import. Generate a small
test-only WAV locally, import it once with Cortex Control, then rerun discovery
and copy its suggested `library.ir` fixture into the private hardware config:

```powershell
node tools/generate-hardware-test-ir.mjs
node tools/hardware-conformance.mjs --config C:\secure\qc-hardware-windows.json --execute --discover
```

The generated `QC-MCP-TEST-IR.wav` is mono 24-bit PCM at 48 kHz with 1,024
samples, contains no third-party audio, and is deliberately low-level.

Copy `tools/hardware-conformance.example.json` outside source control, fill in
the serial suffix and fixtures, and keep OAuth tokens only in the named
environment variable.

Keep `transport.timeoutMs` at 240000 or higher for a release run. The shared
native backup collector can legitimately use its 180-second total window;
the conformance transport must leave additional time for relay and response
serialization instead of aborting a healthy backup at the former 60-second
default.

## Commands

Validate coverage and print the plan without connecting:

```powershell
node tools/hardware-conformance.mjs --config C:\secure\qc-hardware-windows.json
```

Discover the attached QC and fixture candidates without writes:

```powershell
node tools/hardware-conformance.mjs --config C:\secure\qc-hardware-windows.json --execute --discover
```

Clone a named source preset into a verified empty scratch slot and print
suggested reversible fixtures. This is a persistent write and refuses to
overwrite an occupied destination:

```powershell
$env:QC_HARDWARE_TEST_ACK = "I_ACCEPT_QC_HARDWARE_MUTATIONS"
node tools/hardware-conformance.mjs --config C:\secure\qc-hardware-windows.json --execute --prepare
```

Execute reads only:

```powershell
node tools/hardware-conformance.mjs --config C:\secure\qc-hardware-windows.json --execute
```

Execute every action after reviewing the configured scratch resources:

```powershell
$env:QC_HARDWARE_TEST_ACK = "I_ACCEPT_QC_HARDWARE_MUTATIONS"
$env:QC_MCP_BEARER_TOKEN = "<short-lived test token>"
node tools/hardware-conformance.mjs --config C:\secure\qc-hardware-windows.json --execute --all --require-all
```

For release evidence, identify the exact staged artifact under test. The full
suite refuses to run without this argument and verifies the adjacent immutable
source/SHA-256 metadata before touching the device:

CI publishes one `qc-remote-release-bundle-<commit>` artifact only after that
commit passes software parity and responsive/accessibility conformance and both
native packages finish. Extract the bundle into the repository's `artifacts`
directory; it contains exactly one Windows installer, one Android APK, their
adjacent source metadata, and a combined manifest/SBOM. Running
`node tools/release-candidates.mjs verify` must list both files before starting
either physical run. The bundle is
a hardware-test candidate, not a distributable release, until the two canonical
reports below pass the final gate.

```powershell
npm run test:hardware:windows -- --config C:\secure\qc-hardware-windows.json --execute
```

Omit `--execute` first to validate the complete 102-action plan and exact
candidate metadata without connecting to or mutating the QC.

Repeat with the Android device paired. Use a copied configuration whose
`target` is `android`, identify the Android candidate explicitly, and write the
canonical report consumed by the release gate:

```powershell
npm run test:hardware:android -- --config C:\secure\qc-hardware-android.json --execute
```

Both platform runners are safe dry runs when `--execute` is omitted. They first
verify that the bundle contains exactly one same-commit Windows candidate and
one same-commit Android candidate, select the requested platform artifact, force
the complete action plan, and write only its canonical evidence report.

Evidence is written under `artifacts/hardware-conformance/`; explicit output
paths keep the final gate deterministic. Serials, tokens, credentials, and
binary payloads are redacted or hashed.

`--persistent`, `--system`, and `--screen-tap` require `--live`, because the
suite uses live preset recall for safe scratch entry and failure restoration.
`--tuner` enables the guarded tuner-setting group. These writes invisibly engage
the tuner. When `--live` is also enabled, the harness immediately opens and
closes the tuner remotely after restoring its preferences; a tuner-only run
still reports the required manual open/close action. Backup is never implied by
`--persistent`; it additionally requires `--backup`. `--all` enables all five
mutation groups and backup together. Add `--stress` to collect the repeated
performance evidence used by the release gate. Use `--stress-only --live` while
iterating on the performance layer without rerunning unrelated one-pass cases.

To verify that the real Windows UI, Tauri host, selected broker artifact, and QC
all converge on the same live value, launch a development app with WebView2
inspection and an explicit broker path, then run the reversible UI smoke test:

```powershell
$env:QC_GATEWAY_EXECUTABLE = (Resolve-Path services/device-broker/target/release/qc-device-broker.exe)
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9223"
npm run tauri:dev --workspace @qc-remote/windows -- --no-watch
```

In a second terminal:

```powershell
$env:QC_HARDWARE_TEST_ACK = "I_ACCEPT_QC_HARDWARE_MUTATIONS"
node tools/windows-live-ui-smoke.mjs --output artifacts/hardware-conformance/windows-ui-smoke.json
```

The smoke test changes Master Volume by one step, requires the visible slider
and the native gateway readback to agree, and restores the exact starting value.
It never performs persistent, system, screen, or backup operations.

Finally, gate the release against both immutable reports:

```powershell
npm run test:hardware:release
```

The gate rejects missing platforms, stale action-contract digests, skipped or
failed actions, failed restoration checks, and evidence that does not identify
the exact Windows and Android artifacts in the clean-commit release manifest.

A distributable release requires both reports to show every contract action as
`passed`, no `failed`, `skipped`, or `not-run` action, and `complete: true`.

## Physical-device incident log

Open physical-device failures are release blockers even when the action that
immediately preceded them returned a successful readback. Keep the operator's
observation distinct from transport evidence and from any suspected trigger;
only a controlled reproduction may establish causality.

- `QC-WIN-2026-09-07-YSOD-01` — During a Windows full-control physical run, the
  operator observed a yellow screen of death on the Quad Cortex. The last
  completed public action was `duplicate_setlist`; the following harness-owned
  scratch-preset restoration recall lost synchronization and reset handshakes
  received no reply. A later native probe found the QC non-enumerable. That run
  remains invalid evidence. After reboot and guarded state recovery, catalog
  request amplification was reduced and catalog retries were paced from the
  completion of a stale listing. Subsequent duplicate-setlist runs caused no
  crash; the current-runtime Windows r24 run passed all 105 non-backup actions
  with zero failures plus 280 stress operations, restored its starting preset,
  and ended connected and synchronized after both hosts were moved to the same
  shared Rust catalog verification runtime. The
  incident is mitigated and retained for monitoring because firmware causality
  remains unproven. See
  [`incidents/QC-WIN-2026-09-07-YSOD-01.json`](incidents/QC-WIN-2026-09-07-YSOD-01.json).

- `QC-ANDROID-2026-09-07-YSOD-01` — The operator observed a yellow screen of
  death shortly after the current-source Android 0.3.23 APK started with the QC
  directly attached. No conformance harness, backup, phone relay service, or
  remote MCP command path was active. Android still enumerated the QC after the
  report, and the app itself had not crashed. Startup code can automatically
  open and handshake an attached QC, making that lifecycle the nearest plausible
  software interaction, but the available log has no command-level proof that
  the handshake completed or caused the failure. The PC relay and Android app
  were stopped. This incident is open and release-blocking pending controlled
  investigation. Source now requires an explicit user Connect after attachment
  and includes a bounded payload-free USB flight recorder; both compile and pass
  source tests, but neither mitigation has been validated in a post-incident
  physical run and the incident therefore remains open. See
  [`incidents/QC-ANDROID-2026-09-07-YSOD-01.json`](incidents/QC-ANDROID-2026-09-07-YSOD-01.json).

### Post-incident Android recovery sequence

An open release-blocking device incident also blocks `--execute` before the
transport starts. After reviewing the incident and physically recovering the
QC, an investigation run must name every open incident exactly in
`QC_HARDWARE_INCIDENT_ACK`; the ordinary mutation acknowledgement remains a
separate requirement. This prevents a second task or stale terminal from
silently resuming a full run.

Use the staged Android probe before restoring the relay. Starting the mitigated
app is traffic-free: it scans and shows the attached QC as available but does
not open it. The default probe is read-only with respect to QC USB:

```powershell
node tools/probe-android-usb-adb.mjs 192.168.100.15:5555 --output tmp/android-usb-status.json
```

Only after the operator confirms that the QC has recovered, run one explicit
open/handshake/initialization cycle. The probe always disconnects in `finally`
and cannot invoke a gateway action, relay, or backup:

```powershell
$env:QC_ANDROID_USB_HANDSHAKE_ACK = "I_ACCEPT_QC_USB_HANDSHAKE"
node tools/probe-android-usb-adb.mjs 192.168.100.15:5555 --connect --output tmp/android-usb-handshake.json
```

Review the embedded flight record and confirm `handshake-reply`,
`initialization-sent`, `transport-ready`, and `transport-closed`, with no reader
failure or repeated handshake storm. Proceed in increasing risk order: read-only
surface, performance controls, reversible Grid modifications, persistent/system
operations, stress, then the separately authorized backup case.

### Firebase App Distribution and App Check

The Android Firebase app has the stable distribution signing SHA-256 from the
shared branding contract registered in project `qc-control-xmelon`. App Check
is currently not activated; the App Check console still presents **Get
started**. Treat activation or enforcement as a separate security change, not
as an implicit part of uploading an APK.

Before enforcing Play Integrity for Firebase AI Logic, verify the Android app's
advanced App Check policy supports Firebase App Distribution installs:

- `PLAY_RECOGNIZED` is not required.
- `LICENSED` is not required.
- the minimum device-recognition level is **Device integrity**.

Record the reviewed policy with the release evidence. A Play-only policy can
reject the correctly signed sideloaded tester APK even though its certificate
is registered. Changing or enforcing the policy requires an explicit security
review; `scripts/publish-android-firebase.ps1` intentionally does not mutate
Firebase App Check settings.

## Windows backup transport

The Windows broker owns all normal QC traffic through the shared Rust protocol
and runtime, including firmware backup. The native Windows transport keeps one
exclusive HID handle with a permanent read lane and an independent serialized
write lane. Keepalives continue while the QC emits the roughly 1.8 MB
`LocalBackup` response, so the same session remains ready after the transfer.

Current firmware does not echo `request_id` on backup chunks. The collector
therefore synchronizes at the JSON-object boundary, ignores stale leading
fragments and terminators from an earlier client, and validates `type: backup`
and `creator: quad` before accepting the result. A request may be retried only
before the first document chunk arrives. Once collection starts, a stall fails
the transfer and discards it in full; chunks from separate attempts are never
combined.

Run repeated physical verification without printing backup contents:

```powershell
$env:QC_EXPECTED_SERIAL_SUFFIX = "<last serial characters>"
node tools\verify-native-backup.mjs 5
```

Focused transport regressions can exercise backup after both session restart
paths, or after a synthesized touchscreen tap. The latter guards the
hardware-confirmed RELEASE-then-PRESS wire ordering; leaving the remote pointer
pressed causes the QC to refuse a LocalBackup stream.

```powershell
node tools\verify-native-backup.mjs 1 --reset-session --disconnect-reconnect
node tools\verify-native-backup.mjs 1 --screen-tap-roundtrip
```

## Full hardware verification plan

The physical release run is intentionally staged. Each stage is completed on
Windows first and then repeated on Android with the same prepared preset. A
failure stops that platform's run; it does not turn into a retry loop that can
hide stale or queued commands.

### Acceptance gates

- Every one of the 102 public device actions has an authoritative response from
  the QC, not merely a successful send from the app.
- UI feedback is immediate and the later device event agrees with it. A stale
  event may never move a control back during a drag or rapid double press.
- For direct performance controls, click-to-accepted-queue must be at most 20 ms
  and the aggregate observed QC state-event median must be 50 ms or less.
  Footswitch, Scene, and Tempo event p95 must be at most 100 ms; Mode and Master
  Volume p95 must be at most 200 ms, matching their physically measured CorOS
  echo class. UP/DOWN preset navigation has a separate 2 s p95 gate. Save,
  backup, and initial connection are measured separately because the QC itself
  performs longer work.
- Repeatable controls are exercised at least 20 times, including five rapid
  pairs: A-H, UP, DOWN, Mode, Scene, Tempo, and Master Volume.
- The app screen and `capture_screen` device image agree after every stateful
  case: preset and scene, mode, LED state/color, Grid, routing, parameter value,
  tempo, volume, dirty state, and Undo/Redo availability.
- No ordinary ready-state test may produce periodic snapshot traffic.
  Full-snapshot reads are permitted only for startup or explicit recovery.

### Stage 0 — preparation and baseline

1. Close Cortex Control, connect the QC directly by USB, mute or lower the
   monitored audio path, and create a device backup.
2. Select the dedicated `QC MCP TEST` preset and confirm the two disposable
   destination slots are safe to overwrite.
3. Record QC firmware, app build, USB identity, platform, starting preset,
   scene, mode, tempo, volume, and an app/device screenshot pair.
4. Run `--discover`, resolve every fixture, and retain the generated immutable
   configuration with the report.

### Stage 1 — connection, reads, and event transport

Run all read cases, confirm the 256-slot directory and every custom folder, and
compare Grid/block details with the device screen. Then make changes on the QC
itself—scene, bypass, parameter knob, tempo, and volume—and verify that each
arrives as a pushed event without an app request. Disconnect/reconnect USB,
restart the app, and power-cycle the QC once; each recovery must establish a
single fresh session with no orphaned command.

The power switch is observational only: QC Remote does not synthesize a power
press. The test covers detection and recovery from a real device power cycle.

The read stage also probes retail Diagnostics, RemoteControl screenshot, and
graphics-tree support. Reports contain a `retailProtocolCapabilities` ledger
which distinguishes `schema-only`, `retail-response`, and physically verified
evidence. An unsupported read is recorded explicitly and blocks a required-all
release run without aborting the remaining non-destructive probes. Schema
presence alone is never reported as physical success.

### Stage 2 — physical performance controls

Test A-H in STOMP, SCENE, and PRESET modes, including assigned, unassigned,
enabled, bypassed, momentary, and alternating states. Test UP and DOWN across
slot and bank boundaries, including two rapid presses in the same direction
and an immediate reversal. Test Mode, Tap Tempo, tuner, Gig View, scene select,
and Master Volume in both directions: app to QC and QC to app. Capture the QC
screen after each navigation boundary and record LED color/state before and
after each footswitch operation.

Screen-gesture evidence is similarly granular. The public tap gesture exercises
the hardware-confirmed RELEASE/PRESS pair, and swipe exercises DRAG. MOVE and
the protobuf's standalone TAP value remain `schema-only` until a dedicated
retail-device test can produce an unambiguous, reversible physical observation;
the suite does not send them merely to make a coverage number pass.

### Stage 3 — parameters, Grid, and routing

For every parameter primitive represented in ModelRepo—continuous, logarithmic,
stepped rotary, toggle, selector, expression-linked, dependent/disabled, and
dedicated full-screen controls—compare label, order, unit, displayed value, and
encoded round trip. Exercise slow drags, fast drags, and A-B-A changes. Then use
the disposable Grid cells to add, move, bypass, assign, and remove a block and
to change IN, OUT, Split, and Mixer routing. Every operation is restored before
the next case.

This stage samples at least one model in every effect category and runs the
generated scale round-trip suite for every ModelRepo parameter. A visual sample
alone is not sufficient for scale verification.

### Stage 4 — persistent and failure paths

Run Save As, Rename, Copy, and device backup only in the reserved slots. Verify
dirty title, Save, Undo, and Redo transitions on both screens. During separate
scratch runs, interrupt USB once during a read and once immediately after a
write; the app must either receive the authoritative result or show one bounded
failure, never silently replay the mutation. Finish by recalling the original
scratch preset and confirming all reversible settings were restored.

### Evidence and release decision

Each case records app build, contract digest, start/end timestamps, duration,
arguments with secrets redacted, authoritative returned state, and restoration
result. Stateful cases also retain paired app/device screenshots and the raw
event sequence number used for confirmation. The two platform reports are then
checked with `test:hardware:release`; release is blocked by a missing action,
wrong platform, stale contract, latency-gate failure, screenshot mismatch,
failed restoration, or any skipped case.
