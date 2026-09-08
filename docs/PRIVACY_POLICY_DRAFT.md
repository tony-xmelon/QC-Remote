# QC Remote privacy policy — publication draft

Last updated: 2026-09-07

> **Not ready to publish.** Replace every bracketed field, verify the selected
> providers and release configuration, replace `Freevia` with its exact
> registered legal name and legal form, then host the final policy at the HTTPS
> URL recorded in `legal/public-release.json`.

The reviewed implementation-level record supporting this draft is
`legal/DATA-FLOW-INVENTORY.json`. The release check verifies its source evidence
and fixed runtime hosts; update both documents whenever a data flow changes.

## Who is responsible

Freevia, a legal entity based in Bulgaria ("we", "us"), is the controller of
personal data handled by QC Remote. Contact us at [PRIVACY EMAIL] or
[POSTAL ADDRESS]. Questions about the app can be sent to [SUPPORT EMAIL].
Copyright or content complaints can be sent to [TAKEDOWN EMAIL].

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
  Direct Gemini API and Firebase AI Logic/Gemini Developer API processing are
  excluded from the planned general-audience public release. Their existing
  development adapters and local eligibility setting must not be described as
  publicly available unless a later provider review and release build actually
  make them compliant and reachable.
- **AI transparency.** Chat panes identify online assistant responses as AI and
  warn that they may be inaccurate. A local origin attribute distinguishes AI
  messages in the rendered conversation. It is not transmitted as a user
  identifier and is not represented as a final interoperable synthetic-content
  marking standard.
- **Optional voice input.** Voice processing begins only after the user enables
  the separate voice-processing choice and starts it. The operating system or
  its configured speech provider may receive microphone audio and return a
  transcript. Microphone permission is requested only from that voice action.
- **Diagnostics.** User-exported diagnostics contain application/runtime state
  and lifecycle event names. The export is designed to omit conversation
  content, device serial numbers, usernames, filesystem paths, and preset or
  setlist names. The user chooses whether and how to send an export.

QC Remote contains no advertising or first-party analytics in the reviewed
release configuration.

## Why data is handled

For an EEA release, the intended legal bases are: performing the user's request
or contract for local device control and explicitly requested relay operations;
the user's consent for optional cloud-model and voice processing where consent
is the selected basis; Freevia's legitimate interests in securing the app,
preventing abuse, and responding to user-supplied diagnostics, after documenting
the necessary balancing assessment; and compliance with legal obligations.
Withdrawing consent disables future optional processing and does not affect
processing already lawfully completed. Before release, Freevia must confirm the
basis, necessity, and data minimization for every enabled flow and launch market
rather than treating installation as blanket consent.

## Recipients and external services

Local device control does not require an online model. When the user enables an
online feature, data may be received by the provider they selected, such as
Google/Firebase/Gemini, OpenAI, Anthropic, a user-configured compatible server,
Microsoft or the operating-system speech provider, or the operator of a relay
the user paired. The final policy must list only providers actually enabled in
the public build, link their current privacy terms, describe their role, and
identify international-transfer safeguards where required.

The controller/processor label, Article 28 terms, subprocessor chain, transfer
route, and data-subject request path for each enabled service must match the
dated operational record in `docs/GDPR_OPERATIONAL_CHECKLIST.md`. User consent
to an optional feature does not by itself resolve processor contracting or
international-transfer requirements.

Provider retention, abuse monitoring, training, deletion, and location rules
depend on the provider, account type, product tier, and configuration. QC Remote
must not promise a provider retention period until the publisher has verified
the exact public-release configuration.

## Retention and deletion

Session chat and pending attachments are removed when the running app session
ends or when the user selects **Clear conversation**. Windows may briefly stage
attachments in a dedicated Antigravity working directory for a request; it
deletes them when the request ends and removes crash remnants the next time the
model bridge starts. This working directory is not an operating-system sandbox.
The separately installed Antigravity CLI runs with the signed-in user's Windows
account permissions, and its own permissions, terms, privacy practices, and
provider controls apply. Local preferences remain
until changed, cleared, or the app's local data is removed. Credentials remain
in the platform credential store until the user disconnects/removes them or
clears that store. Data already sent to an external provider is subject to that
provider's controls and retention rules. Add exact publisher support-record and
relay-server retention periods here before publication.

## User choices and rights

Users can keep online models disabled, clear the local conversation, remove
saved provider credentials, avoid voice input, disconnect a relay, and choose
whether to export or share diagnostics. EEA users may have rights to access,
correct, erase, restrict, or port personal data; object to processing; withdraw
consent; and complain to a supervisory authority. Requests should be sent to
[PRIVACY EMAIL]. Freevia must verify a request only to the extent reasonably
necessary, respond within the applicable legal period, explain any refusal, and
identify provider-specific routes for data controlled by an external provider.

Users may complain to the Bulgarian Commission for Personal Data Protection,
2 Prof. Tsvetan Lazarov Blvd., Sofia 1592, Bulgaria, or use the current contact
and complaint routes at <https://cpdp.bg/en/contacts/> and
<https://cpdp.bg/en/lodging-complaints-and-alerts/>. Users may instead contact
the supervisory authority available under applicable law in their place of
residence or work.

## Children and eligibility

QC Remote imposes no additional app-wide minimum age. Direct Gemini API and
Firebase AI Logic/Gemini Developer API features are excluded from the planned
public release because the currently reviewed terms prohibit an API client
likely to be accessed by people under 18. Individual app stores, other online
providers, and local law may impose their own eligibility, parental-consent, or
child-privacy requirements. The publisher must re-verify the released provider
set and every launch market before release.

The intended position is general audience and not child-directed, subject to a
final evidenced store and market review. “No app-wide minimum age” does not mean
that the service is intended for children or that child-privacy duties are
waived. Freevia must complete
`docs/CHILDREN_AND_TARGET_AUDIENCE_CHECKLIST.md`, publish a channel for reports
that give it actual knowledge of a minor's age, and operate the documented
restriction, deletion, parental-request, and provider-escalation process before
enabling online features publicly.

## Security, changes, and contact

The reviewed release uses platform credential storage, app-private Android
storage protected by a non-exportable Keystore key for relay credentials,
encrypted network transport for non-loopback services, allowlisted device tools,
expected-state guards for writes, consent gates for optional model and voice
processing, and diagnostics designed to omit credentials and user content.
Freevia must still document access control, patching, incident response, backup,
relay infrastructure, and provider-management procedures before publication.
Material policy changes will be dated and communicated through the app,
repository, download page, or store listing as appropriate. Report privacy or
security concerns to [PRIVACY EMAIL] and [SECURITY EMAIL]. The final security
policy will be available at [SECURITY POLICY URL]. No transmission or
storage system can be guaranteed perfectly secure.
