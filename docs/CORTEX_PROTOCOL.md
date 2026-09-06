# CorOS protocol extraction from Cortex Control 4.1.0

Interoperability reference for talking to a Quad Cortex the owner already has.
Everything below is derived from descriptors Neural DSP ships in the shipping
Cortex Control binary, cross-checked against the connected unit.

Re-run the extraction with `tools/extract-cortex-protocol.py`. It writes the
serialized descriptors, the message-type table, and the coverage map under
`artifacts/cortex-protocol/`.

## What the binary carries

`Cortex Control.exe` 4.1.0 (64 MB, PE) embeds two serialized
`FileDescriptorProto` blobs, both `proto3`:

| file | package | offset | bytes | messages |
| --- | --- | --- | --- | --- |
| `ProductionAutomation.proto` | `cortex_protobuf_v2` | `0x33a2310` | 40,172 | 153 |
| `Preset.proto` | *(none)* | `0x339d2e0` | 3,526 | 15 |

The blobs have no length prefix. Their end is found by walking the top-level
`FileDescriptorProto` fields until a tag appears that the message cannot hold;
a truncated prefix does not parse, so growing a candidate window never gets a
foothold.

**The copies in `packages/rust/qc-protocol/proto/` are complete.** A message-set
diff against the freshly extracted descriptors reports 153/153 and 15/15 with
nothing missing on either side. There is no schema drift to chase.

## The message-type table

`CortexMessageType.Enum` has 74 values: 72 real types, plus `Undefined = 0` and
the `NumberOfMessageTypes = 73` sentinel. This is the routing key in every HID
frame's trailer.

```
 1 Grid                    19 DefaultParameters       40 LocalBackup
 2 SetlistPosition         20 RecentsFavorites        41 CloudBackup
 3 IOSettings              21 UndoRedo                42 CompilerInhibitedModules
 4 File                    22 SceneCopy               43 SystemTimeSync
 5 IOMeter                 23 SceneLabel              44 Logs
 6 Tuner                   24 ShowGigView             45 ProcessDownloadsQueue
 7 Diagnostics             25 Screenshot              46 CloudProduct
 8 MIDISettings            26 CPULoad                 47 Confirmation
 9 GeneralSettings         27 ShowTuner               48 SceneColor
10 Version                 28 Looper                  49 Connection
11 ProductionAutomationMode 29 ProductForward         50 NewModels
12 GridMove                30 BackupsForward          51 ModelRepo
13 Scene                   31 LogsForward             52 ResetCommsBuffers
14 Mode                    32 KeepAlive               53 SuspendConnection
15 RecallPreset            33 GlobalTempo             54 PinnedModels
16 EnableCaptureOut        34 PresetDirty             55 GigViewButton
17 MasterVolume            35 ModuleStats             56 GenericError
18 CloudLogin              36 NeuralCapture           57 BulkOperation
                           37 GridModelMeter          58 License
                           38 GlobalEQ                59 PresetSpeedTest
                           39 RecentSearches          60 Updater
61 UpdaterForward          65 TestFarm                69 SetTestPresetSplitMixPoints
62 GainCalibration         66 ProductionTest          70 GenerateTestPreset
63 NeuralCapture2          67 LoadAutomatedTestPreset 71 ModelPreset
64 Serialization           68 SetTestPresetInputOutputPorts  72 RemoteControl
```

## Coverage

Static name matching is unsound here: several messages are hand-encoded as raw
bytes (`show_tuner` is literally `[0x08, 0x01, 0x18, show]` on type 27), so only
the type number is reliable. The map below combines the numbers this stack
encodes or decodes with the numbers actually exchanged during a full 102-action
hardware conformance run.

- **32 types observed on the wire** in one complete conformance pass.
- **45 of 72 implemented or observed.**
- **27 never touched**, and they fall into coherent groups:
  - factory and production test: 65-70
  - 71 ModelPreset — *not* production test despite sitting in that range;
    Cortex Control sends it during ordinary block editing (see the wire
    section below), and `pyquadcortex`'s enum does not know the type exists
  - Cloud forwarding and account: 18, 29, 30, 31, 41, 45, 46
  - telemetry, meters and logs: 5, 7, 26, 37, 44
  - updater and calibration: 61, 62
  - other: 39 RecentSearches, 43 SystemTimeSync, 55 GigViewButton,
    59 PresetSpeedTest, 63 NeuralCapture2, 64 Serialization

