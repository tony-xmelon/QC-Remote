# Google/Firebase services release checklist

Reviewed against current official documentation on 2026-09-07. This checklist
does not record contractual acceptance. Keep
`thirdPartySdkTermsReviewed: false` in `legal/public-release.json` until the
publisher with authority to bind the publishing entity completes and records
every applicable item.

## Contract and account

- Use a Google Play **organization** account for Freevia; do not register the
  release under an individual's developer identity.
- Ensure Freevia's legal name and address match exactly across its linked Google
  Payments profile, official organization document, and D-U-N-S record. Record
  the Payments-profile match separately from D-U-N-S matching.
- Record Google's acceptance of the official organization document and the
  identity verification of the account owner or authorized representative.
- Verify the private contact email and phone used by Google. Keep both
  operational and organization-controlled; use a monitored business-domain
  mailbox rather than a personal account where practicable.
- Confirm that the account owner satisfies Google's developer-account
  eligibility rules, including the account-owner age requirement. This is an
  account-administration requirement and does not create an app-wide 18+ user
  requirement for QC Remote.
- Verify Freevia's public website through Google Search Console. Record the
  verified site and responsible account in the private release evidence.
- Verify the separate developer email and developer phone that organization
  accounts display publicly on Google Play, then review the complete Developer
  Profile as rendered. Google also displays legal identity/country information
  and may display further address or trader details depending on monetization,
  region, and applicable law. Do not use a home address or personal contact
  channel unless Freevia has deliberately approved that publication.
- Complete website and identity prerequisites before relying on developer-phone
  verification; Google currently prevents organization phone verification until
  the prerequisite checks are complete.
- Identify the Google/Firebase account owner and keep at least one documented
  organizational recovery path that does not depend on a single employee.
- Review and accept the Android SDK License Agreement, Google Cloud Platform
  Terms, service-specific Generative AI terms, Firebase terms, applicable Gemini
  API terms and prohibited-use policies under that entity.
- Confirm that use is for the publisher's trade, business, craft, or profession;
  the current Firebase terms describe the covered services on that basis.
- Choose and document the Firebase AI Logic backend and billing plan. The current
  Android code uses `GenerativeBackend.googleAI()` (Gemini Developer API).
- Exclude direct Gemini API and Firebase AI Logic/Gemini Developer API calls
  from the general-audience public build. The local 18+ checkbox currently used
  in development builds is not treated as resolving terms that prohibit an API
  client likely to be accessed by people under 18. Re-enable a public path only
  for a genuine app-wide 18+ release or after preserving an applicable Google
  contract or written permission that expressly covers the audience and use.
- Confirm launch-country, age/eligibility, export-control, sanctions, payment,
  quota, prohibited-use, indemnity, suspension and termination requirements.
- Record the date, terms URLs, account/project IDs, reviewer and approval owner in
  the release record. Terms can change, so repeat this check for each release.

## Firebase and Play Integrity configuration

- Use the production Firebase project; do not ship a developer's personal
  project as an undocumented public service.
- Finalize the Android application ID before registering it. The current
  `com.qccontrol.mobile` value is a legacy development identifier and is not
  recorded as final in `legal/public-release.json`.
- Register the final package name and release-signing certificate to Freevia.
  Preserve evidence of package ownership and the SHA-256 fingerprint without
  committing the private signing key or recovery secrets.
- Register that same final application ID and release-signing SHA-256
  fingerprint in Firebase App Check.
- Store the environment-specific `google-services.json` outside Git. CI expects
  its base64 encoding in `QC_FIREBASE_ANDROID_CONFIG_BASE64`, restores it only
  for the Android build, and verifies that it contains exactly one client for
  the shared branded package ID. This separates test and production projects;
  it does not replace API restrictions or App Check.
- Link the same Cloud project to Play Integrity in Play Console. The linking
  account must have the required project ownership.
- Decide whether distribution is Play-only, outside Play, or both, then configure
  `PLAY_RECOGNIZED`, `LICENSED`, and device-integrity verdict requirements to
  match. Google's recommended settings differ by distribution channel.
- Review App Check metrics and enable Firebase AI Logic enforcement before public
  release. Verify legitimate Play and permitted sideload installations under the
  chosen policy.
- Review every Firebase client key present in the current tree and reachable Git
  history. Restrict or rotate each historical value. Record the result in
  `firebasePublishedClientKeysReviewed`; repository deletion alone does not
  invalidate a key.
- If Firebase/Gemini is enabled in the public build, verify that the publicly shipped Firebase client key is restricted to the
  required Firebase APIs and specifically does **not** allow the Generative
  Language API. Record this separately in
  `firebaseClientKeyExcludesGenerativeLanguageApi`. Google documents Firebase
  client keys as public identifiers only under appropriate restrictions and
  says a Gemini Developer API key must not be included in public client config.
- These production Firebase and App Check fields are not release requirements
  while Firebase/Gemini is compiled out. The historical-key review remains
  mandatory because removing a key from a new binary does not revoke older
  published copies.
- If Firebase/Gemini is enabled, do not set `firebaseAppCheckEnforced` merely because the Play Integrity
  provider is installed in code. Confirm enforcement in the production Firebase
  console and test that an invalid or unattested public build is rejected.
- Set and document App Check token TTL. Shorter TTL improves leak resistance but
  increases attestation latency, quota use, and potentially cost.
- Apply project budgets, quotas, alerts, API restrictions and least-privilege IAM.
  Confirm no unrestricted Gemini API key is embedded in the application.
- Document signing-key custody, backup, access, rotation/recovery, and Play App
  Signing enrollment. Loss of the eligible private key can prevent package-name
  registration or future updates.
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

- Google Play organization-account information: <https://support.google.com/googleplay/android-developer/answer/10840893>
- Google Play developer identity verification: <https://support.google.com/googleplay/android-developer/answer/10841920>
- Android developer verification and package registration: <https://developer.android.com/developer-verification/guides>
- Android SDK terms: <https://developer.android.com/studio/terms>
- Firebase terms: <https://firebase.google.com/terms>
- Firebase AI Logic data governance: <https://firebase.google.com/docs/ai-logic/data-governance>
- Firebase Android data disclosure: <https://firebase.google.com/docs/android/play-data-disclosure>
- App Check with Play Integrity: <https://firebase.google.com/docs/app-check/android/play-integrity-provider>
- Google Play Data Safety: <https://support.google.com/googleplay/android-developer/answer/10787469>
