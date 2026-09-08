# EU AI Act release checklist

Reviewed 2026-09-07. This is engineering issue-spotting, not legal advice.
Freevia must retain the factual assessment and identify any additional national
requirements before distributing QC Remote in the EEA.

## Role assessment

QC Remote integrates third-party general-purpose models into an assistant that
is distributed under Freevia's product name and can propose or perform connected
device operations. The Commission's final Article 50 guidance, published on
20 July 2026, says an entity that
develops, or has developed, and places an AI system on the market under its own
name or trademark can be the provider of that system even when an upstream model
provider remains the provider of the underlying model. Do not assume that using
Google, Anthropic, OpenAI, Antigravity, or a compatible endpoint makes Freevia
only a deployer.

Before release, record:

- whether each enabled path makes Freevia a provider, deployer, distributor, or
  importer of the resulting AI system;
- the upstream provider and model, contractual allocation of AI Act duties, and
  technical documentation made available to Freevia;
- whether QC Remote generates synthetic content within Article 50(2), including
  whether text shown only inside the interactive chat is covered and what
  effective, interoperable machine-readable marking is required;
- whether any output is published as public-interest text or exported as audio,
  image, or video, and the applicable disclosure or labelling route;
- the intended-purpose, foreseeable-misuse, safety, accessibility, complaint,
  logging, and post-market monitoring records appropriate to the final role.

Set `euAiActRoleAssessmentCompleted` only after this is documented for every AI
path enabled in the signed public build. A provider decision requires evidence,
not merely the upstream provider's brand or terms.

## First-interaction transparency

Article 50 applies from 2 August 2026. Information that a person is interacting
with an AI system must be clear, distinguishable, accessible, and supplied no
later than first interaction or exposure, unless that fact is already obvious to
a reasonably well-informed, observant and circumspect person in context.

QC Remote therefore:

- displays a persistent shared notice in both Windows and Android chat panes;
- labels assistant responses `AI` rather than presenting them as a human or as
  the connected device;
- records an internal `data-content-origin="ai"` marker on assistant messages;
- warns that responses can be inaccurate and that proposed and resulting device
  state must be verified.

The internal HTML marker improves local detectability but is not represented as
the robust, interoperable content marking required by Article 50(2). If QC Remote
is an Article 50(2) provider, select and test an applicable standard or Code of
Practice implementation before release. Keep `euAiTransparencyControlImplemented`
true only while both visible surfaces and the shared disclosure remain present.
That implementation flag does not clear the release gate by itself. Before
release, verify the exact signed builds and record:

- that the notice is available from the start of first interaction;
- keyboard and screen-reader accessibility of the notice and composer linkage;
- `AI`, `APP`, and device-tool origin labelling across every enabled provider;
- the documented Article 50(2) synthetic-content marking conclusion; and
- a SHA-256 digest of the retained test report or evidence bundle.

Record those results in `legal/public-release.json`. Do not mark accessibility
or cross-provider origin handling verified from source inspection alone.

## Prohibited and higher-risk uses

The reviewed intended purpose is musical-device assistance. It does not include
biometric categorisation, emotion recognition, social scoring, manipulation,
employment, education, credit, law-enforcement, migration, or other high-risk
decision making. Do not add or market those purposes without a new classification
and compliance assessment. Preserve user control, bounded tool access,
expected-state guards, guarded confirmations, and the ability to disable online
models.

## Official sources

- Regulation (EU) 2024/1689, Articles 3, 50 and 113:
  <https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng>
- European Commission Article 50 guidance and FAQs:
  <https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems>
  <https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations>
  <https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act>
