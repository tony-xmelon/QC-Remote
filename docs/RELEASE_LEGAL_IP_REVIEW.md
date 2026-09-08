# Pre-release legal and intellectual-property review

Reviewed 2026-09-07. This is engineering issue-spotting, not legal advice or a
substitute for review by counsel in each launch market.

## Do not publish until resolved

1. **The overall visual presentation closely reproduces the device and CorOS.**
   Functional layout can be important to interoperability, but expressive
   artwork, screen graphics, and a product's overall commercial appearance can
   receive separate copyright, design, or trade-dress protection. Before public
   distribution, have counsel review screenshots of every public-facing screen
   and the store listing. Prefer the independently styled `obsidian` skin and
   original block glyphs in release builds.

2. **The open-source model is chosen, but no exact distribution license has
   been chosen for QC Remote itself.**
   The repository has no root LICENSE and is currently public despite not being
   ready for public distribution. Freevia, a legal entity based in Bulgaria, is
   recorded as the intended publisher and copyright owner, and has selected an
   open-source distribution model. Select the exact SPDX license, verify
   Freevia's chain of title and authority, and ship matching terms before
   accepting public users. Do not publish source under an implied license.
   Record the private corporate and contribution evidence described in
   `docs/PUBLISHER_AUTHORITY_CHECKLIST.md`; Git authorship alone is not proof
   that Freevia owns or may license every first-party contribution and asset.
   `docs/TERMS_OF_USE_DRAFT.md` remains intentionally incomplete until the exact
   license and remaining publisher details are supplied.
   The audit also found inconsistent first-party metadata: private/unlicensed
   npm workspaces, mostly MIT Rust crates, two Apache-2.0 services, and an
   unlicensed Windows native crate. Follow
   `docs/DISTRIBUTION_LICENSE_DECISION.md` and harmonize every manifest before
   setting the new project-license and contribution-policy release flags.

3. **The source repository is already public and contains historical reference
   material and downloadable binaries.** GitHub reports the configured origin
   as public, with 18 non-expired Actions artifacts and no formal Releases. The
   current local index removes 221 physical-device/manual and derived visual
   reference files, but
   that change is not remote and cannot remove earlier copies or history. Follow
   `docs/PUBLIC_REPOSITORY_REMEDIATION.md`: make the repository private, remove
   remote artifacts, push the current-tree cleanup, perform a history/secret
   remediation, and independently verify a clean source archive before making
   it public again. These remote/destructive actions require the repository
   owner's explicit authorization. While the repository remains public, every
   push and pull request now runs a dedicated full-history credential and
   source-IP boundary job. It is intentionally red until remediation; this is a
   warning/control, not a recall of already-public material.

4. **The tracked source tree still contains private conformance
   implementations and device-derived datasets.** Production hosts now import
   independent release screens directly and exclude the exact CorOS fixture
   implementation from compiled apps, but an open-source archive would still
   include tracked fixture components, reconstructed styles and glyphs,
   captured colors and geometry, private-fidelity tests/tools, reconstruction
   reports, and the live parameter-scale baseline. The expanded audit currently
   identifies 44 tracked files across these families. Follow
   `docs/PUBLIC_SOURCE_IP_BOUNDARY.md` and separate the private
   conformance corpus from the independently designed public source before
   recording the source IP boundary as reviewed. `npm run legal:source-ip`
   enforces this boundary against Git's release index and currently fails on
   those tracked families by design.

5. **EU trader and product-law decisions are incomplete.** Freevia still needs
   to publish its exact registered legal identity, address, register details,
   and public business contacts, and record whether QC Remote is supplied in a
   commercial activity for EU Cyber Resilience Act purposes. The Commission's
   July 2026 guidance treats installed mobile and desktop applications as
   products with digital elements. Open-source status is not by itself a CRA exemption:
   the factual assessment must cover paid binaries or access, paid
   updates, donation-conditioned access, required non-security personal-data
   processing, bundling with paid offerings, and whether the app monetizes a
   separate service. Conversely, free source, binaries and updates do not become
   commercial solely because a company develops them, and optional professional
   services can remain separate. Record QC Remote's actual facts rather than
   relying on Freevia's legal form. Follow
   `docs/EU_PRODUCT_COMPLIANCE_CHECKLIST.md`; if the product is in scope, the
   release needs an implemented compliance and vulnerability-reporting plan.
   CRA vulnerability and severe-incident reporting begins on 11 September 2026;
   the main obligations begin on 11 December 2027.