None of those are needed to control a device; the untouched set is
manufacturing, telemetry, and Cortex Cloud plumbing.

## Impulse responses

### Reading

`FileMessage{action: READ, type: 1}` on type 4 returns the IR library. The
folder key is `local_ir_root` by convention, but the `type` field is what
actually selects the library — the current `read_library_files` ignores the key
it is handed.

`FileMessage.type` is a bare `int32`, and two enums in the schema could plausibly
type it with **conflicting orderings**:

| enum | PRESET | IR | CAPTURE |
| --- | --- | --- | --- |
| `RecentsFavoritesMessage.RecentFavoriteType` | 0 | 1 | 2 |
| `StorageInfoType.Enum` | 0 | 2 | 1 |

Hardware settles it: this stack sends `type = 0` to create a setlist and
`type = 1` to list IRs, and both work. `FileMessage.type` therefore follows
`RecentFavoriteType`, **not** `StorageInfoType`. Captures are listed with the
field omitted and folder `local_nc_root`.

### Referencing an IR from a block

An IR reference is two strings on the IR Loader block, and the first is not a
path despite its label:

- `IR PATH` (parameter 2 or 10) takes the library entry's **key**
- `IR NAME` (parameter 22 or 23) takes its display name

Every IR Loader has two slots, each with its own pair.

### Writing — captured from Cortex Control, then replayed

`FileMessage` carries the upload field:

```
message FileMessage {
   1  MessageAction.Enum action
   2  uint64 request_id
   3  int32  type                     // 1 for impulse responses
   4  FolderInfo folder
   5  FolderInfo to_folder
   6  bool   short_listing
   7  bytes  ir_payload               // the IR upload path
   8  BinaryPreset preset_payload
   9  int32  total_bulk_create_count
  10  bool   delete_from_library
}
```

This was settled by breakpointing `kernel32!WriteFile` in Cortex Control 4.1.0
and reading the bytes it hands the HID device during a real import
(`tools/capture_cortex_hid_writes.py`). The import is **one message, 34 reports,
with no keepalive interleaved**, and decodes to exactly this:

```
FileMessage{
  request_id: 10,
  type: 1,                                   // RecentFavoriteType.IR
  folder: FolderInfo{ key: "local_ir_root",
                      is_factory: false,
                      files: [ ProductData{ name: "QC-MCP-TEST-IR2",
                                            date: "2026-09-06T17:53:06Z" } ] },
  ir_payload: <4154 bytes>
}                                                        on message type 4
```

Note what is **not** there: no `action` (so `CREATE`, the proto3 default), no
`total_bulk_create_count`, no key on the file entry, and no path anywhere. The
whole envelope is a folder key, a display name, a date, and the bytes.

#### The payload is re-encoded to 32-bit float

The fixture on disk is a 21 ms, 24-bit, 48 kHz mono WAV of 3116 bytes. What
Cortex Control puts on the wire is 4154 bytes and a different format:

| | on disk | on the wire |
| --- | --- | --- |
| `fmt ` chunk | 16 bytes | 18 bytes |
| format | PCM | IEEE_FLOAT |
| bits | 24 | 32 |
| `fact` chunk | absent | present, 1024 samples |
| `data` | 3072 bytes | 4096 bytes |

So Cortex Control does decode and re-encode before sending. An earlier revision
of this note ruled that out because `addLocalImpulseResponse` takes no buffer -
the signature reading is still right, but the conversion simply happens
elsewhere, and the wire bytes outrank the inference.

One quirk to copy deliberately or not at all: the emitted RIFF size field says
4192, which describes a 4200-byte file, while only 4154 bytes are sent. The
device accepts the mismatch.

#### Replayed from this stack, which settles the rest

The captured envelope was rebuilt and sent through `pyquadcortex` with two
different payloads and everything else held equal:

