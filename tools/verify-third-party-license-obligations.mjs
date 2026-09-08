import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const restrictedPattern = /Android Software Development Kit License|Play Core Software Development Kit Terms|Play Integrity API Terms/i;
const copyleftPattern = /MPL-2\.0|GPL|LGPL|AGPL/i;

const componentKey = (item) => `${item.ecosystem}:${item.name}@${item.version}`;

export function thirdPartyObligationErrors(inventory, notices, sourceOffer, cargoManifests = []) {
  const errors = [];
  const components = Array.isArray(inventory?.components) ? inventory.components : [];
  const restrictedExpected = components.filter((item) => restrictedPattern.test(item.license ?? "")).map(componentKey).sort();
  const restrictedRecorded = [...(inventory?.restrictedTermsReview ?? [])].sort();
  if (JSON.stringify(restrictedExpected) !== JSON.stringify(restrictedRecorded)) {
    errors.push("restricted SDK/service terms classification does not match the locked components");
  }

  const copyleftExpected = components.filter((item) => copyleftPattern.test(item.selectedLicense ?? item.license ?? "")).map(componentKey).sort();
  const sourceEntries = Array.isArray(inventory?.sourceAvailabilityNotice) ? inventory.sourceAvailabilityNotice : [];
  const copyleftRecorded = sourceEntries.map((item) => item.component).sort();
  if (JSON.stringify(copyleftExpected) !== JSON.stringify(copyleftRecorded)) {
    errors.push("copyleft source-availability entries do not match the effective locked licenses");
  }
  for (const entry of sourceEntries) {
    if (!/^https:\/\//.test(entry.sourceUrl ?? "") || !/^https:\/\//.test(entry.sourceArchiveUrl ?? "")) {
      errors.push(`${entry.component} lacks HTTPS upstream and exact-source locations`);
    }
    if (!sourceOffer.includes(entry.component) || !sourceOffer.includes(entry.sourceArchiveUrl)) {
      errors.push(`${entry.component} is missing from the distributed source-availability notice`);
    }
  }

  for (const item of components) {
    const declared = item.license ?? "";
    const selected = item.selectedLicense ?? "";
    if (copyleftPattern.test(declared) && /\bOR\b/i.test(declared) && !selected) {
      errors.push(`${componentKey(item)} has a copyleft/permissive choice without an explicit selected license`);
    }
    if (selected && !declared.toLowerCase().includes(selected.toLowerCase())) {
      errors.push(`${componentKey(item)} selects ${selected}, which is not present in its declared license expression`);
    }
    const effective = selected || declared;
    if (/(?:^|\W)(?:AGPL|LGPL|GPL)(?:\W|$)/i.test(effective) && !/classpath exception/i.test(effective)) {
      errors.push(`${componentKey(item)} has an effective strong-copyleft license requiring an explicit distribution design review`);
    }
  }

  if (!notices.includes(`Restricted SDK terms requiring publisher review: ${restrictedExpected.length}.`)) {
    errors.push("distributed notices do not state the current restricted-terms count");
  }
  if (!notices.includes(`Inventory: ${components.length} locked runtime components;`)) {
    errors.push("distributed notices do not state the current locked component count");
  }
  if (cargoManifests.some(({ source }) => /^\s*\[(?:patch\.|replace\])/m.test(source)) && /does not modify these third-party components/i.test(sourceOffer)) {
    errors.push("source notice claims dependencies are unmodified while a Cargo patch/replace section exists");
  }
  return errors;
}

export function currentThirdPartyObligationErrors(root = repositoryRoot) {
  const inventory = JSON.parse(readFileSync(resolve(root, "legal/THIRD_PARTY-LICENSE-INVENTORY.json"), "utf8"));
  const notices = readFileSync(resolve(root, "THIRD_PARTY-NOTICES.md"), "utf8");
  const sourceOffer = readFileSync(resolve(root, "legal/THIRD_PARTY-SOURCE-OFFER.md"), "utf8");
  const manifestPaths = execFileSync("git", ["ls-files", "*Cargo.toml"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  const cargoManifests = manifestPaths.map((path) => ({ path, source: readFileSync(resolve(root, path), "utf8") }));
  return thirdPartyObligationErrors(inventory, notices, sourceOffer, cargoManifests);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentThirdPartyObligationErrors();
  if (errors.length) {
    console.error(`Third-party redistribution obligations are not clean:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Third-party restricted terms, license selections, notices, and source availability are internally consistent.");
  }
}
