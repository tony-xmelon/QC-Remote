# Android data-safety and permission worksheet

Reviewed against the current source on 2026-09-07. This is a release worksheet,
not a completed Google Play declaration. Re-run it against the exact signed APK
and every enabled provider immediately before submission.

## Manifest permissions and user-facing purpose

| Permission or capability | Current purpose | Release disclosure/control |
| --- | --- | --- |
| `INTERNET` | User-paired relay and any separately approved online model | Direct Firebase/Gemini is excluded from the planned public release; disclose every provider and relay transfer that remains |
| `RECORD_AUDIO` | User-initiated speech recognition | Runtime microphone permission; disclose whether recognition is on-device or sent by Android/provider |
| `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_CONNECTED_DEVICE` | Keep the explicitly paired device relay available | Persistent notification and clear stop/unpair control required |
| `POST_NOTIFICATIONS` | Foreground relay notification on supported Android versions | Runtime notification choice; explain reduced relay behavior if denied |
| USB host and attach intent | Direct control of a user-connected device | Android USB grant; no blanket device access |

No location, contacts, advertising identifier, call log, SMS, camera, or broad
storage permission or FileProvider is declared in the reviewed manifest. Cleartext
network traffic is disabled at the application manifest. Android app-data backup
is disabled. Explicit rules also exclude every app data domain from cloud backup
and device-to-device transfer.

## Data categories to evaluate in the Play form

| Data | Collected/shared condition | Current handling |
| --- | --- | --- |
| Chat messages | Only when the user enables an online model and submits | Sent to selected provider; otherwise kept in the running app session |
| Gemini age-eligibility confirmation | Present only in the current development implementation | Do not ship it as a substitute for excluding Firebase/Gemini from the planned general-audience public release |
| Attachment content | Not collected by the current Android chat implementation | There is no Android user-file picker; tool-produced image bytes remain in the running session and are not placed in the Gemini prompt |
| Attachment metadata | When a conversation entry has an attachment and online models are enabled | Attachment name and media type are included in the bounded text prompt; content bytes are not sent |
| Device/preset context | Relevant context accompanies an enabled online-model request; relay state passes through a paired relay | Includes settings such as preset/block/scene/tempo/routing, not firmware |
| Voice audio/transcript | Only after the separate default-off voice-processing choice is enabled and the user starts voice input | Android's explicit on-device recognizer is preferred on API 31+ when available; otherwise the configured recognition service may receive audio and returns transcript text to the app. Provider behavior must be verified on target devices |
| Relay credential and endpoint | When the user pairs remote access | Stored in the app's Android credential storage; transport and server retention need final documentation |
| Preferences and consent | Stored locally | Includes model, consent, access level, UI preferences, and quota estimate |
| Local USB diagnostics | Only when the user asks for USB diagnostics | Displayed locally in chat; the current Android app has no diagnostic-export or share action. If one is added, re-review it and require identifier, path, conversation, and preset-name redaction before release |

Firebase documents automatic collection by Firebase AI Logic of the model name,
SDK and language-runtime versions and, when enabled, the Firebase App ID and app
version. Firebase App Check collects its Firebase user-agent (including device
OS/name/model/brand/form factor, installer and SDK versions) and, for this
configuration, a Play Integrity token. Treat these as off-device collection in
the Play form. QC Remote now installs the Play Integrity App Check provider only
when a consent-gated Gemini request begins, rather than during application
startup.

Google Play's definitions of “collection,” “sharing,” optional processing, and
ephemeral processing must be applied to the exact release architecture. A
transfer to a model provider or independently operated relay may require a
“shared” declaration even when the user initiates it.

## Conservative Play Console answer matrix

This matrix is the working answer key for the planned general-audience public
binary, not permission to submit the form. Google defines collection as data
transmitted off the device, including SDK transfers and qualifying ephemeral
processing. It uses one global declaration for the sum of behavior across all
active versions and regions. Do not answer from the newest source tree alone.
General audience does not itself answer Google Play's Target audience and
content section. Preserve that separate declaration and reconcile any selected
child age group with the Families requirements and this Data safety inventory.

