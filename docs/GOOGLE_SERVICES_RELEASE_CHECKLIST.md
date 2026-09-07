# Google/Firebase services release checklist

Reviewed against current official documentation on 2026-09-07. This checklist
does not record contractual acceptance. Keep
`thirdPartySdkTermsReviewed: false` in `legal/public-release.json` until the
publisher with authority to bind the publishing entity completes and records
every applicable item.

## Contract and account

- Identify the publishing legal entity and the Google/Firebase account owner.
- Review and accept the Android SDK License Agreement, Google Cloud Platform
  Terms, service-specific Generative AI terms, Firebase terms, applicable Gemini
  API terms and prohibited-use policies under that entity.
- Confirm that use is for the publisher's trade, business, craft, or profession;
  the current Firebase terms describe the covered services on that basis.
- Choose and document the Firebase AI Logic backend and billing plan. The current
  Android code uses `GenerativeBackend.googleAI()` (Gemini Developer API).
- Confirm launch-country, age/eligibility, export-control, sanctions, payment,
  quota, prohibited-use, indemnity, suspension and termination requirements.
- Record the date, terms URLs, account/project IDs, reviewer and approval owner in
  the release record. Terms can change, so repeat this check for each release.

## Firebase and Play Integrity configuration

- Use the production Firebase project; do not ship a developer's personal
  project as an undocumented public service.
- Register `com.qccontrol.mobile` and the final release-signing SHA-256
  fingerprint in Firebase App Check.
- Link the same Cloud project to Play Integrity in Play Console. The linking
  account must have the required project ownership.
- Decide whether distribution is Play-only, outside Play, or both, then configure
  `PLAY_RECOGNIZED`, `LICENSED`, and device-integrity verdict requirements to
  match. Google's recommended settings differ by distribution channel.
- Review App Check metrics and enable Firebase AI Logic enforcement before public
  release. Verify legitimate Play and permitted sideload installations under the
  chosen policy.
- Set and document App Check token TTL. Shorter TTL improves leak resistance but
  increases attestation latency, quota use, and potentially cost.
- Apply project budgets, quotas, alerts, API restrictions and least-privilege IAM.
  Confirm no unrestricted Gemini API key is embedded in the application.
- Decide whether AI monitoring is enabled. If enabled, reflect sampled prompt,
  output and telemetry collection in the privacy policy and Play declaration.

## Data disclosure

- Complete Play Data Safety for the sum of behavior across all active app
  versions and regions, including third-party SDK behavior.
- Disclose user-submitted prompts and any preset/device context placed in them,
  plus Firebase AI Logic's model/SDK/runtime/app metadata.
- Disclose Firebase App Check's Firebase user-agent and Play Integrity token.
- Classify provider transfers as collection and sharing unless the exact Google
  Play service-provider exception applies to the final contractual arrangement.
- Describe model processing as optional: local device control remains available
  when online models are disabled.
- Publish a consistent privacy policy and ensure in-app wording, consent,
  retention, deletion and support channels match the deployed configuration.

## Primary references

- Android SDK terms: <https://developer.android.com/studio/terms>
- Firebase terms: <https://firebase.google.com/terms>
- Firebase AI Logic data governance: <https://firebase.google.com/docs/ai-logic/data-governance>
- Firebase Android data disclosure: <https://firebase.google.com/docs/android/play-data-disclosure>
- App Check with Play Integrity: <https://firebase.google.com/docs/app-check/android/play-integrity-provider>
- Google Play Data Safety: <https://support.google.com/googleplay/android-developer/answer/10787469>