6. **A new Android physical-device incident blocks release; Windows backup also
   remains separately gated.** The private incident record
   `QC-WIN-2026-09-07-YSOD-01` preserves the yellow-screen failure observed during
   Windows conformance work. Catalog request amplification and stale-catalog
   retry timing were corrected on both native hosts. Later duplicate-setlist
   runs caused no crash, and the current-runtime Windows r24 regression passed
   all 105 non-backup actions with zero failures plus 280 stress operations,
   restored the starting preset, and ended connected and synchronized after the
   catalog verification runtime was unified across both native hosts. The incident remains under monitoring because firmware
   causality cannot be proven from one crash, but it is no longer an independent
   release blocker. The separately consented Windows backup action was not part
   of r24 and still requires physical certification before distribution. A
   dedicated fail-closed release field records that requirement independently.
   A second record, `QC-ANDROID-2026-09-07-YSOD-01`, preserves a yellow-screen
   failure reported shortly after Android 0.3.23 started with the QC attached.
   No conformance harness, backup, phone relay service, or remote MCP action was
   active. The automatic USB open/handshake startup lifecycle is a suspected but
   unproven trigger. That incident remains open and release-blocking.

7. **Post-2026 EU software product-liability readiness is incomplete.**
   Directive (EU) 2024/2853 applies to products placed on the market or put into
   service after 8 December 2026 and expressly includes software. Its
   noncommercial FOSS exclusion is factual and can be lost through price or
   certain personal-data exchanges. The defectiveness assessment includes the
   product's presentation, foreseeable use, connected products, cybersecurity,
   updates, and user needs. Follow `docs/EU_PRODUCT_LIABILITY_CHECKLIST.md` and
   complete the separate scope decision, connected-device/AI hazard assessment,
   evidence-retention plan, post-release response, and insurance decision.
   A first evidence-linked hazard register is maintained in
   `docs/PRODUCT_SAFETY_RISK_ASSESSMENT_DRAFT.md`; it deliberately leaves the
   prior parameter mismatch, backup, relay, firmware, AI-command, and update
   risks open rather than treating warnings or passing unit tests as acceptance.

## High or medium risk requiring a release decision

- **Name clearance.** `QC Remote` is the proposed public product name; it has
  not been legally cleared or registered. The 2026-09-07 preliminary registry
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
- **Publisher/developer-name clearance.** `Freevia` is also a public source
  identifier, not merely a registry field. Bulgarian company registration and
  Google Play organization verification do not clear that name as a trademark
  or trade name. An open-web screen found multiple unrelated users and an
  unverified third-party record purporting to identify EUTM application
  019325741 for `FREEVIA`, including Class 009 goods. Do not treat that candidate
  as an authoritative registration until its owner, status, territories, and
  full goods/services are independently verified in EUIPO/TMview. The release
  record now separately blocks publication until `Freevia` or a replacement
  public developer brand has a dated evidence-backed clearance decision. Use
  Freevia's exact verified registered name for mandatory legal disclosures;
  consider a separately cleared distinctive store-facing developer brand.
- **Reverse-engineered interoperability.** EU Directive 2009/24/EC permits
  observation/testing by a lawful user and narrowly permits decompilation needed
  for interoperability, subject to conditions. That is helpful but fact-specific:
  retain clean provenance, limit use to interoperability, and do not ship copied
  firmware, confidential material, credentials, or access-control bypasses.
