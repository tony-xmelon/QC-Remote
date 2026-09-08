# Freevia publisher-authority and chain-of-title checklist

Prepared 2026-09-07. This is an internal evidence checklist, not a copyright
assignment, legal opinion, or substitute for an authorized signature.

The Git history currently shows one author and committer identity across all
reachable commits: `Antoni Ivanov <262547018+tony-xmelon@users.noreply.github.com>`.
That is useful provenance evidence, but a Git identity does not prove that
Freevia owns the resulting copyright or may license every included element.

Keep completed evidence in a private corporate record. Do not commit identity
documents, signatures, home addresses, registry numbers, contracts, credentials,
or signing keys to this repository.

## Corporate identity and authority

- Verify Freevia's exact registered legal name, jurisdiction, registration
  status, registered address, and authorized representative against current
  Bulgarian registry evidence.
- Confirm that the person approving publication can bind Freevia and can accept
  the selected open-source license, store terms, SDK terms, and provider terms.
- Record the approval date, approver role, exact source revision, selected SPDX
  expression, application identifiers, signing certificate fingerprints, and
  intended distribution channels.
- Hash the final private approval/evidence bundle and record only its SHA-256
  digest in `publisherAuthorityEvidenceSha256`; do not place the underlying
  identity, employment, assignment, or signature evidence in the repository.

## First-party source and assets

- Obtain a written representation from every natural person who created code,
  copy, icons, artwork, audio, presets, screenshots, or other protectable work
  that identifies whether the work was created by Freevia personnel, assigned
  to Freevia, or licensed to Freevia with sublicensing/distribution rights.
- Review employment, contractor, founder, and assignment documents for the law
  governing ownership. Do not infer corporate ownership merely from payment,
  repository access, or use of a company account.
- Record the provenance of the QC Remote icon, splash screens, fonts, generated
  code, screenshots, and store assets. Exclude physical-device and manual
  captures from public release material unless separately authorized.
- Identify material generated with AI-assisted development tools and retain the
  applicable account/plan terms and human review record. Do not promise that an
  AI provider transferred rights it did not grant.

## Third-party and interoperability material

- Keep third-party dependencies, fonts, the community protocol material, and
  any other imported work outside Freevia's first-party copyright claim.
- Confirm that all retained third-party notices, license texts, source
  availability obligations, attribution, and modification notices match the
  exact release revision.
- Confirm that interoperability research did not retain firmware, access
  credentials, protected service content, copied manual artwork, or circumvention
  tooling in the distributed source or binaries.
- Confirm that use of Neural DSP and Quad Cortex names remains compatibility-only
  and follows `TRADEMARKS.md` and the final store listing.

## Open-source grant and contributions

- Select the exact SPDX license and make every first-party manifest, root
  license file, source header policy, README statement, and binary notice agree.
- Confirm explicitly that Freevia has authority to grant that license for all
  first-party files at the selected revision.
- Adopt inbound contribution terms before accepting pull requests. Decide
  whether Developer Certificate of Origin sign-off is sufficient or whether
  Freevia needs a separate contributor agreement for relicensing or patent
  rights.
- Retain the dated contribution-policy approval privately and record its digest
  in `contributionPolicyEvidenceSha256`. A repository checkbox or README sentence
  is not evidence that the authorized publisher adopted the policy.
- Preserve immutable approval evidence and the exact source archive/hash that
  was approved. Future releases must repeat the review for new contributors and
  assets.

Only after the evidence above is complete should
`publisherAuthorityConfirmed`, `projectLicenseFilesFinalized`, and
`contributionPolicyFinalized` be set to `true` in
`legal/public-release.json`.
