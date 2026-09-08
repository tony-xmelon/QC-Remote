import assert from "node:assert/strict";
import test from "node:test";
import { publicReleaseLegalErrors } from "../tools/verify-public-release-legal.mjs";
import { trackedSecretErrors } from "../tools/verify-no-tracked-secrets.mjs";
import { currentPublicationBoundaryErrors, publicationBoundaryErrors, trackedPrivateReferenceErrors } from "../tools/verify-private-publication-boundaries.mjs";
import { buildThirdPartyInventory, upstreamMavenLicense } from "../tools/generate-third-party-inventory.mjs";
import { currentDataFlowInventoryErrors, dataFlowInventoryErrors } from "../tools/verify-data-flow-inventory.mjs";
import { assistantDataMinimizationErrors, currentAssistantDataMinimizationErrors } from "../tools/verify-assistant-data-minimization.mjs";
import { releaseVisualBoundaryErrors } from "../tools/verify-release-visual-boundary.mjs";
import { publicSourceIpBoundaryErrors, publicSourceIpContentErrors } from "../tools/verify-public-source-ip-boundary.mjs";
import { currentThirdPartyObligationErrors, thirdPartyObligationErrors } from "../tools/verify-third-party-license-obligations.mjs";
import { currentFirstPartyLicensePolicyErrors, firstPartyLicensePolicyErrors } from "../tools/verify-first-party-license-policy.mjs";
import { sourceArchiveAttributeErrors, sourceArchiveContentErrors, sourceArchiveInventoryErrors, sourceArchiveZipInventoryErrors, zipCentralDirectoryPaths } from "../tools/create-public-source-release.mjs";
import { currentPlatformSecurityErrors, platformSecurityErrors } from "../tools/verify-release-platform-security.mjs";
import { currentReleaseIncidentErrors, releaseIncidentErrors } from "../tools/verify-release-incidents.mjs";
import { currentPublicProviderBoundaryErrors, publicProviderBoundaryErrors } from "../tools/verify-public-provider-boundary.mjs";
import { readFileSync } from "node:fs";

const complete = {
  productName: "QC Remote",
  publisherLegalName: "Example Publisher LLC",
  publisherLegalForm: "LLC",
  publisherJurisdiction: "Example Country",
  publisherRegisteredAddress: "1 Example Street, Example City",
  publisherTradeRegister: "Example Companies Register",
  publisherRegistrationNumber: "123456789",
  publisherVatStatus: "not-registered",
  publisherVatId: "",
  publisherPublicWebsite: "https://example.com",
  publisherPublicPhone: "+15555550100",
  publisherRegistryIdentityVerified: true,
  publisherNameClearanceCompleted: true,
  publisherNameClearanceDecision: "retained-after-documented-clearance",
  publisherPublicBrand: "",
  publisherNameKnownCollisionsReviewed: true,
  publisherNameClearanceSearchReportSha256: "0".repeat(64),
  copyrightOwner: "Example Publisher LLC",
  supportEmail: "support@example.com",
  securityEmail: "security@example.com",
  privacyEmail: "privacy@example.com",
  takedownEmail: "legal@example.com",
  securityPolicyUrl: "https://example.com/security",
  privacyPolicyUrl: "https://example.com/privacy",
  termsUrl: "https://example.com/terms",
  distributionModel: "open-source",
  distributionLicense: "MIT OR Apache-2.0",
  distributionLicenseDecisionApprovedAt: "2026-09-07T12:00:00+03:00",
  distributionLicenseDecisionApproverRole: "Managing director",
  distributionLicenseDecisionRevision: "1".repeat(40),
  sourceLicenseScope: "all-original-material",
  documentationLicense: "same-as-project",
  brandAssetLicense: "same-as-project",
  projectLicenseFilesFinalized: true,
  licenseScopeNoticesFinalized: true,
  contributionPolicyFinalized: true,
  contributionPolicy: "external-contributions-closed",
  contributionPolicyEvidenceSha256: "2".repeat(64),
  androidApplicationId: "com.example.qcremote",
  windowsApplicationId: "com.example.qcremote",
  applicationIdentifiersFinalized: true,
  distributionChannels: ["Google Play", "Windows direct"],
  targetMarkets: ["US"],
  exportControlAssessmentCompleted: true,
  euDualUseClassificationDecision: "cryptography-note-exclusion-documented",
  usEarEncryptionClassificationDecision: "mass-market-classification-completed",
  cryptographyInventorySha256: "4".repeat(64),
  exportControlAssessmentEvidenceSha256: "5".repeat(64),
  sanctionsDistributionPlanReviewed: true,
  sanctionsScreeningEvidenceSha256: "6".repeat(64),
  googlePlayDeveloperRegistration: "approved",
  googlePlayAccountType: "organization",
  googlePlayOrganizationIdentityVerified: true,
  googlePlayDunsRecordMatched: true,
  googlePlayPaymentsProfileMatched: true,
  googlePlayOrganizationDocumentsVerified: true,
  googlePlayAuthorizedRepresentativeVerified: true,
  googlePlayWebsiteVerified: true,
  googlePlayPrivateContactChannelsVerified: true,
  googlePlayPublicDeveloperContactsVerified: true,
  googlePlayPublicContactDisclosureReviewed: true,
  euTraderDisclosureCompleted: true,
  androidPackageNameRegistered: true,
  androidSigningKeyCustodyReviewed: true,
  minimumUserAge: null,
  minimumUserAgeDecisionFinalized: true,
  targetAudienceDecision: "not-child-directed",
  childrenPrivacyAssessmentCompleted: true,
  childrenPrivacyOperationalPlanReviewed: true,
  childDirectedMarketingReviewCompleted: true,
  neutralAgeScreenImplemented: false,
  childCompatibleOnlineProvidersVerified: false,
  childrenPrivacyEvidenceSha256: "7".repeat(64),
  googlePlayTargetAudienceDeclarationSha256: "8".repeat(64),
  eaaScopeAssessmentCompleted: true,
  eaaScopeDecision: "not-in-scope",
  eaaMicroenterpriseFactsReviewed: false,
  accessibilityConformanceAssessmentCompleted: true,
  accessibilityFeedbackProcessReviewed: true,
  accessibilityStatementDecision: "not-required-after-scope-assessment",
  accessibilityAutomatedEvidenceSha256: "9".repeat(64),
  accessibilityManualEvidenceSha256: "a".repeat(64),
  euConsumerContractAssessmentCompleted: true,
  euDigitalContentDirectiveDecision: "in-scope",
  consumerPersonalDataCounterperformanceReviewed: true,
  consumerMandatoryRightsTermsReviewed: true,
  consumerSupportAndUpdateCommitmentReviewed: true,
  consumerRemediesAndWithdrawalProcessReviewed: true,
  consumerContractEvidenceSha256: "b".repeat(64),
  publicRelayDeployment: "disabled",
  publicRelayCodeExcluded: true,
  publicRelayOperator: "",
  publicRelayPrivacyReviewed: false,
  publisherAuthorityConfirmed: true,
  publisherAuthorityEvidenceSha256: "3".repeat(64),
  providerDataPracticesReviewed: true,
  gdprControllerRolesReviewed: true,
  gdprLegalBasesAndDpiaReviewed: true,
  gdprProcessorContractsReviewed: true,
  gdprInternationalTransfersReviewed: true,
  gdprRightsRetentionAndBreachReadinessReviewed: true,
  providerReleaseDecisions: {
    openaiApi: "reviewed",
    anthropicApi: "reviewed",
    geminiApi: "reviewed",
    firebaseGemini: "reviewed",
    antigravityCli: "reviewed",
    compatibleEndpoint: "reviewed",
    platformSpeech: "reviewed",
  },
  geminiApiEligibilityPlan: "documented-contractual-exception",
  geminiFeatureAgeGateImplemented: true,
  firebaseProductionConfigurationReviewed: true,
  firebasePublishedClientKeysReviewed: true,
  firebaseClientKeyExcludesGenerativeLanguageApi: true,
  firebaseAppCheckEnforced: true,
  storeDataDisclosuresCompleted: true,
  googlePlayDataSafetyActiveArtifactsReviewed: true,
  googlePlayDataSafetySdkBehaviorReviewed: true,
  googlePlayDataSafetySpeechBehaviorReviewed: true,
  googlePlayDataSafetyRelayBehaviorReviewed: false,
  googlePlayDataSafetyArtifactSha256: "a".repeat(64),
  googlePlayDataSafetyDeclarationExportSha256: "b".repeat(64),
  securityReviewCompleted: true,
  githubPrivateVulnerabilityReportingEnabled: true,
  githubVulnerabilityAlertsEnabled: true,
  githubDependabotSecurityUpdatesEnabled: true,
  githubSecretScanningEnabled: true,
  githubSecretPushProtectionEnabled: true,
  dependencySecurityAuditCompleted: true,
  dependencySupportedTargetReviewCompleted: true,
  dependencyInformationalAdvisoriesReviewed: true,
  dependencySecurityEvidenceSha256: "f".repeat(64),
  hardwareBackupSafetyValidationCompleted: true,
  euAiActRoleAssessmentCompleted: true,
  euAiTransparencyControlImplemented: true,
  euAiTransparencyFirstInteractionVerified: true,
  euAiTransparencyAccessibilityVerified: true,
  euAiOutputOriginVerified: true,
  euAiSyntheticContentMarkingDecision: "not-applicable-after-role-assessment",
  euAiTransparencyEvidenceSha256: "d".repeat(64),
  assistantSensitiveActionAuthorizationDecision: "host-confirmed-each-sensitive-action",
  assistantSensitiveActionAuthorizationReviewed: true,
  assistantSensitiveActionAuthorizationEvidenceSha256: "e".repeat(64),
  euProductLiabilityAssessmentCompleted: true,
  euProductLiabilityCommercialActivityConclusion: "out-of-scope-noncommercial-foss",
  euProductLiabilityNoncommercialFactsReviewed: true,
  productSafetyRiskAssessmentCompleted: true,
  productLiabilityEvidenceRetentionReviewed: true,
  productLiabilityInsuranceDecisionReviewed: true,
  craScopeAssessmentCompleted: true,
  craCommercialActivityConclusion: "out-of-scope-noncommercial-foss",
  craCommercialActivityFacts: {
    sourceLicensedForFreeUseModificationRedistribution: true,
    notMonetizedByPublisher: true,
    noPriceOrPaidFeatureAccess: true,
    noPaidUpdates: true,
    noDonationLinkedBenefits: true,
    noRequiredPaidService: true,
    notBundledWithMonetizedProduct: true,
    noRequiredPersonalDataBeyondSecurityCompatibilityInteroperability: true,
    notIntendedForCommercialIntegration: true,
  },
  craNoncommercialFactsReviewed: true,
  craCompliancePlanReviewed: false,
  craIncidentReportingReadinessReviewed: false,
  publicRepositoryRemediationCompleted: true,
  publicSourceIpBoundaryReviewed: true,
  thirdPartySdkTermsReviewed: true,
  nameClearanceCompleted: true,
  nameClearanceDecision: "retain-after-professional-clearance",
  nameClearanceSearchReportSha256: "c".repeat(64),
  nameClearanceReviewedMarkets: ["US"],
  nameClearanceReviewedClasses: ["009", "042"],
  nameClearanceKnownCollisionsReviewed: true,
  nameClearancePublisherRiskAcceptance: "",
  finalVisualRiskDecisionCompleted: true
};

