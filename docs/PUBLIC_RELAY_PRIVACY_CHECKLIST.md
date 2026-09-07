# Public relay privacy and operations checklist

Reviewed against the current relay source on 2026-09-07. The application-level
relay implementation is ephemeral, but the production proxy, OAuth provider and
hosting platform can add logs and retention that are not represented in this
repository.

## Current code behavior

- OAuth bearer tokens are validated through a configured introspection endpoint.
- Pairing offers live for five minutes; failed-attempt timestamps keyed by source
  IP live for a one-minute rate-limit window.
- Device credentials expire after 90 days by default and are stored only as
  hashes in relay process memory. Principal/device grants are also memory-only.
- Device IDs are server-generated random UUIDs. User-supplied device names are
  not used as relay identities.
- The relay terminates TLS and routes allowlisted command arguments and device
  results, so the operator can access those payloads while processing them.
- The Rust service has no application-level request or payload logger and no
  database. A restart drops pairing offers, credentials, grants and sessions.

## Required deployment decision

- Choose `disabled`, `publisher-operated`, or `user-self-hosted` in
  `legal/public-release.json`.
- If enabled, identify the relay operator, OAuth/identity operator, hosting
  provider, reverse proxy/CDN, regions, subprocessors and security contact.
- Configure proxy/access logs to avoid authorization headers, WebSocket bodies,
  query secrets, pairing codes and command payloads. Document IP-address and
  metadata retention and deletion.
- Use HTTPS from user to trusted proxy and authenticated protected transport from
  proxy to relay. Restrict which proxy can supply forwarding headers.
- Set incident response, abuse handling, credential revocation, account deletion,
  availability and support policies.
- Verify privacy-policy roles and transfer safeguards for publisher, relay host,
  identity provider and model providers in every target market.
- Test expiration, revocation, restart behavior, tenant isolation, rate limiting,
  payload-size limits and the generated action allowlist against the deployed
  configuration.

Do not describe the relay as end-to-end encrypted: TLS protects transport, but
the relay processes readable command and response payloads.
