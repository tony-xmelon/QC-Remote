# Dependency-security release checklist

Reviewed 2026-09-07. This is an engineering security record, not a guarantee
that the software is vulnerability-free or a substitute for incident response.

## Current baseline

A fresh audit of the current lockfiles reported:

- npm production dependencies: zero known vulnerabilities at the moderate
  threshold;
- complete npm graph: zero known vulnerabilities at the high threshold;
- all eleven first-party Rust lockfiles: zero RustSec vulnerability advisories;
- the Windows Tauri lockfile: RustSec informational warnings for unmaintained
  crates, one `glib 0.18.5` unsoundness advisory, and yanked `chacha20 0.10.1`.

The raw lockfile result overstates the Windows release exposure. Target-filtered
`cargo tree --target x86_64-pc-windows-msvc` checks found that GTK3/`glib` and
`chacha20 0.10.1` are not in the Windows target graph. The active target does
include unmaintained `unic-* 0.9.0` crates through `urlpattern 0.3.0` and
`tauri-utils`; the current `tauri 2.11.5` release still resolves that chain.
This is an upstream maintenance risk to monitor, not evidence of an exploitable
QC Remote vulnerability. RustSec classifies RUSTSEC-2024-0429 as informational
unsoundness and identifies `glib >=0.20.0` as patched.

This baseline is development evidence only. It does not clear
`dependencySecurityAuditCompleted` because it is not tied to final signed
artifacts, final platform graphs, or a retained approval record.

## Release procedure

For the exact release commit and signed Windows/Android artifacts:

1. Recreate every dependency graph from locked inputs in a clean environment.
2. Run the npm production and complete-graph audits and RustSec against all
   first-party lockfiles with a freshly updated advisory database.
3. Resolve the actual Windows target graph and Android native/Gradle runtime
   graph. Do not treat a package merely present in a cross-platform lockfile as
   shipped, and do not dismiss a finding without target evidence.
4. Review every vulnerability, unsoundness, yanked, unmaintained, malicious,
   or notice advisory. Update, remove, mitigate, or retain a dated reasoned
   disposition with an owner and re-review date.
5. Reconcile the result with the SBOM and packaged third-party inventory. Scan
   the final APK and Windows installer contents so excluded and dynamically
   bundled components are not misclassified.
6. Record supported OS versions, compiler/toolchain, target triples, advisory
   database revision, commands, outputs, false-positive rationale, residual
   risk, and approval owner.
7. Define continuous monitoring, emergency update, user notification,
   vulnerability intake, coordinated disclosure, and CRA reporting ownership.

Do not set `securityReviewCompleted`, `dependencySecurityAuditCompleted`,
`dependencySupportedTargetReviewCompleted`, or
`dependencyInformationalAdvisoriesReviewed` from a green CI badge alone. Hash
the retained final report and record its SHA-256 value as
`dependencySecurityEvidenceSha256`.

## Current informational dispositions

- **RUSTSEC-2024-0429 (`glib 0.18.5`)**: present in the cross-platform Tauri
  lockfile but absent from the supported Windows target graph. Reconfirm for the
  final target and after every Tauri update.
- **GTK3 unmaintained advisories**: Linux-only Tauri dependencies, not part of
  the supported Windows build. QC Remote does not currently claim Linux
  support; a future Linux release requires a fresh review and likely a GTK4
  migration strategy.
- **`chacha20 0.10.1` yanked**: present in the lockfile but not reachable in the
  supported Windows target graph. Reconfirm and remove through upstream lock
  resolution when possible.
- **`unic-* 0.9.0` unmaintained advisories**: reachable in the Windows Tauri
  graph through `urlpattern 0.3.0`. No patched Tauri resolution was available
  in the current latest Tauri release. Track upstream and reassess before the
  signed release; do not describe this as fixed.

## Primary sources

- RustSec RUSTSEC-2024-0429:
  <https://rustsec.org/advisories/RUSTSEC-2024-0429.html>
- RustSec GTK3 maintenance advisory example:
  <https://rustsec.org/advisories/RUSTSEC-2024-0415.html>
- RustSec advisory database:
  <https://github.com/RustSec/advisory-db>
