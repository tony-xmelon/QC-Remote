import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { currentTrackedSecretErrors } from "./verify-no-tracked-secrets.mjs";
import { currentPublicationBoundaryErrors } from "./verify-private-publication-boundaries.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredText = ["publisherLegalName", "copyrightOwner", "supportEmail", "privacyEmail", "takedownEmail", "privacyPolicyUrl", "termsUrl", "distributionLicense"];
const emailFields = ["supportEmail", "privacyEmail", "takedownEmail"];
const urlFields = ["privacyPolicyUrl", "termsUrl"];
const booleanDecisions = [
  ["projectLicenseFilesFinalized", "first-party project license files and manifest declarations are not recorded as finalized"],
  ["contributionPolicyFinalized", "the inbound contribution and ownership policy is not recorded as finalized"],
  ["applicationIdentifiersFinalized", "application/package identifiers are not recorded as final"],
  ["publisherAuthorityConfirmed", "publisher authority to distribute the app is not confirmed"],
  ["providerDataPracticesReviewed", "online provider data practices are not recorded as reviewed"],
  ["firebaseProductionConfigurationReviewed", "production Firebase ownership, restrictions, billing, and App Check configuration are not recorded as reviewed"],
  ["storeDataDisclosuresCompleted", "app-store privacy/data-safety disclosures are not recorded as complete"],
  ["securityReviewCompleted", "the final dependency, application, and infrastructure security review is not recorded as complete"]
];

export function publicReleaseLegalErrors(config) {
  const errors = [];
  if (config?.productName !== "QC Remote") errors.push("productName must be QC Remote");
  for (const field of requiredText) {
    const value = typeof config?.[field] === "string" ? config[field].trim() : "";
    if (!value || /(?:TBD|TODO|PLACEHOLDER|\[.+\])/i.test(value)) errors.push(`${field} is not finalized`);
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
  if (!/^([a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/i.test(config?.androidApplicationId ?? "")) errors.push("androidApplicationId is not a valid finalized reverse-domain identifier");
  if (!/^([a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/i.test(config?.windowsApplicationId ?? "")) errors.push("windowsApplicationId is not a valid finalized reverse-domain identifier");
  if (!Array.isArray(config?.distributionChannels) || config.distributionChannels.length === 0) errors.push("distributionChannels must identify every intended release channel");
  if (!Array.isArray(config?.targetMarkets) || config.targetMarkets.length === 0) errors.push("targetMarkets must identify the countries or regions reviewed for release");
  if (!Number.isInteger(config?.minimumUserAge) || config.minimumUserAge < 13 || config.minimumUserAge > 120) errors.push("minimumUserAge is not finalized");
  if (!["disabled", "publisher-operated", "user-self-hosted"].includes(config?.publicRelayDeployment)) errors.push("publicRelayDeployment must be disabled, publisher-operated, or user-self-hosted");
  if (config?.publicRelayDeployment && config.publicRelayDeployment !== "disabled" && !String(config?.publicRelayOperator ?? "").trim()) errors.push("publicRelayOperator is not identified");
  if (config?.publicRelayDeployment !== "disabled" && config?.publicRelayPrivacyReviewed !== true) errors.push("public relay privacy, retention, subprocessors, and deletion are not recorded as reviewed");
  for (const [field, message] of booleanDecisions) if (config?.[field] !== true) errors.push(message);
  if (config?.nameClearanceCompleted !== true) errors.push("name clearance is not recorded as complete");
  if (config?.thirdPartySdkTermsReviewed !== true) errors.push("Google/Android third-party SDK terms review is not recorded as complete");
  if (config?.finalVisualRiskDecisionCompleted !== true) errors.push("the final UI/trade-dress risk decision is not recorded as complete");
  return errors;
}

export function verifyPublicReleaseLegal(configPath = resolve(repositoryRoot, "legal/public-release.json")) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const errors = publicReleaseLegalErrors(config);
  const inventory = JSON.parse(readFileSync(resolve(repositoryRoot, "legal/THIRD_PARTY-LICENSE-INVENTORY.json"), "utf8"));
  if (inventory.unresolved?.length) errors.push(`third-party inventory has ${inventory.unresolved.length} unresolved record(s)`);
  if (inventory.missingLocalLicenseText?.length) errors.push(`third-party inventory has ${inventory.missingLocalLicenseText.length} component(s) without bundled license text`);
  errors.push(...currentTrackedSecretErrors().map((error) => `repository secret hygiene: ${error}`));
  errors.push(...currentPublicationBoundaryErrors().map((error) => `publication boundary: ${error}`));
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