test("public distribution stays blocked while owner, policy, or clearance data is missing", () => {
  const errors = publicReleaseLegalErrors({
    productName: "QC Remote",
    // Select the Firebase path so this missing-data test also exercises its
    // conditional key-restriction and App Check release requirements.
    providerReleaseDecisions: { firebaseGemini: "reviewed" },
  });
  assert.ok(errors.some((error) => error.includes("publisherLegalName")));
  assert.ok(errors.some((error) => error.includes("publisherJurisdiction")));
  assert.ok(errors.some((error) => error.includes("publisherLegalForm")));
  assert.ok(errors.some((error) => error.includes("publisherRegistrationNumber")));
  assert.ok(errors.some((error) => error.includes("publisherVatStatus")));
  assert.ok(errors.some((error) => error.includes("publisherRegistryIdentityVerified") || error.includes("register record")));
  assert.ok(errors.some((error) => error.includes("publisher/developer name")));
  assert.ok(errors.some((error) => error.includes("distributionModel")));
  assert.ok(errors.some((error) => error.includes("name clearance")));
  assert.ok(errors.some((error) => error.includes("third-party SDK terms")));
  assert.ok(errors.some((error) => error.includes("UI/trade-dress")));
  assert.ok(errors.some((error) => error.includes("backup safety")));
  assert.ok(errors.some((error) => error.includes("provider/deployer role")));
  assert.ok(errors.some((error) => error.includes("product-liability assessment")));
  assert.ok(errors.some((error) => error.includes("product-safety risk assessment")));
  assert.ok(errors.some((error) => error.includes("controller/processor roles")));
  assert.ok(errors.some((error) => error.includes("DPIA screening")));
  assert.ok(errors.some((error) => error.includes("international-transfer")));
  assert.ok(errors.some((error) => error.includes("release channel")));
  assert.ok(errors.some((error) => error.includes("googlePlayDeveloperRegistration")));
  assert.ok(errors.some((error) => error.includes("organization identity")));
  assert.ok(errors.some((error) => error.includes("D-U-N-S")));
  assert.ok(errors.some((error) => error.includes("Payments profile")));
  assert.ok(errors.some((error) => error.includes("organization documents")));
  assert.ok(errors.some((error) => error.includes("authorized representative")));
  assert.ok(errors.some((error) => error.includes("organization website")));
  assert.ok(errors.some((error) => error.includes("private contact email and phone")));
  assert.ok(errors.some((error) => error.includes("public Google Play developer email and phone")));
  assert.ok(errors.some((error) => error.includes("public organization contact")));
  assert.ok(errors.some((error) => error.includes("EU trader identity")));
  assert.ok(errors.some((error) => error.includes("package name")));
  assert.ok(errors.some((error) => error.includes("signing-key")));
  assert.ok(errors.some((error) => error.includes("minimum-age decision")));
  assert.ok(errors.some((error) => error.includes("providerReleaseDecisions.openaiApi")));
  assert.ok(errors.some((error) => error.includes("Firebase client keys")));
  assert.ok(errors.some((error) => error.includes("publicRelayDeployment")));
  assert.ok(errors.some((error) => error.includes("project license files")));
  assert.ok(errors.some((error) => error.includes("contribution")));
  assert.ok(errors.some((error) => error.includes("security review")));
  assert.ok(errors.some((error) => error.includes("Cyber Resilience Act scope")));
  assert.ok(errors.some((error) => error.includes("craCommercialActivityConclusion")));
  assert.ok(errors.some((error) => error.includes("craCommercialActivityFacts")));
  assert.ok(errors.some((error) => error.includes("public repository")));
  assert.ok(errors.some((error) => error.includes("open-source tree's conformance fixtures")));
});

test("public release metadata requires HTTPS policies and valid contact addresses", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.deepEqual(publicReleaseLegalErrors({ ...complete, minimumUserAge: 18 }), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, minimumUserAge: -1 }).some((error) => error.includes("valid age")));
  assert.ok(publicReleaseLegalErrors({ ...complete, privacyPolicyUrl: "http://example.com/privacy" }).some((error) => error.includes("HTTPS")));
  assert.ok(publicReleaseLegalErrors({ ...complete, supportEmail: "not-an-email" }).some((error) => error.includes("valid public email")));
  assert.ok(publicReleaseLegalErrors({ ...complete, publisherPublicWebsite: "http://example.com" }).some((error) => error.includes("publisherPublicWebsite must use HTTPS")));
  assert.ok(publicReleaseLegalErrors({ ...complete, publisherPublicPhone: "555-0100" }).some((error) => error.includes("international-format")));
  assert.ok(publicReleaseLegalErrors({ ...complete, publisherVatStatus: "registered", publisherVatId: "" }).some((error) => error.includes("Bulgarian VAT number")));
  assert.ok(publicReleaseLegalErrors({ ...complete, publisherVatStatus: "not-registered", publisherVatId: "BG123456789" }).some((error) => error.includes("must be blank")));
  assert.ok(publicReleaseLegalErrors({ ...complete, googlePlayDeveloperRegistration: "pending" }).some((error) => error.includes("still pending")));
  assert.ok(publicReleaseLegalErrors({ ...complete, googlePlayAccountType: "personal" }).some((error) => error.includes("must be organization")));
  assert.ok(publicReleaseLegalErrors({ ...complete, androidApplicationId: "com.qccontrol.mobile" }).some((error) => error.includes("legacy QC Control")));
  assert.ok(publicReleaseLegalErrors({ ...complete, windowsApplicationId: "com.tonyxmelon.qcvoicecontrol" }).some((error) => error.includes("legacy personal")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    providerReleaseDecisions: { ...complete.providerReleaseDecisions, geminiApi: "reviewed" },
    geminiApiEligibilityPlan: "undecided",
  }).some((error) => error.includes("app-wide 18+ release")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    geminiApiEligibilityPlan: "feature-gated-18",
  }).some((error) => error.includes("feature-only Gemini age checkbox")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    providerReleaseDecisions: { ...complete.providerReleaseDecisions, geminiApi: "reviewed" },
    geminiApiEligibilityPlan: "app-wide-18",
  }).some((error) => error.includes("conflicts with the recorded app minimum age")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    providerReleaseDecisions: { ...complete.providerReleaseDecisions, openaiApi: "disabled" },
  }).some((error) => error.includes("current release code still exposes that path")));
  const geminiDisabled = publicReleaseLegalErrors({
    ...complete,
    providerReleaseDecisions: { ...complete.providerReleaseDecisions, geminiApi: "disabled", firebaseGemini: "disabled" },
    providerReleaseCodeExclusions: { geminiApi: true, firebaseGemini: true },
    geminiApiEligibilityPlan: "disabled",
    firebaseProductionConfigurationReviewed: false,
    firebaseClientKeyExcludesGenerativeLanguageApi: false,
    firebaseAppCheckEnforced: false,
  });
  assert.ok(!geminiDisabled.some((error) => /Gemini|geminiApi|firebaseGemini|Firebase App Check/.test(error)));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    firebaseProductionConfigurationReviewed: false,
    firebaseClientKeyExcludesGenerativeLanguageApi: false,
    firebaseAppCheckEnforced: false,
  }).some((error) => error.includes("production Firebase ownership")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    thirdPartySdkTermsReviewed: false,
  }).some((error) => error.includes("contractual exception")));
  assert.ok(publicReleaseLegalErrors({ ...complete, distributionModel: "open-source", distributionLicense: "some open license" }).some((error) => error.includes("SPDX")));
  assert.ok(publicReleaseLegalErrors({ ...complete, distributionModel: "open-source", distributionLicense: "LicenseRef-Proprietary" }).some((error) => error.includes("not one of the open-source choices reviewed")));
  assert.ok(publicReleaseLegalErrors({ ...complete, sourceLicenseScope: "undecided" }).some((error) => error.includes("sourceLicenseScope")));
  assert.ok(publicReleaseLegalErrors({ ...complete, documentationLicense: "undecided" }).some((error) => error.includes("documentationLicense")));
  assert.ok(publicReleaseLegalErrors({ ...complete, brandAssetLicense: "undecided" }).some((error) => error.includes("brandAssetLicense")));
  assert.ok(publicReleaseLegalErrors({ ...complete, brandAssetLicense: "all-rights-reserved" }).some((error) => error.includes("all-original-material conflicts")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    craCommercialActivityConclusion: "in-scope-manufacturer",
    craCompliancePlanReviewed: false,
  }).some((error) => error.includes("compliance and vulnerability-reporting plan")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    craCommercialActivityFacts: { ...complete.craCommercialActivityFacts, noPaidUpdates: false },
  }).some((error) => error.includes("noncommercial FOSS conclusion conflicts")));
  assert.ok(publicReleaseLegalErrors({
    ...complete,
    craCommercialActivityFacts: { ...complete.craCommercialActivityFacts, noPaidUpdates: "undecided" },
  }).some((error) => error.includes("yes/no evidence")));
});

