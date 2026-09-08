import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hosts = ["apps/windows", "apps/android"];

/**
 * Functional device UI may retain neutral vectors and device geometry. This guard only
 * prevents the development fixture selector from being exposed in production;
 * branding and legal checks remain independent.
 */
export function releaseVisualBoundaryErrors(root = repositoryRoot) {
  const errors = [];
  for (const host of hosts) {
    const appPath = resolve(root, host, "src/App.tsx");
    if (!existsSync(appPath)) {
      errors.push(`${host} is missing src/App.tsx`);
      continue;
    }
    const app = readFileSync(appPath, "utf8");
    if (!/import\.meta\.env\.DEV\s*\?\s*window\.location\.search\s*:\s*["']{2}/.test(app)) {
      errors.push(`${host} does not gate the visual-conformance fixture selector behind import.meta.env.DEV`);
    }
  }

  const assets = JSON.parse(readFileSync(resolve(root, "packages/typescript/qc-theme/src/assets.json"), "utf8"));
  for (const key of ["chassisVector"]) {
    const asset = assets[key];
    if (!asset?.sourcePath || !existsSync(resolve(root, asset.sourcePath))) {
      errors.push(`required fidelity asset ${key} is missing`);
    }
  }
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = releaseVisualBoundaryErrors();
  if (errors.length) {
    console.error(`Release visual-boundary check failed:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Production fixture selection is gated; neutral functional vectors and geometry are present.");
  }
}
