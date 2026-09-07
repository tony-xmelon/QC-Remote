# QC Remote privacy policy — publication draft

Last updated: 2026-09-07

> **Not ready to publish.** Replace every bracketed field, verify the selected
> providers and release configuration, then host the final policy at the HTTPS
> URL recorded in `legal/public-release.json`.

## Who is responsible

[PUBLISHER LEGAL NAME] ("we", "us") is the controller of personal data handled
by QC Remote. Contact us at [PRIVACY EMAIL] or [POSTAL ADDRESS]. Questions about
the app can be sent to [SUPPORT EMAIL]. Copyright or content complaints can be
sent to [TAKEDOWN EMAIL].

## What the app handles

- **Connected-device data.** The app reads and changes the state of a Quad
  Cortex connected locally or through a relay selected by the user. This can
  include preset names, block and parameter settings, scenes, tempo, routing,
  and connection status.
- **Local app data.** Preferences, access levels, model selection, consent
  choices, and quota estimates are stored on the user's device. Chat messages
  and pending attachments are held only in the running app session and can be
  cleared from Privacy settings.
- **Credentials.** On Windows, provider credentials and relay secrets are kept
  in Windows Credential Manager. Provider sign-in software may maintain its own
  credential store. On Android, the relay credential is encrypted with a
  non-exportable Android Keystore key before app-private storage. QC Remote does
  not include credentials in diagnostics.
- **Optional public relay.** The reviewed relay routes authenticated commands and
  device responses without application-level request logging or durable storage.
  It terminates TLS and therefore can access command and device-state payloads
  while routing them. Pairing/credential and principal/device mappings are held
  in server memory until expiry, revocation, or process restart. A rate-limit key
  derived from the connecting IP address is held for about one minute. Bearer
  tokens are sent to the configured authorization server's introspection
  endpoint. The final policy must identify the relay and identity operators,
  infrastructure logs, regions, subprocessors, retention, deletion, and security
  controls—or state that public relay support is disabled.
- **Optional model input.** Online model processing is off by default. If the
  user enables it, QC Remote sends the user's message, files the user selected,
  and relevant connected-device context to the provider selected by the user so
  that provider can generate a response or proposed device action. On Windows,
  consent is bound to the selected provider and endpoint; changing either
  requires a new opt-in. Loopback model servers do not require cloud-sharing
  consent because their configured destination is the user's own computer.
  Firebase AI Logic also documents automatic collection of model, SDK, runtime,
  Firebase-app and app-version metadata. When Android Gemini is used, Firebase
  App Check additionally sends a Firebase user-agent containing device and
  installer metadata and a Play Integrity token.
- **Optional voice input.** Voice processing begins only after the user starts
  it. The operating system or its speech provider may receive microphone audio
  and return a transcript.
- **Diagnostics.** User-exported diagnostics contain application/runtime state
  and lifecycle event names. The export is designed to omit conversation
  content, device serial numbers, usernames, filesystem paths, and preset or
  setlist names. The user chooses whether and how to send an export.

QC Remote contains no advertising or first-party analytics in the reviewed
release configuration.

## Why data is handled

The final publisher must identify and document the applicable legal basis for
each purpose and launch market. Expected purposes are providing device-control
features requested by the user, remembering local preferences, securing
credentials and relay sessions, providing optional model or speech features
chosen by the user, troubleshooting an export the user elects to share, and
meeting legal obligations.

## Recipients and external services

Local device control does not require an online model. When the user enables an
online feature, data may be received by the provider they selected, such as
Google/Firebase/Gemini, OpenAI, Anthropic, a user-configured compatible server,
Microsoft or the operating-system speech provider, or the operator of a relay
the user paired. The final policy must list only providers actually enabled in
the public build, link their current privacy terms, describe their role, and
identify international-transfer safeguards where required.

Provider retention, abuse monitoring, training, deletion, and location rules
depend on the provider, account type, product tier, and configuration. QC Remote
must not promise a provider retention period until the publisher has verified
the exact public-release configuration.

## Retention and deletion

Session chat and pending attachments are removed when the running app session
ends or when the user selects **Clear conversation**. Windows may briefly stage
attachments in the app's isolated Antigravity workspace for a request; it
deletes them when the request ends and removes crash remnants the next time the
model bridge starts. Local preferences remain
until changed, cleared, or the app's local data is removed. Credentials remain
in the platform credential store until the user disconnects/removes them or
clears that store. Data already sent to an external provider is subject to that
provider's controls and retention rules. Add exact publisher support-record and
relay-server retention periods here before publication.

## User choices and rights

Users can keep online models disabled, clear the local conversation, remove
saved provider credentials, avoid voice input, disconnect a relay, and choose
whether to export or share diagnostics. Before publication, add the procedures
and jurisdiction-specific rights for access, correction, deletion, restriction,
objection, portability, withdrawal of consent, and supervisory-authority
complaints, together with identity-verification and response timelines.

## Children and eligibility

The final publisher must set and enforce an age policy compatible with every
enabled provider and launch market. Do not enable a provider for a person who
does not meet that provider's eligibility terms.

## Security, changes, and contact

Describe the final release's technical and organizational safeguards, incident
contact, policy-change notice method, effective date, and country-specific
supplements here. No transmission or storage system can be guaranteed perfectly
secure.