test("AI transparency cannot be cleared by a bare implementation checkbox", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, euAiTransparencyFirstInteractionVerified: false }).some((error) => error.includes("start of first interaction")));
  assert.ok(publicReleaseLegalErrors({ ...complete, euAiTransparencyAccessibilityVerified: false }).some((error) => error.includes("accessibility")));
  assert.ok(publicReleaseLegalErrors({ ...complete, euAiOutputOriginVerified: false }).some((error) => error.includes("output-origin")));
  assert.ok(publicReleaseLegalErrors({ ...complete, euAiTransparencyEvidenceSha256: "" }).some((error) => error.includes("signed-build transparency evidence")));
  assert.ok(publicReleaseLegalErrors({ ...complete, euAiSyntheticContentMarkingDecision: "undecided" }).some((error) => error.includes("Article 50(2)")));
});

test("model-supplied confirmation flags cannot clear the human-authorization release gate", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, assistantSensitiveActionAuthorizationDecision: "model-supplied-confirmation-flag" }).some((error) => error.includes("independent host authorization")));
  assert.ok(publicReleaseLegalErrors({ ...complete, assistantSensitiveActionAuthorizationReviewed: false }).some((error) => error.includes("independently authorized")));
  assert.ok(publicReleaseLegalErrors({ ...complete, assistantSensitiveActionAuthorizationEvidenceSha256: "" }).some((error) => error.includes("signed-build authorization evidence")));
});

test("the selected open-source license must match every first-party manifest and root license text", () => {
  const mit = "MIT License\n\nPermission is hereby granted, free of charge, to any person obtaining a copy";
  const manifests = [
    { path: "package.json", source: '{"name":"example","license":"MIT"}' },
    { path: "crate/Cargo.toml", source: '[package]\nname = "example"\nlicense = "MIT"\n' },
    { path: "python/pyproject.toml", source: '[project]\nname = "example"\nlicense = "MIT"\n' },
  ];
  assert.deepEqual(firstPartyLicensePolicyErrors({ distributionModel: "open-source", distributionLicense: "MIT" }, manifests, [mit]), []);
  assert.ok(firstPartyLicensePolicyErrors({ distributionModel: "open-source", distributionLicense: "" }, manifests, []).some((error) => error.includes("not selected")));
  assert.ok(firstPartyLicensePolicyErrors({ distributionModel: "open-source", distributionLicense: "" }, manifests, []).some((error) => error.includes("prematurely declares MIT")));
  assert.ok(firstPartyLicensePolicyErrors({ distributionModel: "open-source", distributionLicense: "Apache-2.0" }, manifests, []).some((error) => error.includes("declares MIT")));
  assert.ok(firstPartyLicensePolicyErrors({ distributionModel: "open-source", distributionLicense: "MIT" }, [{ path: "package.json", source: '{"name":"example"}' }], [mit]).some((error) => error.includes("no first-party license declaration")));
  assert.ok(firstPartyLicensePolicyErrors({ distributionModel: "open-source", distributionLicense: "MIT" }, manifests, []).some((error) => error.includes("MIT license text")));
});

test("unselected project licensing does not advertise provisional package grants", () => {
  assert.deepEqual(currentFirstPartyLicensePolicyErrors(), [
    "the exact open-source SPDX license is not selected; first-party manifests currently advertise no license",
  ]);
});

test("license, authority, and contribution checkboxes require retained approval evidence", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, distributionLicenseDecisionApprovedAt: "" }).some((error) => error.includes("approval time")));
  assert.ok(publicReleaseLegalErrors({ ...complete, distributionLicenseDecisionApproverRole: "" }).some((error) => error.includes("corporate role")));
  assert.ok(publicReleaseLegalErrors({ ...complete, distributionLicenseDecisionRevision: "main" }).some((error) => error.includes("exact approved Git commit")));
  assert.ok(publicReleaseLegalErrors({ ...complete, contributionPolicy: "informal" }).some((error) => error.includes("external-contributions-closed")));
  assert.ok(publicReleaseLegalErrors({ ...complete, contributionPolicyEvidenceSha256: "" }).some((error) => error.includes("contribution-policy approval")));
  assert.ok(publicReleaseLegalErrors({ ...complete, publisherAuthorityEvidenceSha256: "" }).some((error) => error.includes("chain-of-title")));
});

test("encrypted worldwide distribution requires artifact-specific export and sanctions evidence", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, euDualUseClassificationDecision: "undecided" }).some((error) => error.includes("EU encryption classification")));
  assert.ok(publicReleaseLegalErrors({ ...complete, usEarEncryptionClassificationDecision: "undecided" }).some((error) => error.includes("U.S. EAR")));
  assert.ok(publicReleaseLegalErrors({ ...complete, exportControlAssessmentCompleted: false }).some((error) => error.includes("export-control assessment")));
  assert.ok(publicReleaseLegalErrors({ ...complete, cryptographyInventorySha256: "" }).some((error) => error.includes("exact-artifact export evidence")));
  assert.ok(publicReleaseLegalErrors({ ...complete, sanctionsDistributionPlanReviewed: false }).some((error) => error.includes("sanctions controls")));
  assert.ok(publicReleaseLegalErrors({ ...complete, sanctionsScreeningEvidenceSha256: "" }).some((error) => error.includes("sanctions-control evidence")));
});

test("no app-wide age gate does not bypass children and Play audience obligations", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, targetAudienceDecision: "undecided" }).some((error) => error.includes("targetAudienceDecision")));
  assert.ok(publicReleaseLegalErrors({ ...complete, childrenPrivacyAssessmentCompleted: false }).some((error) => error.includes("children-privacy assessment")));
  assert.ok(publicReleaseLegalErrors({ ...complete, childrenPrivacyEvidenceSha256: "" }).some((error) => error.includes("child-privacy evidence")));
  assert.ok(publicReleaseLegalErrors({ ...complete, googlePlayTargetAudienceDeclarationSha256: "" }).some((error) => error.includes("Play target-audience")));
  const mixed = { ...complete, targetAudienceDecision: "mixed-audience-including-children" };
  assert.ok(publicReleaseLegalErrors(mixed).some((error) => error.includes("neutral age screen")));
  assert.ok(publicReleaseLegalErrors(mixed).some((error) => error.includes("child-directed use")));
  assert.deepEqual(publicReleaseLegalErrors({ ...mixed, neutralAgeScreenImplemented: true, childCompatibleOnlineProvidersVerified: true }), []);
});

test("accessibility scope and conformance require manual as well as automated evidence", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, eaaScopeDecision: "undecided" }).some((error) => error.includes("eaaScopeDecision")));
  assert.ok(publicReleaseLegalErrors({ ...complete, accessibilityConformanceAssessmentCompleted: false }).some((error) => error.includes("accessibility conformance")));
  assert.ok(publicReleaseLegalErrors({ ...complete, accessibilityManualEvidenceSha256: "" }).some((error) => error.includes("signed-build accessibility evidence")));
  assert.ok(publicReleaseLegalErrors({ ...complete, eaaScopeDecision: "microenterprise-services-exemption" }).some((error) => error.includes("employee, turnover")));
  assert.ok(publicReleaseLegalErrors({ ...complete, eaaScopeDecision: "in-scope", accessibilityStatementDecision: "not-required-after-scope-assessment" }).some((error) => error.includes("published accessibility")));
});

test("EU consumer digital-content scope requires operational evidence, not an as-is disclaimer", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, euConsumerContractAssessmentCompleted: false }).some((error) => error.includes("consumer-contract")));
  assert.ok(publicReleaseLegalErrors({ ...complete, euDigitalContentDirectiveDecision: "undecided" }).some((error) => error.includes("2019/770")));
  assert.ok(publicReleaseLegalErrors({ ...complete, consumerPersonalDataCounterperformanceReviewed: false }).some((error) => error.includes("counter-performance")));
  assert.ok(publicReleaseLegalErrors({ ...complete, consumerSupportAndUpdateCommitmentReviewed: false }).some((error) => error.includes("necessary-update")));
  assert.ok(publicReleaseLegalErrors({ ...complete, consumerRemediesAndWithdrawalProcessReviewed: false }).some((error) => error.includes("conformity")));
  assert.ok(publicReleaseLegalErrors({ ...complete, consumerContractEvidenceSha256: "" }).some((error) => error.includes("retained market")));
});

test("dependency security requires exact-target evidence and disposition of informational advisories", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, dependencySecurityAuditCompleted: false }).some((error) => error.includes("known vulnerabilities")));
  assert.ok(publicReleaseLegalErrors({ ...complete, dependencySupportedTargetReviewCompleted: false }).some((error) => error.includes("supported Windows and Android")));
  assert.ok(publicReleaseLegalErrors({ ...complete, dependencyInformationalAdvisoriesReviewed: false }).some((error) => error.includes("unmaintained, unsound, and yanked")));
  assert.ok(publicReleaseLegalErrors({ ...complete, dependencySecurityEvidenceSha256: "" }).some((error) => error.includes("exact-artifact dependency audit")));
});

test("public security intake requires an enabled private reporting route", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, githubPrivateVulnerabilityReportingEnabled: false })
    .some((error) => error.includes("private vulnerability reporting")));
  for (const [field, marker] of [
    ["githubVulnerabilityAlertsEnabled", "vulnerability alerts"],
    ["githubDependabotSecurityUpdatesEnabled", "Dependabot security updates"],
    ["githubSecretScanningEnabled", "secret scanning"],
    ["githubSecretPushProtectionEnabled", "push protection"],
  ] as const) {
    assert.ok(publicReleaseLegalErrors({ ...complete, [field]: false }).some((error) => error.includes(marker)));
  }
});

