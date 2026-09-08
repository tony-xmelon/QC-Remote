import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifyPublicReleaseLegal } from "./verify-public-release-legal.mjs";
import { publicSourceIpBoundaryErrors, publicSourceIpContentErrors } from "./verify-public-source-ip-boundary.mjs";
import { trackedPrivateReferenceErrors } from "./verify-private-publication-boundaries.mjs";
import { trackedSecretErrors } from "./verify-no-tracked-secrets.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function git(args, root = repositoryRoot, encoding = "utf8") {
  return execFileSync("git", args, { cwd: root, encoding, stdio: ["ignore", "pipe", "pipe"] });
}

export function sourceArchiveInventoryErrors(paths) {
  const normalized = paths.map((path) => path.replaceAll("\\", "/")).filter(Boolean);
  const errors = [
    ...trackedPrivateReferenceErrors(normalized),
    ...publicSourceIpBoundaryErrors(normalized),
  ];
  // Evidence ledgers are permitted; private visual-reference files are rejected
  // by the publication and source-IP boundary checks above.
  const generated = normalized.filter((path) => /^(?:artifacts|dist|target|coverage|test-results)\//.test(path));
  if (generated.length) errors.push(`source archive contains generated output: ${generated.join(", ")}`);
  const incidentEvidence = normalized.filter((path) => path.startsWith("docs/incidents/"));
  if (incidentEvidence.length) errors.push(`source archive contains private safety-incident evidence: ${incidentEvidence.join(", ")}`);
  return [...new Set(errors)];
}

export function sourceArchiveContentErrors(entries, rootIgnore = "") {
  return [
    ...trackedSecretErrors(entries, rootIgnore)
      .map((error) => `source archive secret boundary: ${error}`),
    ...publicSourceIpContentErrors(entries)
      .map((error) => `source archive IP boundary: ${error}`),
  ];
}

export function sourceArchiveAttributeErrors(attributes = "", path = ".gitattributes") {
  const active = attributes
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, "").trim())
    .filter((line) => line && !line.startsWith("#"));
  return active.flatMap((line) => {
    const tokens = line.split(/\s+/).slice(1);
    const archiveChanging = tokens.filter((token) => /^[!-]?(?:export-ignore|export-subst)(?:=|$)/.test(token));
    return archiveChanging.length
      ? [`source archive attributes must not alter the reviewed commit inventory (${path}): ${line}`]
      : [];
  });
}

export function zipCentralDirectoryPaths(archive) {
  const minimumEocdSize = 22;
  const lowerBound = Math.max(0, archive.length - 65_557);
  let eocd = -1;
  for (let offset = archive.length - minimumEocdSize; offset >= lowerBound; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("source archive has no ZIP end-of-central-directory record");
  const entryCount = archive.readUInt16LE(eocd + 10);
  const centralSize = archive.readUInt32LE(eocd + 12);
  const centralOffset = archive.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 source archives are not supported by the release verifier");
  }
  if (centralOffset + centralSize > eocd) throw new Error("source archive central directory is out of bounds");
  const paths = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > archive.length || archive.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`source archive central directory entry ${index + 1} is malformed`);
    }
    const flags = archive.readUInt16LE(offset + 8);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > archive.length) throw new Error(`source archive filename ${index + 1} is out of bounds`);
    if (!(flags & 0x800) && archive.subarray(nameStart, nameEnd).some((byte) => byte > 0x7f)) {
      throw new Error(`source archive filename ${index + 1} is not UTF-8 encoded`);
    }
    paths.push(archive.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + commentLength;
  }
  if (offset !== centralOffset + centralSize) throw new Error("source archive central-directory size does not match its entries");
  return paths;
}