| payload | result |
| --- | --- |
| the 32-bit float bytes Cortex Control sent | **stored** |
| the original 24-bit PCM file | **silently ignored** |

That answers the question this document carried for three revisions. The file on
disk was never the problem and the envelope was never the problem; **the wire
payload must be a 32-bit IEEE-float WAV**. A host that reads a user's `.wav` and
forwards its bytes unchanged will fail on anything else, with no error at all.

Two further facts fell out of the replay:

- **The key is a content hash.** Importing identical audio under a new name
  yields the same `CIR_…` key and *replaces* the existing entry instead of
  adding one; halving every sample yields a different key and a second entry.
  That is why supplying a key from the host never changed anything.

  ```
  QC-MCP-TEST-IR3   key=CIR_cd2f33341295a482cf3eea966fbc94e   # the captured audio
  QC-MCP-TEST-IR5   key=CIR_cdc892a018ccda5f4c9ffa4d2de0a2fe   # same audio, halved
  ```

- **`total_bulk_create_count` controls progress reporting, not the import.**
  Omitted, as Cortex Control omits it, the import runs and the device says
  nothing. Set to 1, the same import runs *and* answers on type 57:

  ```
  BulkOperation finished=false progress=0.00  "Importing IRs, please wait."
  BulkOperation finished=false progress=1.00  ""
  BulkOperation finished=true  progress=0.00  ""
  ```

  An earlier revision called the field *required*, because omitting it produced
  silence. The silence was the missing progress channel, not a missing import;
  the imports in those probes failed for the payload-format reason above.

- **The folder key does not matter.** `2_q`, `local_ir_root`,
  `/media/p4/CustomIRs` and omitting the folder all behave identically. User IRs
  live at `/media/p4/CustomIRs/Impulse Responses/` on the device; that path and
  the literal `CustomIR` sit together in the Cortex Control binary at
  `0x0310e8a8`, next to `irImportFinished` and the file filter `*.wav;*.aiff`.

Reading the library back shows the folders user IRs live between:
`local_ir_root` and `2_q` ("My IRs"), while the 690 entries under
`/opt/neuraldsp/impulse_responses` are plugin assets that expose a name and no
key, and the unit cannot load them.

> One caution. During the probing, before the format was understood, a malformed
> 32-bit-float payload knocked the QC's HID interface off the USB bus. It
> re-enumerated on its own after about 15 seconds with all 74 presets intact,
> but it is a real crash. Well-formed float payloads are handled cleanly.

## What the rest of the protocol looks like on the wire

The same capture technique applied to ordinary UI actions. Every block below is
bytes Cortex Control 4.1.0 actually sent, decoded through this stack's own
registry, so it doubles as a conformance check on our encoders.

**KeepAlive (32)** — once per second while idle, not every five:

```
KeepAlive{action: UPDATE, request_id, is_online: true}          6 bytes
```

**Scene change (13)** — `selected_scene` is 0-based, A=0:

```
Scene{action: UPDATE, request_id: 16, selected_scene: 1}        6 bytes
```

**Preset navigation (2)** — the full setlist path every time, 0-based position,
and `is_factory` written explicitly even when false:

```
SetlistPosition{action: UPDATE, request_id: 19,
                folder_key: "/media/p4/Presets/My Presets",
                position: 29, is_factory: false}               38 bytes
```

**Parameter write (1)** — one sparse `Grid` message per pointer move, no
coalescing, the model addressed by grid position rather than by hash:

```
Grid{action: UPDATE, request_id: 25,
     preset: {chains: [{row: 0,
              models: [{column: 0,
                        params: [{index: 0,
                                  param_values: [{float_value: 0.44207263}]}]}]}]}}
```

Dragging one knob across its range produced 26 of these. The value is plainly
normalized: the last one sent was `0.17337024` and the editor then read
`17.3 %`.

**Preset save (4)** — positional, and carries no payload at all. The device
writes its own edit buffer into the addressed slot:

```
File{request_id: 39, type: 0,                                  // 0 = PRESET
     folder: {key: "/media/p4/Presets/My Presets", is_factory: false,
              files: [{index: 28, instrument: 0}]}}            44 bytes
```

