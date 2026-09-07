# Pre-release legal and intellectual-property review

Reviewed 2026-09-13. This is engineering issue-spotting, not legal advice or a
substitute for review by counsel in each launch market.

## Do not publish until resolved

1. **The overall visual presentation closely reproduces the device and CorOS.**
   Functional layout can be important to interoperability, but expressive
   artwork, screen graphics, and a product's overall commercial appearance can
   receive separate copyright, design, or trade-dress protection. Before public
   distribution, have counsel review screenshots of every public-facing screen
   and the store listing. Prefer the independently styled `obsidian` skin and
   original block glyphs in release builds.

2. **No distribution license has been chosen for QC Remote itself.**
   The repository is private and has no root LICENSE. Decide whether releases
   are proprietary or open source, identify the copyright owner(s), and ship
   matching binary terms before accepting public users. Do not publish source
   under an implied license. `docs/TERMS_OF_USE_DRAFT.md` is intentionally
   incomplete until this decision and the publisher identity are supplied.
   The audit also found inconsistent first-party metadata: private/unlicensed
   npm workspaces, mostly MIT Rust crates, two Apache-2.0 services, and an
   unlicensed Windows native crate. Follow
   `docs/DISTRIBUTION_LICENSE_DECISION.md` and harmonize every manifest before
   setting the new project-license and contribution-policy release flags.

## High or medium risk requiring a release decision

- **Name clearance.** `QC Remote` is the proposed public product name; it has
  not been legally cleared or registered. The 2026-09-13 preliminary registry
  screen found no exact `QC REMOTE` result in USPTO or EUIPO searches, but it
  confirmed live Neural DSP `QUAD CORTEX` registrations covering overlapping
  Class 009 software and hardware in both territories. In this app's market,
  `QC` deliberately evokes that device and `Remote` describes the function.
  Separately, KLIPPEL already markets **QC Remote Configuration Software** for
  audio-equipment quality-control systems. Those facts make the collision
  material despite the empty exact-phrase searches. The icon avoids Neural
  DSP's logo and wordmark, and the About surfaces state independence, but
  disclaimers do not clear a mark. Follow `docs/NAME_CLEARANCE_SCREEN.md`; do
  not publish under `QC Remote` until exact and similar-mark searches cover all
  launch countries, app stores, package names, domains, and the actual goods
  and services. If professional clearance is unavailable, a distinctive coined
  name that does not lead with `QC` is the materially safer option.
- **Reverse-engineered interoperability.** EU Directive 2009/24/EC permits
  observation/testing by a lawful user and narrowly permits decompilation needed
  for interoperability, subject to conditions. That is helpful but fact-specific:
  retain clean provenance, limit use to interoperability, and do not ship copied
  firmware, confidential material, credentials, or access-control bypasses.
- **Google/model distribution terms.** Android uses Firebase AI and Windows can
  invoke Google Antigravity or other providers. A public app needs approved
  credentials, an accurate consent screen, provider branding compliance, age and
  region gating where required, and a hosted privacy policy. Current Gemini API
  terms state that EEA/Swiss/UK API clients may use only Paid Services and impose
  an 18+ requirement. Do not represent consumer subscription access as a public
  app entitlement without written confirmation from Google.
- **Restricted Android SDK terms.** The locked graph contains Google Play
  Services, Play Core, and Play Integrity components whose POMs refer to Android
  SDK or service-specific terms rather than an open-source license. They are now
  listed separately in `legal/THIRD_PARTY-LICENSE-INVENTORY.json`; the publisher
  must review and record acceptance/compliance before release, especially Play
  Integrity branding, API-use, distribution, and termination conditions.
- **User media and presets.** The app should require users to warrant that they
  may upload recordings, video, IRs, captures, and presets to model providers.
  Add reporting/takedown contact details before hosting or sharing user content.
- **Privacy compliance.** Online model processing is now disabled until the
  user explicitly opts in on both platforms, and session conversation data has
  an in-app clear action. The in-app summary is still not a complete privacy
  policy. Finalize and host `docs/PRIVACY_POLICY_DRAFT.md` with controller
  identity/contact, legal bases, exact subprocessors, transfers, retention,
  rights, age rules, and jurisdictional disclosures before distribution.
- **Public relay operation.** The reviewed relay is memory-only and does not log
  request payloads itself, but it processes readable command/device data and
  delegates identity validation to an OAuth introspection service. Decide whether
  the public build disables the relay, uses a publisher-operated service, or is
  self-host-only; if enabled, document the actual proxy/host/operator logging,
  retention, deletion, subprocessors, security and international transfers.

## Lower-risk findings and controls added

- Neural-derived chassis SVGs, block sprites, and cropped reference images have
  been removed from both source and production bundles. Runtime block marks are
  original code-drawn artwork, and release apps default to the independently
  styled Graphite Hardware skin.
- Public builds no longer expose the YouTube extraction tool and no longer
  download or bundle yt-dlp, Deno, or FFmpeg media sidecars. Users can attach
  media files they are entitled to process directly. Release SBOM generation no
  longer reports those removed development tools as shipped dependencies.
- Windows and Android require an explicit stored opt-in before sending messages,
  selected attachments, or device context to a non-local model. Startup quota
  checks and Antigravity warmup are also suppressed until consent; loopback
  model servers remain available without cloud consent.
- `npm run legal:notices` resolves the locked npm, target-filtered Cargo, and
  Android runtime graphs into 521 component records. It harvests 243 distinct
  LICENSE/NOTICE texts from installed packages and JAR/AAR archives, maps every
  component to bundled license text, records MPL/GPL source locations, and fails
  on missing license metadata. Both apps package and link the notice, texts,
  retained pyquadcortex notice, and machine-readable inventory. Android's Maven
  graph is now dependency-locked so the shipped graph cannot drift silently.
