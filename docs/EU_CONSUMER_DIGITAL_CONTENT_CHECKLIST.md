# EU consumer digital-content release checklist

Reviewed 2026-09-07. This is engineering and legal issue-spotting, not a
Bulgarian-law opinion or a substitute for market-specific legal review.

## Scope decision

Before distributing QC Remote to consumers in the EEA, retain a written scope
assessment for Directive (EU) 2019/770 and its national implementations. Record
one `euDigitalContentDirectiveDecision` in `legal/public-release.json`:

- `outside-consumer-contract` only where Freevia is not acting as a trader in a
  consumer contract for the relevant app or service;
- `outside-directive-no-price-or-data-counterperformance` only where the
  consumer neither pays nor undertakes to provide personal data, except data
  processed exclusively to supply the content/service or comply with law; or
- `in-scope` where the release or an optional service is supplied for money or
  qualifying personal data.

Assess the downloadable app and each optional hosted, relay, speech, AI,
account, support, donation-benefit, subscription, and in-app-purchase path
separately. “Free,” “open source,” or user-supplied API credentials do not alone
answer whether a consumer contract or data counter-performance exists. Record
the actual store flow, privacy choices, provider data uses, and Freevia's
commercial role. Confirm the Bulgarian implementing rules and every additional
launch market before relying on an exclusion.

## Pre-contract information and public claims

Reconcile the signed artifacts, store listing, website, About/Legal screens,
README, terms, privacy policy, and support material. State accurately:

- functionality, interoperability, supported Quad Cortex firmware, supported
  operating systems, device/USB/network requirements, and known limitations;
- whether local control, AI, speech, relay, attachments, or accounts are
  included, optional, unavailable, or supplied by a third party;
- price, renewals, purchases, donations tied to benefits, data processing, and
  contract duration;
- the minimum committed period for necessary software and security updates
  where that disclosure is required; and
- contact, complaint, withdrawal, termination, and statutory-remedy routes.

Do not market unverified fidelity, compatibility, continuous availability,
model accuracy, device safety, accessibility, or update duration. A separate,
express acceptance may be required for a disclosed deviation from objective
conformity requirements; a general disclaimer or bundled “as is” clause is not
a substitute.

## Conformity, updates, and remedies

For every in-scope release, define and test an operational process to:

- supply the promised app/service and keep continuous services conforming for
  the contracted period;
- notify users of necessary updates and provide usable installation
  instructions;
- accept defect reports and bring the app/service into conformity within a
  reasonable time, free of charge and without significant inconvenience;
- provide any required price reduction, refund, contract termination, cessation
  of non-required data use, and return/export of user-created content;
- preserve evidence of public statements, versions, support periods, incidents,
  fixes, notices, acceptance of specific deviations, and completed remedies;
- handle negative service modifications, advance notice, and any right to keep
  an unmodified conforming version or terminate; and
- avoid terms that waive mandatory remedies, reverse burdens of proof, force an
  unavailable forum, or reduce open-source rights already granted.

The current terms correctly reserve mandatory rights but do not themselves
prove that Freevia can operate these remedies. Do not set the release fields to
complete until the final support owner, update period, intake channel, response
workflow, data-return/deletion path, signed artifacts, markets, and terms have
been tested and retained.

## Evidence

Keep the detailed assessment privately because it may contain company,
contract, account, and support information. It should identify the reviewer,
date, exact Git revision and signed artifact hashes, markets, channels,
commercial model, data flows, applicable national rules, update commitment,
terms/privacy versions, support owners, and remedy test results. Record only its
SHA-256 digest as `consumerContractEvidenceSha256`.

## Official sources

- Directive (EU) 2019/770 on contracts for digital content and digital services:
  <https://eur-lex.europa.eu/eli/dir/2019/770/oj/eng>
- European Commission digital-contracts overview:
  <https://commission.europa.eu/document/download/32184a01-3fc8-4d3c-95ed-356ba1cd577e_en?filename=factsheet_digital_contracts.pdf>
- Your Europe guidance on guarantees for digital content and services:
  <https://europa.eu/youreurope/citizens/consumers/shopping/guarantees/index_en.htm>