**Tuner (27 + 6)** — showing the tuner is *two* messages, and the second is the
one this stack is missing:

```
ShowTuner{action: UPDATE, request_id: 8, show: true}            6 bytes
Tuner{action: UPDATE, request_id: 9, enable_meter: true}        6 bytes
Tuner{action: READ}                                             2 bytes
```

Hiding it sends `ShowTuner{action: UPDATE, request_id: 10}` with `show`
**omitted**, then `Tuner{enable_meter: false}`. Our `show_tuner` writes an
explicit `18 00` for hide and its comment claims Cortex Control does the same;
the capture shows Cortex Control relies on proto3 omission instead. Both reach
the device as false, so the encoder is fine and only the comment is wrong.

**Tap tempo (33)** — writes `GlobalTempo` parameter **0**, normalized:

```
GlobalTempo{action: UPDATE, params: [{index: 0,
                                      param_values: [{float_value: 0.175}]}]}
```

The footer read `75BPM` at that moment, and `(75 - 40) / (240 - 40) = 0.175`
exactly — an independent confirmation of `MINIMUM_TEMPO_BPM = 40` and
`MAXIMUM_TEMPO_BPM = 240` in `qc-protocol::domain`.

**But the device does not always act on it.** Parameter 0 is writable only
while parameter 1 — the PRESET/GLOBAL switch — is GLOBAL. Measured directly:

| tempo mode | write | parameter 0 afterwards |
| --- | --- | --- |
| PRESET (`param1 = 0.0`) | `0.175`, then `0.60` | unchanged at `0.4000` |
| GLOBAL (`param1 = 1.0`) | `0.60` | `0.6000` |
| GLOBAL (`param1 = 1.0`) | `0.30` | `0.3000` |

No error, no reply, no acknowledgement in the PRESET case — the write is simply
dropped. The unit here was in PRESET mode during the capture, so Cortex
Control's tap almost certainly did nothing to the global tempo either, and its
`75BPM` footer is its own optimistic display. Anything that wants "set the
tempo I can hear" has to read the mode first and then choose between this and
the preset's own TempoControl block.

**ModelPreset (71)** — a type `pyquadcortex`'s enum does not have at all: its
table stops at 70 and names 71 as the `NumberOfMessageTypes` sentinel, whereas
CorOS 4.1.0 has 72 real types. Sent either side of a save:

```
ModelPreset{action: DELETE, request_id: 40, loaded_row: 0, loaded_column: 0}
GridModelMeter{action: DELETE, request_id: 41, row: 0, column: 0}
ModelPreset{action: CREATE, request_id: 42, loaded_row: 0, loaded_column: 0}
```

Read as teardown and re-subscription of the edited block's feeds; the exact
contract is not established, only the bytes.

### What this changed in our implementation

Both gaps the capture exposed now have builders in `qc-protocol::commands`,
each with a unit test asserting the bytes Cortex Control sent:

- **`set_tuner_meter(enabled)`** — `TunerMessage.enable_meter` on type 6, the
  half of Cortex Control's tuner pair we were missing. It writes that field and
  nothing else, so it cannot clobber the user's input, mute or reference.
- **`set_global_tempo(bpm)`** — `GlobalTempo` parameter 0, alongside the
  existing `set_tempo_mode` on parameter 1. The read side already handled this
  parameter correctly (`decode_tempo_settings` maps it as `40 + 200 × value`),
  which the `0.175`/`75BPM` observation independently confirms.

Neither is exposed as a gateway action yet, and both have a caveat that argues
for care rather than haste:

- The meter's payload is unverified. With nothing plugged into the unit,
  enabling it produced no `TunerMessage` pushes at all over 12 seconds, so
  `TunerMessage.meter`'s range and unit stay unmeasured and nothing decodes it.
- A `set_global_tempo` action would be a silent no-op whenever the device is in
  PRESET mode, per the table above. Exposing it means picking a behaviour —
  switch the mode first (a global setting change the caller did not ask for),
  or refuse and report the mode — and that is a product decision, not a
  protocol one.