test("public source archives retain reviewed evidence ledgers but reject generated output", () => {
  assert.deepEqual(sourceArchiveInventoryErrors(["README.md", "references/README.md", "packages/typescript/qc-core/src/index.ts"]), []);
  assert.ok(sourceArchiveInventoryErrors(["references/qc-ui-coverage/coros-4.1.0/coverage.json"]).some((error) => error.includes("private reference evidence")));
  assert.deepEqual(sourceArchiveInventoryErrors(["packages/typescript/qc-ui/src/coros-screen-fixtures.tsx"]), []);
  assert.ok(sourceArchiveInventoryErrors(["artifacts/source.zip"]).some((error) => error.includes("generated output")));
  assert.ok(sourceArchiveInventoryErrors(["docs/incidents/private-crash.json"]).some((error) => error.includes("incident evidence")));
});

test("public source archives cannot use Git attributes to bypass the reviewed inventory", () => {
  assert.deepEqual(sourceArchiveAttributeErrors("references/qc-ui-official-details/**/*.svg -text\n"), []);
  for (const attributes of [
    "references/** export-ignore",
    "private/** -export-ignore",
    "private/** !export-ignore",
    "README.md export-subst",
    "README.md -export-subst",
    "docs/** export-ignore=true",
  ]) {
    assert.ok(sourceArchiveAttributeErrors(attributes).some((error) => error.includes("must not alter")));
  }
  assert.deepEqual(sourceArchiveAttributeErrors("# private/** export-ignore\n*.svg -text\n"), []);
  assert.ok(sourceArchiveAttributeErrors("fixtures/** export-ignore", "packages/ui/.gitattributes")
    .some((error) => error.includes("packages/ui/.gitattributes")));
});

test("public source ZIP contents must exactly match the reviewed Git inventory", () => {
  const zipDirectory = (names: string[]) => {
    const central = names.map((name) => {
      const encoded = Buffer.from(name, "utf8");
      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(0x800, 8);
      header.writeUInt16LE(encoded.length, 28);
      return Buffer.concat([header, encoded]);
    });
    const body = Buffer.concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(names.length, 8);
    eocd.writeUInt16LE(names.length, 10);
    eocd.writeUInt32LE(body.length, 12);
    eocd.writeUInt32LE(0, 16);
    return Buffer.concat([body, eocd]);
  };
  const archive = zipDirectory(["README.md", "src/", "src/index.ts"]);
  assert.deepEqual(zipCentralDirectoryPaths(archive), ["README.md", "src/", "src/index.ts"]);
  assert.deepEqual(sourceArchiveZipInventoryErrors(archive, ["README.md", "src/index.ts"]), []);
  assert.ok(sourceArchiveZipInventoryErrors(archive, ["README.md", "missing.ts"])
    .some((error) => error.includes("missing reviewed files")));
  assert.ok(sourceArchiveZipInventoryErrors(zipDirectory(["README.md", "../secret.txt"]), ["README.md"])
    .some((error) => error.includes("unsafe paths")));
  assert.ok(sourceArchiveZipInventoryErrors(Buffer.from("not a zip"), [])
    .some((error) => error.includes("no ZIP end")));
});

test("public source archives scan the exact committed file contents for credentials", () => {
  const ignore = ["*.jks", "*.keystore", "*.p12", "*.pfx", "*.pem", "*.key", "*service-account*.json", "*service_account*.json"].join("\n");
  assert.deepEqual(sourceArchiveContentErrors([{ path: "src/index.ts", content: "export const value = 1;" }], ignore), []);
  const simulatedToken = "token=" + "sk-" + "proj-" + "abcdefghijklmnopqrstuvwxyz123456";
  const errors = sourceArchiveContentErrors([{ path: "config.txt", content: simulatedToken }], ignore);
  assert.ok(errors.some((error) => error.includes("model-provider API token")));
});

test("public source IP checks permit fidelity markers in reviewed source", () => {
  assert.deepEqual(publicSourceIpContentErrors([{ path: "src/clean.ts", content: "export const value = 1;" }]), []);
  const errors = publicSourceIpContentErrors([
    { path: "src/renamed.ts", content: 'const setlistKey = "coros-4.1.0-corpus";' },
    { path: "tools/renamed.py", content: '"sourceType": "official-manual"' },
  ]);
  assert.deepEqual(errors, []);
  assert.deepEqual(publicSourceIpContentErrors([
    { path: "tools/verify-public-source-ip-boundary.mjs", content: '"coros-4.1.0-corpus"' },
  ]), []);
});

test("public builds keep direct Gemini and Firebase AI outside both native runtimes", () => {
  assert.deepEqual(currentPublicProviderBoundaryErrors(), []);
  assert.ok(publicProviderBoundaryErrors({
    windowsVite: "", windowsProviders: "", windowsNative: "", androidApp: "",
    androidBuild: "", androidMain: "", workflow: "", androidPackage: "", windowsPackage: "",
  }).some((error) => error.includes("Windows public build flag")));
});

test("unresolved safety incidents independently block release", () => {
  assert.ok(currentReleaseIncidentErrors().some((error) => error.includes("QC-ANDROID-2026-09-07-YSOD-01")));
  assert.ok(releaseIncidentErrors([{ incidentId: "I-1", status: "open-investigation", releaseBlocking: true }]).some((error) => error.includes("unresolved")));
  assert.ok(releaseIncidentErrors([{ incidentId: "I-1", status: "open-investigation", releaseBlocking: false }]).some((error) => error.includes("not explicitly release-blocking")));
  assert.ok(releaseIncidentErrors([{ incidentId: "I-1", status: "mitigated-monitoring", releaseBlocking: false }]).some((error) => error.includes("physical validation evidence")));
  const resolved = {
    incidentId: "I-1", status: "resolved", releaseBlocking: false,
    resolution: {
      closedAt: "2026-09-07T23:00:00+03:00",
      rootCauseOrRiskDecision: "Root cause established and corrected.",
      verificationEvidence: ["private-release-evidence/report.json"],
    },
  };
  assert.deepEqual(releaseIncidentErrors([resolved]), []);
  assert.ok(releaseIncidentErrors([{ ...resolved, releaseBlocking: true }]).some((error) => error.includes("releaseBlocking=false")));
  assert.ok(releaseIncidentErrors([{ ...resolved, resolution: undefined }]).some((error) => error.includes("cannot close")));
  assert.ok(releaseIncidentErrors([{ incidentId: "I-1", status: "fixed-ish", releaseBlocking: false }]).some((error) => error.includes("unrecognized")));
});

test("both public chat surfaces clearly identify AI interaction and output origin", () => {
  const legalCopy = readFileSync(new URL("../packages/typescript/qc-theme/src/legal.ts", import.meta.url), "utf8");
  const windowsChat = readFileSync(new URL("../apps/windows/src/chat-dock.tsx", import.meta.url), "utf8");
  const androidApp = readFileSync(new URL("../apps/android/src/App.tsx", import.meta.url), "utf8");
  assert.match(legalCopy, /interacting with an AI system/i);
  for (const source of [windowsChat, androidApp]) {
    assert.match(source, /QC_LEGAL\.aiTransparency/);
    assert.match(source, /data-content-origin=/);
  }
  assert.match(windowsChat, /item\.origin === "ai" \? "AI" : "APP"/);
  assert.match(windowsChat, /id="ai-transparency-notice"/);
  assert.match(windowsChat, /aria-describedby="ai-transparency-notice"/);
  assert.match(androidApp, /entry\.origin === "ai" \? "AI" : "APP"/);
});

test("both Legal surfaces consume shared structured publisher contacts", () => {
  const legalCopy = readFileSync(new URL("../packages/typescript/qc-theme/src/legal.ts", import.meta.url), "utf8");
  const windowsApp = readFileSync(new URL("../apps/windows/src/App.tsx", import.meta.url), "utf8");
  const androidApp = readFileSync(new URL("../apps/android/src/App.tsx", import.meta.url), "utf8");
  assert.match(legalCopy, /publisherRegisteredAddress/);
  assert.match(legalCopy, /securityPolicyUrl/);
  for (const source of [windowsApp, androidApp]) {
    assert.match(source, /QC_LEGAL\.publisher\.registeredAddress/);
    assert.match(source, /QC_LEGAL\.publisher\.supportEmail/);
    assert.match(source, /QC_LEGAL\.publisher\.securityEmail/);
    assert.match(source, /QC_LEGAL\.publisher\.takedownEmail/);
    assert.match(source, /QC_LEGAL\.publisher\.phone/);
    assert.match(source, /QC_LEGAL\.publisher\.website/);
    assert.match(source, /QC_LEGAL\.publisher\.securityPolicyUrl/);
  }
});

test("the product-safety assessment tracks every release hazard family", () => {
  const assessment = readFileSync(new URL("../docs/PRODUCT_SAFETY_RISK_ASSESSMENT_DRAFT.md", import.meta.url), "utf8");
  for (let index = 1; index <= 12; index += 1) {
    assert.match(assessment, new RegExp(`\\| PS-${String(index).padStart(2, "0")} \\|`));
  }
  assert.match(assessment, /unexpected master-output increase/i);
  assert.match(assessment, /parameter value that differs from the device/i);
  assert.match(assessment, /backup.*release-blocking/is);
  assert.match(assessment, /AI response falsely claims success/i);
});