- **Google/model distribution terms.** Android development builds can use
  Firebase AI and Windows development builds can invoke direct Gemini;
  Windows can also invoke Google Antigravity or other providers. A public app needs approved
  credentials, an accurate consent screen, provider branding compliance, age and
  region gating where required, and a hosted privacy policy. Current Gemini API
  terms state that EEA/Swiss/UK API clients may use only Paid Services and impose
  an 18+ requirement. Do not represent consumer subscription access as a public
  app entitlement without written confirmation from Google.
  `docs/PROVIDER_RELEASE_MATRIX.md` now requires a separate disabled/reviewed
  decision for every runtime provider path. With no app-wide minimum age, the
  planned public release excludes direct Gemini API and Firebase AI Logic using
  the Gemini Developer API. A feature-only self-attestation is not treated as
  satisfying terms aimed at whether the API client itself is likely to be
  accessed by minors. Development paths remain in source, but release builds
  now compile the direct Gemini/Firebase AI implementations and Android
  Firebase AI dependencies out. Automated source-boundary, final-web-asset, and
  APK scans fail if those paths reappear. Re-enabling them still requires a new
  recorded review or an applicable Google contract or written exception.
- **No app-wide age limit requires a separate children/audience decision.**
  The intended position is general audience and not child-directed, but Freevia
  has not yet retained the market, provider, marketing, or Play declaration
  evidence for that conclusion. Availability to minors is not the same as
  selecting child age groups in Google Play. Before public online features,
  complete `docs/CHILDREN_AND_TARGET_AUDIENCE_CHECKLIST.md`, including GDPR
  national consent ages, COPPA actual-knowledge handling, provider eligibility,
  deletion/parental-request procedures, and the exact Play Target audience and
  content declaration. Child-inclusive positioning additionally requires a
  neutral age screen and child-compatible providers/SDKs.
- **Accessibility scope and conformance are unverified.** Automated Axe and
  target-size checks pass on the configured Windows and Android viewports, but
  the complete UI suite is not green and there is no retained signed-build
  keyboard, screen-reader, zoom/reflow, contrast, forced-colors, or native
  accessibility-tree evidence. Freevia must separately determine whether the
  final commercial/store/service model is within Directive (EU) 2019/882 and
  may not rely on a microenterprise services exemption without current factual
  evidence. Follow `docs/ACCESSIBILITY_RELEASE_CHECKLIST.md`; do not publish an
  unqualified conformance claim from automated scans alone.
- **EU AI Act role and transparency.** Article 50 transparency duties have
  applied since 2 August 2026. An integrator that distributes an AI system under
  its own product name may be the provider of that system even when a separate
  company supplies the underlying model. Both apps now display a persistent,
  shared first-interaction notice, label assistant messages `AI`, and add an
  internal origin marker. Freevia must still record its provider/deployer role
  for every enabled path and determine whether Article 50(2) requires a robust,
  interoperable marking method for generated output. Follow
  `docs/EU_AI_ACT_CHECKLIST.md`; the internal HTML marker is not represented as
  full Article 50(2) compliance.
- **AI action confirmation is not yet an independent authorization boundary.**
  The current online-model path can populate the same boolean confirmation
  fields that the shared executor checks. Prompt instructions are not proof of
  a contemporaneous user decision, and expected-state guards address stale
  state rather than authority. Public model-driven sensitive actions remain
  blocked until Freevia selects, implements, and tests one of the host-enforced
  designs in `docs/AI_DEVICE_ACTION_AUTHORIZATION.md`, then records signed-build
  evidence in `legal/public-release.json`.
- **Restricted Android SDK terms.** The locked graph contains Google Play
  Services, Play Core, and Play Integrity components whose POMs refer to Android
  SDK or service-specific terms rather than an open-source license. They are now
  listed separately in `legal/THIRD_PARTY-LICENSE-INVENTORY.json`; the publisher
  must review and record acceptance/compliance before release, especially Play
  Integrity branding, API-use, distribution, and termination conditions.
