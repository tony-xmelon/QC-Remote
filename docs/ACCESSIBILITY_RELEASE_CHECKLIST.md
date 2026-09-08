# Accessibility release checklist

Reviewed 2026-09-07. This is engineering and legal issue-spotting, not an EU
Accessibility Act scope opinion or a WCAG/EN 301 549 conformance claim.

## Current evidence

The web UI includes programmatic labels, state attributes, keyboard-operable
encoder/slider controls, live regions, target-size checks, and automated Axe
coverage. A local `npm run test:ui` run on 2026-09-07 passed the automated
accessibility-and-fit case for each configured Android and Windows viewport.
The complete suite nevertheless finished 27 passed and 7 failed because other
interaction and geometry cases did not match the current UI. No screen-reader,
native accessibility-tree, forced-colors, text-spacing, high-contrast, reduced-
motion, or signed-build report was retained.

This evidence demonstrates useful implementation work; it does not justify a
conformance claim. Automated tools cannot test every success criterion, and
WCAG conformance applies to complete pages/variations rather than selected
components.

## EU Accessibility Act scope

Directive (EU) 2019/882 has applied to covered products and services since
28 June 2025. Its scope includes specified consumer services, including
e-commerce services. Determine whether QC Remote itself, its download/store
flow, paid features, subscriptions, support, relay, model access, or other
contracting flow is an in-scope service in each launch market.

Record one `eaaScopeDecision`:

- `not-in-scope`;
- `microenterprise-services-exemption`; or
- `in-scope`.

Do not rely on the microenterprise exemption until Freevia has documented the
current employee headcount, annual turnover, annual balance-sheet total, linked
or partner enterprises, and that the relevant activity is a service covered by
the exemption. A general “small company” statement is insufficient. Reassess
after any commercialization, corporate, staffing, or financial change.

If in scope, identify the Bulgarian implementing law and competent authority,
the applicable harmonised standards or technical specifications, required
service information, accessibility statement/information, complaint handling,
record retention, and any fundamental-alteration or disproportionate-burden
assessment. Do not use those exceptions without the required written assessment.

## Signed-build conformance assessment

Test the exact signed Windows and Android releases, every supported viewport,
orientation, display scale, language, theme, and relevant system setting. At
minimum cover:

- keyboard-only operation, logical focus order, visible/unobscured focus, escape
  and restoration behavior, and no keyboard traps;
- TalkBack on supported Android versions and Narrator on supported Windows
  versions, including names, roles, values, states, status messages, dialogs,
  menus, Grid routing, parameter editors, chat, attachments, and errors;
- resize, zoom/reflow, font scaling, text spacing, truncation, orientation, and
  minimum target size/spacing;
- text and non-text contrast, forced colors/high contrast, color-independent
  status, flashing, animation, and reduced motion;
- pointer alternatives for every drag gesture, including volume and encoders;
- voice-input alternatives and permission/processing disclosures;
- AI first-interaction transparency and content-origin labels; and
- installation, update, legal/privacy information, help, and error recovery.

Use the applicable final standard and legal scope record. WCAG 2.2 AA is a
useful engineering baseline for the web-rendered interfaces, but it is not by
itself proof of native-app or EAA compliance. Map any EN 301 549 requirements
that apply beyond WCAG and retain the mapping.

## Evidence and public process

Retain separate automated and manual reports identifying the app versions,
commit, signed-artifact hashes, OS/device matrix, assistive technologies,
settings, testers, results, exceptions, defects, and remediation verification.
Record only their SHA-256 digests in `legal/public-release.json`.

Publish an accessible feedback channel and define ownership, response targets,
triage, workaround, remediation, release-note, and regulator/complaint handling.
Do not publish an unqualified “WCAG compliant,” “fully accessible,” or EAA
compliance claim while known failures or untested supported paths remain.

## Official sources

- Directive (EU) 2019/882:
  <https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng>
- WCAG 2.2 Recommendation and conformance requirements:
  <https://www.w3.org/TR/WCAG22/>
- ETSI EN 301 549 accessibility standard materials:
  <https://www.etsi.org/committee/hf>
