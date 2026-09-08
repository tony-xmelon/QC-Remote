# Cortex Control 4.1.0 binary inventory

This document records interoperability-relevant behavior visible in the
shipping Windows Cortex Control 4.1.0 binary. It deliberately distinguishes
three kinds of evidence:

- **Extracted:** directly represented by an embedded protobuf descriptor,
  string, RTTI name, PE import, or mechanically recovered instruction sequence.
- **Interpreted:** a control-flow conclusion reviewed against extracted machine
  code and the protobuf schema.
- **Unverified:** a plausible capability which still needs a device trace or a
  physical-device test before it can be treated as supported behavior.

It is an engineering inventory, not permission to expose every discovered
operation. Factory, production, account, cloud, update, logging, reset, and
power operations require separate product and authorization decisions.

## Reference and reproduction

Reference executable:

- Path: `C:\Program Files\Neural DSP\Cortex Control\Cortex Control.exe`
- Product/file version: 4.1.0
- Architecture: x86-64 PE
- Size: 67,060,088 bytes
- SHA-256: `9BE548FB6CBD2E8C80715015C2A2F0F248C9B01A7165004E2B017FFE2B14E65A`

Run the three read-only extractors:

```powershell
python tools/extract-cortex-protocol.py
python tools/extract-cortex-control-behavior.py
python tools/extract-cortex-control-inventory.py
```

They write ignored evidence under `artifacts/cortex-protocol/`: the two
serialized descriptors, schema/type coverage, state-machine addresses and
entry order, and an allow-listed binary inventory. The inventory intentionally
does not copy arbitrary URLs, headers, credentials, user data, or the embedded
factory-library catalogue.

## Embedded protocol definition

**Extracted, high confidence.** The executable contains complete serialized
`FileDescriptorProto` blobs for:

| Descriptor | Offset | Bytes | Top-level messages |
|---|---:|---:|---:|
| `Preset.proto` | `0x339d2e0` | 3,526 | 15 |
| `ProductionAutomation.proto` | `0x33a2310` | 40,172 | 153 |

The extracted message sets match the checked-in copies under
`packages/rust/qc-protocol/proto/`: 153/153 `ProductionAutomation` top-level
messages and 15/15 `Preset` top-level messages, with nothing missing on either
side. `CortexMessageType` defines 72 routed message types, plus `Undefined` and
the terminal count sentinel. This is the authoritative source for field
numbers, optionality, enums, and message type IDs. It does **not** define
sequencing, correlation, retries, or UI policy.

The generated `coverage.json` is a source-tree inventory, not a product-support
claim. Its current `implemented` predicate can be satisfied by constants,
schema references, builders, decoders, tests, or internal-only code. Thus a
row marked `implemented` does not prove that an operation is exposed by either
app or MCP, authorized in any control tier, exercised end-to-end, or verified
on hardware. Public method coverage, runtime encode/decode coverage, observed
wire coverage, and physical-device conformance must be reported separately.

The executable also includes substantial factory preset/model catalogue and
parameter metadata. That is useful as evidence that Cortex Control validates
and presents factory dependencies, model IDs, defaults, and parameter ranges.
It is not copied into this repository: the catalogue is proprietary content,
not a protocol prerequisite.

## USB startup and subscriptions

**Extracted and interpreted, high confidence.** The complete state analysis is
in [CORTEX_CONTROL_USB_PROTOCOL.md](CORTEX_CONTROL_USB_PROTOCOL.md). The normal
gate is:

```text
session-ID-correlated ResetCommsBuffers
  -> Version READ and compatibility validation
  -> Connection true + ModelRepo READ
  -> ModuleStats READ
  -> ordered boot subscriptions
  -> Updater response
  -> Connected
```

The boot entry order is exact:

```text
26 CPULoad
58 License
21 UndoRedo
 3 IOSettings
 9 GeneralSettings
24 ShowGigView
14 Mode
38 GlobalEQ
17 MasterVolume
 4 File
71 ModelPreset
46 CloudProduct
20 RecentsFavorites
20 RecentsFavorites
42 CompilerInhibitedModules
15 RecallPreset
50 NewModels
54 PinnedModels
19 DefaultParameters
33 GlobalTempo
 2 SetlistPosition
34 PresetDirty
13 Scene
57 BulkOperation
60 Updater
```

