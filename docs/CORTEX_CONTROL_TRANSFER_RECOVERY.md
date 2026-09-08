# Cortex Control backup and updater transfer recovery

This note combines Cortex Control 4.1.0 static evidence, the extracted protobuf
schemas, and the project’s physical-device backup traces. It defines recovery
rules for the shared runtime without enabling Cortex Control’s device-originated
HTTP proxy.

Evidence labels:

- **Binary:** exact schema, retained RTTI/method name, or reviewed machine code.
- **Physical:** observed on the connected retail Quad Cortex.
- **Project policy:** a conservative bound chosen by this implementation; it is
  not attributed to Cortex Control unless separately labelled Binary.

## Binary identity and reproduction

Reference: Cortex Control 4.1.0, SHA-256
`9BE548FB6CBD2E8C80715015C2A2F0F248C9B01A7165004E2B017FFE2B14E65A`.

Run:

```powershell
python tools/extract-cortex-protocol.py
python tools/extract-cortex-control-inventory.py
```

The complete `ProductionAutomation.proto` descriptor provides the backup,
forwarding, and updater fields. The binary inventory records relevant RTTI and
method-name offsets without copying URLs, credentials, headers, user data, or
factory content.

## Static transfer evidence

**Binary, high confidence:**

- `LocalBackup` (40) has optional `backup_json`, `can_apply_backup`,
  `applied_backup`, and `is_last_chunk` fields.
- `BackupsForward` (30) identifies a transfer with `backups_request_id` and can
  carry URL, headers, timeout, request payload, request terminal marker,
  response payload, response terminal marker, and response error code.
- Backup-forward operations are create/update, download, rename, delete, list,
  fetch-URL, and upload-status.
- `UpdaterForward` (61) identifies a transfer with `updater_request_id` and
  distinguishes check, changelog download, update-header download, and update
  download. Responses carry bytes, `is_last_chunk`, and an error code.
- `Updater` (60) distinguishes check, check-and-download, install, restart
  download through Cortex Control, and cancel. Device states are idle,
  requesting, downloading, updating, reboot, and failed; download and install
  progress are independent optional values.

Retained names independently establish separate sender/receiver types and
chunking helpers:

- `LocalBackupMessageSender/Receiver` and `sendBackupChunk`;
- `BackupsForwardMessageSender/Receiver`, `sendBackupChunk`,
  `sendCloudForwardResponse`, and `uploadCloudBackupInChunks`;
- `UpdaterForwardMessageSender/Receiver`, `sendResponseChunk`, and
  `sendUpdaterForwardResponseInChunks`; and
- `FirmwareUpdaterStateController`, `TransferThread::run`,
  `transferStarted`, `transferHeaderChanged`, and `transferStateChanged`.

These names prove chunked/stateful architecture, not exact timer values or
successful retail-firmware execution of every cloud/update path.

## Physical LocalBackup behavior

**Physical, high confidence for the tested firmware/device:**

- One `CREATE` produced 12 ordered JSON chunks: 11 full chunks and one terminal
  chunk.
- Backup chunks did not echo `request_id`; message type or request ID alone
  cannot correlate a transfer.
- A newly attached collector can inherit fragments or a terminal marker from
  an older uncorrelated stream. Synchronization therefore begins only at a JSON
  object boundary.
- The assembled document is accepted only if it is valid JSON with
  `type: "backup"` and `creator: "quad"` and is within the shared maximum size.
- Once the first document chunk is accepted, a timeout, malformed chunk,
  oversized document, invalid terminal document, cancellation, or transport
  loss terminates that attempt. A partial document is never combined with a
  retry.
- The dedicated keepalive continues during the transfer. In the proven Windows
  path, successful completion does not itself require reconnecting.
- Android currently performs host-level recovery after saving a backup. This is
  a host behavior, not evidence that the protocol universally requires a
  reconnect after a valid terminal chunk.
- A remote pointer left pressed can prevent the QC from starting the backup
  stream; physical gesture tests must finish RELEASE before backup begins.

## Retry and timing policy

No unambiguous Cortex Control timer/retry constants have been recovered from
the binary. Generic controller and UI timers are interleaved, so assigning an
immediate value to backup/update recovery without a call-graph proof would be
guesswork.

The existing LocalBackup values remain unchanged as **project policy backed by
physical testing**, not claimed Cortex Control constants:

| Bound | Value | Meaning |
|---|---:|---|
| Overall transfer | 180,000 ms | Absolute cap across all pre-start attempts |
| First document chunk | 60,000 ms | May trigger one re-request only while no document has started |
| Inter-chunk stall | 15,000 ms | Terminal failure after document start |
| Maximum requests | 2 | Initial request plus at most one pre-start retry |
| Maximum document | 33,554,432 bytes | Hard allocation/content bound |
| Keepalive interval | 5,000 ms | Independent of inbound chunk progress |

The shared runtime has no retry action after stream start. Ignored stale prefix
fragments extend the pre-start observation window but do not cause another
request to be injected into a stream which may still be draining. A malformed
message now makes the runtime terminal even when the lower-level assembler
resets its buffer, preventing accidental eligibility for a duplicate request.

