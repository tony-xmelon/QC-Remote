# Cortex Control USB startup behavior

This note records interoperability behavior recovered from the installed
Cortex Control 4.1.0 binary. It complements the protobuf schemas: those define
message shapes, while this analysis defines the startup order and failure
transitions which the schemas cannot express.

The broader inventory of backup/update forwarding, diagnostics, native remote
control, system settings, logging, production tooling, connectivity checks, and
unresolved encryption behavior is in
[CORTEX_CONTROL_BINARY_INVENTORY.md](CORTEX_CONTROL_BINARY_INVENTORY.md).

Reference binary:

- `C:\Program Files\Neural DSP\Cortex Control\Cortex Control.exe`
- SHA-256 `9BE548FB6CBD2E8C80715015C2A2F0F248C9B01A7165004E2B017FFE2B14E65A`
- x86-64 PE, 67,060,088 bytes

The extraction is reproducible with
`python tools/extract-cortex-control-behavior.py`. The machine-readable report
is written to `artifacts/cortex-protocol/behavior.json`.

## State machine

The binary contains ten concrete `neural::cortex::usb::Device*State` classes.
Their constructors set the following numeric state values:

| Value | State |
|---:|---|
| 0 | Undefined |
| 1 | Session validating |
| 2 | Version validating |
| 3 | Invalid |
| 4 | Disconnected |
| 5 | Building |
| 6 | Initializing |
| 7 | Booting |
| 8 | Connected |
| 9 | Failed |

The normal startup path is staged:

1. Session validating sends `ResetCommsBuffers` (52), including a generated
   session id.
2. Only a reset reply carrying the same session id advances to version
   validating. A mismatch enters the invalid state.
3. Version validating sends `Version` (10) with action `READ`.
4. The returned device type and `cortex_control_version_valid` flag are checked.
   Unsupported or incompatible results enter the invalid state. A valid result
   reaches disconnected, after which the connection controller queues building
   once its connection dependencies are present.
5. Building sends `Connection{connected:true}` (49), then `ModelRepo` (51) with
   action `READ`.
6. A valid model-repository update advances to initializing. Initializing sends
   `ModuleStats` (35) with action `READ`.
7. Valid module statistics advance to booting. Only then does Cortex Control
   send the state/subscription burst below.
8. The `Updater` (60) response is the final boot gate before connected.

The booting-state entry burst is ordered as follows:

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
33 Tempo
 2 SetlistPosition
