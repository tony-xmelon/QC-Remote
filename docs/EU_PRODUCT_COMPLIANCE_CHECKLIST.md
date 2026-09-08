# EU product and trader compliance checklist

Status reviewed: 2026-09-07. This is a release-risk checklist, not a legal
opinion. Freevia must confirm the facts and obtain specialist advice where its
business model or intended distribution makes the answer uncertain.

## Public trader identity

Before an EU public release, publish and keep consistent across the store
listing, website, privacy policy, terms, and in-app About/Legal screens:

- Freevia's exact registered legal name and legal form;
- registered geographic address, public email address, and telephone number;
- Bulgarian register name and registration number; and
- VAT identification number if applicable.

These fields are now explicit, fail-closed entries in
`legal/public-release.json`. `publisherVatStatus` must say whether Freevia is
VAT-registered so that a blank VAT number cannot be mistaken for a completed
review. `publisherRegistryIdentityVerified` must remain false until the exact
values have been checked against current Bulgarian register evidence. This
implements the publication-data categories in Article 5 of Directive
2000/31/EC; it is not a conclusion about every additional Bulgarian disclosure.

Do not treat the short name `Freevia` or a non-affiliation notice as a substitute
for these disclosures. Google Play or another online platform may request
additional non-public verification evidence and may display trader contact and
register information to EU users.

## Cyber Resilience Act (CRA)

QC Remote is software that communicates with hardware and network services, so
Freevia must make and retain a written CRA scope assessment before release. Open
source status alone is not an exemption.

The Commission's July 2026 guidance specifically treats both an installed mobile
application and a locally installed desktop application built with web technology
as products with digital elements. It also clarifies that openly shared FOSS that
is not monetized by its publisher is not supplied in a commercial activity merely
because a company developed or financed it. The answer changes if access,
binaries, updates, functionality, bundled support, another service, or required
non-security personal-data processing is monetized. This assessment is therefore
about QC Remote's actual distribution model, not Freevia's corporate form alone.

The release record now preserves each fact separately in
`craCommercialActivityFacts`. Every field must be an evidenced `true` or
`false`; `undecided` is intentionally release-blocking. An out-of-scope
noncommercial-FOSS conclusion is rejected unless all of the following are true:

- the selected license actually permits free access, use, modification, and
  redistribution;
- Freevia does not monetize QC Remote, charge for access or features, charge for
  updates, or tie benefits to donations;
- QC Remote does not require a paid service and is not bundled with a monetized
  product;
- required personal-data processing is limited to security, compatibility, or
  interoperability; and
- Freevia does not intend QC Remote for integration into a monetized product.

Answer these from the actual launch arrangement and retain supporting store,
website, pricing, donation, service, and data-flow evidence. A future business
model change must reopen the classification before distribution continues.

Record exactly one conclusion in `legal/public-release.json`:

- `out-of-scope-noncommercial-foss`: Freevia supplies the open-source software
  outside a commercial activity and records the supporting facts. Confirm that
  source, binaries, ordinary updates, and security updates are freely available;
  that no payment or donation is required; that the app does not monetize another
  service; and that non-security personal-data processing is not a condition of use;
- `in-scope-manufacturer`: Freevia places the product on the EU market in the
  course of a commercial activity; or
- `in-scope-open-source-steward`: Freevia does not place the product on the
  market but meets the CRA's steward criteria.

If the conclusion is in scope, document at minimum:

- product cybersecurity risk assessment and technical documentation;
- secure-by-design/default controls and dependency vulnerability handling;
- a stated support period and security-update process;
- coordinated vulnerability disclosure and market-surveillance contacts;
- actively exploited vulnerability and severe-incident reporting readiness;
- conformity assessment, EU declaration of conformity, CE marking, and user
  information where the manufacturer duties apply; and
- how substantial modifications and end-of-support decisions are controlled.

The main CRA obligations apply from 11 December 2027. The reporting obligations
apply from 11 September 2026, including to products already made available on
the Union market. A release before the main application date is therefore not a
reason to omit the assessment or reporting plan.

Do not select the noncommercial conclusion until
`craNoncommercialFactsReviewed` records those facts. If Freevia is a manufacturer
or steward, do not release until `craIncidentReportingReadinessReviewed` records
an owner and tested process for the 24-hour early warning, 72-hour notification,
and applicable final report.

## Evidence to retain privately

- dated CRA scope memorandum and the commercial/noncommercial facts relied on;
- company-register extract and authority of the person making store declarations;
- screenshots/exports of EU trader and Google Play organization disclosures;
- security support period, vulnerability intake process, and incident owners;
- release SBOM, dependency scan, provenance, and security-test results; and
- any conformity documents required by the final CRA classification.

## Primary sources

- EU Electronic Commerce Directive, Directive 2000/31/EC, Article 5:
  <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02000L0031-20240217>
- EU Cyber Resilience Act, Regulation (EU) 2024/2847:
  <https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng>
- European Commission CRA open-source explanation:
  <https://digital-strategy.ec.europa.eu/en/policies/cra-open-source>
- European Commission July 2026 CRA implementation guidance:
  <https://digital-strategy.ec.europa.eu/en/library/commission-publishes-new-guidance-support-timely-cyber-resilience-act-implementation>
- European Commission CRA reporting obligations:
  <https://digital-strategy.ec.europa.eu/en/policies/cra-reporting>
- Digital Services Act Article 30 trader traceability:
  <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065>
- European Commission business website disclosure guidance:
  <https://europa.eu/youreurope/business/growing/digitalising/setting-up-business-website/index_en.htm>