Forwarded backup/update streams use caller-supplied total/stall/size policy and
likewise have no replay action. A retry, if ever added, must create a fresh
service request ID and only occur after the old transfer is cancelled or fully
drained.

## Chunk and stale-transfer rules

The shared `ChunkTransferRuntime` keys every stream by family and service
request ID and applies these rules:

1. A chunk for a different ID is reported as stale and cannot contribute bytes
   or a terminal marker.
2. Every accepted chunk updates byte/chunk counts and the stall deadline.
3. A nonzero remote error is immediately terminal and typed.
4. `is_last_chunk: true` completes the stream exactly once.
5. Chunks, errors, or duplicate terminators arriving after complete, cancelled,
   or failed state are stale and ignored.
6. Overall timeout, stream stall, size overflow, and transport loss are distinct
   terminal failures.
7. Cancellation is terminal and does not generate a retry.

An absent `is_last_chunk` is not completion. This is essential for updater
downloads and backup bodies, where a valid prefix can otherwise be mistaken
for a complete artifact.

## Updater forwarding lifecycle

The shared `UpdaterTransferRuntime` records but does not execute decoded
device-originated updater-forward requests. Request types 0–2 enter requesting
data; type 3 enters downloading data. A different request ID cannot replace an
active nonterminal transfer.

Device `Updater UPDATE` messages drive:

```text
Idle -> RequestingData -> DownloadingData -> Updating
  -> AwaitingReboot -> Reconnecting -> AwaitingDeviceConfirmation -> Complete
```

Sparse updater messages preserve the previous phase and progress values.
Progress must be finite; its numerical scale remains device-defined because the
schema does not specify whether a particular firmware reports a fraction or a
percentage.

An idle update is terminal only when its reported status matches the operation:
check accepts new-version-available or no-new-version, while download accepts
new-version-downloaded. A fresh forwarding request ID clears prior operation,
status, progress, and error metadata so an earlier lifecycle cannot falsely
complete it.

Cancellation is accepted only while requesting or downloading. Once
installation has begun, cancellation is rejected rather than pretending a
firmware write can be safely interrupted. A subsequent idle update confirms a
requested cancellation. Device state `FAILED`, malformed updates, an unknown
state, or unexpected transport loss become typed failures.

The reboot state is the one positive reconnect requirement. Disconnect after
`AwaitingReboot` enters `Reconnecting`; reopening the transport enters
`AwaitingDeviceConfirmation`; only a subsequent device update confirming idle
completes the lifecycle. Reconnection alone is not success.

## Recovery matrix

| Situation | Retry | Reconnect | Result |
|---|---|---|---|
| Local backup: no document start by first-chunk deadline | At most one | No | Fresh request while still pre-start |
| Local backup: stale leading tail/terminator | No immediate retry | No | Ignore and keep waiting within bounds |
| Local backup: valid terminal document | No | Not inherently | Complete once |
| Local backup: stall/malformed/oversized/invalid after start | Never | Only if transport/session was lost | Fail and discard partial document |
| Forward stream: wrong request ID | Never splice | No | Report stale |
| Forward stream: cancellation or nonzero remote error | No | No, unless transport separately fails | Terminal typed state |
| Updater: disconnect during ordinary download/update | No automatic replay | Required to restore session | Failed; outcome remains uncertain |
| Updater: expected reboot state then disconnect | No command replay | Required | Await fresh device confirmation |

## Network execution boundary

The public runtime’s only network decision is `Disabled`. There is deliberately
no `Allowed` variant and no HTTP client in the transfer module. Device-provided
URLs and headers are untrusted input, even when they came through an owner’s
USB connection.

Enabling forwarding requires, at minimum, all of the following as one reviewed
change:

- exact HTTPS origin and path allowlists per operation;
- DNS/IP and private-network restrictions, including rebinding protection;
- redirect rejection or per-hop revalidation;
- an explicit credential source and header allowlist with log redaction;
- request/response/chunk/total size and time limits;
- TLS validation and failure mapping;
- cancellation semantics and concurrency limits;
- prevention of cross-request ID data mixing;
- no automatic replay of non-idempotent methods; and
- physical tests proving device expectations without installing firmware.

Until that policy exists, hosts may decode, audit, reject, and expose typed
state for diagnostics, but must not execute the requested URL.

## Verification

Focused shared-runtime tests cover:

- complete-once terminal behavior and stale ID rejection;
- no retry/splice after a started stream stalls;
- cancellation, remote error, timeout, size, and transport-loss terminals;
- a compile-time API with no network-enable path;
- updater request-ID isolation and cancellation boundary; and
- reboot disconnect/reconnect/device-confirmation sequencing.

LocalBackup regression tests additionally prove pre-start-only retry,
keepalive independence, complete-once delivery, and terminal handling of a
malformed started stream. Physical release testing remains required; typed
state-machine tests do not prove Cortex Cloud or firmware-update execution.
