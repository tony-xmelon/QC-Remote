import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { currentTrackedSecretErrors } from "./verify-no-tracked-secrets.mjs";
import { currentPublicationBoundaryErrors } from "./verify-private-publication-boundaries.mjs";
import { currentDataFlowInventoryErrors } from "./verify-data-flow-inventory.mjs";
import { releaseVisualBoundaryErrors } from "./verify-release-visual-boundary.mjs";
import { currentPublicSourceIpBoundaryErrors } from "./verify-public-source-ip-boundary.mjs";
import { currentThirdPartyObligationErrors } from "./verify-third-party-license-obligations.mjs";
import { currentFirstPartyLicensePolicyErrors } from "./verify-first-party-license-policy.mjs";
import { currentAssistantDataMinimizationErrors } from "./verify-assistant-data-minimization.mjs";
import { currentPlatformSecurityErrors } from "./verify-release-platform-security.mjs";
import { currentReleaseIncidentErrors } from "./verify-release-incidents.mjs";
import { currentPublicProviderBoundaryErrors } from "./verify-public-provider-boundary.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredText = [
  "publisherLegalName", "publisherLegalForm", "publisherJurisdiction",
  "publisherRegisteredAddress", "publisherTradeRegister", "publisherRegistrationNumber",
  "publisherPublicWebsite", "publisherPublicPhone", "copyrightOwner", "supportEmail",
  "securityEmail", "privacyEmail", "takedownEmail", "securityPolicyUrl",
  "privacyPolicyUrl", "termsUrl", "distributionLicense"
];
const emailFields = ["supportEmail", "securityEmail", "privacyEmail", "takedownEmail"];
const urlFields = ["securityPolicyUrl", "privacyPolicyUrl", "termsUrl"];
const providerReleasePaths = ["openaiApi", "anthropicApi", "geminiApi", "firebaseGemini", "antigravityCli", "compatibleEndpoint", "platformSpeech"];
const craCommercialFactFields = [
  "sourceLicensedForFreeUseModificationRedistribution", "notMonetizedByPublisher",
  "noPriceOrPaidFeatureAccess", "noPaidUpdates", "noDonationLinkedBenefits",
  "noRequiredPaidService", "notBundledWithMonetizedProduct",
  "noRequiredPersonalDataBeyondSecurityCompatibilityInteroperability",
  "notIntendedForCommercialIntegration"
];
const reviewedOpenSourceLicenses = new Set(["Apache-2.0", "MIT", "MIT OR Apache-2.0"]);
const booleanDecisions = [
  ["projectLicenseFilesFinalized", "first-party project license files and manifest declarations are not recorded as finalized"],
  ["licenseScopeNoticesFinalized", "the license scope and exclusions are not recorded consistently in the root license, README, and asset/document notices"],
  ["contributionPolicyFinalized", "the inbound contribution and ownership policy is not recorded as finalized"],
  ["applicationIdentifiersFinalized", "application/package identifiers are not recorded as final"],
  ["exportControlAssessmentCompleted", "the signed artifacts' encryption export-control assessment is not recorded as complete"],
  ["sanctionsDistributionPlanReviewed", "distribution-channel and service sanctions controls are not recorded as reviewed"],
  ["publisherRegistryIdentityVerified", "Freevia's exact legal name, form, address, and Bulgarian register record are not recorded as verified"],
  ["publisherNameClearanceCompleted", "the publisher/developer name is not recorded as separately cleared from the Bulgarian legal-entity identity"],
  ["googlePlayOrganizationIdentityVerified", "Freevia's Google Play organization identity is not recorded as verified"],
  ["googlePlayDunsRecordMatched", "Freevia's D-U-N-S record is not recorded as matching its legal name and address"],
  ["googlePlayPaymentsProfileMatched", "Freevia's linked Google Payments profile is not recorded as matching its legal name and address"],
  ["googlePlayOrganizationDocumentsVerified", "Google Play acceptance of Freevia's official organization documents is not recorded"],
  ["googlePlayAuthorizedRepresentativeVerified", "the Google Play account owner's or authorized representative's identity verification is not recorded"],
  ["googlePlayWebsiteVerified", "Freevia's organization website is not recorded as verified"],
  ["googlePlayPrivateContactChannelsVerified", "Google Play's private contact email and phone verification is not recorded"],
  ["googlePlayPublicDeveloperContactsVerified", "Freevia's public Google Play developer email and phone verification is not recorded"],
  ["googlePlayPublicContactDisclosureReviewed", "Google Play's public organization contact disclosure is not recorded as reviewed"],
  ["euTraderDisclosureCompleted", "Freevia's EU trader identity and public business disclosures are not recorded as complete"],
  ["androidPackageNameRegistered", "the final Android package name is not recorded as registered to Freevia"],
  ["androidSigningKeyCustodyReviewed", "Android signing-key ownership, custody, and recovery are not recorded as reviewed"],
  ["minimumUserAgeDecisionFinalized", "the app-wide minimum-age decision is not recorded as final"],
  ["childrenPrivacyAssessmentCompleted", "the general-audience release's children-privacy assessment is not recorded as complete"],
  ["childrenPrivacyOperationalPlanReviewed", "known-minor reports, data requests, and online-feature handling are not recorded as operationally reviewed"],
  ["childDirectedMarketingReviewCompleted", "store copy and visual marketing are not recorded as reviewed for child-directed signals"],
  ["eaaScopeAssessmentCompleted", "the European Accessibility Act scope assessment is not recorded as complete"],
  ["accessibilityConformanceAssessmentCompleted", "signed Windows and Android accessibility conformance is not recorded as assessed"],
  ["accessibilityFeedbackProcessReviewed", "the public accessibility feedback and remediation process is not recorded as reviewed"],
  ["euConsumerContractAssessmentCompleted", "the EU consumer-contract and digital-content scope assessment is not recorded as complete"],
  ["consumerPersonalDataCounterperformanceReviewed", "whether personal data is counter-performance for the app or an optional service is not recorded as reviewed"],
  ["consumerMandatoryRightsTermsReviewed", "the final terms are not recorded as reviewed against mandatory consumer rights in each target market"],
  ["consumerSupportAndUpdateCommitmentReviewed", "the support and necessary-update commitment is not recorded as reviewed and disclosed"],
  ["consumerRemediesAndWithdrawalProcessReviewed", "consumer conformity, remedy, termination, and withdrawal operations are not recorded as reviewed"],
  ["publisherAuthorityConfirmed", "publisher authority to distribute the app is not confirmed"],
  ["providerDataPracticesReviewed", "online provider data practices are not recorded as reviewed"],
  ["gdprControllerRolesReviewed", "controller/processor roles are not recorded for every enabled personal-data flow"],
  ["gdprLegalBasesAndDpiaReviewed", "GDPR legal bases, necessity, legitimate-interest records, and DPIA screening are not recorded as reviewed"],
  ["gdprProcessorContractsReviewed", "Article 28 processor and subprocessor terms are not recorded as reviewed for production accounts"],
  ["gdprInternationalTransfersReviewed", "EEA international-transfer routes, transfer tools, and impact assessments are not recorded as reviewed"],
  ["gdprRightsRetentionAndBreachReadinessReviewed", "data-subject rights, retention, and GDPR breach-response readiness are not recorded as reviewed"],
  ["firebasePublishedClientKeysReviewed", "all Firebase client keys published in the current tree or Git history are not recorded as restricted or rotated"],
  ["storeDataDisclosuresCompleted", "app-store privacy/data-safety disclosures are not recorded as complete"],
  ["googlePlayDataSafetyActiveArtifactsReviewed", "Google Play Data safety is not recorded as covering every active non-exempt artifact and region"],
  ["googlePlayDataSafetySdkBehaviorReviewed", "the submitted Android bundle's SDK behavior is not recorded as reconciled to Google Play Data safety"],
  ["securityReviewCompleted", "the final dependency, application, and infrastructure security review is not recorded as complete"],
  ["githubPrivateVulnerabilityReportingEnabled", "GitHub private vulnerability reporting is not recorded as enabled for the public source repository"],
  ["githubVulnerabilityAlertsEnabled", "GitHub dependency vulnerability alerts are not recorded as enabled for the public source repository"],
  ["githubDependabotSecurityUpdatesEnabled", "GitHub Dependabot security updates are not recorded as enabled for the public source repository"],
  ["githubSecretScanningEnabled", "GitHub secret scanning is not recorded as enabled for the public source repository"],
  ["githubSecretPushProtectionEnabled", "GitHub secret-scanning push protection is not recorded as enabled for the public source repository"],
  ["dependencySecurityAuditCompleted", "the exact release lockfiles and signed artifacts are not recorded as scanned for known vulnerabilities"],
  ["dependencySupportedTargetReviewCompleted", "dependency findings are not recorded as reconciled to the supported Windows and Android target graphs"],
  ["dependencyInformationalAdvisoriesReviewed", "unmaintained, unsound, and yanked dependency advisories are not recorded as reviewed"],
  ["hardwareBackupSafetyValidationCompleted", "the separately gated physical-device backup safety case is not recorded as completed before distribution"],
  ["euAiActRoleAssessmentCompleted", "Freevia's provider/deployer role and applicable EU AI Act obligations are not recorded as assessed"],
  ["euAiTransparencyControlImplemented", "the EU AI Act first-interaction transparency control is not recorded as implemented"],
  ["assistantSensitiveActionAuthorizationReviewed", "AI-sensitive device actions are not recorded as independently authorized by the user"],
  ["euProductLiabilityAssessmentCompleted", "the post-8 December 2026 EU software product-liability assessment is not recorded as complete"],
  ["productSafetyRiskAssessmentCompleted", "the connected-device and AI product-safety risk assessment is not recorded as complete"],
  ["productLiabilityEvidenceRetentionReviewed", "product-liability evidence preservation and post-release response are not recorded as reviewed"],
  ["productLiabilityInsuranceDecisionReviewed", "Freevia's product and cyber liability insurance decision is not recorded as reviewed"],
  ["craScopeAssessmentCompleted", "the EU Cyber Resilience Act scope assessment is not recorded as complete"],
  ["publicRepositoryRemediationCompleted", "the public repository, historical reference assets, and downloadable CI artifacts are not recorded as remediated"],
  ["publicSourceIpBoundaryReviewed", "the open-source tree's conformance fixtures and device-derived material are not recorded as reviewed for public distribution"]
];

