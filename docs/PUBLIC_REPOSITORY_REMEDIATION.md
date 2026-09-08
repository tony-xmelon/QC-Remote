# Public repository remediation

Reviewed 2026-09-07. This is engineering risk reduction, not legal advice.

## Confirmed current exposure

The configured origin is the public repository
`tony-xmelon/QC-Remote`. The former public repository was retired during the
clean-history migration. On 2026-09-07, the GitHub API reported:

- repository visibility: `PUBLIC`;
- 446 reachable Git commits in the local clone;
- zero GitHub forks and zero pull requests across all states;
- no GitHub Releases;
- no configured GitHub Pages site was returned by the repository Pages API;
- GitHub private vulnerability reporting was disabled at the initial audit. It
  was enabled and verified through the GitHub API later on 2026-09-07. A
  finalized public Freevia security contact and response commitment remain
  outstanding;
- GitHub dependency vulnerability alerts and Dependabot security updates were
  enabled and API-verified on 2026-09-07. Secret scanning and secret-scanning
  push protection were already enabled. These settings reduce new exposure but
  do not replace history review, key rotation, or signed-artifact assessment;
- 18 non-expired Actions artifacts, comprising Android APKs, Windows
  installers, and combined release bundles created on 2026-09-05. The API
  reports expiry on 2026-09-19; until deletion or expiry they remain publicly
  downloadable from the repository's Actions runs;
- 217 tracked private-reference files in the then-current history, including
  physical-device screenshots, graphics trees, copied manual screenshots/SVGs,
  and derived icon/typography measurements.

A bounded local history scan across all reachable commits found no private-key
blocks, service-account JSON, or common high-confidence GitHub, OpenAI,
Anthropic, AWS, Slack, or live payment-token candidates outside scanner test
fixtures. It did find the real Android Firebase client configuration in commits
`16e484d1068f37800a776df4285efcd284d8b074` and
`96f901fa605f899e933606f28c3485abba0474c4`, including its Firebase client API
key. Google documents these Firebase client keys as public identifiers only
when appropriately restricted. This finding therefore requires cloud-side
verification or rotation, especially confirmation that the public key does not
allow the Generative Language API; deleting Git history is not key revocation.
The scan is useful evidence, but it is not a substitute for a maintained scanner
such as Gitleaks plus review of Actions logs, deleted refs, forks, caches, and
external mirrors.

The authenticated token lacked GitHub's `read:packages` scope, so the repository
package/container inventory could not be verified. Treat packages as an open
remote audit item even though the repository reports no Releases. Zero current
forks and pull requests reduce the known replication surface but cannot prove
that no prior clone, download, deleted fork, cache, or mirror exists.

The current local index removes all 221 private-reference and derived visual
evidence files while retaining
the physical files on this development machine. Git ignore rules and the legal
verifier prevent those paths from being re-added. This local preparation does
not change GitHub until it is committed and pushed, and it does not remove the
same files from older commits.

The current local index also removes
`apps/android/android/app/google-services.json` while retaining it locally as
an ignored development file. CI now requires environment-specific configuration
through `QC_FIREBASE_ANDROID_CONFIG_BASE64` and verifies the configured Android
package before building. This does not remove the file from remote history or
prove the published key restrictions.

The current workflow inventory shows that those 18 artifacts contain APKs,
Windows installers, provenance files, release manifests, and SBOMs—not the raw
reference trees as separately uploaded files. A read-only inspection of the
newest Android artifact has now confirmed that its APK contains a separately
named CorOS screen-fixture bundle and reference assets, enabled Firebase/direct
Gemini implementation markers, no packaged third-party legal materials, the
superseded product identity, and a release manifest declaring a dirty source
tree. The hash-bound evidence and its deliberately limited scope are recorded
in `docs/PUBLIC_ARTIFACT_AUDIT.md`. Treat every surviving 2026-09-05 binary as
superseded and unsuitable for public distribution; the other 17 binaries have
not been individually unpacked and must not be described as content-identical
without further evidence.

The current working-tree workflow makes future `private-test` packaging fail
before either platform build unless
GitHub reports the repository itself as private. A public repository may create
distributables only through the `public-release` scope, which invokes the legal
gate. This prevents the misleading condition in which an artifact is labelled
private while GitHub makes it downloadable to every reader of a public
repository. The control is not live until committed and pushed and does not
revoke the 18 already-created artifacts.
Failed UI screenshots and browser traces are likewise uploaded only from a
private repository, preventing test captures or trace payloads from becoming
new public Actions artifacts.

Every push to `main` and every pull request now also runs a dedicated
`Public source legal boundary` job whenever GitHub reports the repository as
public. It fetches complete history, runs the tracked/history credential scan,
and rejects the private conformance and device-derived source families. This
job is intentionally failing while the public source boundary remains
unresolved. It supplies an unmistakable CI warning and a branch-protection
check that an administrator can require; it cannot undo material already
published or prevent an administrator from bypassing or disabling the check.

## Immediate owner actions

Perform these in order from a trusted administrator account:

1. Make the repository private while remediation is assessed. Record the date,
   administrator, and resulting visibility. Changing visibility affects forks,
   Pages, Actions access, stars/watchers, and repository policy, so it requires
   an explicit owner decision.
2. Delete the 18 non-expired Actions artifacts after preserving only any
   privately required test evidence. They are replaceable build outputs, but
   deletion is irreversible on GitHub.
3. Commit and push the prepared removal of the seven private-reference trees.
   Verify through GitHub's tree view and archive download that current source no
   longer contains them.
4. Decide whether to purge the files from all reachable Git history or start a
   clean public repository from an audited source export. A history rewrite
   changes commit IDs and requires coordinated force-push, clone replacement,
   tag/branch cleanup, Actions-cache review, and collaborator notice. Prefer a
   clean audited repository if preserving old public commit identity is not
   important.
5. Audit forks, pull-request refs, Actions logs/caches, Pages, packages,
   attachments, and third-party mirrors. Neither making a repository private
   nor rewriting history can recall copies already downloaded or forked.
6. Run a full history secret scan before any repository becomes public again.
   The current-tree scanner found no tracked private keys or service-account
   credentials, but that does not prove 446 historical commits are clean. Review
   or rotate every Firebase client key found in current or historical config.
7. Publish under the final `QC-Remote` repository name after completing the public
   identity. The current repository name uses an abbreviation of Neural DSP as
   the project identity and conflicts with the app's independence positioning.
8. Apply `docs/PUBLIC_SOURCE_IP_BOUNDARY.md` to the clean export. The existing
   production alias does not remove tracked conformance fixtures, reconstructed
   styles, reports, or device-derived datasets from an open-source archive.
9. Keep `docs/incidents/` and its screenshots, traces, serials, device names,
   reproduction data, and operator notes in the private safety record. Publish a
   separately reviewed advisory only when disclosure is useful and sanitized.
   The public-source archive verifier rejects the private incident directory.

## Re-publication evidence

Before recording repository remediation as complete, archive:

- GitHub visibility and settings screenshots or API output;
- the deleted artifact IDs and deletion timestamps;
- the final branches and tags included in any history rewrite;
- a fresh-clone inventory proving the private-reference paths are absent;
- source-archive contents and checksums;
- full-history secret-scan output;
- the final repository name, license, owner, security policy, and contribution
  terms;
- confirmation that private incident records and associated evidence are absent
  from the public tree and archive.

Set `publicRepositoryRemediationCompleted` in
`legal/public-release.json` only after the remote evidence—not merely the local
working tree—proves these steps complete.
