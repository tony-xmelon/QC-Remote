# QC Remote distribution-license decision

Reviewed 2026-09-13. This is engineering issue-spotting, not legal advice.

## Current state

QC Remote does not yet have a coherent project license. The repository has no
root `LICENSE` file. The npm workspaces are marked `private` and do not declare a
license. Most internal Rust crates declare `MIT`, while `qc-remote-mcp` and
`qc-remote-service` declare `Apache-2.0`; the Windows Tauri crate declares no
license. Git history currently identifies one committing author, Antoni Ivanov,
but a commit record does not by itself establish the legal copyright owner or
confirm that every contribution was made within that person's authority.

Do not publish source or binaries until the publisher records the copyright
owner, chooses one of the strategies below, harmonizes every first-party
manifest, and ships the corresponding license or end-user terms.

Until that decision is made, the repository enforces an accidental-publication
boundary: npm workspaces set `private: true`, Cargo packages set `publish =
false`, and Python projects use PyPI's `Private :: Do Not Upload` classifier.
`npm run legal:publication-boundaries` verifies all three ecosystems. These are
interim registry controls, not a distribution license and not evidence that the
present license metadata is harmonized.

## Option A: proprietary binaries and private source

This is the lower-disclosure option if the publisher wants to retain exclusive
control of the first-party source.

- Keep first-party source private and add a publisher-owned end-user license
  governing installation and use of the Windows and Android binaries.
- Replace first-party `MIT` and `Apache-2.0` manifest declarations with a
  consistent private/non-published designation before release. A public grant
  already made for a particular copy cannot normally be withdrawn from a
  recipient merely by changing later metadata, so first establish whether any
  internal crate versions have already been distributed under those terms.
- Complete `docs/TERMS_OF_USE_DRAFT.md` with the publisher identity, license
  grant, warranty/liability language appropriate to each target market, support
  rules, termination, and governing-law terms.
- Continue distributing all third-party notices, license texts, and the source
  availability document. A proprietary first-party license does not replace
  third-party obligations.

## Option B: open-source first-party code

This can simplify public source collaboration but gives recipients broad rights
that cannot be clawed back for copies already licensed.

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
- `projectLicenseFilesFinalized`
- `contributionPolicyFinalized`
- `publisherAuthorityConfirmed`

The release verifier intentionally remains fail-closed until then.
