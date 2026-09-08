# QC Remote

An independent, unofficial control platform for compatible guitar hardware. The project provides functionally aligned Windows and Android controllers plus a standalone MCP server, while keeping future iOS, web, and other clients from duplicating device-control logic. Quad Cortex compatibility is explained in the notice below.

> [!IMPORTANT]
> QC Remote is an independent, unofficial project. It is not affiliated with, authorized, sponsored, endorsed, or supported by Neural DSP Technologies Oy. Neural DSP and Quad Cortex are trademarks of Neural DSP Technologies Oy and are referenced only to identify compatibility. Device support uses an independent native Rust implementation informed by the community-maintained `pyquadcortex` project. The private protocol remains firmware-sensitive.

> [!CAUTION]
> This public repository does not yet have a repository-wide license. Do not
> assume that public visibility grants permission to copy, modify, or distribute
> material that is not covered by an explicit file- or package-level license.
> Freevia intends an open-source release, but the exact project license and
> ownership record must be finalized first.

See [Compatibility and trademark notice](TRADEMARKS.md) and
[third-party notices](THIRD_PARTY-NOTICES.md).

## Repository shape

```text
apps/                       End-user clients
  windows/                  Tauri + web UI desktop client
  android/                  Capacitor Android client with native USB, AI, and voice adapters
  ios/                      Future iOS composition root
services/                   Independently runnable processes
  device-broker/            Native single-owner USB/protobuf broker
  device-gateway/           Legacy Python parity gateway for development
  mcp-server/               Standalone MCP server
packages/
  rust/
    qc-protocol/             Shared QC framing, protobuf schema, and native state engine
    qc-android/              Narrow JNI binding for the shared native state engine
  python/
    qc-core/                Pure device model, use cases, ports, safety rules
    qc-pyquadcortex/        Development-only pyquadcortex parity adapter
    qc-gateway-client/      Client for a running device gateway
  typescript/
    qc-core/                Shared client behavior, commands, reducers, transport port
    qc-client/              Generated contracts and gateway transport types
    qc-ui/                  Platform-neutral web UI primitives
    qc-form-factors/        QC geometry, skins, and control manifests
contracts/                  Versioned wire schemas; the cross-language source of truth
docs/                       Product, architecture, and decision records
tests/                      Cross-module contract and real-hardware tests
```

Every directory initially contains a boundary document. Code is added only to the module that owns the responsibility.

## Architectural rules

- `qc-core` contains no HID, MCP, HTTP, UI, Tauri, or operating-system imports.
- Production device behavior lives in the shared Rust crates; `qc-pyquadcortex` isolates the optional Python parity oracle.
- Exactly one process owns the QC USB-HID session at a time.
- Clients communicate in typed domain commands and events, never protobuf packets or raw grid coordinates.
- `contracts/` is the source of truth for cross-process and cross-language messages.
- The MCP server is independently installable and never imports a desktop or mobile app.
- Form-factor geometry, skins, and behavior are separate; adding a client or skin must not change device logic.
- AI is an optional adapter. Manual device control continues to work without an AI provider.

See [Architecture](docs/ARCHITECTURE.md), the [Windows implementation plan](docs/WINDOWS_IMPLEMENTATION_PLAN.md),
and the [pyquadcortex coverage and deferred OpenCortex research](docs/PYQUADCORTEX_COVERAGE_AND_OPENCORTEX.md).

## Status

