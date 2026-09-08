import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function section(source, heading) {
  const match = new RegExp(`^\\[${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\]\\s*$`, "m").exec(source);
  if (!match) return "";
  const remainder = source.slice(match.index + match[0].length);
  const next = /^\s*\[/m.exec(remainder);
  return next ? remainder.slice(0, next.index) : remainder;
}

function declaredLicense(path, source) {
  const name = basename(path).toLowerCase();
  if (name === "package.json") {
    try {
      const value = JSON.parse(source).license;
      return typeof value === "string" ? value.trim() : "";
    } catch {
      return "";
    }
  }
  const metadata = section(source, name === "cargo.toml" ? "package" : "project");
  const scalar = /^license\s*=\s*["']([^"']+)["']\s*$/m.exec(metadata)?.[1];
  if (scalar) return scalar.trim();
  const table = /^license\s*=\s*\{[^}]*text\s*=\s*["']([^"']+)["'][^}]*\}\s*$/m.exec(metadata)?.[1];
  return table?.trim() ?? "";
}

export function firstPartyLicensePolicyErrors(config, manifests, rootLicenseTexts = []) {
  const expected = typeof config?.distributionLicense === "string" ? config.distributionLicense.trim() : "";
  const errors = [];
  if (config?.distributionModel !== "open-source") return errors;
  if (!expected) {
    const declarations = manifests
      .map(({ path, source }) => ({ path, license: declaredLicense(path, source) }))
      .filter(({ license }) => Boolean(license));
    const declared = [...new Set(declarations.map(({ license }) => license))].sort();
    errors.push(`the exact open-source SPDX license is not selected; first-party manifests currently advertise ${declared.length ? declared.join(", ") : "no license"}`);
    for (const { path, license } of declarations) {
      errors.push(`${path} prematurely declares ${license} before the project-wide license and scope are finalized`);
    }
    return errors;
  }
  for (const manifest of manifests) {
    const actual = declaredLicense(manifest.path, manifest.source);
    if (!actual) errors.push(`${manifest.path} has no first-party license declaration (expected ${expected})`);
    else if (actual !== expected) errors.push(`${manifest.path} declares ${actual}, not the selected ${expected}`);
  }
  const combined = rootLicenseTexts.join("\n");
  if (/\bMIT\b/.test(expected) && !/Permission is hereby granted, free of charge/i.test(combined)) {
    errors.push("the tracked root license files do not contain the MIT license text required by the selected expression");
  }
  if (/Apache-2\.0/.test(expected) && !/Apache License[\s\S]{0,200}Version 2\.0/i.test(combined)) {
    errors.push("the tracked root license files do not contain the Apache License 2.0 text required by the selected expression");
  }
  return errors;
}

export function currentFirstPartyLicensePolicyErrors(root = repositoryRoot) {
  const config = JSON.parse(readFileSync(resolve(root, "legal/public-release.json"), "utf8"));
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  const manifestPaths = tracked.filter((path) => /(?:^|\/)(?:package\.json|Cargo\.toml|pyproject\.toml)$/.test(path));
  const manifests = manifestPaths.map((path) => ({ path, source: readFileSync(resolve(root, path), "utf8") }));
  const rootLicensePaths = tracked.filter((path) => !path.includes("/") && /^LICENSE(?:[-.].*)?$/i.test(path) && existsSync(resolve(root, path)));
  const rootLicenseTexts = rootLicensePaths.map((path) => readFileSync(resolve(root, path), "utf8"));
  return firstPartyLicensePolicyErrors(config, manifests, rootLicenseTexts);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentFirstPartyLicensePolicyErrors();
  if (errors.length) {
    console.error(`First-party open-source license policy is not coherent:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("First-party manifests and root license texts match the selected open-source policy.");
  }
}
