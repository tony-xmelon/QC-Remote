import assert from "node:assert/strict";
import test from "node:test";
import { publicReleaseLegalErrors } from "../tools/verify-public-release-legal.mjs";
import { trackedSecretErrors } from "../tools/verify-no-tracked-secrets.mjs";
import { currentPublicationBoundaryErrors, publicationBoundaryErrors } from "../tools/verify-private-publication-boundaries.mjs";
import { buildThirdPartyInventory, upstreamMavenLicense } from "../tools/generate-third-party-inventory.mjs";
import { readFileSync } from "node:fs";

const complete = {
  productName: "QC Remote",
  publisherLegalName: "Example Publisher LLC",
  copyrightOwner: "Example Publisher LLC",
  supportEmail: "support@example.com",
  privacyEmail: "privacy@example.com",
  takedownEmail: "legal@example.com",
  privacyPolicyUrl: "https://example.com/privacy",
  termsUrl: "https://example.com/terms",
  distributionLicense: "Proprietary EULA 1.0",
  projectLicenseFilesFinalized: true,
  contributionPolicyFinalized: true,
  androidApplicationId: "com.example.qcremote",
  windowsApplicationId: "com.example.qcremote",
  applicationIdentifiersFinalized: true,
  distributionChannels: ["Google Play", "Windows direct"],
  targetMarkets: ["US"],
  minimumUserAge: 18,
  publicRelayDeployment: "disabled",
  publicRelayOperator: "",
  publicRelayPrivacyReviewed: false,
  publisherAuthorityConfirmed: true,
  providerDataPracticesReviewed: true,
  firebaseProductionConfigurationReviewed: true,
  storeDataDisclosuresCompleted: true,
  securityReviewCompleted: true,
  thirdPartySdkTermsReviewed: true,
  nameClearanceCompleted: true,
  finalVisualRiskDecisionCompleted: true
};

test("public distribution stays blocked while owner, policy, or clearance data is missing", () => {
  const errors = publicReleaseLegalErrors({ productName: "QC Remote" });
  assert.ok(errors.some((error) => error.includes("publisherLegalName")));
  assert.ok(errors.some((error) => error.includes("name clearance")));
  assert.ok(errors.some((error) => error.includes("third-party SDK terms")));
  assert.ok(errors.some((error) => error.includes("UI/trade-dress")));
  assert.ok(errors.some((error) => error.includes("release channel")));
  assert.ok(errors.some((error) => error.includes("minimumUserAge")));
  assert.ok(errors.some((error) => error.includes("publicRelayDeployment")));
  assert.ok(errors.some((error) => error.includes("project license files")));
  assert.ok(errors.some((error) => error.includes("contribution")));
  assert.ok(errors.some((error) => error.includes("security review")));
});