- **Google Play registration.** Freevia's Google Play developer registration is
  recorded as pending. Store publication remains blocked until the registration
  is approved and the production developer account details match the publisher.
  Because Freevia is the publishing legal entity, the release record also fails
  closed until the organization identity, matching D-U-N-S record, verified
  Payments-profile and organization-document checks, authorized-representative
  verification, organization website, private and public contact verification,
  public contact disclosure, package-name registration,
  and signing-key custody have each been reviewed and recorded. The current
  `com.qccontrol.mobile` package is a legacy development identifier, not an
  approved final identity. The Windows identifier
  `com.tonyxmelon.qcvoicecontrol` is likewise a legacy personal-development
  value. The automated gate rejects both even if the general identifier flag is
  accidentally marked complete.
- **Encryption export controls and sanctions are unresolved.** The Windows and
  relay artifacts use TLS/WSS, OAuth and authentication cryptography, credential
  storage, hashing, and locked dependencies including Rustls, ring or AWS-LC,
  and ChaCha20. That evidence prevents a “no encryption” declaration but does
  not establish whether an exclusion, classification, notification,
  authorization, or distribution restriction applies. Before any worldwide
  store, direct-download, update, relay, or hosted-service release, complete the
  exact-artifact EU dual-use and U.S. EAR assessments and a current sanctions
  distribution plan in `docs/EXPORT_CONTROLS_AND_SANCTIONS_CHECKLIST.md`.
  The release gate requires retained inventory and assessment digests rather
  than a bare classification checkbox.
- **User media and presets.** The app should require users to warrant that they
  may upload recordings, video, IRs, captures, and presets to model providers.
  Add reporting/takedown contact details before hosting or sharing user content.
  Public builds accept only media files the user attaches directly. They do not
  download, extract, transcode, or record media from YouTube, Spotify, or other
  streaming-service URLs; Antigravity URL access is read-only and forbids those
  operations. This boundary reduces platform-terms and copyright risk but does
  not establish that a user has the right to send an attached work to a model.
- **Privacy compliance.** Online model processing is now disabled until the
  user explicitly opts in on both platforms, and session conversation data has
  an in-app clear action. Persistent device identity is no longer exposed as a
  model tool, assistant preset summaries omit the custom device name, and both
  MCP implementations plus the public relay recursively remove device names
  and serial identifiers from returned data. A fail-closed data-minimization
  check protects those boundaries and the Gemini
  feature-level eligibility gate. The in-app summary is still not a complete privacy
  policy. Finalize and host `docs/PRIVACY_POLICY_DRAFT.md` with controller
  identity/contact, legal bases, exact subprocessors, transfers, retention,
  rights, age rules, and jurisdictional disclosures before distribution.
  Complete `docs/GDPR_OPERATIONAL_CHECKLIST.md` as well: the release gate now
  separately requires controller/processor classification, lawful-basis and DPIA
  evidence, Article 28 production contracts, international-transfer safeguards,
  rights/retention operations, and a tested Bulgarian 72-hour breach workflow.
- **EU consumer terms.** The terms draft preserves mandatory consumer remedies,
  habitual-residence protections, and open-source license rights. Do not replace
  those protections with a blanket "as is," no-refund, or foreign-forum waiver.
  Whether the free/open-source exclusion in Directive (EU) 2019/770 applies is
  fact-specific, especially if personal data, paid features, donations with
  benefits, or hosted services become part of the bargain. Reassess the terms
  before enabling any paid or publisher-operated offering. The release gate now
  requires a retained scope decision plus review of personal-data counter-
  performance, necessary-update commitments, pre-contract claims, conformity,
  withdrawal, termination, and actual remedy operations. Follow
  `docs/EU_CONSUMER_DIGITAL_CONTENT_CHECKLIST.md`; a rights-preserving terms
  clause is not evidence that Freevia can deliver the required remedy.
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
- Android production policy disables app-data backup, cleartext traffic, shared
  file-provider exposure, and unintended exported components. The embedded web
  views disallow mixed content. The Windows shell retains a restrictive
  self-only content-security policy and the minimum default native capability.
  A release verifier fails closed if these platform boundaries drift.
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
- The master launcher icon is now an original abstract Q/C connection mark. It
  removes the prior top-down chassis, screen, knob, navigation-control, LED, and
  footswitch arrangement and contains no Neural DSP logo or wordmark. This
  materially lowers icon-specific copyright/design/trade-dress risk, but it
  does not clear the proposed `QC Remote` name. Preserve its SVG, generator,
  dated human review, and exact store-asset hashes as provenance evidence.