Worth recording separately: `show_tuner` (type 27) is built and unit-tested in
`commands.rs` but is **not on the live path**. `device.showTuner` is served by
`request.rs` as MIDI CC 45 (`profile::TUNER_CONTROLLER`), and
`DeviceCommand::ShowTuner` is constructed nowhere outside tests.

## The connection handshake, captured from launch

`tools/capture_cortex_hid_writes.py --wait-for-launch 60` polls for the process
so the attach lands before the USB handshake, which an attach to an
already-running instance can never show. Cortex Control 4.1.0 opens a session
with 35 distinct message types, in this order:

```
52 ResetCommsBuffers  {request_id: 1, session_id: "5538f3285b154317bb1cbfedc210c2f1"}
10 Version            READ
10 Version            UPDATE {cortex_control_version: "4.1.0"}
26 CPULoad            DELETE {request_id: 3}
49 Connection         {connected: false}
49 Connection         {connected: true}
51 ModelRepo          READ
35 ModuleStats        READ
26 CPULoad            {request_id: 1}
58 License · 21 UndoRedo · 3 IOSettings · 9 GeneralSettings · 24 ShowGigView
14 Mode · 38 GlobalEQ · 17 MasterVolume · 4 File · 71 ModelPreset
46 CloudProduct · 20 RecentsFavorites (x6) · 42 CompilerInhibitedModules
15 RecallPreset · 50 NewModels · 54 PinnedModels · 19 DefaultParameters
33 GlobalTempo · 2 SetlistPosition · 34 PresetDirty · 13 Scene
57 BulkOperation · 60 Updater                                       all READ
37 GridModelMeter     {row: 0..3, column: -1}                       x4
 5 IOMeter            {request_id: 6}
43 SystemTimeSync     UPDATE {ms_since_epoch: 1788711237617}
18 CloudLogin         (non-protobuf body)
61 UpdaterForward     UPDATE {updater_request_id, response: {...}}
```

Two shapes are worth copying. `Connection` is sent **false then true**, not just
true. And a `GridModelMeter` subscription uses `column: -1` to mean "every
column in this row", which is why four messages cover the whole grid.

### What Cortex Control uses here that this stack does not

`profile::LIVE_SUBSCRIPTIONS` covers 21 types plus `version_hello`, `ModelRepo`
and `Connection`. Set against the capture, these are the gaps — all confirmed
absent from our Rust by search, not assumed:

| type | what it is | why it might matter |
| --- | --- | --- |
| 5 IOMeter | input/output level meters | live metering on our device surface |
| 37 GridModelMeter | per-block meters, `column: -1` per row | gain reduction and block activity |
| 43 SystemTimeSync | host sets the device clock | the QC has no clock of its own to trust |
| 26 CPULoad | live DSP load | our CPU readout exists only as a screen fixture |
| 61 UpdaterForward | host relays the firmware update check | see below |
| 46 CloudProduct, 18 CloudLogin | Cortex Cloud plumbing | account features we do not implement |
| 71 ModelPreset | read at connect and around edits | contract not established |

**`SystemTimeSync` is now sent, but do not believe the obvious story about it.**
The host hands the device a `ms_since_epoch` once per connection, and the
obvious reading — that this is where saved content gets its dates — is wrong.
Two tests on hardware say so:

| test | result |
| --- | --- |
| import an IR with the `date` field omitted | stored with **no date at all**, whatever the clock said |
| set the clock to 2020-01-02, then save a preset | stamped with the **true wall time**, with and without a `request_id` |

So an IR's `date_ms_since_epoch` is the host's own `date` string echoed back,
and preset dates come from a time source the sync does not override. Type 43
answers no READ either, so the device clock cannot be inspected directly. What
the field actually reaches — device logs, backups, the unit's own UI — is not
established. `commands::sync_system_time` is in `initialization` for handshake
fidelity, and its doc comment says exactly this so no caller builds on it.

**The host is the device's internet connection.** `UpdaterForward` (61) carries
a plain-JSON body the host fetched on the device's behalf:

```json
{"message":"There is no new version available.","requestId":"835eafb3-…"}
```

`ProductForward` (29), `BackupsForward` (30), `LogsForward` (31) and
`CloudProduct` (46) are the same pattern. The QC does not reach the network
itself for these; it asks whichever host is attached. That also explains
`GeneralSettings.disableInternetConnectionCheck`.

### One more thing the host announces

`version_hello` tells the device which Cortex Control it is talking to. Ours
says `4.0.1` (`profile::CORTEX_CONTROL_VERSION`); the shipping app now says
`4.1.0`. Nothing observed depends on it, but it is a version gate the firmware
could use, and it is worth knowing that we currently identify as an older build.

### The device will hand over its screen and its widget tree

`RemoteControlMessage` (72) has three payloads. This stack already used `mouse`
for tap and drag, and `screenshot` is wired all the way out as
`device.captureScreen`. The third, `graphics_tree`, was unused; asking for it
returns the live `zenUI` scene graph as indented text, with each node's class,
its text and the icon it draws:

```
zenUI::RootGraphicsItem
  zenUI::GraphicsItem
    zenUI::Grid
      zenUI::Chain
        zenUI::InputPortItem
          zenUI::GraphicsItem
            text : 'In
1'
        zenUI::ChainItemContainer
          zenUI::SlotItem
          zenUI::ModelItem
```

A real reply on the Grid screen was 5230 characters over 171 lines, and named
`SceneIndicator`, `NavigationBar`, `NavMenuBlock`, `ModeButton`,
`SplitCableHelper` and `PressAnimationView` among others. `commands::read_graphics_tree`
and `responses::decode_graphics_tree` now expose it.

This is the structural counterpart to the screenshot for the reconstruction work
in `docs/qc-screen-coverage-matrix.md`: the PNG says what the device drew, and
the tree says which widgets it thinks it drew and what text they hold - which a
pixel diff cannot report.

### How to reproduce a capture

```
python tools/capture_cortex_hid_writes.py --seconds 90 --out artifacts/cortex-hid/trace.bin
python tools/analyze_cortex_hid_trace.py artifacts/cortex-hid/trace.bin
```

Cortex Control has no `hid.dll` imports: its Windows HID backend writes output
reports straight through `kernel32!WriteFile` on the device handle, so
breakpointing that one export and keeping 129-byte buffers whose first byte is
`0x02` yields its wire traffic and nothing else.

Two things that will otherwise waste time. Cortex Control's footer bar sits
*underneath* the Windows taskbar when the window is maximized, so clicks aimed
at TUNER or TAP hit the taskbar and the capture comes back empty — un-maximize
first. And JUCE ignores UI Automation's `InvokePattern` here: invoking a scene
button changes its highlight and sends nothing, so drive it with real mouse
input and judge the result from the trace, never from the button's appearance.

## Long host-to-device messages need pacing

This is not IR-specific and it matters for anything large.

A 72 KB message frames into 572 HID reports. Written back to back as fast as the
host can issue them - 0.19 s for the whole message - the device answers **0 times
out of 3**. The same payload with a 0.5 ms gap after each report takes 0.6 s and
is answered **3 times out of 3**; at 1 ms, 3 out of 3 again.

This looked at first like a size ceiling, and a coarse sweep supported that: 48 KB
answered, 72 KB and 96 KB silent. Bracketing it disproved the idea outright -
66.0 KB silent, 66.5 KB answered, 67.0 KB answered, 67.5 KB silent, 69.0 KB
answered. Loss that comes and goes across a 3 KB span is not a limit. There is
no ceiling in the framing either: reports carry 126 payload bytes each with no
cap on how many.

So the constraint is delivery. Every QC write STALLs its status stage by design,
so a long burst has nothing pacing it and the device drops reports silently -
the message never reassembles and no error is ever reported. Any host sending a
multi-hundred-report message should space its reports; roughly half a millisecond
was enough here.

## Related notes


- `docs/NDSP_FILE_FORMATS.md` — preset `.pb`, backup JSON wrapper, Cloud packaging
- `docs/HARDWARE_CONFORMANCE.md` — how the physical suite is run