The two `RecentsFavorites` requests carry different intent and must be retained.
The recovered entry walker establishes message-type order; individual payload
actions should be validated by decode/disassembly or a trace rather than being
assumed from the type list alone.

## Backup and cloud-forwarding architecture

Detailed recovery rules, timing confidence, stale-stream handling, and updater
reconnect policy are in
[CORTEX_CONTROL_TRANSFER_RECOVERY.md](CORTEX_CONTROL_TRANSFER_RECOVERY.md).

**Schema-extracted, high confidence; exact live sequences partly unverified.**
There are separate local-device, cloud-model, and desktop-forwarding paths:

- `LocalBackup` (40) carries action, optional request ID, JSON chunks,
  `can_apply_backup`, `applied_backup`, and `is_last_chunk`.
- `CloudBackup` (41) carries backup metadata, detailed operation result codes,
  cloud error code, installation progress, and busy state. The errors distinguish
  create/update/rename/download/delete/list outcomes, authentication/connectivity,
  and `GRID_NOT_VISIBLE`.
- `BackupsForward` (30) lets the device ask Cortex Control to create/update,
  download, rename, delete, list, fetch a URL, or report upload status. Requests
  can contain URL, headers, timeout, payload chunks, and `is_last_chunk`;
  responses contain payload chunks, terminal markers, and error codes.

Retained RTTI names independently confirm `LocalBackupMessageSender/Receiver`,
`CloudBackupMessageSender/Receiver`, `BackupsForwardMessageSender/Receiver`, a
`LocalBackupLoaderThread`, and methods named `sendBackupChunk`,
`sendLocalBackup`, `uploadCloudBackupInChunks`, and `install`. The UI contains
specific local-backup loading, file chooser, creation, install-completion, and
“backup too new” flows.

Implementation requirements:

- Treat every backup as a stateful, boundary-aware transfer, not a normal
  request/reply.
- End only on one valid terminal `is_last_chunk`; reject or diagnose missing,
  repeated, stale, oversized, and malformed tails.
- Preserve operation IDs where supplied, but do not assume every firmware reply
  echoes them. Prevent a stale stream from satisfying a new operation.
- Separate first-chunk timeout, inter-chunk stall timeout, total timeout, and
  retry-before-stream-start policy.
- Do not automatically start a second backup after a completed device-side run.
- Keep cloud credentials and arbitrary forwarding headers out of logs and test
  artifacts.

## Updates and HTTP forwarding

**Schema-extracted, high confidence; endpoint/authentication behavior
unverified.** `ProductForward` (29) is a generic device-to-desktop HTTP request
envelope with operation, URL, timeout, multipart flag, headers, payload, cloud
request ID, response bytes, and error code. This shows that Cortex Control can
act as an HTTP execution proxy for the device; it does not make arbitrary HTTP
forwarding appropriate for public MCP exposure.

Update handling is split between `Updater` (60) and `UpdaterForward` (61):

- Commands: check, check-and-download, install, restart download through Cortex
  Control, and cancel.
- States: idle, requesting data, downloading data, updating, reboot, and failed.
- Statuses distinguish no update, available update, downloaded update, and no
  newer version.
- Download and installation progress are independent values.
- Forward requests distinguish check, changelog, update header, and update body;
  forwarded responses are chunked and carry terminal/error fields.

Implementation must model this as a state machine with separate request,
download, installation, reboot/disconnect, cancellation, and failure phases.
Update/install operations belong to the full-control authorization tier and
need explicit confirmation and physical tests; they must not be exercised as
part of an ordinary conformance run.

## Logging and reports

**Extracted, high confidence.** The binary retains `HidLogger`,
`ProtobufLogger`, `DeviceReportStream`, and `DeviceReportLogger` types. The
schema has:

- `Logs` (44), carrying a correlation ID.
- `LogsForward` (31), with operations to fetch upload URLs, upload logs, and
  upload a coredump; requests carry chunk payload, headers, URL, timeout, and a
  terminal marker.

The layers imply distinct transport, decoded-message, and report/upload
concerns. Our implementation should preserve that separation. Diagnostic
exports should default to metadata and counters, redact serials, paths,
credentials, URLs/headers, preset/user content, and conversation data, and
never upload logs or coredumps without an explicit user action.

## Device diagnostics

**Schema-extracted, high confidence; production-firmware response unverified.**
`Diagnostics` (7) exposes four DSP-core reports and one SOC2 ARM/USB report.
DSP fields include status words, current/maximum process CPU, internal/external
and program-memory heap use, external DMA use, and error flags. ARM/USB fields
include:

- USB connection and ring-buffer read/write indices;
- USB audio receive/transmit frame counts, skipped and aborted frames;
- average/minimum/maximum buffer distance and sample-adjustment counts;
- audio feedback and endpoint enabled/disabled counts;
- USB MIDI and HID input/output counts; and
- dropped HID input/output counts.

These counters should augment, not replace, host-side flight recording. A
physical test should establish the correct action, availability on retail
firmware, cadence, counter rollover, reset behavior, and whether reading the
report has measurable audio or UI impact.

## Native remote control

**Schema-extracted and RTTI-confirmed; firmware enablement partly verified only
where a physical trace exists.** `RemoteControl` (72) contains:

- mouse coordinates and `PRESS`, `RELEASE`, `MOVE`, `TAP`, or `DRAG`, including
  drag destination;
- screenshot bytes with x/y/width/height metadata; and
- a serialized graphics-tree string.

This is distinct from legacy message type 25 `Screenshot`. It is potentially a
strong device-test primitive: a test can act, request a screenshot/tree, and
assert the resulting device state instead of trusting host UI state or fixed
screen coordinates. Tests must determine coordinate space, screenshot encoding,
partial-region semantics, graphics-tree schema, request correlation, pacing,
and the retail firmware’s first-request behavior. Gesture implementations must
preserve ordered press/move/release semantics and avoid unbounded queues.

Remote UI access is a modification/control surface. Reads of screenshots and
trees still expose device/user content and require deliberate privacy handling.

## General settings and system boundary

**Schema-extracted, high confidence.** `GeneralSettings` (9) covers ordinary
preferences and materially destructive/system operations in one message:

- display/LED brightness and screen/volume locking;
- cab/IR bypass, scene overwrite policy, stomp assignment and dimming;
- MIDI-over-USB, channel, duplicate-PC handling, clock in/out, and internal
  clock;
- master-volume assignment, hold timing, looper lock, gig-view access;
- download destinations, storage totals/entities, dynamic delay compensation,
  cloud endpoint/domain, and connectivity-check override;
- shutdown, reboot, standby, wake, Wi-Fi reset, settings reset, and factory
  reset.

Field presence matters because these values share an update envelope. Builders
must set only the intended optional field and must read back/confirm changes.
Power, reset, network, update, serialization, calibration, and cloud/account
operations belong only to full control. Factory reset and serialization need
additional explicit confirmation and should remain excluded until a safe test
strategy exists.

## Factory and production surfaces

**Schema-extracted and RTTI-confirmed, high confidence.** The shipping desktop
binary carries message shapes and controllers for:

- production-automation mode;
- gain calibration, including input/output/headphone paths;
- device serialization and display type;
- test-farm jobs and queued/running/pass/fail/abort states;
- production LED and tempo-LED tests;
- loading and generating automated test presets;
- assigning test input/output ports and rows;
- choosing split/mix points and hard-pan behavior; and
- randomized multi-lap preset-speed tests with CSV output.

These are evidence of manufacturing/service tooling, not consumer features.
They must be denied by the public MCP regardless of general “full control”
unless a separately authenticated service build and threat model are created.
Do not probe them on a user device merely to improve coverage.

## Connectivity checks

