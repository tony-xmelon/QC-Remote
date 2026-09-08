# GDPR operational release checklist

Reviewed 2026-09-07. This is engineering issue-spotting, not legal advice. It
turns the existing data-flow inventory and privacy-policy draft into evidence
that Freevia must complete before enabling public network services in the EEA.

## 1. Controller and processor roles

For every row in `legal/DATA-FLOW-INVENTORY.json`, record whether Freevia, the
user, the relay operator, and each model/speech/authentication provider acts as
controller, joint controller, processor, subprocessor, or independent controller.
Do not infer processor status merely because Freevia sends an API request. Review
the production account, service terms, data-use settings, abuse monitoring,
training use, retention, and who determines purposes and essential means.

Set `gdprControllerRolesReviewed` only when the final enabled-provider matrix and
contractual roles agree with the privacy notice.

## 2. Purpose, necessity, legal basis, and DPIA screening

For each processing purpose, document categories, data subjects, recipients,
retention, necessity, minimisation, and an Article 6 legal basis. Consent must be
specific, informed, freely given, demonstrable, as easy to withdraw as to give,
and must not be bundled with local device control. If relying on contract, show
that the processing is objectively necessary for the requested service. If
relying on legitimate interests, retain the purpose/necessity/balancing test.

Complete and retain an Article 35 DPIA screening. The final assessment must
consider AI processing of free text/media, device context that may contain names,
systematic monitoring or profiling by providers, children or other vulnerable
users, relay access, novel technology, and combination or scale of processing.
If the screening finds likely high risk, complete the DPIA and any required
prior consultation before launch.

Set `gdprLegalBasesAndDpiaReviewed` only after these records match the signed
build. A UI opt-in is a control, not a complete lawful-basis or DPIA analysis.

## 3. Processor and subprocessor contracts

Where a recipient is a processor, retain an Article 28-compliant agreement that
covers documented instructions, confidentiality, security, subprocessors,
rights assistance, breach/DPIA assistance, deletion or return, audit information,
and international transfers. Maintain a subprocessor list and a workable change
notification/objection process. Confirm that consumer subscriptions or locally
installed command-line tools actually provide terms suitable for Freevia's
public application; do not assume personal account access is a processor service.

Set `gdprProcessorContractsReviewed` only for the exact production accounts and
plans used by the released app. Disable any path without an adequate allocation.

## 4. International transfers

Map every EEA-to-third-country transfer and onward transfer, including provider
support, abuse review, telemetry, authentication, relay infrastructure, and
subprocessors. For each, retain the adequacy decision or Article 46 instrument,
the current Standard Contractual Clauses module where applicable, a transfer
impact assessment, and any supplementary technical, contractual, or
organisational measures. Reassess on provider, region, purpose, law, or
subprocessor changes.

Set `gdprInternationalTransfersReviewed` only after the final data-flow inventory
has a valid route for every enabled transfer. Consent to model use does not by
itself replace Chapter V safeguards.

## 5. Rights, retention, security, and breach response

Before release, provide and test:

- public privacy and support contacts plus identity-verification minimisation;
- access, correction, deletion, restriction, portability, objection, consent
  withdrawal, and provider-specific request routing;
- a deletion/retention schedule covering app storage, credentials, staged files,
  relay memory/logs, provider data, support records, backups, and incident data;
- Article 30 processing records and an owner for keeping them current;
- processor breach-notification routes, internal triage, risk assessment,
  affected-person communication, and the evidence needed for CPDP notice;
- a tested clock for notifying the Bulgarian CPDP without undue delay and, where
  feasible, within 72 hours after awareness when Article 33 requires notice.

Set `gdprRightsRetentionAndBreachReadinessReviewed` only after a tabletop test
proves the contacts, provider escalation paths, records, and 72-hour workflow.

## Official sources

- Regulation (EU) 2016/679:
  <https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng>
- EDPB controller/processor guidance and international-transfer resources:
  <https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en>
  <https://www.edpb.europa.eu/topics/international-transfers-and-international-cooperation_en>
- Bulgarian CPDP personal-data breach notification:
  <https://cpdp.bg/en/submission-of-notifications/>
