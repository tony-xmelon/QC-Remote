import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publicSourceIpContentErrors, publicSourceIpBoundaryErrors } from "./verify-public-source-ip-boundary.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const posix = (value) => value.replaceAll("\\", "/");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const splitZ = (value) => value.split("\0").filter(Boolean).map(posix);

const visualExtensions = new Set([
  ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".otf", ".png", ".svg",
  ".ttf", ".webp", ".woff", ".woff2", ".mp3", ".ogg", ".wav", ".flac",
  ".mp4", ".webm"
]);
const rasterExtensions = new Set([".avif", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".webp"]);
const sourceExtensions = new Set([".css", ".html", ".java", ".js", ".json", ".mjs", ".nsh", ".ps1", ".py", ".rs", ".ts", ".tsx", ".xml"]);
const productionRoots = /^(?:apps|packages|services)\//;
const visualAndroidXml = /^apps\/android\/android\/app\/src\/main\/res\/(?:drawable|mipmap|font)[^/]*\/.*\.xml$/i;
const vectorNode = /<(?:svg|path|circle|ellipse|line|polygon|polyline|rect)\b/i;
const mediaUrl = /https?:\/\/[^\s"')>]+\.(?:avif|gif|ico|jpe?g|otf|png|svg|ttf|webp|woff2?)(?:[?#][^\s"')>]*)?/gi;
const staticDataMedia = /data:(?:image|audio|video)\/[a-z0-9.+-]+(?:;[^,]*)?,/gi;

function gitFiles(...arguments_) {
  return splitZ(execFileSync("git", ["ls-files", "-z", ...arguments_], { cwd: root, encoding: "utf8" }));
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function owns(path, exact, prefixes) {
  return exact.has(path) || prefixes.some((prefix) => path.startsWith(prefix));
}

export function auditRepositoryAssets() {
  const tracked = gitFiles("--cached");
  const untracked = gitFiles("--others", "--exclude-standard");
  const all = [...new Set([...tracked, ...untracked])].filter((path) => existsSync(resolve(root, path)));
  const ledger = readJson("contracts/repository-assets.v1.json");
  const visualManifest = readJson(ledger.visualManifest);
  const errors = [];
  const exact = new Set();
  const prefixes = [];
  for (const [name, asset] of Object.entries(visualManifest)) {
    const sourcePath = posix(asset.sourcePath);
    exact.add(sourcePath);
    if (!sourcePath.startsWith(ledger.canonicalVisualRoot)) errors.push(`${name}: canonical source is outside ${ledger.canonicalVisualRoot}: ${sourcePath}`);
    if (!existsSync(resolve(root, sourcePath))) errors.push(`${name}: canonical source is missing: ${sourcePath}`);
    else {
      const bytes = readFileSync(resolve(root, sourcePath));
      const digest = sha256(sourcePath.endsWith(".svg") ? Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n")) : bytes);
      if (digest !== asset.sha256) errors.push(`${name}: canonical fingerprint differs for ${sourcePath}`);
    }
    for (const prefix of asset.derivedPathPrefixes ?? []) prefixes.push(posix(prefix));
  }

  const visualFiles = all.filter((path) => visualExtensions.has(extname(path).toLowerCase()) || visualAndroidXml.test(path));
  for (const path of visualFiles) {
    if (!owns(path, exact, prefixes)) errors.push(`unowned visual/media asset: ${path}`);
    if (rasterExtensions.has(extname(path).toLowerCase()) && !prefixes.some((prefix) => path.startsWith(prefix))) {
      errors.push(`raster is not a declared generated platform output: ${path}`);
    }
  }

  const nonVisual = new Map(ledger.nonVisualBinaryArtifacts.map((entry) => [posix(entry.path), entry]));
  for (const [path, entry] of nonVisual) {
    if (!tracked.includes(path)) errors.push(`declared non-visual binary is not tracked: ${path}`);
    else if (sha256(readFileSync(resolve(root, path))) !== entry.sha256) errors.push(`non-visual binary fingerprint differs: ${path}`);
  }
  const binaryFiles = tracked.filter((path) => readFileSync(resolve(root, path)).subarray(0, 8192).includes(0));
  for (const path of binaryFiles) {
    if (!visualExtensions.has(extname(path).toLowerCase()) && !nonVisual.has(path)) errors.push(`unclassified tracked binary: ${path}`);
  }

  const duplicateOwners = new Map();
  for (const path of visualFiles.filter((entry) => tracked.includes(entry) && !entry.startsWith("references/"))) {
    const digest = sha256(readFileSync(resolve(root, path)));
    const earlier = duplicateOwners.get(digest);
    if (earlier) errors.push(`byte-identical visual assets: ${earlier} and ${path}`);
    else duplicateOwners.set(digest, path);
  }

  const trackedSvgEntries = tracked.filter((path) => path.endsWith(".svg")).map((path) => ({ path, content: readFileSync(resolve(root, path), "utf8") }));
  errors.push(...publicSourceIpBoundaryErrors(tracked), ...publicSourceIpContentErrors(trackedSvgEntries));

  const vectorOwners = tracked.filter((path) => /\.(?:ts|tsx)$/.test(path) && productionRoots.test(path))
    .filter((path) => vectorNode.test(readFileSync(resolve(root, path), "utf8")));
  const declaredVectorOwners = [...ledger.embeddedVectorOwners].map(posix).sort();
  for (const path of vectorOwners) if (!declaredVectorOwners.includes(path)) errors.push(`embedded vector owner is not declared: ${path}`);
  for (const path of declaredVectorOwners) if (!vectorOwners.includes(path)) errors.push(`declared embedded vector owner no longer contains vector markup: ${path}`);

  const dynamicMediaOwners = new Set(ledger.dynamicMediaOwners.map(posix));
  const sourceFindings = { externalProductionMedia: [], staticEmbeddedMedia: [], developmentEmbeddedMedia: [], dynamicMediaOwners: [], developmentReferenceUrls: [] };
  for (const path of tracked.filter((entry) => sourceExtensions.has(extname(entry).toLowerCase()))) {
    const source = readFileSync(resolve(root, path), "utf8");
    const external = [...source.matchAll(mediaUrl)].map((match) => match[0]);
    if (external.length) {
      if (productionRoots.test(path)) sourceFindings.externalProductionMedia.push({ path, urls: [...new Set(external)] });
      else sourceFindings.developmentReferenceUrls.push({ path, urls: [...new Set(external)] });
    }
    const embedded = [...source.matchAll(staticDataMedia)].map((match) => match[0]);
    if (embedded.length) {
      const target = productionRoots.test(path) ? sourceFindings.staticEmbeddedMedia : sourceFindings.developmentEmbeddedMedia;
      target.push({ path, values: [...new Set(embedded)] });
    }
    if (/data:\$\{[^}]+\};base64,|format!\(\s*"data:\{\};base64,/.test(source)) sourceFindings.dynamicMediaOwners.push(path);
  }
  for (const finding of sourceFindings.externalProductionMedia) errors.push(`production source loads external media: ${finding.path}: ${finding.urls.join(", ")}`);
  for (const finding of sourceFindings.staticEmbeddedMedia) errors.push(`static embedded media bypasses the asset registry: ${finding.path}`);
  for (const path of sourceFindings.dynamicMediaOwners) if (!dynamicMediaOwners.has(path)) errors.push(`dynamic media owner is not declared: ${path}`);
  for (const path of dynamicMediaOwners) if (!sourceFindings.dynamicMediaOwners.includes(path)) errors.push(`declared dynamic media owner no longer emits attachment data: ${path}`);

  return {
    errors,
    summary: {
      trackedFiles: tracked.length,
      untrackedNonIgnoredFiles: untracked.length,
      visualAndMediaFiles: visualFiles.length,
      canonicalVisualAssets: exact.size,
      derivedVisualOutputs: visualFiles.filter((path) => !exact.has(path)).length,
      embeddedVectorOwners: vectorOwners.length,
      classifiedNonVisualBinaries: nonVisual.size,
      developmentReferenceUrls: sourceFindings.developmentReferenceUrls.length,
      developmentEmbeddedMediaFixtures: sourceFindings.developmentEmbeddedMedia.length,
      dynamicMediaOwners: sourceFindings.dynamicMediaOwners.length
    },
    inventory: {
      canonical: [...exact].sort(),
      derived: visualFiles.filter((path) => !exact.has(path)).sort(),
      embeddedVectorOwners: vectorOwners.sort(),
      nonVisualBinaries: [...nonVisual.keys()].sort(),
      dynamicMediaOwners: sourceFindings.dynamicMediaOwners.sort()
    }
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const report = auditRepositoryAssets();
  if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(JSON.stringify(report.summary));
    for (const error of report.errors) console.error(`FAIL ${error}`);
  }
  if (report.errors.length) process.exitCode = 1;
}