The Windows client now has a Tauri/WebView2 shell, reusable hardware surface,
form-factor/skin packages, keyboard/mouse interaction, connection diagnostics,
menus, chat composer, and microphone capture lifecycle. A native Rust broker
owns QC HID, exposes the complete application gateway API, keeps the session
warm, and publishes realtime state from the same Rust decoder compiled into
Android. The optional Python gateway is a development-only differential oracle.
One Rust session machine now owns reconnect,
handshake, keepalive, and link-loss policy for both native hosts, and shared
payload schemas generate the TypeScript, Rust, and Python boundary types.
Scene selection, block bypass, tuner, and
Gig View controls are enabled, along with mode-aware A–H footswitch emulation
through the QC's Windows MIDI endpoint and verified tempo/encoder/tap control,
live setlist browsing, installed model discovery, guarded block placement/removal/movement,
STOMP assignment and signal-routing editing, guarded preset
recall, bank navigation, metadata-driven block parameter editing, and explicit
dirty-state recovery. The Grid rails and split/rejoin markers are derived from
the live preset's four-row routing topology rather than demo labels, including
parallel-lane blocks and split/rejoin points. Visible device state synchronizes
in the background so touchscreen changes appear without a manual refresh.
Explicit disconnect/reconnect, a privacy-safe connection
log, current-device details, and an allowlisted redacted diagnostics export are
available from the application menus. State-changing commands use expected-state guards,
value readback, and dirty-state verification. Local `.qcw` workspace snapshots
can be saved and reopened without touching the hardware. Persistent preset,
library, and global-setting writes require explicit review and confirmation.
The chat dock now supports a
configurable OpenAI Responses-compatible conversational model, supplies current
QC context as untrusted data, and exposes an allowlisted set of typed device
tools. Read tools can be followed by a natural answer; performance actions
retain expected-state guards; bypass and parameter edits still require review
before temporary application. The deterministic offline command parser remains
available when no model is configured. Windows installer builds embed only the
native Rust device broker; Python and pyquadcortex remain source-level parity
tools and are not installed. Public installers do not include streaming-media
download or extraction tools. Users may attach files they own or are authorized
to process; those attachments remain subject to the selected model provider's
terms. An installed app does not require
Python, Node, Rust, the source tree, or a repository `.venv` at runtime.
Push-to-talk voice transcription is runtime-detected and opt-in: the app
discloses that stable Microsoft Edge speech recognition may send microphone
audio to Microsoft Azure before starting it, then routes the visible transcript
through the same guarded typed-command path.

The public MCP and remote-control services are implemented in Rust, with the
legacy Python server retained only as a compatibility oracle. Neither deployed
path exposes raw HID, protobuf, or arbitrary JSON-RPC; global-setting mutations
remain typed, allowlisted, and confirmation-gated.
See [Chat and MCP setup](docs/CHAT_AND_MCP.md).

The Android development client has been distributed privately through Firebase
App Distribution.
It presents the QC display, compact performance controls, and chat in a
phone-first layout. Android owns a direct USB-host HID session with the Quad
Cortex (USB permission is requested on first attachment). Development builds
can use Firebase AI Logic with Gemini without embedding a personal Gemini key;
that adapter and its Firebase AI dependencies are compiled out of the planned
general-audience public build. Development builds can also send Android
speech-recognition transcripts through the same chat/action path. The
mobile shell composes the same preset, Grid, routing, scene, parameter,
footswitch, history, save, and performance workflows as Windows, including the
same guarded assistant action executor, generated hardware-safe action
allowlist, and offline intent resolver. That shared allowlist covers the
contracted read, performance, edit, library, and confirmed system surface. Live
USB messages populate the preset grid, routes, scene metadata, setlist position,
dirty state, tempo, mode/footswitch state, and master volume through the shared
Rust state engine.
The Firebase project registers the stable distribution certificate used by
the tester APK. App Check is not yet activated in the project. Before enabling
Play Integrity enforcement for Firebase AI Logic, review the off-Play policy in
the hardware-conformance release checklist so Firebase App Distribution builds
are not rejected as unrecognized Play installs.

Run `npm run app-parity:check` for the executable capability inventory. It
distinguishes required Windows/Android parity from justified platform-only
features and validates the shared/native evidence for every listed capability.

The native transport and legacy parity adapter have been validated locally
against a connected Quad Cortex. See [Native QC device broker](docs/NATIVE_BROKER.md).

## Licensing

No repository-wide project license has been selected yet. Some components carry
explicit package-level licenses and third-party dependencies retain their own
licenses, but those notices do not license the repository as a whole. Release
builds include generated third-party notices. See the
[distribution-license decision](docs/DISTRIBUTION_LICENSE_DECISION.md).
