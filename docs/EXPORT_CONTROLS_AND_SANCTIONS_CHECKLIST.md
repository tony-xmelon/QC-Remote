# Export controls and sanctions release checklist

Reviewed 2026-09-07. This is engineering issue-spotting, not a classification,
licence determination, or legal opinion.

## Why this release needs a recorded assessment

QC Remote is not an encryption product by intended purpose, but its distributed
software uses encryption for HTTPS/WSS transport, relay authentication, OAuth,
credential storage, integrity checks, and related security functions. The
current Windows and relay dependency trees include Rustls, ring or AWS-LC,
ChaCha20, SHA-2, and platform security facilities. Android also relies on
platform TLS and credential/security services.

Do not claim that the application contains no encryption. Conversely, the
presence of cryptographic libraries does not by itself establish that a licence
is required. Classification depends on the exact artifact, functionality,
availability, destination, recipient, end use, and applicable exclusions or
authorizations.

## Artifact inventory

For every signed APK/AAB, Windows installer/binary, relay image, downloadable
CLI or service binary, and public source archive:

- produce an exact dependency/SBOM and cryptographic-function inventory;
- identify algorithms and whether users can modify cryptographic functionality;
- distinguish confidentiality encryption from authentication, signatures,
  integrity hashing, credential storage, and operating-system-provided TLS;
- record whether source and corresponding object code are publicly available;
- record distribution channels, hosting countries, target markets, service
  regions, payment paths, and update delivery;
- hash the inventory and retain it with the exact artifact hashes privately.

The inventory must be regenerated after dependency, platform, relay, packaging,
or cryptographic-feature changes. A source-only scan is not evidence of what a
signed store artifact contains.

## EU dual-use assessment

Freevia is established in Bulgaria, so assess Regulation (EU) 2021/821 and the
current EU control list for each export or transmission outside the EU. Record
one supported decision in `euDualUseClassificationDecision`:

- `not-listed`;
- `cryptography-note-exclusion-documented`;
- `authorization-or-registration-completed`; or
- `distribution-restricted`.

If relying on the Category 5 Part 2 Cryptography Note, retain the facts proving
general public availability, non-user-changeable cryptographic functionality,
user installation without substantial supplier support, and readiness to
provide details to the competent authority when required. Do not infer the note
solely from a free price or an open-source label.

## U.S. EAR encryption assessment

Evaluate the complete application and services for U.S.-origin components,
U.S. hosting or release activity, and exports/reexports. BIS states that an item
does not become publicly available merely because it incorporates or calls
publicly available open-source encryption. Record one supported decision in
`usEarEncryptionClassificationDecision`:

- `not-subject-to-ear-documented`;
- `mass-market-classification-completed`;
- `authorization-or-exception-completed`; or
- `distribution-restricted`.

If relying on public-availability or mass-market treatment, preserve the exact
notification, self-classification report, Commodity Classification request,
classification, dates, recipients, and artifact/source relationship that the
chosen route requires. Do not put government filing identifiers or sensitive
corporate evidence in the public repository unless publication is required.

## Sanctions and restricted destinations

Before opening any worldwide store, direct download, update, model-provider,
relay, payment, support, or hosted-service channel:

- map every channel's country availability and ability to block territories;
- check current EU restrictive measures and each relevant provider/store rule;
- screen business counterparties and paid/service recipients where required;
- cover free software downloads as well as paid transactions—absence of payment
  does not prove that an export or service restriction is irrelevant;
- define update, security-fix, takedown, false-positive, escalation, record
  retention, and emergency suspension procedures; and
- re-screen whenever sanctions, destinations, ownership, end use, or providers
  change.

Use the current Official Journal legal acts as authoritative. The Commission's
Sanctions Map and consolidated list are operational aids and can change.

## Release evidence

Set `exportControlAssessmentCompleted` and
`sanctionsDistributionPlanReviewed` only after the exact release artifacts and
all channels are covered. Record SHA-256 digests for the private cryptography
inventory, assessment, and sanctions-control evidence in
`legal/public-release.json`. A questionnaire, generic dependency list, or bare
checkbox is insufficient.

## Official sources

- EU Dual-Use Regulation (EU) 2021/821, including Category 5 Part 2:
  <https://eur-lex.europa.eu/eli/reg/2021/821/oj/eng>
- European Commission sanctions overview, map, consolidated list, and national
  competent-authority resources:
  <https://finance.ec.europa.eu/eu-and-world/sanctions-restrictive-measures/overview-sanctions-and-related-resources_en>
- U.S. BIS guidance on encryption items not subject to the EAR:
  <https://www.bis.gov/learn-support/encryption-controls/encryption-items-not-subject-to-ear>
