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

### Writing — probed on hardware

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

Probed against a unit with an empty IR library. **The envelope is proven.**

```
FileMessage{action: CREATE, type: 1, total_bulk_create_count: 1,
            folder: FolderInfo{key, files: [ProductData{name}]},
            ir_payload: <bytes>}                              on message type 4
```

sent this way makes the device run a real import and answer on type 57, echoing
the request's `request_id`:

```
BulkOperation finished=false progress=0.00  "Importing IRs, please wait."
BulkOperation finished=false progress=1.00  ""
BulkOperation finished=true  progress=0.00  ""
```

What the probes settled:

- **`total_bulk_create_count` is required.** Without it the device is completely
  silent and no import is attempted. With it, the flow above runs every time.
- **The folder key does not matter.** `2_q`, `local_ir_root`, `/media/p4/CustomIRs`
  and `/media/p4/CustomIRs/Impulse Responses/` all behave identically, as does
  omitting the folder. Nor does the file metadata: a `.wav` suffix on the name,
  an explicit `key`, and a bare name are indistinguishable.
- **User IRs live at `/media/p4/CustomIRs/Impulse Responses/`** on the device.
  That path and the literal `CustomIR` sit together in the Cortex Control binary
  at `0x0310e8a8`, next to `irImportFinished` and the import file filter
  `*.wav;*.aiff`.

**The payload encoding is still unresolved.** Structurally valid mono 48 kHz
WAVs - 16-bit and 24-bit, at 21 ms, 100 ms and 500 ms - are all accepted and
then discarded: the import runs to `finished` and the library stays empty. So
`ir_payload` is not simply the contents of a `.wav` file. Gzipping it and
sending bare sample data without a container behave the same way.

### What Cortex Control's own symbols say

The binary keeps MSVC RTTI names for lambdas, and each builder's lambda names the
method that encloses it, so the senders' signatures survive demangling:

```cpp
void FileMessageSender::addLocalImpulseResponse(
    const juce::String&, const juce::String&, const juce::String&, bool) const;

void FileMessageSender::addPluginPreset(
    const juce::String&, const juce::String&, const juce::String&, bool,
    BinaryPreset*) const;

void FileMessageSender::addUserFile(
    int, const juce::String&,
    const std::optional<neural::cortex::usb::FileData>&) const;
```

All three build a `cortex_protobuf_v2::FileMessage` - their lambdas are
`std::function<void(FileMessage&)>`. The contrast between them is the useful
part:

- `addPluginPreset` takes the same three strings and bool **plus a
  `BinaryPreset*`**, which is `preset_payload`.
- `addUserFile` takes a `usb::FileData`, which is how file bytes travel.
- **`addLocalImpulseResponse` takes neither.** It receives only strings, so it
  is not handed decoded audio or a byte buffer; the bytes must be read inside
  from a path one of those strings carries.

That rules out one theory worth stating because the class list suggests it:
Cortex Control does carry JUCE's `WavAudioFormatReader`, `WavAudioFormatWriter`,
`AiffAudioFormatReader`, `ResamplingAudioSource` and `MemoryOutputStream`, which
looks like a decode-and-re-encode pipeline. The signature says that pipeline is
not on this path - nothing decoded is passed in.

What remains unknown is the *value* of those three strings and the bool. The
probes above already cover the obvious readings - name, key, folder key, a
destination path, with and without extensions - and none of them import.

Closing this needs ground truth rather than more guesses: capture Cortex Control
performing an IR import with `tools/capture_cortex_device_writes.py` and read
the bytes it puts in the field. Cortex Control also logs with source file and
line (`{parseState: UpdaterMessageReceiver.cpp,135}`) to
`%APPDATA%\Neural DSP\Cortex Control\logs`, so the import's own log lines will
name the functions it ran even without a HID capture.

> One caution from the probing. A 32-bit-float WAV payload knocked the QC's HID
> interface off the USB bus. It re-enumerated on its own after about 15 seconds
> with all 74 presets intact and nothing lost, but it is a real crash and worth
> avoiding: send integer PCM while experimenting.

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
