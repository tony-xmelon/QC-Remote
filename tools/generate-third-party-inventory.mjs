import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { androidGradleInventory } from "./release-provenance.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = resolve(repositoryRoot, "legal/THIRD_PARTY-LICENSE-INVENTORY.json");
const noticePath = resolve(repositoryRoot, "THIRD_PARTY-NOTICES.md");
const licenseTextsPath = resolve(repositoryRoot, "legal/THIRD_PARTY-LICENSE-TEXTS.txt");
const sourceOfferPath = resolve(repositoryRoot, "legal/THIRD_PARTY-SOURCE-OFFER.md");
const legalFileName = /(?:^|\/)(?:licen[cs]e|copying|notice|copyright|third[_-]party[_-]licen[cs]es?)(?:[._-]|$)/i;

const bundledAssetComponents = [{
  ecosystem: "bundled-asset",
  name: "IBM Plex Sans",
  version: "3.1",
  license: "OFL-1.1",
  author: "IBM Corp.; Bold Monday",
  sourceUrl: "https://github.com/IBM/plex",
  assets: [
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans.ttf",
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans-Medium.ttf",
    "packages/typescript/qc-theme/assets/fonts/IBMPlexSans-Bold.ttf"
  ],
  _packageDirectory: resolve(repositoryRoot, "packages/typescript/qc-theme/assets/fonts")
}];

const digest = (value) => createHash("sha256").update(value).digest("hex");
const supplementalLegalTexts = {
  "gradle:org.checkerframework:checker-compat-qual@2.5.5": [{
    name: "upstream-MIT-license.txt",
    text: `Checker Framework qualifiers
Copyright 2004-present by the Checker Framework developers

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
  }],
  "gradle:org.reactivestreams:reactive-streams@1.0.4": [{
    name: "upstream-MIT-0-license.txt",
    text: `MIT No Attribution

Copyright 2014 Reactive Streams

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
  }]
};

function normalizeAuthor(author) {
  if (typeof author === "string") return author;
  if (author && typeof author.name === "string") return author.name;
  return undefined;
}

function repositoryUrl(repository) {
  if (typeof repository === "string") return repository.replace(/^git\+/, "").replace(/\.git$/, "");
  if (repository && typeof repository.url === "string") return repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
  return undefined;
}

export function npmLicenseInventory(packageLock, root = repositoryRoot) {
  const rows = [];
  for (const [packagePath, lock] of Object.entries(packageLock.packages ?? {})) {
    if (!packagePath.includes("node_modules/") || !lock.version || lock.dev === true) continue;
    const diskPath = resolve(root, packagePath);
    let manifest = {};
    try { manifest = JSON.parse(readFileSync(resolve(diskPath, "package.json"), "utf8")); } catch {}
    rows.push({
      ecosystem: "npm",
      name: lock.name ?? manifest.name ?? packagePath.slice(packagePath.lastIndexOf("node_modules/") + 13),
      version: lock.version,
      license: lock.license ?? manifest.license ?? null,
      author: normalizeAuthor(manifest.author) ?? null,
      sourceUrl: repositoryUrl(manifest.repository) ?? manifest.homepage ?? lock.resolved ?? null,
      _packageDirectory: diskPath
    });
  }
  return rows.sort(compareRows);
}

