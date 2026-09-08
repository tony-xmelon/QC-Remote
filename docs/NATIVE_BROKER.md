# Shared native QC runtime

The installed Windows and Android applications use the same Rust protocol and
domain engine. Python is not part of either installed application's live path.

```text
Windows React -> Tauri -> qc-device-broker -> qc-device-runtime -> qc-protocol -> Windows HID
Android React -> Capacitor/Java/JNI ---------> qc-device-runtime -> qc-protocol -> Android USB
```

`qc-protocol` owns protobuf schemas, the stateless HID codec, typed outbound
commands, ModelRepo parsing, parameter scales/dependencies, and state decoding.
`qc-device-runtime` owns the long-lived `TransportRuntime`: session phases,
handshake/report-layout selection, raw-report normalization, frame assembly,
keepalive/reconnect policy, read-error tolerance, LocalBackup assembly/retry/
stall policy, post-handshake preset/seed synchronization, preset-catalog
verification timing, reply type/request-id correlation and deadlines, the
complete snapshot reducer, and preset-library projection. The Windows broker supplies Windows HID I/O,
background workers and framed `gateway.v1` IPC. Android supplies USB permission,
endpoint and application lifecycle around the same Rust runtime through JNI.
The Windows HID adapter reports actual native report, idle, and error outcomes;
an empty broker queue poll is not a successful device read, and only the shared
transport runtime owns the consecutive-error threshold. The same adapter path
applies that policy during reset handshake, staged startup, seed collection,
and the established session.

Gateway state-verification semantics live in the shared runtime. Reply
correlation, encoded-write pacing, mutation confirmation deadlines/readback
cadence, preflight/readback/refresh method selection, post-write refreshes,
composite-read dependencies, and catalog verification policy are shared; each
host retains only its native event wait, timer primitive, and USB dispatch. The
shared `GatewayVerificationRuntime` chooses every wait, refresh, verified, and
timeout transition. Correlated settings retries likewise query one shared Rust
attempt schedule instead of receiving platform-owned timing arrays.
New device-protocol fixes must land with a shared runtime regression test; the
platform adapters are not alternate protocol implementations.

The shared initializer reports ready only after the current preset and the
required scene, mode, Master Volume, dirty-state, and setlist-position seed are
all present. Both hosts also consume the same generated first-command
stabilization window. Android's semantic plans and initialization decisions
cross JNI as named JSON fields; only actual HID reports and QC payload bytes use
binary arrays. Rust also applies the selected report-ID layout before those
arrays cross JNI, exactly as it does before Windows HID writes. Both hosts keep
the handshake-selected layout for every later write in that USB session.
Verification cadence stays inside Rust rather than crossing JNI,
so Java does not duplicate either a private plan codec or protocol timer loop.
Android also queries the shared transport's connected and synchronized
projections directly instead of maintaining Java handshake, initialization,
startup-epoch, or synchronization readiness mirrors.
An ordinary preset push is not allowed to promote Android to Ready by itself;
both native hosts publish synchronization only from the shared semantic-seed
decision, including recovery when missing seed fields arrive late.
An incomplete initial seed remains retained on both hosts until late state
completes it; a synchronized seed is released immediately.
The transport runtime itself interprets each completed seed against its phase,
so adapters do not choose between first-handshake and established-session
readiness transitions.
The staged Version/ModelRepo/ModuleStats/Updater sequence also owns its total
readiness deadline in Rust; both hosts only supply a monotonic clock and react
to the same timeout decision. Its phase and error names are stable shared enum
projections rather than adapter-specific strings.
Their bounded flight recorders likewise treat only the dedicated KeepAlive as
routine transport noise, preserving Version frames as startup evidence.

Windows starts preset-folder enumeration when the directory is first opened.
Folder pushes are decoded and cached on the background receive lane. Starting
that device-wide transfer during the handshake would queue hundreds of File
messages ahead of live command readback, so it is deliberately kept out of the
startup and real-time paths.

The broker implements the manifest-defined gateway API directly, including snapshots, native
state frames, ModelRepo-backed block editors, scene/bypass/parameter/tempo and
Master Volume control, grid/routing writes, preset directory/slot listing,
recall/navigation/reload, save/rename/copy, favorites and recent presets,
pinned models, capture/IR browsing and loading, setlist create/delete/duplicate,
preset move/delete, and chunked native device backup.
It also owns device identity and naming, device undo/redo, compiler-inhibited
module state, stored-preset screenshots, CorOS 4.1 live screen capture, and
screen-coordinate tap sequences. Live tap sends the verified wire-value 1 then
wire-value 0 pair as one serialized worker operation after priming the
remote-screen session; CorOS 4.1 interprets those values opposite their recovered
`RELEASE`/`PRESS` labels.

On Windows the HID owner is full duplex: a permanent RX thread waits on the
input endpoint while the serialized broker lane writes on the same exclusive
handle. This matters for large device-originated transfers such as backup,
which keep receiving reports and sending keepalives without tearing down the
live session. LocalBackup assembly is boundary-aware because current firmware
does not correlate its chunks with the request id.
All Windows performance-MIDI actions—footswitches, Tap Tempo, mode slots,
Tuner, Gig View, and Looper controls—use the app-owned persistent Tauri MIDI
lane, so they cannot queue behind a long broker USB transaction. Android sends
the same shared MIDI plans through its independent native MIDI executor because
USB endpoint ownership and packet I/O remain operating-system concerns.

## Python parity oracle

`services/device-gateway` and `pyquadcortex` remain source-only development
references. They are used for differential fixtures, protocol archaeology, and
future CorOS comparison. Oracle tests start them independently; neither client
contains a runtime switch to them. The Windows installer does not package them
and the normal application cannot start them.

The vendored protobuf schema records its upstream MIT source and revision in
`packages/rust/qc-protocol/SCHEMA-SOURCE.md` and
`packages/rust/qc-protocol/PYQUADCORTEX-LICENSE.txt`.

## Verification

```powershell
cargo test --manifest-path packages/rust/qc-protocol/Cargo.toml
cargo test --manifest-path packages/rust/qc-device-runtime/Cargo.toml
cargo test --manifest-path services/device-broker/Cargo.toml
node tools/verify-native-runtime-boundary.mjs
node tools/verify-packaged-gateway.mjs services/device-broker/target/debug/qc-device-broker.exe
```

`cargo run --manifest-path services/device-broker/Cargo.toml -- --verify-live`
changes the active scene, verifies the device echo, and restores it. Do not run
Cortex Control concurrently because QC HID access is exclusive.