test("the privacy inventory covers every fixed runtime recipient and has live evidence", () => {
  assert.deepEqual(currentDataFlowInventoryErrors(), []);
  const fixture = {
    schemaVersion: 1,
    reviewedAt: "2026-09-07",
    publisher: "Freevia",
    runtimeRemoteHosts: [],
    flows: [{
      id: "fixture",
      releaseStatus: "planned-public",
      platforms: ["test"], recipients: ["test"], data: ["test"],
      trigger: "test", purpose: "test", transport: "test", retention: "test", userControl: "test",
      evidence: [{ path: "package.json", contains: "qc-remote-mcp" }]
    }]
  };
  const errors = dataFlowInventoryErrors(fixture, (path) => path === "apps/windows/src/model-chat.ts" ? 'baseUrl: "https://new-provider.example.net/v1"' : path === "apps/windows/src-tauri/src/chat.rs" ? "" : readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
  assert.ok(errors.some((error) => error.includes("new-provider.example.net")));
  assert.ok(dataFlowInventoryErrors({ ...fixture, flows: [{ ...fixture.flows[0], releaseStatus: "" }] }).some((error) => error.includes("releaseStatus")));
});

test("Google Play Data safety cannot be finalized without artifact and declaration evidence", () => {
  const worksheet = readFileSync(new URL("../docs/ANDROID_DATA_SAFETY_DRAFT.md", import.meta.url), "utf8");
  assert.match(worksheet, /sum of behavior across all\s+active versions and regions/i);
  assert.match(worksheet, /Ephemeral processing does not justify answering “No.”/);
  assert.match(worksheet, /googlePlayDataSafetyActiveArtifactsReviewed/);
  assert.match(worksheet, /googlePlayDataSafetyDeclarationExportSha256/);
  const missingEvidence = publicReleaseLegalErrors({
    ...complete,
    googlePlayDataSafetyArtifactSha256: "",
    googlePlayDataSafetyDeclarationExportSha256: "not-a-digest",
  });
  assert.ok(missingEvidence.some((error) => error.includes("googlePlayDataSafetyArtifactSha256")));
  assert.ok(missingEvidence.some((error) => error.includes("googlePlayDataSafetyDeclarationExportSha256")));
});

test("online assistants cannot receive persistent device identity", () => {
  assert.deepEqual(currentAssistantDataMinimizationErrors(), []);
  const sources = new Map<string, string>([
    ["packages/typescript/qc-core/src/assistant-tools.ts", "export const MODEL_PRIVATE_QC_ACTIONS = [];"],
    ["packages/typescript/qc-core/src/assistant.ts", "export function formatSnapshotSummary(snapshot) { return snapshot.deviceName; }"],
    ["apps/windows/src/model-chat.ts", ""],
    ["apps/windows/src/App.tsx", ""],
    ["apps/android/src/App.tsx", ""],
    ["contracts/qc-actions.v1.json", '{"actions":[{"name":"get_device_identity"}]}'],
    ["services/mcp-server/src/qc_mcp_server/generated_tools.py", ""],
    ["services/rust-mcp/src/generated_actions.rs", ""],
    ["services/qc-relay/src/generated_actions.rs", ""],
    ["packages/rust/qc-relay-client/src/generated_actions.rs", ""],
  ]);
  const errors = assistantDataMinimizationErrors((path) => sources.get(path) ?? "");
  assert.ok(errors.some((error) => error.includes("device identity")));
  assert.ok(errors.some((error) => error.includes("public-relay action catalog")));
  assert.ok(errors.some((error) => error.includes("custom device name")));
});

test("Antigravity's working directory is not represented as a security sandbox", () => {
  const nativeChat = readFileSync(new URL("../apps/windows/src-tauri/src/chat.rs", import.meta.url), "utf8");
  const windowsApp = readFileSync(new URL("../apps/windows/src/App.tsx", import.meta.url), "utf8");
  const providers = readFileSync(new URL("../docs/MODEL_PROVIDERS.md", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("../docs/PRIVACY_POLICY_DRAFT.md", import.meta.url), "utf8");
  const dataFlows = readFileSync(new URL("../legal/DATA-FLOW-INVENTORY.json", import.meta.url), "utf8");
  assert.doesNotMatch(nativeChat, /isolated Antigravity workspace/);
  assert.match(nativeChat, /dedicated Antigravity working directory/);
  assert.match(windowsApp, /QC_LEGAL\.privacy\.antigravity/);
  for (const disclosure of [providers, privacy, dataFlows]) {
    assert.match(disclosure, /not an operating-system sandbox/);
    assert.match(disclosure, /Windows\s+account permissions/);
  }
});

test("missing Maven POM license fields use narrow verified upstream rules", () => {
  assert.equal(upstreamMavenLicense("androidx.core", "core")?.license, "Apache-2.0");
  assert.equal(upstreamMavenLicense("org.slf4j", "slf4j-api")?.license, "MIT");
  assert.equal(upstreamMavenLicense("unknown.example", "library"), undefined);
});

test("third-party inventory makes every unresolved runtime record explicit", () => {
  const inventory = buildThirdPartyInventory({ npm: [{ ecosystem: "npm", name: "known", version: "1", license: "MIT" }], cargo: [], gradle: [{ ecosystem: "gradle", name: "unknown", version: null, license: null }] });
  assert.deepEqual(inventory.unresolved, ["gradle:unknown@unknown"]);
});

test("current locked inventory is resolved and packaged by both app builds", () => {
  const inventory = JSON.parse(readFileSync(new URL("../legal/THIRD_PARTY-LICENSE-INVENTORY.json", import.meta.url), "utf8"));
  const windowsVite = readFileSync(new URL("../apps/windows/vite.config.ts", import.meta.url), "utf8");
  const androidVite = readFileSync(new URL("../apps/android/vite.config.ts", import.meta.url), "utf8");
  const tauri = readFileSync(new URL("../apps/windows/src-tauri/tauri.conf.json", import.meta.url), "utf8");
  const androidBuild = readFileSync(new URL("../apps/android/android/app/build.gradle", import.meta.url), "utf8");
  const androidLock = readFileSync(new URL("../apps/android/android/app/gradle.lockfile", import.meta.url), "utf8");
  assert.equal(inventory.unresolved.length, 0);
  assert.equal(inventory.missingLocalLicenseText.length, 0);
  assert.ok(inventory.licenseTexts.length > 100);
  assert.ok(inventory.components.length > 100);
  assert.ok(inventory.sourceAvailabilityNotice.length > 0);
  assert.ok(inventory.sourceAvailabilityNotice.every((item) => /^https:\/\/crates\.io\/api\/v1\/crates\/.+\/download$/.test(item.sourceArchiveUrl)));
  assert.equal(inventory.components.find((item) => item.name === "org.checkerframework:checker-compat-qual")?.selectedLicense, "MIT");
  const plex = inventory.components.find((item) => item.ecosystem === "bundled-asset" && item.name === "IBM Plex Sans");
  assert.equal(plex?.version, "3.1");
  assert.equal(plex?.license, "OFL-1.1");
  assert.deepEqual(plex?.assets, [
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans.ttf",
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans-Medium.ttf",
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans-Bold.ttf"
  ]);
  assert.ok(plex?.licenseTextHashes.length > 0);
  assert.ok(!inventory.components.some((item) => /^@fontsource-variable\/(?:arimo|roboto)$/.test(item.name)));
  assert.match(androidBuild, /dependencyLocking\s*\{\s*lockAllConfigurations\(\)/);
  assert.match(androidLock, /releaseRuntimeClasspath/);
  for (const source of [windowsVite, androidVite, tauri]) {
    assert.match(source, /THIRD_PARTY-NOTICES\.md/);
    assert.match(source, /THIRD_PARTY-LICENSE-INVENTORY\.json/);
    assert.match(source, /THIRD_PARTY-LICENSE-TEXTS\.txt/);
    assert.match(source, /THIRD_PARTY-SOURCE-OFFER\.md/);
  }
  assert.deepEqual(currentThirdPartyObligationErrors(), []);
});

test("third-party obligation audit fails closed on drift and inaccurate modification claims", () => {
  const fixture = {
    components: [
      { ecosystem: "cargo", name: "weak", version: "1", license: "MPL-2.0", sourceUrl: "https://example.com/weak" },
      { ecosystem: "gradle", name: "sdk", version: "2", license: "Play Integrity API Terms of Service" },
      { ecosystem: "gradle", name: "choice", version: "3", license: "GPL-2.0 OR MIT" },
    ],
    restrictedTermsReview: [],
    sourceAvailabilityNotice: [],
  };
  const errors = thirdPartyObligationErrors(fixture, "", "QC Remote does not modify these third-party components.", [{ path: "Cargo.toml", source: "[patch.crates-io]\n" }]);
  assert.ok(errors.some((error) => error.includes("restricted SDK/service")));
  assert.ok(errors.some((error) => error.includes("copyleft source-availability")));
  assert.ok(errors.some((error) => error.includes("without an explicit selected license")));
  assert.ok(errors.some((error) => error.includes("Cargo patch/replace")));
});

test("Android release defaults do not back up private app data, expose shared storage, or allow cleartext", () => {
  const manifest = readFileSync(new URL("../apps/android/android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  const backupRules = readFileSync(new URL("../apps/android/android/app/src/main/res/xml/backup_rules.xml", import.meta.url), "utf8");
  const extractionRules = readFileSync(new URL("../apps/android/android/app/src/main/res/xml/data_extraction_rules.xml", import.meta.url), "utf8");
  const relay = readFileSync(new URL("../apps/android/android/app/src/main/java/com/qccontrol/mobile/QcRelayPlugin.java", import.meta.url), "utf8");
  assert.match(manifest, /android:allowBackup="false"/);
  assert.match(manifest, /android:fullBackupContent="@xml\/backup_rules"/);
  assert.match(manifest, /android:dataExtractionRules="@xml\/data_extraction_rules"/);
  for (const domain of ["root", "file", "database", "sharedpref", "external"]) {
    assert.match(backupRules, new RegExp(`<exclude domain="${domain}" path="\\."`));
    assert.equal((extractionRules.match(new RegExp(`<exclude domain="${domain}" path="\\."`, "g")) ?? []).length, 2);
  }
  assert.doesNotMatch(manifest, /CHANGE_NETWORK_STATE/);
  assert.match(manifest, /android:usesCleartextTraffic="false"/);
  assert.doesNotMatch(manifest, /FileProvider|fileprovider|FILE_PROVIDER_PATHS/);
  assert.match(relay, /Manifest\.permission\.POST_NOTIFICATIONS/);
  assert.match(relay, /explainNotificationPermission\(call, "pairNotificationPermission"\)/);
  assert.match(relay, /explainNotificationPermission\(call, "startNotificationPermission"\)/);
  assert.match(relay, /requestPermissionForAlias\("notifications", call, callback\)/);
  assert.match(relay, /NOTIFICATION_PERMISSION_DENIED/);
});

test("release platform security is fail-closed and covers both native shells", () => {
  assert.deepEqual(currentPlatformSecurityErrors(), []);
  const sources: Record<string, string> = {
    "apps/android/android/app/src/main/AndroidManifest.xml": '<application android:allowBackup="true" android:usesCleartextTraffic="true"><provider android:name="androidx.core.content.FileProvider" android:exported="true"></provider></application>',
    "apps/android/capacitor.config.json": JSON.stringify({ loggingBehavior: "debug", android: { allowMixedContent: true } }),
    "apps/android/android/app/src/main/res/xml/backup_rules.xml": "<full-backup-content />",
    "apps/android/android/app/src/main/res/xml/data_extraction_rules.xml": "<data-extraction-rules />",
    "apps/windows/src-tauri/tauri.conf.json": JSON.stringify({ app: { security: { csp: "script-src 'unsafe-eval'" } } }),
    "apps/windows/src-tauri/capabilities/default.json": JSON.stringify({ permissions: ["core:default", "shell:allow-execute"] }),
  };
  const errors = platformSecurityErrors((path) => sources[path]);
  assert.ok(errors.some((error) => error.includes("cleartext")));
  assert.ok(errors.some((error) => error.includes("file-sharing")));
  assert.ok(errors.some((error) => error.includes("mixed content")));
  assert.ok(errors.some((error) => error.includes("CSP")));
  assert.ok(errors.some((error) => error.includes("capability")));
});

test("first-party package identities do not imply Neural DSP affiliation", () => {
  const rootPackage = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const lockfile = readFileSync(new URL("../package-lock.json", import.meta.url), "utf8");
  const pythonPackage = readFileSync(new URL("../services/mcp-server/pyproject.toml", import.meta.url), "utf8");
  for (const source of [rootPackage, lockfile, pythonPackage]) {
    assert.doesNotMatch(source, /(?:@ndsp-qc|ndsp-qc-mcp)/i);
  }
  assert.match(rootPackage, /"name": "qc-remote-mcp"/);
  assert.match(lockfile, /"name": "@qc-remote\/windows"/);
  assert.match(lockfile, /"name": "@qc-remote\/android"/);
  assert.match(pythonPackage, /name = "qc-remote-mcp-server"/);
});

test("release secret hygiene rejects private credentials and requires ignore rules", () => {
  const ignore = ["*.jks", "*.keystore", "*.p12", "*.pfx", "*.pem", "*.key", "*service-account*.json", "*service_account*.json"].join("\n");
  const actualIgnore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  assert.deepEqual(trackedSecretErrors([{ path: "apps/android/google-services.json", content: '{"api_key":[{"current_key":"public-client-config"}]}' }], ignore), []);
  assert.match(actualIgnore, /apps\/android\/android\/app\/google-services\.json/);
  assert.ok(trackedSecretErrors([{ path: "release.jks", content: "binary" }], ignore).some((error) => error.includes("credential-bearing filename")));
  const serviceAccountFixture = `{"type":"${"service"}_${"account"}"}`;
  const privateKeyFixture = `-----BEGIN ${"PRIVATE"} KEY-----`;
  assert.ok(trackedSecretErrors([{ path: "config.json", content: serviceAccountFixture }], ignore).some((error) => error.includes("service credential")));
  assert.ok(trackedSecretErrors([{ path: "notes.txt", content: privateKeyFixture }], ignore).some((error) => error.includes("private-key block")));
  assert.ok(trackedSecretErrors([], "").some((error) => error.includes(".gitignore")));
});

test("dependency monitoring covers every locked first-party ecosystem", () => {
  const dependabot = readFileSync(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/security-audit.yml", import.meta.url), "utf8");
  for (const ecosystem of ["npm", "cargo", "gradle", "pip", "github-actions"]) assert.match(dependabot, new RegExp(`package-ecosystem: ${ecosystem}`));
  for (const directory of ["apps/windows/src-tauri", "packages/rust/qc-android", "services/device-broker", "services/qc-relay", "services/qc-remote", "services/rust-mcp"]) {
    assert.match(workflow, new RegExp(directory.replaceAll("/", "\\/")));
  }
  assert.match(workflow, /rustsec\/audit-check@v2\.0\.0/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=moderate/);
  assert.match(workflow, /npm audit --audit-level=high/);
});

test("the device catalog XML parser stays on the RustSec-patched release line", () => {
  const manifest = readFileSync(new URL("../packages/rust/qc-protocol/Cargo.toml", import.meta.url), "utf8");
  const lockfiles = [
    "../packages/rust/qc-protocol/Cargo.lock",
    "../packages/rust/qc-device-runtime/Cargo.lock",
    "../packages/rust/qc-android/Cargo.lock",
    "../packages/rust/qc-windows-midi/Cargo.lock",
    "../services/device-broker/Cargo.lock",
    "../apps/windows/src-tauri/Cargo.lock"
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
  assert.match(manifest, /quick-xml = "0\.41"/);
  for (const lockfile of lockfiles) assert.doesNotMatch(lockfile, /name = "quick-xml"\r?\nversion = "0\.38\./);
});

test("the proposed public name has a dated, non-clearance registry screen", () => {
  const screen = readFileSync(new URL("../docs/NAME_CLEARANCE_SCREEN.md", import.meta.url), "utf8");
  assert.match(screen, /Screened 2026-09-07/);
  assert.match(screen, /Do not treat `QC Remote` as cleared/i);
  assert.match(screen, /CM:"QC REMOTE"/);
  assert.match(screen, /018255049/);
  assert.match(screen, /KLIPPEL/);
});

test("a name-clearance checkbox cannot bypass market, class, collision, and evidence records", () => {
  const errors = publicReleaseLegalErrors({
    ...complete,
    nameClearanceDecision: "retain-after-documented-self-screen",
    nameClearanceSearchReportSha256: "",
    nameClearanceReviewedMarkets: [],
    nameClearanceReviewedClasses: ["009"],
    nameClearanceKnownCollisionsReviewed: false,
    nameClearancePublisherRiskAcceptance: "",
  });
  for (const marker of ["nameClearanceSearchReportSha256", "target market", "Class 042", "collisions", "risk-acceptance"]) {
    assert.ok(errors.some((error) => error.includes(marker)), `missing name-clearance error for ${marker}`);
  }
});

test("publisher identity cannot bypass separate developer-name clearance", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  const errors = publicReleaseLegalErrors({
    ...complete,
    publisherNameClearanceDecision: "distinctive-developer-brand-adopted",
    publisherPublicBrand: "Freevia",
    publisherNameKnownCollisionsReviewed: false,
    publisherNameClearanceSearchReportSha256: "",
  });
  for (const marker of ["publisherPublicBrand", "collisions", "publisherNameClearanceSearchReportSha256"]) {
    assert.ok(errors.some((error) => error.includes(marker)), `missing publisher-name error for ${marker}`);
  }
  const exactNameErrors = publicReleaseLegalErrors({
    ...complete,
    publisherRegistryIdentityVerified: false,
    publisherNameClearanceDecision: "exact-legal-name-descriptive-use-only",
  });
  assert.ok(exactNameErrors.some((error) => error.includes("register identity")));
});

test("release surfaces consistently identify QC Remote as an independent app", () => {
  const brand = JSON.parse(readFileSync(new URL("../packages/typescript/qc-theme/src/brand.json", import.meta.url), "utf8"));
  const legal = readFileSync(new URL("../packages/typescript/qc-theme/src/legal.ts", import.meta.url), "utf8");
  const androidApp = readFileSync(new URL("../apps/android/src/App.tsx", import.meta.url), "utf8");
  const windowsApp = readFileSync(new URL("../apps/windows/src/App.tsx", import.meta.url), "utf8");
  const androidStrings = readFileSync(new URL("../apps/android/android/app/src/main/res/values/strings.xml", import.meta.url), "utf8");
  const windows = JSON.parse(readFileSync(new URL("../apps/windows/src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  assert.equal(brand.appName, "QC Remote");
  assert.equal(brand.companionCaption, "INDEPENDENT DEVICE CONTROL");
  assert.doesNotMatch(brand.companionCaption, /Neural|Quad Cortex|CorOS/i);
  assert.match(androidStrings, /<string name="app_name">QC Remote<\/string>/);
  assert.equal(windows.productName, "QC Remote");
  assert.ok(windows.app.windows.every((window: { title: string }) => window.title === "QC Remote"));
  assert.match(legal, /independent, unofficial application/);
  assert.match(legal, /not affiliated with, authorized, sponsored, endorsed, or supported/);
  assert.match(legal, /relay operator you trust/);
  assert.match(androidApp, /QC_LEGAL\.privacy\.relay/);
  assert.match(windowsApp, /QC_LEGAL\.privacy\.relay/);
  assert.match(androidApp, /QC_BRAND\.privacyPolicyUrl/);
  assert.match(androidApp, /QC_BRAND\.termsUrl/);
  assert.match(windowsApp, /QC_BRAND\.privacyPolicyUrl/);
  assert.match(windowsApp, /QC_BRAND\.termsUrl/);
  assert.equal(windows.bundle.shortDescription, "Independent controller for compatible guitar hardware");
  assert.doesNotMatch(windows.bundle.shortDescription, /Neural DSP|Quad Cortex|CorOS|companion/i);
  assert.match(windows.bundle.longDescription, /^Independent, unofficial Windows controller/);
  assert.match(windows.bundle.longDescription, /Works with compatible Quad Cortex devices/);
  assert.match(windows.bundle.longDescription, /Not affiliated with or endorsed by Neural DSP Technologies Oy/);
});

test("public project copy uses compatibility-only marks and makes no streaming extractor claim", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const trademarks = readFileSync(new URL("../TRADEMARKS.md", import.meta.url), "utf8");
  const storeCopy = readFileSync(new URL("../docs/STORE_LISTING_COPY_DRAFT.md", import.meta.url), "utf8");
  assert.match(readme, /independent, unofficial project/i);
  assert.match(readme, /\[Compatibility and trademark notice\]\(TRADEMARKS\.md\)/);
  assert.match(readme, /does not yet have a repository-wide license/i);
  assert.match(readme, /public visibility grants permission/i);
  assert.match(readme, /package-level licenses[\s\S]*do not license the repository as a whole/i);
  assert.match(readme, /Public installers do not include streaming-media\s+download or extraction tools/i);
  assert.doesNotMatch(readme, /installer also embeds the\s+optional YouTube reference-audio resolver/i);
  assert.match(trademarks, /published by Freevia/);
  assert.match(trademarks, /not affiliated with, authorized,\s+sponsored, endorsed, or supported/i);
  assert.match(trademarks, /used only as reasonably necessary to identify/i);
  assert.match(trademarks, /No trademark license, certification, partnership/i);
  assert.match(trademarks, /firmware-sensitive/i);
  assert.match(storeCopy, /## Short description[\s\S]*Independent controller for compatible guitar hardware/i);
  assert.doesNotMatch(storeCopy.match(/## Short description[\s\S]*?(?=\n## )/)?.[0] ?? "", /Neural DSP|Quad Cortex|CorOS|companion/i);
});

test("publication drafts preserve mandatory rights and identify EEA privacy routes", () => {
  const terms = readFileSync(new URL("../docs/TERMS_OF_USE_DRAFT.md", import.meta.url), "utf8");
  const privacy = readFileSync(new URL("../docs/PRIVACY_POLICY_DRAFT.md", import.meta.url), "utf8");
  assert.doesNotMatch(terms, /\[(?:INSERT|DEFINE|STATE THE)\b/i);
  assert.match(terms, /do(?:es)?\s+not reduce rights granted by the selected open-source license/i);
  assert.match(terms, /Nothing in these terms excludes or limits a mandatory consumer right/i);
  assert.match(terms, /minimum\s+period for necessary security and conformity updates/i);
  assert.match(terms, /does not shift responsibility to the consumer|responsibility\s+will not be shifted to the consumer/i);
  assert.match(terms, /repair, price-\s*reduction, refund, termination, withdrawal, or data-return right/i);
  assert.match(terms, /without depriving a consumer of\s+mandatory protections/i);
  assert.match(terms, /Changes do not retroactively\s+reduce rights already granted under an open-source license/i);
  assert.match(privacy, /rather than treating installation as blanket consent/i);
  assert.match(privacy, /Bulgarian Commission for Personal Data Protection/i);
  assert.match(privacy, /cpdp\.bg\/en\/lodging-complaints-and-alerts/);
  assert.match(privacy, /platform credential storage/);

  const placeholders = [...`${terms}\n${privacy}`.matchAll(/\[([A-Z][A-Z -]+)\]/g)]
    .map((match) => match[1])
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
  assert.deepEqual(placeholders, [
    "POSTAL ADDRESS",
    "PRIVACY EMAIL",
    "SECURITY EMAIL",
    "SECURITY POLICY URL",
    "SUPPORT EMAIL",
    "TAKEDOWN EMAIL",
  ]);
});

test("first-party registries fail closed against accidental publication", () => {
  assert.deepEqual(currentPublicationBoundaryErrors(), []);
  assert.ok(publicationBoundaryErrors([{ path: "package.json", content: '{"name":"example"}' }]).some((error) => error.includes('"private": true')));
  assert.ok(publicationBoundaryErrors([{ path: "Cargo.toml", content: '[package]\nname = "example"\nversion = "1.0.0"\n' }]).some((error) => error.includes("publish = false")));
  assert.ok(publicationBoundaryErrors([{ path: "pyproject.toml", content: '[project]\nname = "example"\n' }]).some((error) => error.includes("Private :: Do Not Upload")));
  assert.ok(trackedPrivateReferenceErrors(["references/qc-ui-corpus/coros-4.1.0/grid.png"]).some((error) => error.includes("must not be tracked")));
  assert.ok(trackedPrivateReferenceErrors(["references/qc-ui-coverage/coros-4.1.0/coverage.json"]).some((error) => error.includes("must not be tracked")));
  assert.ok(trackedPrivateReferenceErrors(["references/qc-ui-app-golden/v1/iconography-audit.png"]).some((error) => error.includes("must not be tracked")));
  assert.ok(trackedPrivateReferenceErrors(["references/qc-ui-official-details/coros-4.1.0/official-detail-power-on.svg"]).some((error) => error.includes("must not be tracked")));
  assert.ok(trackedPrivateReferenceErrors(["packages/typescript/qc-theme/assets/qc-overview-001.svg"]).some((error) => error.includes("must not be tracked")));
  assert.ok(trackedPrivateReferenceErrors(["apps/android/android/app/google-services.json"]).some((error) => error.includes("injected at build time")));
  assert.deepEqual(trackedPrivateReferenceErrors(["references/README.md"]), []);
});

test("private builds identify Freevia without implying that the license is finalized", () => {
  const brand = JSON.parse(readFileSync(new URL("../packages/typescript/qc-theme/src/brand.json", import.meta.url), "utf8"));
  const legal = readFileSync(new URL("../packages/typescript/qc-theme/src/legal.ts", import.meta.url), "utf8");
  assert.doesNotMatch(brand.copyrightNotice, /contributors|all rights reserved/i);
  assert.equal(brand.deviceWordmark, "QUADCORTEX");
  assert.doesNotMatch(brand.appWordmark, /QUAD\s*CORTEX|NEURAL\s*DSP/i);
  assert.match(brand.copyrightNotice, /Freevia, a legal entity based in Bulgaria/);
  assert.match(brand.copyrightNotice, /Open-source license details/);
  assert.match(brand.copyrightNotice, /before public release/i);
  assert.match(legal, /copyright: brand\.copyrightNotice/);
  assert.match(legal, /Review device changes, use safe output levels/);
  assert.doesNotMatch(legal, /use it at your own risk/i);
});

test("runtime-facing names use QC Remote while legacy local state remains readable", () => {
  const implementationPlan = readFileSync(new URL("../docs/WINDOWS_IMPLEMENTATION_PLAN.md", import.meta.url), "utf8");
  const gatewayCli = readFileSync(new URL("../services/device-gateway/src/qc_device_gateway/__main__.py", import.meta.url), "utf8");
  const windowsHost = readFileSync(new URL("../apps/windows/src-tauri/src/lib.rs", import.meta.url), "utf8");
  const chat = readFileSync(new URL("../apps/windows/src-tauri/src/chat.rs", import.meta.url), "utf8");
  const relay = readFileSync(new URL("../apps/windows/src-tauri/src/relay.rs", import.meta.url), "utf8");
  const windowsCargo = readFileSync(new URL("../apps/windows/src-tauri/Cargo.toml", import.meta.url), "utf8");
  const windowsMain = readFileSync(new URL("../apps/windows/src-tauri/src/main.rs", import.meta.url), "utf8");
  const versionScript = readFileSync(new URL("../scripts/version-app.mjs", import.meta.url), "utf8");
  const flight = readFileSync(new URL("../services/device-broker/src/flight.rs", import.meta.url), "utf8");

  assert.match(implementationPlan, /^# QC Remote — Windows implementation plan/m);
  assert.doesNotMatch(implementationPlan, /QC Voice Control/);
  assert.match(gatewayCli, /description="QC Remote device gateway"/);
  assert.doesNotMatch(gatewayCli, /QC Voice Control/);
  assert.match(windowsHost, /\.join\("QC Remote"\)\s*\.join\("runtime-health\.json"\)/);
  assert.match(windowsHost, /"format": "qc-remote-diagnostics-v1"/);
  assert.match(windowsCargo, /^name = "qc-remote"/m);
  assert.match(windowsCargo, /^name = "qc_remote_lib"/m);
  assert.match(windowsMain, /qc_remote_lib::run\(\)/);
  assert.match(versionScript, /name = "qc-remote"/);
  assert.match(chat, /fn legacy_settings_path\(\)[\s\S]*legacy_app_data_directory/);
  assert.match(chat, /\.or_else\(\|_\| fs::read\(legacy_settings_path\(\)\)\)/);
  assert.match(chat, /const CREDENTIAL_SERVICE: &str = "QC Remote model provider"/);
  assert.match(chat, /const LEGACY_CREDENTIAL_SERVICE: &str = "com\.tonyxmelon\.qc-control\.model-provider"/);
  assert.match(chat, /legacy_service_credential_entry/);
  assert.match(relay, /const CREDENTIAL_SERVICE: &str = "QC Remote"/);
  assert.match(relay, /const LEGACY_CREDENTIAL_SERVICE: &str = "QC Control"/);
  assert.match(relay, /legacy_credential_entry/);
  assert.match(flight, /root\.join\("QC Remote"\)\.join\("device-flight-recorder\.json"\)/);
  assert.match(flight, /open_with_fallback\(Some\(path\), Some\(legacy_path\)\)/);
});

test("external contributions remain closed until ownership and inbound terms are finalized", () => {
  const contributing = readFileSync(new URL("../CONTRIBUTING.md", import.meta.url), "utf8");
  const authority = readFileSync(new URL("../docs/PUBLISHER_AUTHORITY_CHECKLIST.md", import.meta.url), "utf8");
  assert.match(contributing, /not currently accepting external/i);
  assert.match(contributing, /not an open-source license/i);
  assert.match(contributing, /copyright owner/i);
  assert.match(contributing, /inbound-contribution terms/i);
  assert.match(authority, /Git identity does not prove/i);
  assert.match(authority, /exact registered legal name/i);
  assert.match(authority, /employment, contractor, founder, and assignment/i);
  assert.match(authority, /AI-assisted development tools/i);
  assert.match(authority, /private corporate record/i);
  assert.match(authority, /publisherAuthorityConfirmed/);
});

test("public issue intake requires reporters to exclude protected and sensitive material", () => {
  const config = readFileSync(new URL("../.github/ISSUE_TEMPLATE/config.yml", import.meta.url), "utf8");
  const bug = readFileSync(new URL("../.github/ISSUE_TEMPLATE/bug-report.yml", import.meta.url), "utf8");
  const feature = readFileSync(new URL("../.github/ISSUE_TEMPLATE/feature-request.yml", import.meta.url), "utf8");
  assert.match(config, /blank_issues_enabled: false/);
  for (const template of [bug, feature]) {
    assert.match(template, /safe-material/);
    assert.match(template, /required: true/);
    assert.match(template, /not authorized to share/);
  }
  assert.match(bug, /credentials, tokens, serial numbers, personal data/);
  assert.match(feature, /copied product\/manual artwork/);
});

test("release source does not retain captured personal setlists or a default tester address", () => {
  const sources = [
    readFileSync(new URL("../packages/typescript/qc-ui/src/quad-cortex-surface.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../scripts/publish-android-firebase.ps1", import.meta.url), "utf8")
  ].join("\n");
  assert.doesNotMatch(sources, /\bALI(?:\s|20)/);
  assert.doesNotMatch(sources, /[A-Z0-9._%+-]+@(gmail|icloud|outlook|hotmail|yahoo|protonmail|proton\.me)\.[A-Z]{2,}/i);
  assert.match(sources, /\[string\]\$Testers = ""/);
});

test("security and pull-request intake do not imply unsupported public channels or contribution terms", () => {
  const security = readFileSync(new URL("../SECURITY.md", import.meta.url), "utf8");
  const pullRequest = readFileSync(new URL("../.github/pull_request_template.md", import.meta.url), "utf8");
  assert.match(security, /no supported public release/i);
  assert.match(security, /Do not post suspected vulnerabilities.*public issue or pull request/is);
  assert.match(security, /github\.com\/tony-xmelon\/QC-Remote\/security\/advisories\/new/i);
  assert.match(security, /interim and supplementary\s+channel/i);
  assert.match(security, /not a promise of a current response time/i);
  assert.match(pullRequest, /not currently accepting external contributions/i);
  assert.match(pullRequest, /I own or am authorized to submit everything/);
});

test("CI cannot create public distributables without the legal gate", () => {
  const workflow = readFileSync(new URL("../.github/workflows/software-parity.yml", import.meta.url), "utf8");
  assert.match(workflow, /public-repository-boundary:[\s\S]*github\.event\.repository\.visibility == 'public'/);
  assert.match(workflow, /public-repository-boundary:[\s\S]*fetch-depth: 0[\s\S]*npm run legal:secrets[\s\S]*npm run legal:source-ip/);
  assert.match(workflow, /build_distributables:[\s\S]*?default: false[\s\S]*?type: boolean/);
  assert.match(workflow, /distribution_scope:[\s\S]*?private-test[\s\S]*?public-release/);
  assert.equal((workflow.match(/github\.event_name == 'workflow_dispatch' && inputs\.build_distributables/g) ?? []).length, 3);
  assert.ok((workflow.match(/inputs\.distribution_scope == 'public-release'/g) ?? []).length >= 3);
  assert.equal((workflow.match(/run: npm run legal:check/g) ?? []).length, 2);
  assert.equal((workflow.match(/Reject private-test artifacts from a public repository/g) ?? []).length, 3);
  assert.equal((workflow.match(/\$env:DISTRIBUTION_SCOPE -eq "private-test" -and \$env:REPOSITORY_VISIBILITY -ne "private"/g) ?? []).length, 3);
  assert.match(workflow, /android-package:[\s\S]*?Reject private-test artifacts from a public repository[\s\S]*?Restore environment-specific Firebase client configuration/);
  assert.match(workflow, /Restore environment-specific Firebase client configuration\s+if: \$\{\{ inputs\.distribution_scope == 'private-test' \}\}/);
  assert.match(workflow, /Preserve failed UI screenshots and traces\s+if: \$\{\{ failure\(\) && github\.event\.repository\.private \}\}/);
  assert.match(workflow, /QC_FIREBASE_ANDROID_CONFIG_BASE64: \$\{\{ secrets\.QC_FIREBASE_ANDROID_CONFIG_BASE64 \}\}/);
  assert.match(workflow, /Firebase configuration must contain exactly one client for the branded Android package/);
});

test("production hosts cannot select visual-reference query fixtures", () => {
  const windows = readFileSync(new URL("../apps/windows/src/App.tsx", import.meta.url), "utf8");
  const android = readFileSync(new URL("../apps/android/src/App.tsx", import.meta.url), "utf8");
  for (const host of [windows, android]) {
    assert.match(host, /corosFixtureConfiguration\(import\.meta\.env\.DEV \? window\.location\.search : "", demoSnapshot\)/);
  }
});

test("functional device visuals retain their verified vector coordinates", () => {
  const visuals = readFileSync(new URL("../packages/typescript/qc-ui/src/block-visuals.ts", import.meta.url), "utf8");
  const icons = readFileSync(new URL("../packages/typescript/qc-ui/src/theme-icons.tsx", import.meta.url), "utf8");
  const categories = readFileSync(new URL("../packages/typescript/qc-ui/src/device-category-glyph.tsx", import.meta.url), "utf8");
  const fixtures = readFileSync(new URL("../packages/typescript/qc-ui/src/coros-screen-fixtures.tsx", import.meta.url), "utf8");
  assert.match(visuals, /shared neutral vector/);
  assert.match(categories, /Visible geometry follows the device UI/);
  assert.doesNotMatch(categories, /<image\b|data:image|base64|<(?:metadata|title|desc)\b|Neural DSP Technologies LLC/);
  assert.match(icons, /shared neutral 24px glyph area/);
  assert.doesNotMatch(fixtures, /Neural DSP Technologies LLC|support@neuraldsp\.com|Elimäenkatu/);
});

test("release guard requires neutral functional vectors while gating fixture selection", () => {
  assert.deepEqual(releaseVisualBoundaryErrors(), []);
  const verifier = readFileSync(new URL("../tools/verify-release-visual-boundary.mjs", import.meta.url), "utf8");
  assert.match(verifier, /neutral vectors and device geometry/);
  assert.match(verifier, /import\.meta\.env\.DEV/);
});

test("public repository remediation remains a documented release blocker", () => {
  const review = readFileSync(new URL("../docs/PUBLIC_REPOSITORY_REMEDIATION.md", import.meta.url), "utf8");
  const artifactAudit = readFileSync(new URL("../docs/PUBLIC_ARTIFACT_AUDIT.md", import.meta.url), "utf8");
  assert.match(review, /repository visibility: `PUBLIC`/);
  assert.match(review, /18 non-expired Actions artifacts/);
  assert.match(review, /PUBLIC_ARTIFACT_AUDIT\.md/);
  assert.match(review, /217 tracked private-reference files/);
  assert.match(review, /does not remove the\s+same files from older commits/);
  assert.match(review, /google-services\.json/);
  assert.match(review, /does not\s+allow the Generative Language API/i);
  assert.match(review, /deleting Git history is not key revocation/i);
  assert.match(artifactAudit, /9967875562/);
  assert.match(artifactAudit, /446ab157e73711a815c9361a8956ece4195979a6742e38868c3fb3d9f5d65406/);
  assert.match(artifactAudit, /source\.dirty: true/);
  assert.match(artifactAudit, /no packaged legal directory/);
});

test("public-source policy publishes neutral vectors and rejects official reference SVGs", () => {
  const boundary = readFileSync(new URL("../docs/PUBLIC_SOURCE_IP_BOUNDARY.md", import.meta.url), "utf8");
  assert.match(boundary, /neutral project-owned vectors/i);
  assert.match(boundary, /must not be tracked/i);
  assert.match(boundary, /does not imply affiliation/i);
  assert.deepEqual(publicSourceIpBoundaryErrors(["packages/typescript/qc-ui/src/release-device-screens.tsx"]), []);
  const errors = publicSourceIpBoundaryErrors(["references/qc-ui-official-details/coros-4.1.0/official-detail-power-on.svg"]);
  assert.ok(errors.some((error) => error.includes("private visual-reference corpora")));
  assert.deepEqual(publicSourceIpContentErrors([{ path: "assets/neutral.svg", content: '<svg><path d="M0 0h1"/></svg>' }]), []);
  for (const content of [
    '<svg><metadata>source</metadata></svg>',
    '<svg><image href="data:image/png;base64,AA=="/></svg>',
    '<svg><use href="https://images.ctfassets.net/reference.svg"/></svg>',
    '<svg><title>Quad Cortex</title></svg>',
  ]) assert.ok(publicSourceIpContentErrors([{ path: "assets/leak.svg", content }]).length > 0);
});

test("EU release records require trader disclosure and a CRA role decision", () => {
  const checklist = readFileSync(new URL("../docs/EU_PRODUCT_COMPLIANCE_CHECKLIST.md", import.meta.url), "utf8");
  const review = readFileSync(new URL("../docs/RELEASE_LEGAL_IP_REVIEW.md", import.meta.url), "utf8");
  assert.match(checklist, /exact registered legal name and legal form/i);
  assert.match(checklist, /out-of-scope-noncommercial-foss/);
  assert.match(checklist, /in-scope-manufacturer/);
  assert.match(checklist, /in-scope-open-source-steward/);
  assert.match(checklist, /11 September 2026/);
  assert.match(checklist, /11 December 2027/);
  assert.match(review, /Open-source status\s+is not by itself a CRA exemption/i);
});