**Exact binary strings, high confidence that the code exists; invocation policy
unverified.** Cortex Control embeds both:

- a socket-style probe target of `8.8.8.8`; and
- a Windows PowerShell command using `Get-NetAdapter`, counting adapters whose
  status is `Up` while excluding Bluetooth and loopback descriptions.

This dual check can disagree with actual cloud reachability, especially with
VPNs, captive portals, firewalls, Tailscale, or IPv6-only networks. Our runtime
should report USB/device reachability separately from host network, relay, DNS,
authentication, and service-endpoint reachability rather than copying one
global online flag.

## Encryption and framing boundary

**RTTI/string-extracted, low semantic confidence.** The binary retains
`ZencryptionManager` and `ZencryptionHelper` in the USB layer and imports
Windows cryptographic APIs. That establishes an abstraction boundary, but not
the algorithm, keys, framing, integrity rules, or whether every report is
encrypted. Names alone are insufficient evidence.

Do not invent an algorithm or replace observed framing with a guess. Resolve
this through focused call-graph analysis and owner-authorized USB traces with
known plaintext, then add deterministic framing vectors. Keep cryptography and
report fragmentation below protobuf dispatch so Windows and Android share one
implementation.

## Version observations

**Extracted.** The PE version resource and ordinary binary strings identify
Cortex Control 4.1.0. The binary also contains `4.2.0` near compatibility/state
machinery; neither product string alone establishes compatibility behavior. A
physical Version exchange with retail CorOS omitted the optional compatibility
flag. Both platforms therefore accept omission and reject explicit `false`.
The shared runtime decodes the Version
fields, rejects unsupported devices and newer/older compatibility errors, and
tests those outcomes before either native host becomes ready.

## Revision checklist for the shared runtime

The platform implementations now converge on one Rust protocol/runtime
implementation and thin Windows/Android transports. Status after the binary
review and implementation pass:

1. **Implemented:** session-ID-correlated staged startup, exact subscription
   order, rebuild invalidation, and semantic seed lifetime are shared by
   Windows and Android through `DeviceLifecycleRuntime`.
2. **Implemented:** protobuf builders/decoders, optional-field discipline,
   correlation, typed errors, framing, decompression limits, backup lifecycle,
   and reconnect policy live in the shared Rust crates.
3. **Partly implemented:** local backup uses the shared boundary-aware transfer
   engine. Forwarded product, backup, log, and updater envelopes have typed
   codecs and tests; host HTTP execution remains deliberately disabled.
4. **Safety hold:** device-supplied forwarding URLs and headers are explicitly
   untrusted. Network execution needs an allowlist, redirect rules, credential
   isolation, and bounded transfer policy before it can be enabled.
5. **Implemented:** `get_device_diagnostics` / `device.diagnostics` is a
   read-only, correlated, typed MCP path on both platforms.
6. **Implemented in software:** RemoteControl screenshot, graphics tree, and
   press/release/move/tap/drag wire shapes are shared and tested. Retail-device
   availability and the complete gesture matrix still need physical evidence.
7. **Implemented:** authorization uses read-only, performance, modify, and full
   control semantic tiers. Manufacturing, serialization, calibration, and test
   operations remain hard-denied even in full control.
8. **Software verified; physical verification pending:** shared contract and
   native-host tests pass on both platforms. Clean device runs must still cover
   startup, reconnect, backup boundaries, diagnostics, and RemoteControl, and
   must exclude destructive production, reset, serialization, and firmware
   installation probes.

## Remaining unknowns

Static evidence still does not establish:

- HID report framing/encryption details not already proven by traces;
- timer durations, retry limits, and backoff in Cortex Control’s outer
  controllers;
- exact action/payload for every boot entry;
- cloud endpoints, authentication, or service contracts;
- whether each diagnostic, RemoteControl, factory, and production operation is
  enabled on retail firmware; or
- the meaning of the adjacent 4.2.0 compatibility string.

Each unknown should be closed with disassembly plus a trace/test vector. A
schema field or RTTI name is never, on its own, proof of successful physical
device behavior.
