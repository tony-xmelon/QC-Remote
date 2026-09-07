# Android data-safety and permission worksheet

Reviewed against the current source on 2026-09-07. This is a release worksheet,
not a completed Google Play declaration. Re-run it against the exact signed APK
and every enabled provider immediately before submission.

## Manifest permissions and user-facing purpose

| Permission or capability | Current purpose | Release disclosure/control |
| --- | --- | --- |
| `INTERNET` | Optional Gemini/model requests and the user-paired relay | Online model sharing is off by default; disclose provider and relay transfers |
| `RECORD_AUDIO` | User-initiated speech recognition | Runtime microphone permission; disclose whether recognition is on-device or sent by Android/provider |
| `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_CONNECTED_DEVICE` | Keep the explicitly paired device relay available | Persistent notification and clear stop/unpair control required |
| `POST_NOTIFICATIONS` | Foreground relay notification on supported Android versions | Runtime notification choice; explain reduced relay behavior if denied |
| USB host and attach intent | Direct control of a user-connected device | Android USB grant; no blanket device access |
| File picker / FileProvider | User-selected chat attachments and exported files | Use scoped picker grants; do not scan unrelated storage |

No location, contacts, advertising identifier, call log, SMS, camera, or broad
storage permission is declared in the reviewed manifest. Android app-data backup
is disabled, and the FileProvider is limited to app-owned external files and
cache rather than the shared external-storage root.

## Data categories to evaluate in the Play form

| Data | Collected/shared condition | Current handling |
| --- | --- | --- |
| Chat messages | Only when the user enables an online model and submits | Sent to selected provider; otherwise kept in the running app session |
| User-selected files, audio, video, images, documents, or source | Only when attached to an enabled online-model request | Sent to selected provider; pending attachments remain session-local until sent/cleared |
| Device/preset context | Relevant context accompanies an enabled online-model request; relay state passes through a paired relay | Includes settings such as preset/block/scene/tempo/routing, not firmware |
| Voice audio/transcript | Only after user starts voice input | Android speech-recognition implementation/provider must be verified on target devices |
| Relay credential and endpoint | When the user pairs remote access | Stored in the app's Android credential storage; transport and server retention need final documentation |
| Preferences and consent | Stored locally | Includes model, consent, access level, UI preferences, and quota estimate |
| Diagnostics/export | Only when the user creates and shares it | Verify the signed build still redacts identifiers, paths, conversation, and preset names |

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

## Release checks

- Identify the legal entity operating every production relay and its retention,
  logging, deletion, security, and subprocessors.
- Record the exact Gemini/Firebase project, region behavior, abuse-monitoring and
  retention terms, account eligibility, and whether data can train models.
- Register the final application ID and release-signing SHA-256 fingerprint in
  Firebase App Check, link the same Google Cloud project in Play Console, review
  metrics, and enable enforcement for Firebase AI Logic before public release.
- Verify Android speech recognition behavior and provider disclosures on every
  supported Android/API configuration.
- Test that microphone, notification, USB, model-sharing, and relay choices are
  granular and that core local control still works when optional choices are
  denied.
- Complete Play's account-deletion section only after deciding whether any
  publisher-operated account exists. Local pairing credentials need an in-app
  removal path regardless.
- Match the final Play form, hosted privacy policy, in-app privacy copy, and
  actual signed APK. Treat any new SDK as a fresh data-flow review.