test("public release metadata requires HTTPS policies and valid contact addresses", () => {
  assert.deepEqual(publicReleaseLegalErrors(complete), []);
  assert.ok(publicReleaseLegalErrors({ ...complete, privacyPolicyUrl: "http://example.com/privacy" }).some((error) => error.includes("HTTPS")));
  assert.ok(publicReleaseLegalErrors({ ...complete, supportEmail: "not-an-email" }).some((error) => error.includes("valid public email")));
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
  assert.match(androidBuild, /dependencyLocking\s*\{\s*lockAllConfigurations\(\)/);
  assert.match(androidLock, /releaseRuntimeClasspath/);
  for (const source of [windowsVite, androidVite, tauri]) {
    assert.match(source, /THIRD_PARTY-NOTICES\.md/);
    assert.match(source, /THIRD_PARTY-LICENSE-INVENTORY\.json/);
    assert.match(source, /THIRD_PARTY-LICENSE-TEXTS\.txt/);
    assert.match(source, /THIRD_PARTY-SOURCE-OFFER\.md/);
  }
});

test("Android release defaults do not back up private app data or expose shared storage", () => {
  const manifest = readFileSync(new URL("../apps/android/android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  const filePaths = readFileSync(new URL("../apps/android/android/app/src/main/res/xml/file_paths.xml", import.meta.url), "utf8");
  const relay = readFileSync(new URL("../apps/android/android/app/src/main/java/com/qccontrol/mobile/QcRelayPlugin.java", import.meta.url), "utf8");
  assert.match(manifest, /android:allowBackup="false"/);
  assert.doesNotMatch(manifest, /CHANGE_NETWORK_STATE/);
  assert.doesNotMatch(filePaths, /<external-path\b/);
  assert.match(filePaths, /<external-files-path\b/);
  assert.match(relay, /Manifest\.permission\.POST_NOTIFICATIONS/);
  assert.match(relay, /explainNotificationPermission\(call, "pairNotificationPermission"\)/);
  assert.match(relay, /explainNotificationPermission\(call, "startNotificationPermission"\)/);
  assert.match(relay, /requestPermissionForAlias\("notifications", call, callback\)/);
  assert.match(relay, /NOTIFICATION_PERMISSION_DENIED/);
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
  assert.deepEqual(trackedSecretErrors([{ path: "apps/android/google-services.json", content: '{"api_key":[{"current_key":"public-client-config"}]}' }], ignore), []);
  assert.ok(trackedSecretErrors([{ path: "release.jks", content: "binary" }], ignore).some((error) => error.includes("credential-bearing filename")));
  assert.ok(trackedSecretErrors([{ path: "config.json", content: '{"type":"service_account"}' }], ignore).some((error) => error.includes("service credential")));
  assert.ok(trackedSecretErrors([{ path: "notes.txt", content: "-----BEGIN PRIVATE KEY-----" }], ignore).some((error) => error.includes("private-key block")));
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

test("the proposed public name has a dated, non-clearance registry screen", () => {
  const screen = readFileSync(new URL("../docs/NAME_CLEARANCE_SCREEN.md", import.meta.url), "utf8");
  assert.match(screen, /Screened 2026-09-13/);
  assert.match(screen, /Do not treat `QC Remote` as cleared/i);
  assert.match(screen, /CM:"QC REMOTE"/);
  assert.match(screen, /018255049/);
  assert.match(screen, /KLIPPEL/);
});

test("first-party registries fail closed against accidental publication", () => {
  assert.deepEqual(currentPublicationBoundaryErrors(), []);
  assert.ok(publicationBoundaryErrors([{ path: "package.json", content: '{"name":"example"}' }]).some((error) => error.includes('"private": true')));
  assert.ok(publicationBoundaryErrors([{ path: "Cargo.toml", content: '[package]\nname = "example"\nversion = "1.0.0"\n' }]).some((error) => error.includes("publish = false")));
  assert.ok(publicationBoundaryErrors([{ path: "pyproject.toml", content: '[project]\nname = "example"\n' }]).some((error) => error.includes("Private :: Do Not Upload")));
});

test("private builds do not assert an unresolved first-party copyright owner", () => {
  const brand = JSON.parse(readFileSync(new URL("../packages/typescript/qc-theme/src/brand.json", import.meta.url), "utf8"));
  const legal = readFileSync(new URL("../packages/typescript/qc-theme/src/legal.ts", import.meta.url), "utf8");
  assert.doesNotMatch(brand.copyrightNotice, /contributors|all rights reserved/i);
  assert.match(brand.copyrightNotice, /before public release/i);
  assert.match(legal, /copyright: brand\.copyrightNotice/);
});

test("CI cannot create public distributables without the legal gate", () => {
  const workflow = readFileSync(new URL("../.github/workflows/software-parity.yml", import.meta.url), "utf8");
  assert.match(workflow, /build_distributables:[\s\S]*?default: false[\s\S]*?type: boolean/);
  assert.match(workflow, /distribution_scope:[\s\S]*?private-test[\s\S]*?public-release/);
  assert.equal((workflow.match(/github\.event_name == 'workflow_dispatch' && inputs\.build_distributables/g) ?? []).length, 3);
  assert.equal((workflow.match(/inputs\.distribution_scope == 'public-release'/g) ?? []).length, 2);
  assert.equal((workflow.match(/run: npm run legal:check/g) ?? []).length, 2);
});

test("visual-reference query fixtures are disabled in production hosts", () => {
  const windows = readFileSync(new URL("../apps/windows/src/App.tsx", import.meta.url), "utf8");
  const android = readFileSync(new URL("../apps/android/src/App.tsx", import.meta.url), "utf8");
  for (const host of [windows, android]) {
    assert.match(host, /corosFixtureConfiguration\(import\.meta\.env\.DEV \? window\.location\.search : "", demoSnapshot\)/);
  }
});
