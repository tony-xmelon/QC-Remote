# QC Remote public-source visual/IP decision

Reviewed 2026-09-08. This is engineering issue-spotting, not legal advice.

QC Remote preserves familiar functional geometry and screen behavior through
neutral project-owned vectors. Manufacturer reference SVGs are private
validation inputs: they must not be tracked, copied into source releases, or
included in Windows or Android application bundles.

The release guards verify that the development-only fixture selector remains
gated by `import.meta.env.DEV`, the neutral chassis and icon registries exist,
and known manufacturer reference SVG paths do not enter the tracked tree.

This decision does not imply affiliation, endorsement, authorization, or
ownership of Neural DSP trademarks or artwork. App branding, store artwork,
vendor logos, promotional imagery, personal test data, credentials, and
manufacturer support/contact content remain separate concerns. QC Remote must
continue to display its independent/unofficial notice.

Visual changes should be compared locally against lawfully obtained device
references, then implemented in the neutral vector registry. Private reference
inputs must remain ignored and must never be propagated into generated assets.

The source-release process still rejects credentials, private keys,
environment-specific service configuration, incident evidence, generated build
output, and manufacturer reference SVGs. Neutral functional vectors and
non-artwork evidence ledgers are permitted.
