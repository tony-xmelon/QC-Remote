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
  - factory and production test: 65-71
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

### Writing — the shape, and what is still unproven

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
  11  bool   omit_factory_content
  12  int32  user_content_estimate
}
```

So an import is `FileMessage{action: CREATE, type: 1, folder: FolderInfo{key:
"local_ir_root", files: [ProductData{name}]}, ir_payload: <bytes>}` on type 4,
most likely paired with a `BulkOperation` (type 57) progress envelope, given
`total_bulk_create_count` and the fact that BulkOperation carries
`source_folder`/`destination_folder` and a `progress` float.

**This has not been verified on hardware, and three things remain unknown:**

1. whether `ir_payload` is a raw WAV or a converted/wrapped form;
2. whether one message carries a whole IR or the transfer is chunked; and
3. whether the device requires the `BulkOperation` wrapper around it.

Neither this stack nor the pyquadcortex reference implements IR upload, so there
is no prior art to copy. The rigorous way to close it is to capture Cortex
Control performing an IR import with `tools/capture_cortex_device_writes.py`,
rather than guessing at a persistent write to someone's device.

`tools/generate-hardware-test-ir.mjs` produces a disposable 24-bit/48 kHz WAV
suitable for that capture, and an IR present on the unit is the one fixture the
hardware conformance suite still cannot supply for itself (`load_ir`).

## Related notes

- `docs/NDSP_FILE_FORMATS.md` — preset `.pb`, backup JSON wrapper, Cloud packaging
- `docs/HARDWARE_CONFORMANCE.md` — how the physical suite is run