34 PresetDirty
13 Scene
57 BulkOperation
60 Updater
```

The two `RecentsFavorites` requests have different payload intent; they are not
an accidental duplicate. Most entries are `READ` requests. On entry to
disconnected, Cortex Control also sends `CPULoad` with action `DELETE` to stop
that stream, followed by `Connection{connected:false}`.

### Exact entry payload exceptions

`python tools/extract-cortex-control-startup-details.py` records the complete
entry-builder disassembly and a descriptor-reviewed payload table in
`artifacts/cortex-protocol/startup-details.json`. It establishes that three
boot entries must not be reduced to a generic `{action: READ}` message:

- `CPULoad` starts with the default `CREATE` action plus a generated request
  id. The disconnected-state `DELETE` also carries a generated request id.
- The boot `File` read explicitly carries `short_listing`; Cortex Control gets
  its Boolean value from the active device/controller interface. It is false
  for the Quad Cortex profile.
- The boot `CloudProduct` read carries an explicitly present, empty
  `CloudTransferState` submessage.

The favorites distinction is also on the wire: the first type-20 payload is
`08 03`, while the second is `08 03 18 01`. All other fixed boot payloads are
the ordinary `08 03` READ form. ResetCommsBuffers remains dynamic and carries
both its request id and opaque session id.

### Outer-controller timers

The follow-up extractor inventories vtables, direct state-constructor callers,
function bounds, and numeric immediates for `DeviceStateController` and
`ConnectionStateController`. It does **not** assign retry or timeout durations:
the release PE has no function symbols for the relevant callbacks, and the
candidate functions share generic JUCE timer/allocation machinery. Numeric
values such as object sizes and UI timer intervals cannot be attributed to USB
startup safely from static proximity alone.

Consequently, the shared Rust handshake, ready, and reconnect durations remain
explicit implementation safety policy rather than claimed Cortex Control
constants. No timer/profile constant was changed by this analysis. A timestamped
runtime trace around state transitions is still required to recover the outer
controller's exact cadence.

## Message gating

Startup states do not accept all messages equally:

| State | State-specific messages dispatched |
|---|---|
| Session validating | Connection (49), ResetCommsBuffers (52) |
| Version validating | Version (10), Connection (49), GenericError (56) |
| Disconnected | Version (10) |
| Building | Version (10), Connection (49), ModelRepo (51) |
| Initializing | Version (10), ModuleStats (35), Connection (49) |
| Booting | Version (10), Connection (49), Updater (60) |
| Connected | Version (10), Connection (49) |

Version-validating also explicitly allows IO settings (3), file (4), and
general settings (9) to pass through its secondary predicate. This appears to
preserve unsolicited state without letting it advance the startup state.

## Error handling

The embedded device error model is:

| Value | Error |
|---:|---|
| 0 | none |
| 1 | undefined |
| 2 | parse message failure |
| 3 | invalid cloud endpoint |
| 4 | state error |
| 5 | model repository data error |
| 6 | module statistics data error |

Observed control-flow rules:

- Protobuf parse failure records error 2. It is not reduced to a timeout or a
  generic missing reply.
- Reset correlation is strict. A reply of the correct type with the wrong
  session id is a protocol failure.
- `GenericError::VERSION_IS_NEWER` and `VERSION_IS_OLDER` are handled during
  version validation and enter invalid state.
- A `Connection` message whose `connected` field is present and false returns
  any active state which handles it to disconnected.
- Model-repository and module-statistics decoding/install failures retain their
  distinct errors (5 and 6), making diagnosis possible.
- State entry sends occur once. Recovery is performed by the outer connection
  and device-state controllers re-entering the appropriate state, rather than
  by blindly replaying the complete startup burst inside each state.

## Shared runtime implementation status

The shared Rust `DeviceStartupRuntime`, used by both Windows and Android, now
implements the recovered staged startup rather than collapsing post-reset work
into a single burst. The following binary-evidenced corrections are implemented:

- Decode `ResetCommsBuffers` and verify its session id before accepting the
  handshake. Windows and Android now reject type-52 messages for a different
  opaque session through the same shared runtime policy.
- Send Version `READ` first; respond with the controller version when requested,
  instead of treating an unsolicited Version `UPDATE` as the initial hello.
- Keep the controller compatibility field distinct from the Cortex Control
  product version. A physical Version exchange with the current QC omitted the
  optional `cortex_control_version_valid` field. The runtime therefore accepts
  omission for legacy retail firmware and rejects only an explicit `false`.
- Gate ModelRepo until version validation, ModuleStats until ModelRepo install,
  and the subscription burst until ModuleStats install.
- Use the recovered boot request order and preserve the two distinct
  RecentsFavorites requests.
- Decode `Connection`, `GenericError`, Version, ModelRepo, ModuleStats, and
  Updater as state-machine inputs. Message-type arrival alone is insufficient.
- Retain preset and required live-state message types observed before the final
  Updater gate, then seed only fields which are still missing. Windows and
  Android therefore do not diverge when the preset arrives early.
- Return an explicit `SendThenBuild` transition after Version validation or a
  recoverable Connection(false), so neither host infers the next state from a
  phase string or message type.
- Send the same shared `SystemTimeSync` command after Connected on both native
  hosts; only the OS wall-clock value remains platform supplied.
- Preserve typed protocol errors across Windows and Android so both platforms
  make the same reconnect/fail decision.
- Advance `TransportRuntime` from Handshaking only after staged startup and the
  bounded authoritative seed complete, passing the same synchronized result on
  both hosts.
- Own automatic reconnect reservation and its 750 ms cadence in
  `TransportRuntime`. Android now repeats failed automatic attempts through the
  same due/attempted gate as Windows instead of using a one-shot local timer.

A second static-analysis pass retained the complete startup builders and their
callers, but the stripped binary did not expose uniquely attributable outer
timeout, retry-count, or backoff constants. Existing bounded safety policy is
therefore unchanged and is not represented as binary evidence. The recovered
sequence and error transitions above do not depend on those unresolved timings.

## Retail capability evidence for messages 7 and 72

Static analysis of Cortex Control 4.1.0 proves that the linked schema contains
`DiagnosticsMessage` (7) and `RemoteControlMessage` (72). It does **not** prove
that every retail CorOS version answers either message:

- The binary contains a concrete `DiagnosticsMessageReceiver`, but diagnostics
  is absent from the normal Building/Initializing/Booting request sequence.
- The binary contains the RemoteControl protobuf classes and field names, but
  no corresponding Cortex Control sender/receiver class was recovered.
- Cortex Control fetches authenticated and unauthenticated cloud feature flags.
  No recovered flag name or control-flow reference connects those cloud flags
  to Diagnostics or RemoteControl.
- `ProductionAutomationMode` is a separate message type. It must not be enabled
  as a way to probe retail diagnostics or remote control.

Consequently the runtime starts all eight recovered capabilities at
`schemaOnly`: diagnostics, screenshot, graphics tree, and mouse PRESS, RELEASE,
MOVE, TAP, and DRAG. A correlated retail response promotes a capability to
`retailResponse`; only a visible device observation promotes it to
`physicalObservation`. Timeouts and explicit unsupported replies are recorded,
not converted into support. The only automatic probes are the three read-only
operations: diagnostics, screenshot, and graphics tree. Mouse events remain
behind the explicit screen-test safety gate.
