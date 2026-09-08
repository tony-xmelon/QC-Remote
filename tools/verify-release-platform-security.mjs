import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function platformSecurityErrors(readSource = (path) => readFileSync(resolve(repositoryRoot, path), "utf8")) {
  const errors = [];
  const manifest = readSource("apps/android/android/app/src/main/AndroidManifest.xml");
  const capacitor = JSON.parse(readSource("apps/android/capacitor.config.json"));
  const backup = readSource("apps/android/android/app/src/main/res/xml/backup_rules.xml");
  const extraction = readSource("apps/android/android/app/src/main/res/xml/data_extraction_rules.xml");
  const tauri = JSON.parse(readSource("apps/windows/src-tauri/tauri.conf.json"));
  const capability = JSON.parse(readSource("apps/windows/src-tauri/capabilities/default.json"));

  if (!/android:allowBackup="false"/.test(manifest)
    || !/android:usesCleartextTraffic="false"/.test(manifest)) {
    errors.push("Android must disable app-data backup and cleartext network traffic");
  }
  if (/FileProvider|fileprovider|FILE_PROVIDER_PATHS|<external-path\b/.test(manifest)) {
    errors.push("Android must not package an unused broad file-sharing provider");
  }
  const exported = [...manifest.matchAll(/<(activity|service|receiver|provider)\b[\s\S]*?android:exported="(true|false)"[\s\S]*?<\/\1>/g)];
  if (exported.some(([, kind, value], index) => value === "true" && !(kind === "activity" && index === 0))) {
    errors.push("Android exposes a component other than its launcher activity");
  }
  if (capacitor?.android?.allowMixedContent !== false || capacitor?.loggingBehavior !== "none") {
    errors.push("Android WebView must disable mixed content and release bridge logging");
  }
  for (const domain of ["root", "file", "database", "sharedpref", "external"]) {
    if (!new RegExp(`<exclude domain="${domain}" path="\\."`).test(backup)
      || (extraction.match(new RegExp(`<exclude domain="${domain}" path="\\."`, "g")) ?? []).length !== 2) {
      errors.push(`Android backup rules do not exclude the ${domain} domain everywhere`);
    }
  }

  const csp = String(tauri?.app?.security?.csp ?? "");
  if (!/default-src 'self'/.test(csp) || /script-src[^;]*'unsafe-(?:inline|eval)'/.test(csp)) {
    errors.push("Windows WebView CSP is missing a self-only default or permits unsafe scripts");
  }
  if (JSON.stringify(capability?.permissions) !== JSON.stringify(["core:default"])) {
    errors.push("Windows main-window capability exceeds Tauri core defaults");
  }
  return errors;
}

export function currentPlatformSecurityErrors() {
  return platformSecurityErrors();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentPlatformSecurityErrors();
  if (errors.length) {
    console.error(`Release platform-security check failed:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else console.log("Release platform manifests keep backup, network, component, WebView, and desktop capabilities minimized.");
}
