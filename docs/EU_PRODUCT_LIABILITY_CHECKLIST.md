# EU software product-liability checklist

Reviewed 2026-09-07. This is engineering issue-spotting, not legal advice. It is
designed to preserve evidence and force a release decision before Directive
(EU) 2024/2853 applies to products placed on the market or put into service
after 8 December 2026.

## Scope decision

The Directive expressly includes software as a product. It excludes free and
open-source software only when developed or supplied outside a commercial
activity. The recitals specifically treat supply for a price, or in exchange for
personal data used for purposes other than security, compatibility, or
interoperability, as commercial. A free download is not enough by itself to
prove the exclusion.

Record one conclusion in `legal/public-release.json`:

- `out-of-scope-noncommercial-foss`: the exact open-source license gives the
  required freedoms and source, binaries, updates, access, and required data
  processing are not supplied commercially;
- `in-scope-software-product`: QC Remote is supplied in commercial activity or
  the exclusion is otherwise unavailable.

Set `euProductLiabilityNoncommercialFactsReviewed` only after recording the
actual pricing, donations, hosted services, bundled offerings, professional
support, telemetry, and personal-data facts. Do not copy the CRA conclusion
without a separate assessment against this Directive and Bulgarian transposition.
The concrete launch facts are stored once in `craCommercialActivityFacts` to
avoid contradictory factual records, but the legal conclusion and approval are
separate. The release gate rejects an out-of-scope product-liability conclusion
if any recorded fact indicates monetization or remains undecided.

## Safety risk assessment

The defectiveness test includes presentation and instructions, foreseeable use,
interconnection with other products, post-release control and updates,
cybersecurity requirements, recalls, and the needs of intended users. QC Remote's
risk record must therefore cover at least:

- unexpected volume, output, routing, tempo, bypass, scene, preset, and parameter
  changes, including stale or incorrectly confirmed model-generated values;
- destructive save, overwrite, delete, copy, move, restore, backup, and setlist
  operations, including loss or corruption of non-professional user data;
- interrupted USB/relay communication, stale reads, duplicate writes, recovery,
  firmware incompatibility, and failures during app or device updates;
- live-performance misuse, hearing/equipment risk from unsafe output levels,
  unattended operation, and reasonably foreseeable reliance on AI output;
- provider, dependency, credential, relay, and update-channel compromise;
- accessible warnings and safe behavior for the intended user population.

Preserve the mapping from each hazard to prevention, confirmation, rollback,
authoritative readback, tests, residual risk, and user instructions. The product
must be safe in reasonably foreseeable use; warnings do not replace feasible
technical controls. Maintain that mapping in
`docs/PRODUCT_SAFETY_RISK_ASSESSMENT_DRAFT.md` until it is approved as the final
signed-build assessment.

## Evidence and post-release readiness

National courts may order proportionate disclosure of relevant evidence, and
failure to disclose can create a presumption of defectiveness. Before release:

- retain signed binaries, source revision, dependency lockfiles, SBOM, build
  provenance, release manifest, provider/model configuration, applicable terms,
  risk assessment, validation reports, known issues, and user instructions for
  each version;
- define protected retention for safety reports, fixes, release dates, update
  availability, vulnerability handling, and communications without placing
  private device/user evidence in the public repository;
- identify who can issue an update, warning, withdrawal, or recall and how users
  can be reached without adding analytics;
- assess appropriate product/cyber liability insurance and record the decision;
- review the final Bulgarian implementing law and every additional launch market.

Set `productSafetyRiskAssessmentCompleted`,
`productLiabilityEvidenceRetentionReviewed`, and
`productLiabilityInsuranceDecisionReviewed` only when dated evidence exists.
Contract terms must not purport to exclude liability that applicable law makes
non-excludable.

## Official sources

- Directive (EU) 2024/2853:
  <https://eur-lex.europa.eu/eli/dir/2024/2853/oj/eng>
- European Commission summary:
  <https://commission.europa.eu/news-and-media/news/eu-adapts-product-liability-rules-digital-age-and-circular-economy-2024-12-09_en>