export function sourceArchiveZipInventoryErrors(archive, expectedPaths) {
  let archived;
  try {
    archived = zipCentralDirectoryPaths(archive);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const unsafe = archived.filter((path) => path.startsWith("/") || path.includes("\\") || path.split("/").includes(".."));
  const files = archived.filter((path) => !path.endsWith("/")).sort();
  const expected = expectedPaths.map((path) => path.replaceAll("\\", "/")).sort();
  const missing = expected.filter((path) => !files.includes(path));
  const unexpected = files.filter((path) => !expected.includes(path));
  const duplicates = files.filter((path, index) => files.indexOf(path) !== index);
  return [
    ...(unsafe.length ? [`source archive contains unsafe paths: ${unsafe.join(", ")}`] : []),
    ...(missing.length ? [`source archive is missing reviewed files: ${missing.join(", ")}`] : []),
    ...(unexpected.length ? [`source archive contains unreviewed files: ${unexpected.join(", ")}`] : []),
    ...(duplicates.length ? [`source archive contains duplicate files: ${[...new Set(duplicates)].join(", ")}`] : []),
  ];
}

export function repositoryDirtyEntries(root = repositoryRoot) {
  return git(["status", "--porcelain=v1", "--untracked-files=all"], root).trim().split(/\r?\n/).filter(Boolean);
}

export function createPublicSourceRelease(outputDirectory = resolve(repositoryRoot, "artifacts/source"), root = repositoryRoot) {
  const dirty = repositoryDirtyEntries(root);
  if (dirty.length) throw new Error(`Refusing to create a public source release from a dirty repository (${dirty.length} entries). Commit and review the exact release revision first.`);

  const releaseRecordPath = resolve(root, "legal/public-release.json");
  verifyPublicReleaseLegal(releaseRecordPath);
  const releaseRecordContent = readFileSync(releaseRecordPath, "utf8");
  const releaseRecord = JSON.parse(releaseRecordContent);
  const commit = git(["rev-parse", "HEAD"], root).trim();
  const sourceTree = git(["rev-parse", `${commit}^{tree}`], root).trim();
  const paths = git(["ls-tree", "-r", "--name-only", commit], root).trim().split(/\r?\n/).filter(Boolean);
  const inventoryErrors = sourceArchiveInventoryErrors(paths);
  if (inventoryErrors.length) throw new Error(`Public source archive inventory is unsafe:\n- ${inventoryErrors.join("\n- ")}`);
  const entries = paths.map((path) => ({
    path,
    content: git(["show", `${commit}:${path}`], root, "buffer").toString("utf8"),
  }));
  const ignore = entries.find((entry) => entry.path === ".gitignore")?.content ?? "";
  const attributeErrors = entries
    .filter((entry) => entry.path === ".gitattributes" || entry.path.endsWith("/.gitattributes"))
    .flatMap((entry) => sourceArchiveAttributeErrors(entry.content, entry.path));
  if (attributeErrors.length) throw new Error(`Public source archive attributes are unsafe:\n- ${attributeErrors.join("\n- ")}`);
  const contentErrors = sourceArchiveContentErrors(entries, ignore);
  if (contentErrors.length) throw new Error(`Public source archive content is unsafe:\n- ${contentErrors.join("\n- ")}`);

  mkdirSync(outputDirectory, { recursive: true });
  const archivePath = resolve(outputDirectory, `qc-remote-source-${commit.slice(0, 12)}.zip`);
  const checksumPath = `${archivePath}.sha256`;
  const provenancePath = `${archivePath}.source.json`;
  for (const path of [archivePath, checksumPath, provenancePath]) {
    if (existsSync(path)) throw new Error(`Refusing to overwrite an existing source-release artifact: ${path}`);
  }
  const partialArchivePath = `${archivePath}.partial-${process.pid}-${Date.now()}`;
  let archive;
  try {
    git(["archive", "--format=zip", `--output=${partialArchivePath}`, commit], root, "buffer");
    archive = readFileSync(partialArchivePath);
    const zipInventoryErrors = sourceArchiveZipInventoryErrors(archive, paths);
    if (zipInventoryErrors.length) throw new Error(`Public source ZIP inventory is unsafe:\n- ${zipInventoryErrors.join("\n- ")}`);
    renameSync(partialArchivePath, archivePath);
  } catch (error) {
    if (existsSync(partialArchivePath)) unlinkSync(partialArchivePath);
    throw error;
  }
  const sha256 = createHash("sha256").update(archive).digest("hex");
  writeFileSync(checksumPath, `${sha256}  ${archivePath.split(/[\\/]/).at(-1)}\n`, "utf8");
  writeFileSync(provenancePath, `${JSON.stringify({
    schemaVersion: 2,
    productName: "QC Remote",
    publisherLegalName: releaseRecord.publisherLegalName,
    sourceCommit: commit,
    sourceTree,
    releaseRecordSha256: createHash("sha256").update(releaseRecordContent).digest("hex"),
    archiveSha256: sha256,
    trackedFileCount: paths.length,
    createdAt: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
  return { archivePath, checksumPath, provenancePath, commit, sha256, trackedFileCount: paths.length };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    const result = createPublicSourceRelease(process.argv[2] ? resolve(process.argv[2]) : undefined);
    console.log(`Created ${result.archivePath}\nSHA-256 ${result.sha256}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