export function publicReleaseLegalErrors(config) {
  const errors = [];
  if (config?.productName !== "QC Remote") errors.push("productName must be QC Remote");
  if (!["open-source", "proprietary"].includes(config?.distributionModel)) errors.push("distributionModel must be open-source or proprietary");
  for (const field of requiredText) {
    const value = typeof config?.[field] === "string" ? config[field].trim() : "";
    if (!value || /(?:TBD|TODO|PLACEHOLDER|\[.+\])/i.test(value)) errors.push(`${field} is not finalized`);
  }
  if (config?.distributionModel === "open-source" && String(config?.distributionLicense ?? "").trim() && !/^[A-Za-z0-9.+-]+(?:\s+(?:AND|OR|WITH)\s+[A-Za-z0-9.+-]+)*$/.test(config.distributionLicense.trim())) {
    errors.push("distributionLicense must use an exact SPDX expression for an open-source release");
  }
  if (config?.distributionModel === "open-source" && String(config?.distributionLicense ?? "").trim() && !reviewedOpenSourceLicenses.has(config.distributionLicense.trim())) {
    errors.push("distributionLicense is not one of the open-source choices reviewed for this project (Apache-2.0, MIT, or MIT OR Apache-2.0)");
  }
  if (config?.distributionModel === "open-source") {
    if (!["all-original-material", "code-only-with-explicit-exclusions"].includes(config?.sourceLicenseScope)) {
      errors.push("sourceLicenseScope must say whether the project license covers all original material or code only with explicit exclusions");
    }
    const allowedAssetLicenses = ["same-as-project", "CC-BY-4.0", "all-rights-reserved"];
    if (!allowedAssetLicenses.includes(config?.documentationLicense)) {
      errors.push("documentationLicense must be same-as-project, CC-BY-4.0, or all-rights-reserved");
    }
    if (!allowedAssetLicenses.includes(config?.brandAssetLicense)) {
      errors.push("brandAssetLicense must be same-as-project, CC-BY-4.0, or all-rights-reserved");
    }
    if (config?.sourceLicenseScope === "all-original-material" && (config?.documentationLicense !== "same-as-project" || config?.brandAssetLicense !== "same-as-project")) {
      errors.push("all-original-material conflicts with a separate documentation or brand-asset license");
    }
  }
  if (config?.projectLicenseFilesFinalized === true) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(String(config?.distributionLicenseDecisionApprovedAt ?? ""))) {
      errors.push("distributionLicenseDecisionApprovedAt must record the authorized approval time");
    }
    if (!String(config?.distributionLicenseDecisionApproverRole ?? "").trim()) errors.push("distributionLicenseDecisionApproverRole must identify the approving corporate role");
    if (!/^[a-f0-9]{40}$/i.test(String(config?.distributionLicenseDecisionRevision ?? ""))) errors.push("distributionLicenseDecisionRevision must identify the exact approved Git commit");
  }
  const contributionPolicies = ["external-contributions-closed", "dco-1.1", "cla"];
  if (!contributionPolicies.includes(config?.contributionPolicy)) errors.push("contributionPolicy must be external-contributions-closed, dco-1.1, or cla");
  if (config?.contributionPolicyFinalized === true && !/^[a-f0-9]{64}$/i.test(String(config?.contributionPolicyEvidenceSha256 ?? ""))) {
    errors.push("contributionPolicyEvidenceSha256 must identify the retained contribution-policy approval evidence");
  }
  if (config?.publisherAuthorityConfirmed === true && !/^[a-f0-9]{64}$/i.test(String(config?.publisherAuthorityEvidenceSha256 ?? ""))) {
    errors.push("publisherAuthorityEvidenceSha256 must identify retained chain-of-title and corporate-authority evidence");
  }
  for (const field of emailFields) {
    const value = typeof config?.[field] === "string" ? config[field].trim() : "";
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push(`${field} is not a valid public email address`);
  }
  for (const field of urlFields) {
    const value = typeof config?.[field] === "string" ? config[field].trim() : "";
    if (value) {
      try { if (new URL(value).protocol !== "https:") errors.push(`${field} must use HTTPS`); }
      catch { errors.push(`${field} is not a valid URL`); }
    }
  }
  const publisherWebsite = String(config?.publisherPublicWebsite ?? "").trim();
  if (publisherWebsite && !/^https:\/\//i.test(publisherWebsite)) errors.push("publisherPublicWebsite must use HTTPS");
  const publisherPhone = String(config?.publisherPublicPhone ?? "").replace(/[\s().-]/g, "");
  if (publisherPhone && !/^\+[1-9][0-9]{6,14}$/.test(publisherPhone)) {
    errors.push("publisherPublicPhone must be a public international-format telephone number");
  }
  if (!['registered', 'not-registered'].includes(config?.publisherVatStatus)) {
    errors.push("publisherVatStatus must record whether Freevia is VAT-registered");
  } else if (config.publisherVatStatus === 'registered' && !/^BG[0-9]{9,10}$/i.test(String(config?.publisherVatId ?? "").replace(/\s/g, ""))) {
    errors.push("publisherVatId must contain Freevia's Bulgarian VAT number when VAT-registered");
  } else if (config.publisherVatStatus === 'not-registered' && String(config?.publisherVatId ?? "").trim()) {
    errors.push("publisherVatId must be blank when publisherVatStatus is not-registered");
  }
  if (config?.storeDataDisclosuresCompleted === true) {
    for (const field of ["googlePlayDataSafetyArtifactSha256", "googlePlayDataSafetyDeclarationExportSha256"]) {
      if (!/^[a-f0-9]{64}$/i.test(String(config?.[field] ?? ""))) {
        errors.push(`${field} must identify the exact retained release evidence with a SHA-256 digest`);
      }
    }
  }
  if (!/^([a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/i.test(config?.androidApplicationId ?? "")) errors.push("androidApplicationId is not a valid finalized reverse-domain identifier");
  if (!/^([a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/i.test(config?.windowsApplicationId ?? "")) errors.push("windowsApplicationId is not a valid finalized reverse-domain identifier");
  if (config?.androidApplicationId === "com.qccontrol.mobile") errors.push("androidApplicationId still uses the legacy QC Control development identity");
  if (config?.windowsApplicationId === "com.tonyxmelon.qcvoicecontrol") errors.push("windowsApplicationId still uses the legacy personal development identity");
  if (!Array.isArray(config?.distributionChannels) || config.distributionChannels.length === 0) errors.push("distributionChannels must identify every intended release channel");
  if (!Array.isArray(config?.targetMarkets) || config.targetMarkets.length === 0) errors.push("targetMarkets must identify the countries or regions reviewed for release");
  const euDualUseDecisions = ["not-listed", "cryptography-note-exclusion-documented", "authorization-or-registration-completed", "distribution-restricted"];
  const usEarDecisions = ["not-subject-to-ear-documented", "mass-market-classification-completed", "authorization-or-exception-completed", "distribution-restricted"];
  if (!euDualUseDecisions.includes(config?.euDualUseClassificationDecision)) errors.push("euDualUseClassificationDecision must record the reviewed EU encryption classification or restriction");
  if (!usEarDecisions.includes(config?.usEarEncryptionClassificationDecision)) errors.push("usEarEncryptionClassificationDecision must record the reviewed U.S. EAR encryption classification or restriction");
  if (config?.exportControlAssessmentCompleted === true) {
    for (const field of ["cryptographyInventorySha256", "exportControlAssessmentEvidenceSha256"]) {
      if (!/^[a-f0-9]{64}$/i.test(String(config?.[field] ?? ""))) errors.push(`${field} must identify retained exact-artifact export evidence`);
    }
  }
  if (config?.sanctionsDistributionPlanReviewed === true && !/^[a-f0-9]{64}$/i.test(String(config?.sanctionsScreeningEvidenceSha256 ?? ""))) {
    errors.push("sanctionsScreeningEvidenceSha256 must identify retained sanctions-control evidence");
  }
  if (!["not-planned", "pending", "approved"].includes(config?.googlePlayDeveloperRegistration)) errors.push("googlePlayDeveloperRegistration must be not-planned, pending, or approved");
  if (config?.googlePlayAccountType !== "organization") errors.push("googlePlayAccountType must be organization for publication by Freevia");
  if (config?.googlePlayDeveloperRegistration === "pending") errors.push("Google Play developer registration is still pending");
  if (config?.minimumUserAge !== null && (!Number.isInteger(config.minimumUserAge) || config.minimumUserAge < 0 || config.minimumUserAge > 120)) errors.push("minimumUserAge must be null for no app-wide minimum or a valid age");
  const targetAudienceDecisions = ["not-child-directed", "mixed-audience-including-children", "child-directed"];
  if (!targetAudienceDecisions.includes(config?.targetAudienceDecision)) errors.push("targetAudienceDecision must record whether the app is child-directed, mixed-audience, or not child-directed");
  if (["mixed-audience-including-children", "child-directed"].includes(config?.targetAudienceDecision)) {
    if (config?.neutralAgeScreenImplemented !== true) errors.push("a child-inclusive audience requires a verified neutral age screen before non-child-compatible online processing");
    if (config?.childCompatibleOnlineProvidersVerified !== true) errors.push("a child-inclusive audience requires every online provider and SDK to be verified for child-directed use");
  }
  if (config?.childrenPrivacyAssessmentCompleted === true && !/^[a-f0-9]{64}$/i.test(String(config?.childrenPrivacyEvidenceSha256 ?? ""))) {
    errors.push("childrenPrivacyEvidenceSha256 must identify retained market, provider, and child-privacy evidence");
  }
  if ((config?.distributionChannels ?? []).some((channel) => /google play/i.test(String(channel)))
    && !/^[a-f0-9]{64}$/i.test(String(config?.googlePlayTargetAudienceDeclarationSha256 ?? ""))) {
    errors.push("googlePlayTargetAudienceDeclarationSha256 must identify the retained Play target-audience declaration export");
  }
  const eaaScopeDecisions = ["not-in-scope", "microenterprise-services-exemption", "in-scope"];
  if (!eaaScopeDecisions.includes(config?.eaaScopeDecision)) errors.push("eaaScopeDecision must record whether the final offering is in scope, out of scope, or uses the microenterprise services exemption");
  if (config?.eaaScopeDecision === "microenterprise-services-exemption" && config?.eaaMicroenterpriseFactsReviewed !== true) {
    errors.push("the EAA microenterprise services exemption requires current employee, turnover, balance-sheet, service, and linked-enterprise facts");
  }
  if (config?.eaaScopeDecision === "in-scope" && config?.accessibilityStatementDecision !== "published") {
    errors.push("an in-scope EAA service requires a published accessibility-information decision");
  }
  if (config?.eaaScopeDecision !== "in-scope" && !["not-required-after-scope-assessment", "published"].includes(config?.accessibilityStatementDecision)) {
    errors.push("accessibilityStatementDecision must record publication or the assessed reason it is not required");
  }
  if (config?.accessibilityConformanceAssessmentCompleted === true) {
    for (const field of ["accessibilityAutomatedEvidenceSha256", "accessibilityManualEvidenceSha256"]) {
      if (!/^[a-f0-9]{64}$/i.test(String(config?.[field] ?? ""))) errors.push(`${field} must identify retained signed-build accessibility evidence`);
    }
  }
  const euDigitalContentDecisions = [
    "outside-consumer-contract",
    "outside-directive-no-price-or-data-counterperformance",
    "in-scope",
  ];
  if (!euDigitalContentDecisions.includes(config?.euDigitalContentDirectiveDecision)) {
    errors.push("euDigitalContentDirectiveDecision must record the assessed consumer-contract and Directive (EU) 2019/770 position");
  }
  if (config?.euConsumerContractAssessmentCompleted === true
    && !/^[a-f0-9]{64}$/i.test(String(config?.consumerContractEvidenceSha256 ?? ""))) {
    errors.push("consumerContractEvidenceSha256 must identify the retained market, terms, updates, and remedies assessment");
  }
  if (config?.dependencySecurityAuditCompleted === true
    && !/^[a-f0-9]{64}$/i.test(String(config?.dependencySecurityEvidenceSha256 ?? ""))) {
    errors.push("dependencySecurityEvidenceSha256 must identify the exact-artifact dependency audit and advisory disposition");
  }
  if (config?.euAiTransparencyControlImplemented === true) {
    if (config?.euAiTransparencyFirstInteractionVerified !== true) errors.push("AI transparency is not recorded as verified at the start of first interaction");
    if (config?.euAiTransparencyAccessibilityVerified !== true) errors.push("AI transparency accessibility is not recorded as verified");
    if (config?.euAiOutputOriginVerified !== true) errors.push("AI output-origin labelling is not recorded as verified across every public model path");
    if (!/^[a-f0-9]{64}$/i.test(String(config?.euAiTransparencyEvidenceSha256 ?? ""))) errors.push("euAiTransparencyEvidenceSha256 must identify the retained signed-build transparency evidence");
  }
  if (config?.euAiActRoleAssessmentCompleted === true && ![
    "not-applicable-after-role-assessment",
    "upstream-marking-verified",
    "qc-remote-marking-implemented"
  ].includes(config?.euAiSyntheticContentMarkingDecision)) {
    errors.push("euAiSyntheticContentMarkingDecision must record the reviewed Article 50(2) conclusion");
  }
  const assistantAuthorizationDecisions = [
    "host-confirmed-each-sensitive-action",
    "prompt-bound-authorization-with-ui-confirmation",
    "sensitive-model-actions-disabled"
  ];
  if (!assistantAuthorizationDecisions.includes(config?.assistantSensitiveActionAuthorizationDecision)) {
    errors.push("assistantSensitiveActionAuthorizationDecision must select an independent host authorization design");
  }
  if (config?.assistantSensitiveActionAuthorizationReviewed === true
    && !/^[a-f0-9]{64}$/i.test(String(config?.assistantSensitiveActionAuthorizationEvidenceSha256 ?? ""))) {
    errors.push("assistantSensitiveActionAuthorizationEvidenceSha256 must identify retained signed-build authorization evidence");
  }
  if (!["out-of-scope-noncommercial-foss", "in-scope-software-product"].includes(config?.euProductLiabilityCommercialActivityConclusion)) {
    errors.push("euProductLiabilityCommercialActivityConclusion must record the reviewed Directive (EU) 2024/2853 conclusion");
  }
  if (config?.euProductLiabilityCommercialActivityConclusion === "out-of-scope-noncommercial-foss" && config?.euProductLiabilityNoncommercialFactsReviewed !== true) {
    errors.push("a noncommercial FOSS product-liability conclusion requires reviewed pricing, service, donation, and personal-data facts");
  }
  if (config?.euProductLiabilityCommercialActivityConclusion === "out-of-scope-noncommercial-foss") {
    const contraryFacts = craCommercialFactFields.filter((field) => config?.craCommercialActivityFacts?.[field] !== true);
    if (contraryFacts.length) errors.push(`a noncommercial FOSS product-liability conclusion conflicts with unresolved or commercial facts: ${contraryFacts.join(", ")}`);
  }
  if (!["out-of-scope-noncommercial-foss", "in-scope-manufacturer", "in-scope-open-source-steward"].includes(config?.craCommercialActivityConclusion)) {
    errors.push("craCommercialActivityConclusion must record the reviewed EU Cyber Resilience Act role");
  }
  const unresolvedCraFacts = craCommercialFactFields.filter((field) => typeof config?.craCommercialActivityFacts?.[field] !== "boolean");
  if (unresolvedCraFacts.length) errors.push(`craCommercialActivityFacts must record yes/no evidence for: ${unresolvedCraFacts.join(", ")}`);
  if (config?.craCommercialActivityConclusion === "out-of-scope-noncommercial-foss" && config?.craNoncommercialFactsReviewed !== true) {
    errors.push("a noncommercial FOSS conclusion requires reviewed facts showing that access, binaries, updates, and required data processing are not monetized");
  }
  if (config?.craCommercialActivityConclusion === "out-of-scope-noncommercial-foss") {
    const contraryFacts = craCommercialFactFields.filter((field) => config?.craCommercialActivityFacts?.[field] !== true);
    if (contraryFacts.length) errors.push(`a noncommercial FOSS conclusion conflicts with unresolved or commercial facts: ${contraryFacts.join(", ")}`);
  }
  if (["in-scope-manufacturer", "in-scope-open-source-steward"].includes(config?.craCommercialActivityConclusion) && config?.craCompliancePlanReviewed !== true) {
    errors.push("an in-scope Cyber Resilience Act conclusion requires a reviewed compliance and vulnerability-reporting plan");
  }
  if (["in-scope-manufacturer", "in-scope-open-source-steward"].includes(config?.craCommercialActivityConclusion) && config?.craIncidentReportingReadinessReviewed !== true) {
    errors.push("an in-scope Cyber Resilience Act conclusion requires reviewed 24-hour and 72-hour incident-reporting readiness");
  }
  for (const provider of providerReleasePaths) {
    if (!["disabled", "reviewed"].includes(config?.providerReleaseDecisions?.[provider])) {
      errors.push(`providerReleaseDecisions.${provider} must be disabled or reviewed`);
    } else if (config.providerReleaseDecisions[provider] === "disabled" && config?.providerReleaseCodeExclusions?.[provider] !== true) {
      errors.push(`providerReleaseDecisions.${provider} is marked disabled but the current release code still exposes that path`);
    }
  }
  const geminiDecisions = ["geminiApi", "firebaseGemini"].map((provider) => config?.providerReleaseDecisions?.[provider]);
  const geminiEnabled = geminiDecisions.some((decision) => decision === "reviewed");
  const geminiDisabled = geminiDecisions.every((decision) => decision === "disabled");
  if (config?.geminiApiEligibilityPlan === "feature-gated-18") {
    errors.push("a feature-only Gemini age checkbox does not resolve terms that prohibit API clients likely to be accessed by people under 18");
  }
  if (geminiEnabled && !["app-wide-18", "documented-contractual-exception"].includes(config?.geminiApiEligibilityPlan)) {
    errors.push("enabled Gemini API paths require an app-wide 18+ release or a documented Google contractual exception");
  }
  if (geminiDisabled && config?.geminiApiEligibilityPlan !== "disabled") {
    errors.push("disabled Gemini API paths must record geminiApiEligibilityPlan as disabled");
  }
  if (config?.geminiApiEligibilityPlan === "app-wide-18" && config?.minimumUserAge !== 18) {
    errors.push("an app-wide Gemini 18+ plan conflicts with the recorded app minimum age");
  }
  if (config?.geminiApiEligibilityPlan === "documented-contractual-exception" && config?.thirdPartySdkTermsReviewed !== true) {
    errors.push("a Gemini contractual exception requires a completed Google/Android third-party terms review");
  }
  if (config?.providerReleaseDecisions?.firebaseGemini === "reviewed") {
    if (config?.firebaseProductionConfigurationReviewed !== true) errors.push("production Firebase ownership, restrictions, billing, and App Check configuration are not recorded as reviewed");
    if (config?.firebaseClientKeyExcludesGenerativeLanguageApi !== true) errors.push("the public Firebase client key is not recorded as excluding the Generative Language API");
    if (config?.firebaseAppCheckEnforced !== true) errors.push("Firebase App Check enforcement is not recorded as enabled and verified for the public Android app");
  }
  if (!["disabled", "publisher-operated", "user-self-hosted"].includes(config?.publicRelayDeployment)) errors.push("publicRelayDeployment must be disabled, publisher-operated, or user-self-hosted");
  if (config?.providerReleaseDecisions?.platformSpeech === "reviewed" && config?.googlePlayDataSafetySpeechBehaviorReviewed !== true) {
    errors.push("Android speech-provider behavior is not recorded as reconciled to Google Play Data safety");
  }
  if (config?.publicRelayDeployment === "disabled" && config?.publicRelayCodeExcluded !== true) {
    errors.push("publicRelayDeployment is marked disabled but the public build is not recorded as excluding the relay path");
  }
  if (["publisher-operated", "user-self-hosted"].includes(config?.publicRelayDeployment) && config?.googlePlayDataSafetyRelayBehaviorReviewed !== true) {
    errors.push("the production relay's data behavior is not recorded as reconciled to Google Play Data safety");
  }
  if (config?.publicRelayDeployment && config.publicRelayDeployment !== "disabled" && !String(config?.publicRelayOperator ?? "").trim()) errors.push("publicRelayOperator is not identified");
  if (config?.publicRelayDeployment !== "disabled" && config?.publicRelayPrivacyReviewed !== true) errors.push("public relay privacy, retention, subprocessors, and deletion are not recorded as reviewed");
  for (const [field, message] of booleanDecisions) if (config?.[field] !== true) errors.push(message);
  if (config?.publisherNameClearanceCompleted === true) {
    const publisherNameDecisions = [
      "exact-legal-name-descriptive-use-only",
      "distinctive-developer-brand-adopted",
      "retained-after-documented-clearance"
    ];
    if (!publisherNameDecisions.includes(config?.publisherNameClearanceDecision)) {
      errors.push("publisherNameClearanceDecision does not record how the publisher/developer name risk was resolved");
    }
    if (!/^[a-f0-9]{64}$/i.test(String(config?.publisherNameClearanceSearchReportSha256 ?? ""))) {
      errors.push("publisherNameClearanceSearchReportSha256 must identify the retained dated publisher-name search report");
    }
    if (config?.publisherNameKnownCollisionsReviewed !== true) {
      errors.push("known Freevia publisher/developer-name collisions are not recorded as reviewed");
    }
    if (config?.publisherNameClearanceDecision === "exact-legal-name-descriptive-use-only" && config?.publisherRegistryIdentityVerified !== true) {
      errors.push("the exact-legal-name publisher decision requires the Bulgarian register identity to be verified first");
    }
    if (config?.publisherNameClearanceDecision === "distinctive-developer-brand-adopted") {
      const publicBrand = String(config?.publisherPublicBrand ?? "").trim();
      if (!publicBrand || publicBrand.toLocaleLowerCase("en") === "freevia") {
        errors.push("publisherPublicBrand must identify the separately cleared distinctive developer brand");
      }
    }
  }
  if (config?.nameClearanceCompleted !== true) errors.push("name clearance is not recorded as complete");
  if (config?.nameClearanceCompleted === true) {
    const decisions = ["renamed-to-distinctive-mark", "retain-after-documented-self-screen", "retain-after-professional-clearance"];
    if (!decisions.includes(config?.nameClearanceDecision)) errors.push("nameClearanceDecision does not record whether the name was changed, self-screened, or professionally cleared");
    if (!/^[a-f0-9]{64}$/i.test(String(config?.nameClearanceSearchReportSha256 ?? ""))) errors.push("nameClearanceSearchReportSha256 must identify the retained dated search report");
    if (!Array.isArray(config?.nameClearanceReviewedMarkets) || config.nameClearanceReviewedMarkets.length === 0
      || (config?.targetMarkets ?? []).some((market) => !config.nameClearanceReviewedMarkets.includes(market))) {
      errors.push("name clearance does not cover every recorded target market");
    }
    if (!Array.isArray(config?.nameClearanceReviewedClasses) || !config.nameClearanceReviewedClasses.includes("009")) errors.push("name clearance does not cover Nice Class 009 software");
    const onlineServiceReleased = config?.publicRelayDeployment !== "disabled"
      || ["openaiApi", "anthropicApi", "geminiApi", "firebaseGemini", "antigravityCli", "compatibleEndpoint"].some((provider) => config?.providerReleaseDecisions?.[provider] === "reviewed");
    if (onlineServiceReleased && !config?.nameClearanceReviewedClasses?.includes("042")) errors.push("name clearance does not cover Nice Class 042 online software services");
    if (config?.nameClearanceKnownCollisionsReviewed !== true) errors.push("the Neural DSP and KLIPPEL name collisions are not recorded as reviewed");
    if (config?.nameClearanceDecision === "renamed-to-distinctive-mark" && config?.productName === "QC Remote") errors.push("nameClearanceDecision says renamed, but productName remains QC Remote");
    if (config?.nameClearanceDecision === "retain-after-documented-self-screen" && !String(config?.nameClearancePublisherRiskAcceptance ?? "").trim()) errors.push("retaining QC Remote after a self-screen requires an explicit publisher risk-acceptance record");
  }
  if (config?.thirdPartySdkTermsReviewed !== true) errors.push("Google/Android third-party SDK terms review is not recorded as complete");
  if (config?.finalVisualRiskDecisionCompleted !== true) errors.push("the final UI/trade-dress risk decision is not recorded as complete");
  return errors;
}

export function verifyPublicReleaseLegal(configPath = resolve(repositoryRoot, "legal/public-release.json")) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const errors = publicReleaseLegalErrors(config);
  const brand = JSON.parse(readFileSync(resolve(repositoryRoot, "packages/typescript/qc-theme/src/brand.json"), "utf8"));
  const legalCopy = readFileSync(resolve(repositoryRoot, "packages/typescript/qc-theme/src/legal.ts"), "utf8");
  const windowsChat = readFileSync(resolve(repositoryRoot, "apps/windows/src/chat-dock.tsx"), "utf8");
  const androidApp = readFileSync(resolve(repositoryRoot, "apps/android/src/App.tsx"), "utf8");
  const productSafetyAssessment = readFileSync(resolve(repositoryRoot, "docs/PRODUCT_SAFETY_RISK_ASSESSMENT_DRAFT.md"), "utf8");
  const androidStrings = readFileSync(resolve(repositoryRoot, "apps/android/android/app/src/main/res/values/strings.xml"), "utf8");
  const androidBuild = readFileSync(resolve(repositoryRoot, "apps/android/android/app/build.gradle"), "utf8");
  const windowsConfig = JSON.parse(readFileSync(resolve(repositoryRoot, "apps/windows/src-tauri/tauri.conf.json"), "utf8"));
  if (brand.appName !== config.productName) errors.push("shared brand name does not match the release product name");
  if (brand.privacyPolicyUrl !== config.privacyPolicyUrl) errors.push("in-app privacy-policy link does not match the release record");
  if (brand.termsUrl !== config.termsUrl) errors.push("in-app terms link does not match the release record");
  for (const field of [
    "publisherLegalName", "publisherLegalForm", "publisherJurisdiction",
    "publisherRegisteredAddress", "publisherTradeRegister", "publisherRegistrationNumber",
    "publisherVatId", "publisherPublicWebsite", "publisherPublicPhone", "supportEmail",
    "securityEmail", "privacyEmail", "takedownEmail", "securityPolicyUrl"
  ]) {
    if (brand[field] !== config[field]) errors.push(`shared in-app ${field} does not match the release record`);
  }
  if (/(?:Neural DSP|Quad Cortex|CorOS)/i.test(String(brand.companionCaption ?? ""))) errors.push("splash caption must not use third-party product branding without the nearby independence disclosure");
  if (!androidStrings.includes(`<string name="app_name">${config.productName}</string>`)) errors.push("Android app label does not match the release product name");
  if (windowsConfig.productName !== config.productName || windowsConfig.app?.windows?.some((window) => window.title !== config.productName)) errors.push("Windows product or window title does not match the release product name");
  if (brand.androidPackage !== config.androidApplicationId || !androidBuild.includes(`applicationId "${config.androidApplicationId}"`)) errors.push("Android package metadata does not match the release record");
  if (brand.windowsIdentifier !== config.windowsApplicationId || windowsConfig.identifier !== config.windowsApplicationId) errors.push("Windows application identifier does not match the release record");
  const independenceMarkers = ["independent", "unofficial", "not affiliated", "Neural DSP Technologies Oy"];
  for (const marker of independenceMarkers) {
    if (!legalCopy.toLowerCase().includes(marker.toLowerCase())) errors.push(`shared legal copy is missing the independence marker: ${marker}`);
  }
  if (!/interacting with an AI system/i.test(legalCopy)) errors.push("shared legal copy does not clearly disclose AI interaction");
  for (const [surface, source] of [["Windows", windowsChat], ["Android", androidApp]]) {
    if (!source.includes("QC_LEGAL.aiTransparency")) errors.push(`${surface} chat does not expose the shared AI transparency notice`);
    if (!source.includes('data-content-origin={')) errors.push(`${surface} assistant output lacks a machine-readable AI-origin marker`);
  }
  for (const id of Array.from({ length: 12 }, (_, index) => `PS-${String(index + 1).padStart(2, "0")}`)) {
    if (!productSafetyAssessment.includes(`| ${id} |`)) errors.push(`product-safety assessment is missing hazard ${id}`);
  }
  if (config.productSafetyRiskAssessmentCompleted === true && /Status:\s*incomplete|does not justify setting\s+`productSafetyRiskAssessmentCompleted` to true/i.test(productSafetyAssessment)) {
    errors.push("productSafetyRiskAssessmentCompleted conflicts with the risk assessment's incomplete status");
  }
  if (!String(windowsConfig.bundle?.longDescription ?? "").toLowerCase().includes("not affiliated")) errors.push("Windows distributable description does not state non-affiliation");
  const inventory = JSON.parse(readFileSync(resolve(repositoryRoot, "legal/THIRD_PARTY-LICENSE-INVENTORY.json"), "utf8"));
  if (inventory.unresolved?.length) errors.push(`third-party inventory has ${inventory.unresolved.length} unresolved record(s)`);
  if (inventory.missingLocalLicenseText?.length) errors.push(`third-party inventory has ${inventory.missingLocalLicenseText.length} component(s) without bundled license text`);
  errors.push(...currentTrackedSecretErrors().map((error) => `repository secret hygiene: ${error}`));
  errors.push(...currentPublicationBoundaryErrors().map((error) => `publication boundary: ${error}`));
  errors.push(...currentDataFlowInventoryErrors().map((error) => `data-flow inventory: ${error}`));
  errors.push(...currentAssistantDataMinimizationErrors().map((error) => `assistant data minimization: ${error}`));
  errors.push(...currentPlatformSecurityErrors().map((error) => `platform security: ${error}`));
  errors.push(...currentReleaseIncidentErrors().map((error) => `release incident: ${error}`));
  errors.push(...currentPublicProviderBoundaryErrors().map((error) => `public provider boundary: ${error}`));
  errors.push(...releaseVisualBoundaryErrors().map((error) => `release visual boundary: ${error}`));
  errors.push(...currentPublicSourceIpBoundaryErrors().map((error) => `public-source IP boundary: ${error}`));
  errors.push(...currentThirdPartyObligationErrors().map((error) => `third-party redistribution: ${error}`));
  errors.push(...currentFirstPartyLicensePolicyErrors().map((error) => `first-party project license: ${error}`));
  if (errors.length) throw new Error(`Public release is legally blocked:\n- ${errors.join("\n- ")}`);
  return config;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    verifyPublicReleaseLegal();
    console.log("Public-release legal metadata is complete.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
