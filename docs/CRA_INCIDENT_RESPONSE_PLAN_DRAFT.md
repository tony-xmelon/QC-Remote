# CRA incident response plan - draft

Status: not approved for release. Prepared 2026-09-07 from Regulation (EU)
2024/2847 and the European Commission's July 2026 implementation guidance. This
is an operational draft, not legal advice.

Use this plan only if Freevia's recorded scope assessment concludes that QC
Remote is an in-scope product with digital elements or that Freevia is an
open-source software steward with the relevant reporting duty. Keep voluntary
reporting available even if the final conclusion is outside scope.

## Before release

- Assign a primary and backup incident owner. Do not put private personal contact
  details in the public repository.
- Keep GitHub private vulnerability reporting enabled, establish a monitored
  publisher security address, and publish response expectations in
  `SECURITY.md`.
- Register or test access to the CRA Single Reporting Platform and identify the
  Bulgarian CSIRT coordinator applicable to Freevia.
- Keep an inventory linking each released Windows and Android version to source
  revision, SBOM, dependencies, signing identity, distribution channels, and
  support end date.
- Define a support period and a process for shipping authenticated security
  updates to each supported distribution channel.
- Run a tabletop exercise and retain the date, participants, scenario, timing,
  decisions, and corrective actions privately.

## Intake and awareness decision

1. Record receipt time, source, affected versions, indicators, and evidence.
2. Immediately contain access to credentials and sensitive evidence. Do not put
   exploit details, user data, device identifiers, tokens, or private reports in
   public issues.
3. Determine promptly whether there is a reasonable degree of certainty that an
   actively exploited vulnerability exists or that a severe incident has
   compromised QC Remote's security. Record the time of that awareness decision.
4. Start the statutory clocks from awareness, not from completion of root-cause
   analysis. Escalate uncertainty to the assigned incident owner.

## Reporting timeline when Article 14 applies

- Within 24 hours: submit the early warning through the Single Reporting
  Platform.
- Within 72 hours: submit the main notification with the information then
  available and update the initial assessment.
- Actively exploited vulnerability: submit the final report no later than 14 days
  after a corrective or mitigating measure becomes available.
- Severe incident: submit the final report within one month of the 72-hour
  notification.
- Inform affected users when required and give clear mitigation or update
  instructions without publishing information that increases exploitation risk.

## Engineering response

- Reproduce safely without exposing a user's hardware or data to additional risk.
- Identify every supported version, platform, provider integration, relay, and
  third-party component affected.
- Revoke or rotate exposed credentials and signing material through their owning
  systems; never commit replacement secrets.
- Prepare the smallest safe fix, peer-review it, run software and proportionate
  hardware regression tests, and preserve release provenance.
- Coordinate upstream notification and share fixes for incorporated open-source
  components where Article 13 duties apply.
- Publish an advisory only after balancing user protection with exploitation risk.

## Closure evidence

The incident owner must record the root cause, affected versions and users,
notifications, reporting timestamps and references, remediation, validation,
release identifiers, user communication, residual risk, and lessons learned.
Changing an incident to `resolved` also requires an explicit
`releaseBlocking=false` decision supported by evidence. The automated release
gate rejects open release-blocking incident records.

## Primary sources

- Regulation (EU) 2024/2847:
  <https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng>
- Commission CRA reporting obligations:
  <https://digital-strategy.ec.europa.eu/en/policies/cra-reporting>
- Commission July 2026 CRA guidance:
  <https://digital-strategy.ec.europa.eu/en/library/commission-publishes-new-guidance-support-timely-cyber-resilience-act-implementation>