| Play question or data type | Provisional answer | Reason and evidence still required |
| --- | --- | --- |
| Does the app collect or share user data? | **Yes if platform speech or remote relay remains in any active Play artifact** | Both capabilities can transmit data off-device. Ephemeral processing does not justify answering “No.” |
| Is all collected user data encrypted in transit? | **Not yet claimable** | The relay implementation rejects non-HTTPS endpoints and upgrades to WSS. Verify the exact Android speech-recognition provider and every active artifact before answering “Yes.” |
| Can users request deletion? | **Not yet claimable** | Unpairing clears the local credential, but Freevia must verify relay-side revocation/deletion and publish a working request route for any provider-retained data before claiming this badge. |
| Audio files → voice or sound recordings | **Conditional collection; optional; app functionality** | Select when the configured speech service receives microphone audio. Determine sharing only after documenting whether the recipient qualifies for a Play sharing exception. |
| Other user-generated content | **Conditional collection; optional; app functionality** | Use for user-authored preset names, configuration values, chat/transcript text, or similar content when that content crosses the relay or another enabled online boundary. Confirm the final Play category against the exact payloads. |
| App activity → app interactions | **Classification pending for relay commands** | The relay can observe command method names and timing. Record whether the final operator uses or retains these as app-interaction data rather than assuming transport-only handling removes the category. |
| User IDs / Device or other IDs | **Classification pending for relay identifiers** | The relay receives a pseudonymous device credential/identifier and network metadata. Pseudonymous data remains in scope; determine the exact Play category from the production operator's use. |
| Approximate location | **Provider-fact dependent** | An IP address alone does not settle the answer. Select this type if a relay, speech provider, or included SDK uses the IP address to infer approximate location. Obtain written provider/operator facts. |
| Photos, videos, files/documents, and non-voice audio | **No for the reviewed public Android binary** | There is no Android user-file picker or online attachment-content transfer. Reopen this answer if attachment upload is added or an older active artifact contains it. |
| Crash logs, diagnostics, performance data | **No first-party collection in the reviewed binary** | QC Remote has no analytics/crash SDK or Android diagnostic upload. Recheck every dependency and the signed artifact; provider-generated operational logs are assessed under the flow that creates them. |
| Firebase/Gemini SDK metadata and Play Integrity token | **Absent from the planned public binary** | The public build excludes the Gemini plugin and Firebase dependencies. This answer is valid only after inspecting the signed artifact and confirming no older active Play artifact contains that path. |
| Local USB state, preferences, backups written to Downloads | **Not collected solely by this local processing** | They remain on-device unless another enabled feature transmits them. Android backup is disabled; a user-created local backup is not an app transmission. |

Do not rely on a “user initiated,” “service provider,” or “ephemeral” exception
without recording the exact Play definition, contract, recipient role, payload,
retention, and UI disclosure that make it applicable. Declaring more data than
the app actually handles is not a substitute for an accurate declaration.

## Submission evidence record

`legal/public-release.json` intentionally keeps the Play declaration blocked
until all of the following are true and supported by retained evidence:

- `googlePlayDataSafetyActiveArtifactsReviewed`: every active production, open,
  closed, and other non-exempt Play artifact and region was included;
- `googlePlayDataSafetySdkBehaviorReviewed`: the signed bundle's dependency and
  SDK behavior was reconciled to the form;
- `googlePlayDataSafetySpeechBehaviorReviewed`: target-device tests and the
  selected speech provider's current documentation establish transport,
  retention, purposes, and sharing classification;
- `googlePlayDataSafetyRelayBehaviorReviewed`: the production relay operator,
  payloads, logs, retention, subprocessors, deletion, and sharing role are known;
- `googlePlayDataSafetyArtifactSha256`: SHA-256 of the exact submitted AAB; and
- `googlePlayDataSafetyDeclarationExportSha256`: SHA-256 of the final Play
  Console Data safety CSV/export retained in the private release evidence pack.

The two hashes are evidence identifiers only. Do not commit the signed bundle,
private console export, credentials, or provider contracts to the public source
repository.

If the release instead disables the relay, `publicRelayDeployment` may be set to
`disabled` only after the public build actually excludes that code path and
`publicRelayCodeExcluded` records the verified exclusion. A settings choice or
an offline default is not code exclusion.

## Release checks

- Identify the legal entity operating every production relay and its retention,
  logging, deletion, security, and subprocessors.
- Verify from the signed APK that Firebase AI Logic, Gemini API invocation, and
  their model UI are unreachable in the general-audience public build. If a
  later applicable Google contract permits re-enabling them, reopen the full
  project, region, retention, training, billing, App Check, and Play Integrity
  review before distribution.
- Verify Android speech recognition behavior and provider disclosures on every
  supported Android/API configuration.
- Test that microphone, voice-processing, notification, USB, model-sharing, and
  relay choices are granular and that core local control still works when
  optional choices are denied. Voice processing is default-off and separately
  recorded before Android's microphone permission is requested.
- Complete Play's account-deletion section only after deciding whether any
  publisher-operated account exists. Local pairing credentials need an in-app
  removal path regardless.
- Match the final Play form, hosted privacy policy, in-app privacy copy, and
  actual signed APK. Treat any new SDK as a fresh data-flow review.

Primary form guidance: <https://support.google.com/googleplay/android-developer/answer/10787469>
