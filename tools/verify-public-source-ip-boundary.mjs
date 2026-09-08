import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Neutral project-owned vectors and evidence ledgers are publishable. Original
// reference SVGs are private validation inputs and must remain outside Git.
const sensitiveFamilies = [
  {
    label: "private visual-reference corpora",
    matches: (path) => /^references\/qc-ui-[^/]+\//i.test(path)
      || /^packages\/typescript\/qc-theme\/assets\/(?:qc-overview-001|qc-block-samples)\.svg$/i.test(path),
  },
];
const protectedSvgPatterns = [
  { label: "vendor branding", pattern: /Neural\s*DSP|Quad\s*Cortex|CorOS/i },
  { label: "private reference host", pattern: /(?:images\.)?ctfassets\.net/i },
  { label: "document metadata", pattern: /<(?:metadata|rdf:RDF|dc:[a-z]+)\b/i },
  { label: "editor metadata", pattern: /(?:sodipodi|inkscape|Adobe\s+Illustrator|Generator:)/i },
  { label: "embedded raster image", pattern: /<image\b|data:image\//i },
  { label: "external resource link", pattern: /(?:href|xlink:href)\s*=\s*["'](?:https?:|\/\/)/i },
];

const markerDefinitionFiles = new Set([
  "docs/PUBLIC_SOURCE_IP_BOUNDARY.md",
  "tests/legal-release.test.ts",
  "tools/verify-public-source-ip-boundary.mjs",
  "tools/verify-release-visual-boundary.mjs",
]);

export function publicSourceIpBoundaryErrors(paths) {
  const normalized = paths.map((path) => path.replaceAll("\\", "/"));
  return sensitiveFamilies.flatMap(({ label, matches }) => {
    const found = normalized.filter(matches);
    return found.length
      ? [`${label} remains tracked (${found.length} file${found.length === 1 ? "" : "s"}): ${found.join(", ")}`]
      : [];
  });
}

export function publicSourceIpContentErrors(entries) {
  return entries.flatMap(({ path, content }) => {
    const normalized = path.replaceAll("\\", "/");
    if (markerDefinitionFiles.has(normalized)) return [];
    if (!normalized.toLowerCase().endsWith(".svg")) return [];
    return protectedSvgPatterns.flatMap(({ label, pattern }) => pattern.test(String(content))
      ? [`${label} remains in publishable SVG ${normalized}`]
      : []);
  });
}

function trackedSvgEntries(root, tracked) {
  return tracked.filter((path) => path.toLowerCase().endsWith(".svg")).map((path) => ({
    path,
    content: execFileSync("git", ["show", `:${path}`], {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    }).toString("utf8"),
  }));
}

export function currentPublicSourceIpBoundaryErrors(root = repositoryRoot) {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  return [
    ...publicSourceIpBoundaryErrors(tracked),
    ...publicSourceIpContentErrors(trackedSvgEntries(root, tracked)),
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentPublicSourceIpBoundaryErrors();
  if (errors.length) {
    console.error(`Public-source IP boundary is not clean:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Public-source IP boundary contains neutral product vectors and no tracked official reference SVGs.");
  }
}
