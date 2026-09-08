# Public GitHub Actions artifact audit

Reviewed 2026-09-07. This is an engineering exposure record, not legal advice.
It records only sanitized metadata and findings; the downloaded binary and its
unpacked contents are not retained in the repository.

## Scope and result

GitHub's API reported 18 non-expired Actions artifacts in the public
the former public repository. A read-only representative inspection was
performed on the newest Android artifact:

| Field | Value |
| --- | --- |
| Artifact ID | `9967875562` |
| Workflow run | `33960415623` |
| Artifact name | `qc-control-android-50c59c66e890c5b108251146e65016c7fa513338` |
| Source commit reported by GitHub | `50c59c66e890c5b108251146e65016c7fa513338` |
| APK | `QC-Control-Android-0.3.23-debug.apk` |
| APK SHA-256 | `446ab157e73711a815c9361a8956ece4195979a6742e38868c3fb3d9f5d65406` |
| Artifact expiry reported by GitHub | `2026-09-19T10:30:40Z` |

The artifact's own `release-manifest.json` records `source.dirty: true`. The
unpacked APK also contains all of the following:

- the superseded `QC Control` product identity;
- a separately named `coros-screen-fixtures-*` JavaScript/CSS bundle and two
  reference-oriented SVG assets;
- Firebase AI and direct Gemini API implementation markers; and
- no packaged legal directory, third-party notices, third-party license
  inventory, or bundled third-party license texts.

These are direct observations from the hash-identified APK, not an inference
from its build date. They establish that this artifact must not be represented
as a QC Remote release candidate and materially strengthen the recommendation
to delete all 18 superseded public artifacts rather than waiting for ordinary
expiry. The other 17 artifacts were not individually unpacked, so this report
does not assert that every binary has identical contents.

## Preventive control

The current working-tree workflow rejects `private-test` packaging before the
Android or Windows build when GitHub reports a public repository. A public
artifact can be built only through the `public-release` scope, which invokes the
fail-closed legal gate. Android now has its own pre-build rejection; it no
longer relies on the later Windows or combined-bundle job to fail.
The public-release job also no longer reads or reconstructs the Firebase client
configuration secret. That configuration is limited to `private-test`, where
the corresponding Firebase functionality is compiled in and the repository
must itself be private.

This local workflow improvement is not effective on GitHub until committed and
pushed. It does not revoke existing downloads or remove any of the 18 artifacts.
Deletion is irreversible and therefore remains an explicit repository-owner
action. Preserve the artifact IDs and deletion timestamps as private release
evidence if deletion is authorized.
