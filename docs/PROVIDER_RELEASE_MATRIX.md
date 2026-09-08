# QC Remote online-provider release matrix

Reviewed 2026-09-07 against the runtime code and the primary provider sources
linked below. This is engineering issue-spotting, not legal advice. Provider
terms and product configurations change; re-check them immediately before each
public release.

## Release rule

Every provider path in `legal/public-release.json` must be marked either
`disabled` or `reviewed`. `Reviewed` means Freevia has identified the contracting
account, accepted the applicable terms, verified supported territories and age
rules, documented controller/processor roles and transfers, configured security
and retention controls, and made the store and in-app disclosures match the
released implementation. A user supplying an API key does not remove Freevia's
responsibility for the design and claims of its client application.

`Disabled` is accepted only after the corresponding runtime path has actually
been removed or made unreachable in the release code and that boundary has an
automated test. The present code still exposes every listed path, so the gate
rejects a `disabled` declaration by itself.

## Runtime matrix

| Release path | Current implementation | Principal release issues |
| --- | --- | --- |
| OpenAI API | Windows, fixed `api.openai.com` endpoint with a user or publisher credential | Confirm the contracting Freevia account and applicable Services Agreement/DPA; identify end users; prohibit rights-infringing input; verify current retention/data controls, supported regions, safety policy, and any parental-consent handling. |
| Anthropic API | Windows, fixed `api.anthropic.com` endpoint | Confirm Commercial Terms and DPA/account configuration; verify supported regions, standard or zero-data-retention eligibility, abuse-policy exceptions, input rights, subprocessors, and user disclosures. |
| Gemini API | Windows API-key/OAuth path; locally stored 18+ feature confirmation currently gates requests in development builds | Current Gemini API terms say API clients may not be directed to or likely accessed by under-18 users, describe the service as professional/business rather than consumer use, and require Paid Services for EEA/Swiss/UK clients. A self-attestation inside a general-audience app does not establish that the API client is not likely to be accessed by minors. Exclude this path from the public release unless the whole release is genuinely 18+ or Freevia has a documented applicable Google contract or written exception. |
| Firebase AI Logic / Gemini | Android client SDK with App Check and Play Integrity; locally stored 18+ feature confirmation currently gates requests in development builds | Firebase AI Logic currently selects the Gemini Developer API backend, so the same unresolved API-client eligibility issue applies. Exclude it from the public release unless a documented applicable Google contract resolves that issue. If later enabled, also verify production billing, app registration, signing certificate, Play Integrity, App Check enforcement, data governance, API restrictions, quotas, abuse handling, and store Data safety disclosures. A debug attestation provider is not a production control. |
| Antigravity CLI | Windows invokes a separately installed CLI and its configured provider account | Do not imply that QC Remote includes access, quota, or a transferable subscription. Confirm that automated third-party invocation is permitted, document which provider receives data, preserve user-controlled permissions, and do not redistribute the CLI or credentials without permission. Disable this path if no stable governing integration terms can be identified. |
| User-configured compatible endpoint | Windows accepts a custom HTTPS endpoint; loopback HTTP is reserved for local models | Warn that the endpoint operator receives prompts, attachments, and device context. Do not label an arbitrary endpoint as OpenAI, Anthropic, or local. Require HTTPS off-loopback, per-endpoint consent, credential isolation, and operator-specific privacy information. |
| Platform speech recognition | User-initiated Windows/Android recognizer | Voice and transcripts may be personal or sensitive data. Identify the actual recognizer behavior on each supported OS/build, obtain any required permission/consent, disclose network processing, and verify retention. Microsoft documents that its real-time Azure Speech path uses server memory without at-rest retention, but QC Remote must not apply that claim to an unknown OS-configured recognizer. |
| Public relay | Separate deployment decision already recorded in the release gate | Identify the operator, OAuth service, infrastructure regions/logging, retention/deletion, subprocessors, abuse response, and security controls, or disable the public relay. |

Local device control and a loopback local-model server are not online-provider
releases, but they still require accurate local-storage and security disclosures.

## Gemini and the no-app-wide-age decision

`minimumUserAge: null` records that QC Remote itself has no additional app-wide
minimum age. It does not override provider terms. Under the Gemini terms reviewed
on the date above, a public Gemini path therefore needs one of these outcomes:

- `disabled`: no public build can invoke the Gemini API path;
- `app-wide-18`: inconsistent with the current publisher decision and rejected
  by the gate while `minimumUserAge` remains `null`; or
- `documented-contractual-exception`: Freevia has an applicable Google contract
  or written permission that expressly permits the released audience and use.

A checkbox that merely says the user is 18 is not treated as satisfying a term
directed at whether the API client itself is likely to be accessed by minors.
The current public plan is therefore `disabled`. The release gate still blocks
until the Gemini runtime paths are actually unreachable in public binaries and
that exclusion has an automated test; changing metadata alone is insufficient.

## Primary sources

- OpenAI Services Agreement: <https://openai.com/policies/services-agreement/>
- OpenAI API data controls: <https://platform.openai.com/docs/models/default-usage-policies-by-endpoint>
- Anthropic supported countries and regions: <https://www.anthropic.com/supported-countries>
- Anthropic Privacy Center, commercial data retention and model-training use:
  <https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data>
  <https://privacy.claude.com/en/articles/7996885-how-do-you-use-personal-data-in-model-training>
- Gemini API Additional Terms: <https://ai.google.dev/gemini-api/terms>
- Gemini API billing: <https://ai.google.dev/gemini-api/docs/billing>
- Firebase AI Logic data governance: <https://firebase.google.com/docs/ai-logic/data-governance>
- Firebase AI Logic App Check guidance:
  <https://firebase.google.com/docs/ai-logic/app-check>
- Microsoft speech-to-text data and privacy:
  <https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security>
