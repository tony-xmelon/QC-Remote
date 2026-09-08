import { readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".claude", ".git", ".venv", "artifacts", "node_modules", "references", "target", "tmp"]);
const privateReferencePatterns = [
  /^references\/qc-ui-[^/]+\//i,
  /^packages\/typescript\/qc-theme\/assets\/(?:qc-overview-001|qc-block-samples)\.svg$/i,
];

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (ignoredDirectories.has(entry)) return [];
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function packageSection(source, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const header = new RegExp(`^\\[${escapedHeading}\\]\\s*$`, "m");
  const match = header.exec(source);
  if (!match) return "";
  const remainder = source.slice(match.index + match[0].length);
  const nextHeader = /^\s*\[/m.exec(remainder);
  return nextHeader ? remainder.slice(0, nextHeader.index) : remainder;
}

export function publicationBoundaryErrors(files) {
  const errors = [];
  for (const { path, content } of files) {
    const name = basename(path).toLowerCase();
    if (name === "package.json") {
      try {
        const metadata = JSON.parse(content);
        if (metadata.private !== true) errors.push(`${path} must set \"private\": true while distribution rights are unresolved`);
      } catch {
        errors.push(`${path} is not valid JSON`);
      }
    } else if (name === "cargo.toml") {
      const packageMetadata = packageSection(content, "package");
      if (packageMetadata && !/^publish\s*=\s*false\s*$/m.test(packageMetadata)) {
        errors.push(`${path} must set publish = false while distribution rights are unresolved`);
      }
    } else if (name === "pyproject.toml") {
      const projectMetadata = packageSection(content, "project");
      if (projectMetadata && !/Private\s*::\s*Do Not Upload/.test(projectMetadata)) {
        errors.push(`${path} must include the Private :: Do Not Upload classifier while distribution rights are unresolved`);
      }
    }
  }
  return errors;
}

export function trackedPrivateReferenceErrors(paths) {
  return paths.map((path) => path.replaceAll("\\", "/")).flatMap((path) => {
    if (privateReferencePatterns.some((pattern) => pattern.test(path))) {
      return [`${path} is private reference evidence and must not be tracked or publicly distributed`];
    }
    if (path === "apps/android/android/app/google-services.json") {
      return [`${path} is environment-specific Firebase client configuration and must be injected at build time`];
    }
    return [];
  });
}

export function currentPublicationBoundaryErrors(root = repositoryRoot) {
  const files = walk(root)
    .filter((path) => ["package.json", "cargo.toml", "pyproject.toml"].includes(basename(path).toLowerCase()))
    .map((path) => ({ path: path.slice(root.length + 1).replaceAll("\\", "/"), content: readFileSync(path, "utf8") }));
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
  return [...publicationBoundaryErrors(files), ...trackedPrivateReferenceErrors(tracked)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentPublicationBoundaryErrors();
  if (errors.length) {
    console.error(`Private-package publication boundary failed:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("All first-party npm, Cargo, and Python packages are protected from accidental public registry publication.");
  }
}
