# QC Remote distribution-license decision

Reviewed 2026-09-07. This is engineering issue-spotting, not legal advice.

## Current state

Freevia, a legal entity based in Bulgaria, is the intended publisher and
copyright owner. Freevia has chosen an open-source distribution model, but has
not yet selected the exact open-source license. QC Remote therefore does not
yet have a coherent project license. The repository has no
root `LICENSE` file. All first-party npm workspaces are marked `private`, all
first-party Cargo packages are marked `publish = false`, and the first-party
manifests deliberately omit a license declaration until Freevia approves one
coherent project-wide grant. Git history currently identifies one committing
author, Antoni Ivanov,
but a commit record does not by itself establish the legal copyright owner or
confirm that every contribution was made within that person's authority.
Specifically, `git shortlog -sne --all` reported all 440 reachable commits under
that single GitHub noreply identity on 2026-09-07. This does not prove the
author's legal identity, employment or contractual obligations, ownership of
imported assets, or authority to license the work. `CONTRIBUTING.md` therefore
temporarily declines external contributions while inbound terms are unresolved.

Do not publish source or binaries until Freevia selects the exact open-source
license, confirms its authority and chain of title, harmonizes every first-party
manifest, and ships the corresponding license and terms.

Use `docs/PUBLISHER_AUTHORITY_CHECKLIST.md` to preserve the corporate authority,
creator/assignment, asset provenance, AI-assisted-development, and exact-revision
evidence behind that confirmation. Sensitive evidence belongs in Freevia's
private records, not in this repository.

Until that decision is made, the repository enforces an accidental-publication
boundary: npm workspaces set `private: true`, Cargo packages set `publish =
false`, and Python projects use PyPI's `Private :: Do Not Upload` classifier.
`npm run legal:publication-boundaries` verifies all three ecosystems. These are
interim registry controls, not a distribution license and not evidence that the
present license metadata is harmonized.

`npm run legal:project-license` separately fails until the exact SPDX
expression is selected, every first-party npm, Cargo, and Python manifest uses
that same expression, and the tracked root license files contain every license
text required by it. Removing the former mixed MIT and Apache-2.0 manifest
labels prevents non-publishable internal packages from being mistaken for a
coherent grant; it does not revoke any rights already granted for a copy that
was previously distributed with a valid license.

The public-release gate presently accepts only the three permissive choices
reviewed for this dependency and contribution model: `Apache-2.0`, `MIT`, or
`MIT OR Apache-2.0`. A merely SPDX-shaped identifier is not evidence that a
license is open source or compatible. Choosing GPL, AGPL, LGPL, MPL, a
source-available license, or another expression requires a fresh distribution,
linking, app-store, contribution, and notice review before expanding the gate.

The release record also requires an explicit scope decision. Choose either
`all-original-material`, in which case the selected project license covers all
original code, documentation, and brand artwork in the public archive, or
`code-only-with-explicit-exclusions`, in which case every excluded documentation
and artwork path must carry a conspicuous separate notice. Documentation and
original brand assets may use `same-as-project`, `CC-BY-4.0`, or
`all-rights-reserved`; those choices do not change third-party rights and cannot
be used to relicense vendor-derived material. A root license file without a
clear scope statement is insufficient for this mixed code-and-assets tree.

## Option A: proprietary binaries and private source

This is the lower-disclosure option if the publisher wants to retain exclusive
control of the first-party source.

- Keep first-party source private and add a publisher-owned end-user license
  governing installation and use of the Windows and Android binaries.
- Keep the current private/non-published manifest controls until a coherent
  release decision is applied. A public grant already made for a particular
  copy cannot normally be withdrawn from a recipient merely by changing later
  metadata, so first establish whether any internal crate versions were ever
  distributed under the former MIT or Apache-2.0 labels.
- Complete `docs/TERMS_OF_USE_DRAFT.md` with the publisher identity, license
  grant, warranty/liability language appropriate to each target market, support
  rules, termination, and governing-law terms.