- The Android splash identifies the app as `QC REMOTE` with the neutral caption
  `INDEPENDENT DEVICE CONTROL`; it no longer places `QUAD CORTEX` prominently on
  a screen where the full non-affiliation disclosure is not visible.
- Public hosts directly use small, independently styled QC Remote Gig and I/O
  views and no longer import the private fixture configuration, even in
  development mode. The 156 KB QA screen module, its device-derived preset data,
  and 272 KB fixture stylesheet are absent from verified Windows and Android
  production bundles. A release check rejects their chunk names, corpus/test
  identifiers, and known copied support/icon markers if they reappear.
- Windows and Android now use the same About, Privacy, Legal, trademark, safety,
  and third-party notice language from the shared theme package.
- `docs/ANDROID_DATA_SAFETY_DRAFT.md` maps the reviewed Android manifest and data
  flows to a pre-submission disclosure checklist; it must be verified against
  the signed release and the final production providers.
- `legal/DATA-FLOW-INVENTORY.json` records each reviewed runtime data flow,
  recipient class, trigger, data categories, purpose, transport, retention
  responsibility, user control, and source evidence. The release verifier fails
  if evidence disappears or a fixed model/OAuth runtime host is added without
  updating the inventory.
- The protocol stack is independently implemented, carries MIT licensing in its
  Rust packages, and retains the pyquadcortex MIT notice.
- The application says it is independent and unofficial wherever legal details
  are shown. Product names are used as compatibility references, not as the
  publisher identity.
- First-party npm, Python, and command identities use `qc-remote` rather than
  the former `ndsp` shorthand, reducing an avoidable suggestion that the
  publisher is Neural DSP. A release test prevents that shorthand from
  returning in package metadata.
- Runtime health, chat settings, Antigravity staging, the device flight
  recorder, command-line help, and current implementation documents now use
  the `QC Remote` name. Existing chat settings and flight-recorder state remain
  readable from their legacy directories, and stale attachment cleanup also
  covers the former staging path. The Windows crate, diagnostics format, and new
  Credential Manager entries use `QC Remote`; credential reads and deletion
  retain narrow compatibility with entries created under the former labels.
  Legacy application package identifiers remain explicitly blocked pending the
  final identifier decision.
- Accidental public package publication is disabled while publisher authority
  and the exact distribution license remain unresolved: all npm workspaces are
  private, all
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
- Physical-device screenshots, graphics trees, manual screenshots/SVG extracts,
  and derived icon/typography measurements are no longer part of the public
  source boundary. The 217 existing files remain locally available for private
  validation but are ignored and removed from Git's current index. Standard
  tests no longer depend on them, and the publication-boundary verifier rejects
  any future attempt to track those private-reference paths. Prior public Git
  history still requires separate remediation.
- Public GitHub issue intake disables blank reports and requires reporters to
  confirm that they excluded credentials, identifiers, personal data, device or
  manual screenshots, copyrighted media, proprietary presets/captures, and
  other material they are not authorized to share. Feature requests likewise
  ask for independently designed functional outcomes rather than copied art.
- Captured personal-looking setlist/preset labels have been replaced with
  neutral demo names in tracked UI fixtures, and Firebase test distribution no
  longer contains a hardcoded personal email recipient. Testers must be supplied
  explicitly for each private distribution.
- Signing keys, private-key files, service-account JSON, and local environment
  files are excluded at the repository root. The fail-closed legal verifier
  scans every tracked file for high-confidence private-key and service-account
  markers and common model-provider, GitHub, cloud, messaging, and payment token
  formats. The tracked Android `google-services.json` contains Firebase client
  configuration, including a key that appears in reachable public history.
  Google treats Firebase client keys as public identifiers only when correctly
  restricted. Freevia must verify or rotate every published value, confirm the
  public key excludes the Generative Language API, and enforce App Check before
  recording the Firebase release controls as complete.