function cargoMetadata(manifestPath, target) {
  const args = ["metadata", "--format-version", "1", "--locked", "--filter-platform", target, "--manifest-path", resolve(repositoryRoot, manifestPath)];
  return JSON.parse(execFileSync("cargo", args, { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
}

export function cargoLicenseInventory(metadataSets) {
  const rows = new Map();
  for (const metadata of metadataSets) {
    for (const item of metadata.packages ?? []) {
      if (!item.source) continue;
      const key = `${item.name}@${item.version}`;
      rows.set(key, {
        ecosystem: "cargo",
        name: item.name,
        version: item.version,
        license: item.license ?? (item.license_file ? `License file: ${item.license_file}` : null),
        author: Array.isArray(item.authors) && item.authors.length ? item.authors.join(", ") : null,
        sourceUrl: item.repository ?? item.homepage ?? `https://crates.io/crates/${encodeURIComponent(item.name)}/${encodeURIComponent(item.version)}`,
        _packageDirectory: dirname(item.manifest_path)
      });
    }
  }
  return [...rows.values()].sort(compareRows);
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function decodeXml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").trim();
}

function xmlTag(source, tag) {
  return source.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*</${tag}>`, "i"))?.[1];
}

function mavenPom(group, name, version) {
  const gradleRoot = process.env.GRADLE_USER_HOME || resolve(process.env.USERPROFILE ?? process.env.HOME ?? "", ".gradle");
  const moduleRoot = resolve(gradleRoot, "caches/modules-2/files-2.1", group, name, version);
  const pomPath = walk(moduleRoot).find((path) => path.toLowerCase().endsWith(".pom"));
  if (!pomPath) return {};
  const source = readFileSync(pomPath, "utf8");
  const licensesBlock = source.match(/<licenses>([\s\S]*?)<\/licenses>/i)?.[1] ?? "";
  const licenses = [...licensesBlock.matchAll(/<license>([\s\S]*?)<\/license>/gi)].map((match) => {
    const licenseName = xmlTag(match[1], "name");
    const url = xmlTag(match[1], "url");
    return { name: licenseName ? decodeXml(licenseName) : "Unspecified license", url: url ? decodeXml(url) : null };
  });
  const projectUrl = xmlTag(source.replace(licensesBlock, ""), "url");
  return { licenses, sourceUrl: projectUrl ? decodeXml(projectUrl) : null, moduleRoot };
}

const mavenLicenseRules = [
  { matches: (group) => group.startsWith("androidx."), license: "Apache-2.0", sourceUrl: "https://github.com/androidx/androidx" },
  { matches: (group) => group === "org.jetbrains.kotlinx", license: "Apache-2.0", sourceUrl: "https://github.com/Kotlin" },
  { matches: (group, name) => group === "org.jetbrains" && name === "annotations", license: "Apache-2.0", sourceUrl: "https://github.com/JetBrains/java-annotations" },
  { matches: (group) => group === "org.jspecify", license: "Apache-2.0", sourceUrl: "https://github.com/jspecify/jspecify" },
  { matches: (group) => group === "org.slf4j", license: "MIT", sourceUrl: "https://github.com/qos-ch/slf4j" },
  { matches: (group) => group === "com.google.guava", license: "Apache-2.0", sourceUrl: "https://github.com/google/guava" },
  { matches: (group, name) => group === "com.google.code.findbugs" && name === "jsr305", license: "Apache-2.0", sourceUrl: "https://central.sonatype.com/artifact/com.google.code.findbugs/jsr305/3.0.2" },
  { matches: (group) => group === "javax.inject", license: "Apache-2.0", sourceUrl: "https://github.com/javax-inject/javax-inject" }
];

export function upstreamMavenLicense(group, name) {
  return mavenLicenseRules.find((rule) => rule.matches(group, name));
}

export function gradleLicenseInventory(components) {
  return components.map((item) => {
    const pom = mavenPom(item.group, item.name, item.version ?? "");
    const upstream = pom.licenses?.length ? undefined : upstreamMavenLicense(item.group, item.name);
    return {
      ecosystem: "gradle",
      name: `${item.group}:${item.name}`,
      version: item.version ?? null,
      license: pom.licenses?.length ? pom.licenses.map((license) => license.name).join(" OR ") : upstream?.license ?? null,
      author: null,
      sourceUrl: pom.sourceUrl ?? pom.licenses?.find((license) => license.url)?.url ?? upstream?.sourceUrl ?? null,
      licenseSource: pom.licenses?.length ? "Maven POM" : upstream ? "verified upstream project rule" : null,
      _packageDirectory: pom.moduleRoot
    };
  }).sort(compareRows);
}

function compareRows(left, right) {
  return `${left.ecosystem}:${left.name}@${left.version ?? ""}`.localeCompare(`${right.ecosystem}:${right.name}@${right.version ?? ""}`);
}

function componentKey(item) {
  return `${item.ecosystem}:${item.name}@${item.version ?? "unknown"}`;
}

function readableLegalText(path) {
  try {
    const bytes = readFileSync(path);
    if (!bytes.length || bytes.length > 2 * 1024 * 1024 || bytes.includes(0)) return undefined;
    const text = bytes.toString("utf8").replace(/^\uFEFF/, "").trim();
    return text.length >= 20 ? text : undefined;
  } catch { return undefined; }
}

function localLegalFiles(directory) {
  if (!directory || !existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && legalFileName.test(entry.name))
    .map((entry) => ({ name: entry.name, text: readableLegalText(resolve(directory, entry.name)) }))
    .filter((entry) => entry.text);
}

function archiveLegalFiles(directory) {
  if (!directory || !existsSync(directory)) return [];
  const archives = walk(directory).filter((path) => /\.(?:aar|jar)$/i.test(path));
  const collected = [];
  for (const archive of archives) {
    let entries = [];
    try {
      entries = execFileSync("jar", ["tf", archive], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 8 * 1024 * 1024 })
        .split(/\r?\n/).map((entry) => entry.trim()).filter((entry) => legalFileName.test(entry) && !entry.includes("..") && !/^[/\\]/.test(entry));
    } catch { continue; }
    if (!entries.length) continue;
    const extractionRoot = mkdtempSync(resolve(tmpdir(), "qc-legal-"));
    try {
      execFileSync("jar", ["xf", archive, ...entries], { cwd: extractionRoot, stdio: "ignore" });
      for (const entry of entries) {
        const text = readableLegalText(resolve(extractionRoot, entry));
        if (text) collected.push({ name: `${archive.split(/[\\/]/).at(-1)}!/${entry}`, text });
      }
    } finally {
      rmSync(extractionRoot, { recursive: true, force: true });
    }
  }
  return collected;
}

export function collectLicenseTexts(components) {
  const texts = new Map();
  const componentHashes = new Map();
  for (const item of components) {
    const itemKey = componentKey(item);
    const files = [
      ...(item.ecosystem === "gradle" ? archiveLegalFiles(item._packageDirectory) : localLegalFiles(item._packageDirectory)),
      ...(supplementalLegalTexts[itemKey] ?? [])
    ];
    const hashes = new Set();
    for (const file of files) {
      const sha256 = digest(file.text);
      hashes.add(sha256);
      const record = texts.get(sha256) ?? { sha256, names: new Set(), components: new Set(), text: file.text };
      record.names.add(file.name);
      record.components.add(itemKey);
      texts.set(sha256, record);
    }
    componentHashes.set(itemKey, [...hashes].sort());
  }
  const hashesByLicense = new Map();
  for (const item of components) {
    const hashes = componentHashes.get(componentKey(item)) ?? [];
    if (!hashes.length || !item.license) continue;
    const key = item.license.toLowerCase()
      .replaceAll("the apache software license, version 2.0", "apache-2.0")
      .replaceAll("the apache license, version 2.0", "apache-2.0")
      .replaceAll("apache license, version 2.0", "apache-2.0")
      .replaceAll("apache 2.0", "apache-2.0")
      .replaceAll("the mit license", "mit")
      .replace(/\s+/g, " ").trim();
    const current = hashesByLicense.get(key) ?? new Set();
    for (const hash of hashes) current.add(hash);
    hashesByLicense.set(key, current);
  }
  for (const item of components) {
    const itemKey = componentKey(item);
    if ((componentHashes.get(itemKey) ?? []).length || !item.license || /Software Development Kit|Play Integrity API Terms/i.test(item.license)) continue;
    const licenseKey = item.license.toLowerCase()
      .replaceAll("the apache software license, version 2.0", "apache-2.0")
      .replaceAll("the apache license, version 2.0", "apache-2.0")
      .replaceAll("apache license, version 2.0", "apache-2.0")
      .replaceAll("apache 2.0", "apache-2.0")
      .replaceAll("the mit license", "mit")
      .replace(/\s+/g, " ").trim();
    const fallback = [...(hashesByLicense.get(licenseKey) ?? [])].sort();
    if (!fallback.length) continue;
    componentHashes.set(itemKey, fallback);
    for (const hash of fallback) texts.get(hash)?.components.add(itemKey);
  }
  return {
    texts: [...texts.values()].map((item) => ({ sha256: item.sha256, names: [...item.names].sort(), components: [...item.components].sort(), text: item.text })).sort((left, right) => left.sha256.localeCompare(right.sha256)),
    componentHashes
  };
}

export function buildThirdPartyInventory({ npm = [], cargo = [], gradle = [], bundled = [] }, collected = { texts: [], componentHashes: new Map() }) {
  const sourceComponents = [...npm, ...cargo, ...gradle, ...bundled].sort(compareRows);
  const components = sourceComponents.map(({ _packageDirectory, ...item }) => {
    const key = componentKey(item);
    const selectedLicense = key === "gradle:org.checkerframework:checker-compat-qual@2.5.5" ? "MIT" : undefined;
    const effectiveLicense = selectedLicense ?? item.license ?? "";
    const sourceArchiveUrl = item.ecosystem === "cargo" && /MPL-2\.0|GPL|LGPL|AGPL/i.test(effectiveLicense)
      ? `https://crates.io/api/v1/crates/${encodeURIComponent(item.name)}/${encodeURIComponent(item.version)}/download`
      : undefined;
    return { ...item, ...(selectedLicense ? { selectedLicense } : {}), ...(sourceArchiveUrl ? { sourceArchiveUrl } : {}), licenseTextHashes: collected.componentHashes.get(key) ?? [] };
  });
  return {
    schemaVersion: 1,
    product: "QC Remote",
    generatedFrom: ["package-lock.json", "Cargo.lock files and target-filtered Cargo metadata", "Android releaseRuntimeClasspath and cached Maven POMs", "bundled asset manifest and adjacent license files"],
    components,
    licenseTexts: collected.texts.map(({ text, ...item }) => item),
    missingLocalLicenseText: components.filter((item) => item.licenseTextHashes.length === 0).map(componentKey),
    unresolved: components.filter((item) => !item.license || !item.version).map((item) => `${item.ecosystem}:${item.name}@${item.version ?? "unknown"}`),
    restrictedTermsReview: components.filter((item) => /Android Software Development Kit License|Play Core Software Development Kit Terms|Play Integrity API Terms/i.test(item.license ?? "")).map((item) => `${item.ecosystem}:${item.name}@${item.version}`),
    sourceAvailabilityNotice: components.filter((item) => /MPL-2\.0|GPL|LGPL|AGPL/i.test(item.selectedLicense ?? item.license ?? "")).map((item) => ({ component: `${item.ecosystem}:${item.name}@${item.version}`, sourceUrl: item.sourceUrl, sourceArchiveUrl: item.sourceArchiveUrl }))
  };
}

function sourceOfferMarkdown(inventory) {
  const lines = [
    "# QC Remote third-party source availability",
    "",
    "QC Remote distributes unmodified executable forms of the components below under the indicated copyleft license. The exact corresponding source version can be downloaded from the versioned archive link shown. The complete applicable license text is included in `THIRD_PARTY-LICENSE-TEXTS.txt`.",
    "",
    "If an archive link becomes unavailable, contact the public support address published with the release to request the exact corresponding source for that distributed version.",
    "",
    "| Component | Exact source archive | Upstream project |",
    "| --- | --- | --- |"
  ];
  for (const item of inventory.sourceAvailabilityNotice) {
    lines.push(`| ${markdownCell(item.component)} | ${markdownCell(item.sourceArchiveUrl)} | ${markdownCell(item.sourceUrl)} |`);
  }
  lines.push("", "QC Remote does not modify these third-party components.", "");
  return lines.join("\n");
}

function licenseTextBundle(collected) {
  const lines = ["QC Remote bundled third-party license and notice texts", "", "Generated from the exact installed npm packages, Cargo crate sources, legal files embedded in resolved Android JAR/AAR archives, and declared bundled assets.", ""];
  for (const item of collected.texts) {
    lines.push("================================================================================", `SHA-256: ${item.sha256}`, `Source file names: ${item.names.join(", ")}`, `Applies to: ${item.components.join(", ")}`, "--------------------------------------------------------------------------------", item.text, "");
  }
  return lines.join("\n");
}

function markdownCell(value) {
  return String(value ?? "UNRESOLVED").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function noticeMarkdown(inventory) {
  const lines = [
    "# QC Remote third-party notices",
    "",
    "QC Remote contains or is distributed with third-party software and assets. Copyright remains with the respective authors. The license expression below is derived mechanically from the locked runtime dependency graph and declared bundled-asset inventory; the corresponding license terms continue to apply.",
    "",
    "The native protocol schema incorporates interoperability information derived from the MIT-licensed `pyquadcortex` community project. Its complete retained notice is distributed as `legal/COMMUNITY-PROTOCOL-LICENSE.txt`.",
    "",
    "Neural DSP and Quad Cortex are trademarks of Neural DSP Technologies Oy. Their use identifies compatibility only and does not indicate affiliation, authorization, sponsorship, endorsement, or support.",
    "",
    `Inventory: ${inventory.components.length} locked runtime components; ${inventory.unresolved.length} unresolved license/version records.`,
    "",
    `Restricted SDK terms requiring publisher review: ${inventory.restrictedTermsReview.length}. These are listed in the machine-readable inventory and are not characterized as open-source licenses.`,
    "",
    "For copyleft components, exact-version source archive locations are provided in `legal/THIRD_PARTY-SOURCE-OFFER.md`. Where a dependency offers multiple licenses, the machine-readable inventory records QC Remote's selected license.",
    "",
    `Bundled component-specific license/NOTICE texts: ${inventory.licenseTexts.length}; components without a locally discoverable text: ${inventory.missingLocalLicenseText.length}. License labels and upstream locations remain recorded for every component.`,
    "",
    "| Ecosystem | Component | Version | License | Author / source |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const item of inventory.components) {
    const attribution = item.author || item.sourceUrl || "See upstream package metadata";
    lines.push(`| ${markdownCell(item.ecosystem)} | ${markdownCell(item.name)} | ${markdownCell(item.version)} | ${markdownCell(item.license)} | ${markdownCell(attribution)} |`);
  }
  lines.push("", "This inventory supplements, and does not replace, complete license and NOTICE texts required by individual components.", "");
  return lines.join("\n");
}

export function generateThirdPartyInventory() {
  const packageLock = JSON.parse(readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"));
  const npm = npmLicenseInventory(packageLock);
  const cargo = cargoLicenseInventory([
    cargoMetadata("apps/windows/src-tauri/Cargo.toml", "x86_64-pc-windows-msvc"),
    cargoMetadata("services/device-broker/Cargo.toml", "x86_64-pc-windows-msvc"),
    cargoMetadata("packages/rust/qc-android/Cargo.toml", "aarch64-linux-android")
  ]);
  const gradleResult = androidGradleInventory();
  if (!gradleResult.resolved) throw new Error("Android releaseRuntimeClasspath did not resolve; refusing to generate an incomplete legal inventory.");
  const gradle = gradleLicenseInventory(gradleResult.components);
  const collected = collectLicenseTexts([...npm, ...cargo, ...gradle, ...bundledAssetComponents]);
  const inventory = buildThirdPartyInventory({ npm, cargo, gradle, bundled: bundledAssetComponents }, collected);
  mkdirSync(dirname(inventoryPath), { recursive: true });
  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + "\n");
  writeFileSync(noticePath, noticeMarkdown(inventory));
  writeFileSync(licenseTextsPath, licenseTextBundle(collected));
  writeFileSync(sourceOfferPath, sourceOfferMarkdown(inventory));
  if (inventory.unresolved.length) throw new Error(`Third-party license inventory has ${inventory.unresolved.length} unresolved record(s):\n${inventory.unresolved.join("\n")}`);
  return inventory;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const inventory = generateThirdPartyInventory();
    console.log(`Wrote ${inventory.components.length} locked third-party components with no unresolved license records.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
