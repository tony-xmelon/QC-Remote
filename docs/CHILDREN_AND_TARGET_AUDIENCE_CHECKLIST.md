# Children and target-audience release checklist

Reviewed 2026-09-07. This is engineering and policy issue-spotting, not legal
advice. It does not impose an app-wide minimum age.

## Current intended positioning

QC Remote is a technical companion for owners of professional music hardware.
Its current product purpose, terminology, screenshots, and visual design do not
appear directed primarily to children. The working position is therefore
general audience and not child-directed, but Freevia must make and evidence the
final decision for every store and market. Availability to a user is not the
same as intentionally selecting that user's age group as a target audience.

Record one decision in `targetAudienceDecision`:

- `not-child-directed`;
- `mixed-audience-including-children`; or
- `child-directed`.

Do not select child age groups in Google Play merely to maximize availability.
Review the signed app, icon, screenshots, copy, onboarding, chat, voice,
attachments, model providers, relay, links, and planned advertising—not only
the application's subject matter.

## No blanket age gate

`minimumUserAge: null` records that QC Remote imposes no additional app-wide
minimum. It does not:

- declare the app child-directed;
- override a provider's age or parental-consent terms;
- eliminate GDPR safeguards for children or national consent ages;
- eliminate COPPA duties if the service is child-directed or Freevia obtains
  actual knowledge that it is collecting personal information from a child
  under 13; or
- satisfy Google Play's target-audience declaration.

Direct Gemini paths remain excluded from the planned general-audience public
build for their separately reviewed under-18 restriction.

## Online features and personal data

For chat, voice, attachments, relay access, support, diagnostics, and any future
accounts or telemetry:

- identify the lawful basis in each launch country and do not rely on child
  consent where parental authorization is required;
- verify each provider and SDK's eligibility and child-directed-use terms;
- provide child-readable information if communications are addressed to
  children;
- define a channel and trained owner for reports giving Freevia actual knowledge
  of a minor's age, without encouraging collection of unnecessary birth dates;
- define prompt restriction, deletion, provider escalation, parental-request,
  evidence-preservation, and false-report handling;
- do not retain birth dates or identity documents unless a selected, documented
  compliance design makes them necessary and proportionate; and
- keep local-only device control available independently from optional online
  processing wherever feasible.

If the final audience includes children, implement a neutral age screen before
any API or SDK not approved for child-directed use, and verify that every online
provider and SDK is suitable for the selected child audience. A checkbox saying
“I am an adult” is not automatically a neutral or reliable age screen.

## Store and evidence record

For Google Play, retain the submitted Target audience and content declaration,
selected age groups, content-rating answers, store assets, reviewer access
instructions, Data safety declaration, and exact active artifact set. Reconcile
these records whenever the app, provider set, marketing, or audience changes.

Before setting `childrenPrivacyAssessmentCompleted`,
`childrenPrivacyOperationalPlanReviewed`, or
`childDirectedMarketingReviewCompleted`, retain a dated market/provider review,
operational procedure, marketing review, and exact release identifiers. Record
the evidence and Play declaration SHA-256 digests in
`legal/public-release.json`; do not commit private reports or children's data.

## Official sources

- GDPR Articles 8 and 12 and Recitals 38 and 58:
  <https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng>
- European Commission overview of safeguards for children's data:
  <https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en>
- Google Play Target audience and content guidance:
  <https://support.google.com/googleplay/android-developer/answer/9867159>
- Google Play Families data-practice requirements:
  <https://support.google.com/googleplay/android-developer/answer/11043825>
- U.S. FTC COPPA compliance guidance:
  <https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions>
