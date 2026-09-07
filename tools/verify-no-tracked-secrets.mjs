import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenName = /(?:^|\/)(?:\.env(?:\..+)?|[^/]+\.(?:jks|keystore|p12|pfx|pem|key)|[^/]*service[-_]account[^/]*\.json)$/i;
const allowedEnvironmentExample = /(?:^|\/)\.env\.example$/i;

export function trackedSecretErrors(entries, rootIgnore = "") {
  const errors = [];
  for (const entry of entries) {
    const path = entry.path.replaceAll("\\", "/");
    if (forbiddenName.test(path) && !allowedEnvironmentExample.test(path)) {
      errors.push(`${path} has a credential-bearing filename`);
    }
    const source = entry.content ?? "";
    const privateKeyMarker = "-----BEGIN " + "PRIVATE KEY-----";
    const rsaPrivateKeyMarker = "-----BEGIN RSA " + "PRIVATE KEY-----";
    const ecPrivateKeyMarker = "-----BEGIN EC " + "PRIVATE KEY-----";
    const openSshPrivateKeyMarker = "-----BEGIN OPENSSH " + "PRIVATE KEY-----";
    if ([privateKeyMarker, rsaPrivateKeyMarker, ecPrivateKeyMarker, openSshPrivateKeyMarker].some((marker) => source.includes(marker))) {
      errors.push(`${path} contains a private-key block`);
    }
    const serviceAccountType = new RegExp(`"type"\\s*:\\s*"${"service"}_${"account"}"`, "i");
    const privateKeyField = new RegExp(`"${"private"}_${"key"}"\\s*:`, "i");
    const clientSecretField = new RegExp(`"${"client"}_${"secret"}"\\s*:`, "i");
    if (serviceAccountType.test(source) || privateKeyField.test(source) || clientSecretField.test(source)) {
      errors.push(`${path} contains a service credential or client secret field`);
    }
  }
  for (const pattern of ["*.jks", "*.keystore", "*.p12", "*.pfx", "*.pem", "*.key", "*service-account*.json", "*service_account*.json"]) {
    if (!rootIgnore.split(/\r?\n/).some((line) => line.trim() === pattern)) errors.push(`.gitignore does not exclude ${pattern}`);
  }
  return [...new Set(errors)];
}

export function currentTrackedSecretErrors(root = repositoryRoot) {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: root });
  const paths = output.toString("utf8").split("\0").filter(Boolean);
  const entries = paths.map((path) => {
    try { return { path, content: readFileSync(resolve(root, path), "utf8") }; }
    catch { return { path, content: "" }; }
  });
  return trackedSecretErrors(entries, readFileSync(resolve(root, ".gitignore"), "utf8"));
}

export function verifyNoTrackedSecrets(root = repositoryRoot) {
  const errors = currentTrackedSecretErrors(root);
  if (errors.length) throw new Error(`Tracked-secret check failed:\n- ${errors.join("\n- ")}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    verifyNoTrackedSecrets();
    console.log("Tracked-secret check passed.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
