# QC Remote product-safety risk assessment - draft

Assessment date: 2026-09-07
Publisher: Freevia
Status: incomplete; not release approval

This register covers foreseeable harm from controlling a connected musical
device. It must be reviewed against the signed Windows and Android builds, the
supported firmware list, and the completed physical release reports before
`productSafetyRiskAssessmentCompleted` is set. Warnings are supporting controls,
not substitutes for feasible technical prevention.

## Risk scale

- Critical: credible personal injury, equipment damage, or unrecoverable broad
  data loss.
- High: material device/user-data corruption, unsafe live behavior, or loss of
  control requiring recovery.
- Medium: reversible incorrect operation or limited loss with a documented
  recovery path.
- Low: inconvenience without credible safety or material data impact.

## Hazard register

| ID | Hazard and foreseeable sequence | Initial risk | Current controls and evidence | Residual status |
| --- | --- | --- | --- | --- |
| PS-01 | Unexpected master-output increase causes excessive sound level, hearing risk, or downstream-equipment stress. | Critical | The generated `set_master_volume` contract requires the expected prior value and explicit risky-operation confirmation. Live master volume uses authoritative QC state between coalesced writes. Shared legal copy instructs safe output levels. | High pending signed-build physical limit, stale-state, disconnect, and rapid-drag testing at a safe monitored output. |
| PS-02 | The app or AI displays a parameter value that differs from the device and a user relies on the false state. | High | Expected-state guards, authoritative readback, stale-echo suppression, full-snapshot reconciliation, and live parameter-frame tests exist. AI copy now distinguishes proposed text from verified device results. | High because the user previously observed a real mismatch. Require a complete model/parameter sampling report on both hosts and supported firmware, including dependencies and scene changes. |
| PS-03 | A timed-out non-idempotent mutation is replayed and duplicates, deletes, moves, renames, or toggles twice. | High | Native hosts distinguish retryable reads/idempotent writes from structural writes. Android tests require reconnect/readback without replay; undo/redo refresh authoritative state rather than replaying. | Medium pending equivalent signed Windows and Android fault-injection evidence for every non-idempotent action family. |
| PS-04 | Save, overwrite, reload, delete, restore, or setlist operations destroy unsaved presets or user organization. | High | Risky and persistent operations use explicit confirmation fields and expected preset/setlist guards. Save and structural workflows perform authoritative readback. Terms require independent backups. | High until backup is physically certified and every destructive action has tested cancellation, stale-context rejection, and recoverability. |
| PS-05 | USB recovery, request amplification, or an invalid sequence destabilizes or crashes the connected device. | High | Catalog polling was changed to bounded backoff; recovery uses the shared ready timeout; the r16 Windows regression passed 105 actions with no recurrence and restored ready synchronized state. Private incident evidence remains under monitoring. | Medium under monitoring; reopen as release-blocking on recurrence. The separate backup case remains mandatory. |
| PS-06 | An AI response falsely claims success or executes an excessive or unintended sequence of device operations. | High | Model text is not treated as verification; tools provide authoritative results. Access has four user-selected tiers, generated action validation, expected-state guards, confirmations for risky actions, cancellation, and a finite 1,000-command ceiling. AI and app-origin messages are visibly distinct. | High pending adversarial tests for instruction injection in device/tool output, cancellation latency, large preset builds, repeated writes, and each access tier. Confirm that the 1,000-command ceiling cannot bypass per-action guards. |
| PS-07 | A remote party obtains control through relay pairing, credential leakage, stale access policy, or deployment misconfiguration. | Critical | Relay credentials use platform protected storage, access mode is persisted, device identity is minimized, the relay is authenticated/rate-limited, and privacy copy states that the operator can read routed payloads. | High. Public relay deployment/operator remains undecided; disable it in public builds unless production authentication, revocation, abuse response, logging/retention, and penetration testing are approved. |
| PS-08 | A backup is incomplete, oversized, corrupted, mixed across retries, stored somewhere unintended, or reported complete before USB recovery. | High | Native backup validates container type, payload, integrity identifier, size, extension, and safe filename. Android requires recovery before success and never combines a partial document with a retry. | High and explicitly release-blocking until the separately gated physical backup case passes on each shipping host and restore validity is independently demonstrated. |
| PS-09 | Unsupported firmware or later updates change protocol semantics, producing wrong values or mutations. | High | Handshake/version state, protocol-generation parity, authoritative verification, dependency locking, and release provenance exist. | High until Freevia defines supported firmware, refusal/degraded behavior for unknown versions, update monitoring, and regression evidence for every supported version. |
| PS-10 | Live-performance use causes unintended preset, scene, tempo, bypass, routing, tuner, or I/O changes at an unsafe moment. | High | UI surfaces expose connection/synchronization state; command coordination rejects stale expected state; risky tuner/session operations require confirmation; product copy instructs pre-performance testing and disclaims safety-critical use. | Medium to high pending a signed-build live-use test plan covering multi-touch, hardware/app concurrency, focus loss, reconnect, latency, and emergency manual recovery. |
| PS-11 | Malicious attachment, preset name, model response, or device text triggers code execution, prompt injection, path traversal, or data disclosure. | High | Attachments are allowlisted and size-bounded; staged names are generated; stale files are removed; model/device/tool content is treated as untrusted; persistent device identifiers are removed; native shells use restricted platform policies. | Medium pending parser fuzzing, archive/PDF/media handling review, prompt-injection evaluation, and signed-build security testing. |
| PS-12 | A faulty or compromised update remains available or users cannot identify, obtain, or verify a safety fix. | High | Lockfiles, SBOM generation, provenance, dependency monitoring, incident response draft, and manual public-release gating exist. | High until signing-key custody, update channel, rollback policy, supported period, user notification route, and withdrawal/recall authority are finalized. |

## Required release evidence

The final reviewer must link each residual High or Critical risk to one of:

1. verified technical mitigation reducing it to an accepted level;
2. removal or disabling of the affected feature in the shipping build; or
3. a dated, reasoned acceptance by an authorized Freevia representative,
   including why further reduction is not feasible and what user information is
   supplied.

At minimum retain the action-contract version, source revision, signed artifact
hashes, SBOM, firmware and device test matrix, hardware reports, fault-injection
results, known limitations, warnings, provider configuration, and incident
links. Private device/user evidence must remain outside public source archives.

This draft currently leaves multiple High risks open. It does not justify setting
`productSafetyRiskAssessmentCompleted` to true.