- Copyleft runtime components now carry exact-version source archive links in a
  packaged `legal/THIRD_PARTY-SOURCE-OFFER.md`. The dual-licensed Checker
  Framework qualifiers dependency records MIT as QC Remote's selected option,
  avoiding an ambiguous GPL-with-Classpath-Exception choice.
- The master launcher icon is original artwork created for QC Remote and does
  not contain Neural DSP's logo, wordmark, or copied product artwork.
- Windows and Android now use the same About, Privacy, Legal, trademark, safety,
  and third-party notice language from the shared theme package.
- `docs/ANDROID_DATA_SAFETY_DRAFT.md` maps the reviewed Android manifest and data
  flows to a pre-submission disclosure checklist; it must be verified against
  the signed release and the final production providers.
- The protocol stack is independently implemented, carries MIT licensing in its
  Rust packages, and retains the pyquadcortex MIT notice.
- The application says it is independent and unofficial wherever legal details
  are shown. Product names are used as compatibility references, not as the
  publisher identity.
- First-party npm, Python, and command identities use `qc-remote` rather than
  the former `ndsp` shorthand, reducing an avoidable suggestion that the
  publisher is Neural DSP. A release test prevents that shorthand from
  returning in package metadata.
- Accidental public package publication is disabled while ownership and the
  distribution license remain unresolved: all npm workspaces are private, all
  Cargo packages set `publish = false`, and both Python distributions carry
  PyPI's `Private :: Do Not Upload` classifier. The legal verifier scans these
  boundaries on every release check.
- CI no longer produces signed installers or APK artifacts automatically on
  pull requests or pushes. Distributable builds require an explicit manual
  workflow choice between `private-test` and `public-release`; the latter runs
  the fail-closed legal gate before either platform package is built. Local
  development builds remain available.
- URL-driven CorOS visual-reference fixtures are disabled in production hosts.
  The Android I/O and Gig screens remain functional app surfaces, but hidden
  capture/reference variants can no longer be exposed through a release-build
  query parameter. The remaining functional UI similarity still requires the
  final visual-risk decision described above.
- Signing keys, private-key files, service-account JSON, and local environment
  files are excluded at the repository root. The fail-closed legal verifier
  scans every tracked file for high-confidence private-key and service-account
  markers. The tracked Android `google-services.json` was verified to contain
  public client configuration only; its production API restrictions and
  project ownership remain part of the Firebase release checklist.
- The current locked npm graph reports no known vulnerabilities at either the
  production or high-severity development thresholds. Weekly Dependabot checks
  now cover npm, Cargo, Gradle, Python, and GitHub Actions, and a scheduled
  RustSec workflow audits every Cargo lockfile. The publisher must still review
  the signed applications and deployed infrastructure before setting the final
  security release flag.
- QC Remote no longer edits Antigravity/Gemini's global settings or silently
  grants wildcard web access. Antigravity URL reading remains governed by the
  user's own domain-scoped permission choices; the adapter requests no command,
  file-write, or interactive-browser authority.

## Release gate

The current source tree is suitable for private testing, not public publication.
The remaining minimum legal release gate is: choose a project license and owner,
harmonize first-party license files/manifests, and define contribution provenance;
complete the final application and infrastructure security review;
finalize application identifiers, channels, markets, and age eligibility; review
the restricted Google/Android SDK and provider data terms; verify production
Firebase ownership, billing, API restrictions and App Check; publish a privacy
policy and support/takedown contact; complete store disclosures; clear the
product name and store artwork; and complete an informed interoperability and
final-UI risk decision. `npm run legal:check` fails closed until those
publisher-controlled fields and decisions are recorded in
`legal/public-release.json`.

## Primary sources checked

- Neural DSP privacy policy and registered-mark statement:
  <https://neuraldsp.com/pages/privacy-policy>
- KLIPPEL's existing QC Remote Configuration product documentation and price
  list:
  <https://www.klippel.de/fileadmin/klippel/Bilder/Our_Products/QC_System/PDF/S14_QC_Remote_Setup.pdf>
  <https://www.klippel.de/fileadmin/klippel/Bilder/Our_Products/QC_System/PDF/QC_System_Price-List.pdf>
- EU Trade Mark Regulation 2017/1001, including referential compatibility use:
  <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1001>
- EU Software Directive 2009/24/EC, Articles 5 and 6:
  <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0024>
- U.S. Copyright Office, Circular 61 and section 1201 study:
  <https://www.copyright.gov/circs/circ61.pdf>
  <https://www.copyright.gov/policy/1201/>
- USPTO likelihood-of-confusion guidance:
  <https://www.uspto.gov/trademarks/search/likelihood-confusion>
- USPTO Trademark Search and federal search guidance:
  <https://tmsearch.uspto.gov/search/search-information>
  <https://www.uspto.gov/trademarks/search/federal-trademark-searching>
- EUIPO eSearch plus:
  <https://euipo.europa.eu/eSearch/>
- WIPO Nice Classification, 13th edition, version 2026:
  <https://nclpub.wipo.int/>
- YouTube Terms and YouTube API developer policies:
  <https://www.youtube.com/static?template=terms>
  <https://developers.google.com/youtube/terms/developer-policies>
- Gemini API additional terms, Firebase AI governance, and Google API terms:
  <https://ai.google.dev/gemini-api/terms>
  <https://firebase.google.com/docs/ai-logic/data-governance>
  <https://developers.google.com/terms/>
- GDPR Article 13 transparency requirements:
  <https://eur-lex.europa.eu/eli/reg/2016/679/oj>
- Microsoft speech-to-text data and privacy documentation:
  <https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security>