- Continue distributing all third-party notices, license texts, and the source
  availability document. A proprietary first-party license does not replace
  third-party obligations.

## Option B: open-source first-party code

This is the selected distribution model. It can simplify public source
collaboration but gives recipients broad rights
that cannot be clawed back for copies already licensed.

**Engineering recommendation: `Apache-2.0`.** Of the reviewed choices, it gives
one clear project-wide grant plus an express contributor patent licence and
patent-termination protection. That is more protective than MIT for a project
that implements hardware interoperability. It also avoids the contributor and
notice ambiguity of maintaining two alternative first-party licences. This is
not a conclusion that Freevia owns every right needed to make the grant; the
chain-of-title review remains separate and mandatory.

This recommendation was rechecked on 2026-09-07 against the current locked
inventory and the official Apache and OSI materials. The inventory contains
MPL-2.0 components and one Java component offered under GPL-2.0-with-Classpath-
Exception **or MIT**; those components retain their own terms and are not being
relicensed as first-party Apache-2.0 code. The inventory's selected permissive
alternative and bundled notices/source obligations must remain verified for the
exact release. A future dependency with only GPL-2.0 terms would require a new
compatibility analysis because the Apache Software Foundation identifies
Apache-2.0 and GPL-2.0 as incompatible.

- `Apache-2.0` provides an express patent license and patent-termination clause.
  `MIT` is shorter but does not contain the same express patent grant.
- A dual `MIT OR Apache-2.0` policy is common in Rust ecosystems and lets each
  recipient choose, but it increases the files and notices that must remain
  synchronized.
- Add the selected root license file or files, copyright notice, README license
  statement, and matching SPDX expression to every publishable first-party
  npm and Cargo manifest. Keep applications `private` in npm unless they are
  intentionally being published as packages.
- Define whether artwork, screenshots, test captures, firmware-derived facts,
  and documentation use the code license or separate terms. Reference captures
  should not be included in a public source release unless their provenance and
  redistribution rights are documented.

## Contribution policy

The history presently shows one committer, so a CLA or DCO is not required to
resolve an existing multi-contributor chain. Before accepting outside patches,
choose and document one inbound-contribution policy:

- Developer Certificate of Origin (`Signed-off-by`) for a lightweight
  provenance record; or
- a contributor license agreement if the publisher needs explicit relicensing
  or additional patent permissions.

Record employer/client ownership and assignment where any work was created in
the course of employment or under contract. Do not describe the code as owned
by “QC Remote contributors” until the actual ownership and contribution terms
support that statement.

## Required release record

Complete these fields in `legal/public-release.json` only after the underlying
documents and authority exist:

- `copyrightOwner`
- `distributionLicense`
- `distributionLicenseDecisionApprovedAt`
- `distributionLicenseDecisionApproverRole`
- `distributionLicenseDecisionRevision`
- `sourceLicenseScope`
- `documentationLicense`
- `brandAssetLicense`
- `projectLicenseFilesFinalized`
- `licenseScopeNoticesFinalized`
- `contributionPolicyFinalized`
- `contributionPolicy`
- `contributionPolicyEvidenceSha256`
- `publisherAuthorityConfirmed`
- `publisherAuthorityEvidenceSha256`

The release verifier intentionally remains fail-closed until then.

The publisher and distribution-model fields are now recorded. The exact SPDX
license expression remains deliberately blank; “open source” is an intent, not
a license grant.

Official reference material used for this recommendation:

- Apache License 2.0 text and SPDX identifier:
  <https://www.apache.org/licenses/LICENSE-2.0.html>
- Apache guidance for applying the license and maintaining LICENSE/NOTICE:
  <https://www.apache.org/legal/apply-license>
- OSI approved-license list:
  <https://opensource.org/licenses>
- Apache's GPL compatibility note:
  <https://www.apache.org/licenses/GPL-compatibility.html>