- The current locked npm graph reports no known vulnerabilities at either the
  production or high-severity development thresholds. Weekly Dependabot checks
  now cover npm, Cargo, Gradle, Python, and GitHub Actions, and a scheduled
  RustSec workflow audits every Cargo lockfile. A 2026-09-07 all-lockfile scan
  found and removed vulnerable `quick-xml 0.38.4` (RUSTSEC-2026-0194 and
  RUSTSEC-2026-0195); all eleven Rust lockfiles now report zero RustSec
  vulnerability advisories. The Windows lock retains informational
  unmaintained, unsound, and yanked notices. Target tracing excludes GTK3,
  `glib 0.18.5`, and yanked `chacha20 0.10.1` from the supported Windows graph,
  while unmaintained `unic-* 0.9.0` remains reachable through Tauri's current
  URL-pattern dependency. Follow `docs/DEPENDENCY_SECURITY_RELEASE_CHECKLIST.md`;
  the release gate requires exact-artifact evidence and a retained disposition
  rather than treating informational warnings as a clean audit.
- QC Remote no longer edits Antigravity/Gemini's global settings or silently
  grants wildcard web access. Antigravity URL reading remains governed by the
  user's own domain-scoped permission choices; the adapter requests no command,
  file-write, or interactive-browser authority.

## Release gate

The current source tree is suitable for private testing, not public publication.
The remaining minimum legal release gate is: select the exact open-source
project license, confirm Freevia's authority and chain of title, harmonize
first-party license files/manifests, and define contribution provenance;
separate and review the public-source IP boundary;
complete the final application and infrastructure security review;
complete the EU AI Act role and output-marking assessment for every enabled model path;
complete the EU software product-liability scope, safety, evidence, and insurance decisions;
complete GDPR roles, legal bases/DPIA, processor contracts, transfers, rights, retention, and breach readiness;
resolve every release-blocking safety incident with retained evidence;
complete the separately gated physical-device backup safety certification;
finalize application identifiers, channels, and markets; verify that the recorded
no-app-wide-minimum-age decision is compatible with each store, provider, and
launch market; review
the restricted Google/Android SDK and provider data terms; verify production
Firebase ownership, billing, API restrictions and App Check; publish a privacy
policy and support/takedown contact; complete store disclosures; clear the
product name and store artwork; and complete an informed interoperability and
final-UI risk decision; and remediate the currently public repository and its
historical/downloadable artifacts. `npm run legal:check` fails closed until those
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
- EDPB transfer guidance and Bulgarian CPDP breach notification:
  <https://www.edpb.europa.eu/topics/international-transfers-and-international-cooperation_en>
  <https://cpdp.bg/en/submission-of-notifications/>
- EU digital-content consumer rules and consumer guarantee guidance:
  <https://eur-lex.europa.eu/eli/dir/2019/770>
  <https://europa.eu/youreurope/citizens/consumers/shopping/guarantees/indexamp_en.htm>
- EU Cyber Resilience Act and European Commission implementation guidance:
  <https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng>
  <https://digital-strategy.ec.europa.eu/en/library/commission-publishes-new-guidance-support-timely-cyber-resilience-act-implementation>
  <https://digital-strategy.ec.europa.eu/en/policies/cra-reporting>
- EU AI Act and European Commission Article 50 transparency guidance:
  <https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng>
  <https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems>
- EU Product Liability Directive and Commission summary:
  <https://eur-lex.europa.eu/eli/dir/2024/2853/oj/eng>
  <https://commission.europa.eu/news-and-media/news/eu-adapts-product-liability-rules-digital-age-and-circular-economy-2024-12-09_en>
- Bulgarian Commission for Personal Data Protection contacts and complaint route:
  <https://cpdp.bg/en/contacts/>
  <https://cpdp.bg/en/lodging-complaints-and-alerts/>
- Microsoft speech-to-text data and privacy documentation:
  <https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security>
