import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixedRuntimeSources = ["apps/windows/src/model-chat.ts", "apps/windows/src-tauri/src/chat.rs"];

function fixedRuntimeHosts(path, source) {
  if (path.endsWith("model-chat.ts")) {
    return [...source.matchAll(/baseUrl:\s*"https:\/\/([A-Za-z0-9.-]+)/g)]
      .map((match) => match[1].toLowerCase())
      .filter((host) => host !== "antigravity.google");
  }
  const production = source.split("#[cfg(test)]")[0];
  return [...production.matchAll(/https:\/\/([A-Za-z0-9.-]+)([^"\s]*)/g)]
    .filter((match) => !(match[1].toLowerCase() === "www.googleapis.com" && match[2].startsWith("/auth/")))
    .map((match) => match[1].toLowerCase());
}

export function dataFlowInventoryErrors(inventory, readSource = (path) => readFileSync(resolve(repositoryRoot, path), "utf8")) {
  const errors = [];
  if (inventory?.schemaVersion !== 1) errors.push("data-flow inventory schemaVersion must be 1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inventory?.reviewedAt ?? "")) errors.push("data-flow inventory reviewedAt is missing or invalid");
  if (inventory?.publisher !== "Freevia") errors.push("data-flow inventory publisher must be Freevia");
  const hosts = new Set(Array.isArray(inventory?.runtimeRemoteHosts) ? inventory.runtimeRemoteHosts : []);
  if (!Array.isArray(inventory?.flows) || inventory.flows.length === 0) errors.push("data-flow inventory contains no flows");
  const ids = new Set();
  const releaseStatuses = new Set(["planned-public", "pending-release-decision", "development-only"]);
  for (const flow of inventory?.flows ?? []) {
    if (!flow?.id || ids.has(flow.id)) errors.push(`data-flow id is missing or duplicated: ${flow?.id ?? "<missing>"}`);
    ids.add(flow?.id);
    if (!releaseStatuses.has(flow?.releaseStatus)) errors.push(`${flow?.id ?? "data-flow"}.releaseStatus is missing or invalid`);
    for (const field of ["platforms", "recipients", "data", "evidence"]) {
      if (!Array.isArray(flow?.[field]) || flow[field].length === 0) errors.push(`${flow?.id ?? "data-flow"}.${field} is empty`);
    }
    for (const field of ["trigger", "purpose", "transport", "retention", "userControl"]) {
      if (!String(flow?.[field] ?? "").trim()) errors.push(`${flow?.id ?? "data-flow"}.${field} is empty`);
    }
    for (const evidence of flow?.evidence ?? []) {
      if (!evidence?.path || !existsSync(resolve(repositoryRoot, evidence.path))) {
        errors.push(`${flow?.id ?? "data-flow"} evidence path is missing: ${evidence?.path ?? "<missing>"}`);
        continue;
      }
      if (!evidence?.contains || !readSource(evidence.path).includes(evidence.contains)) errors.push(`${flow.id} evidence marker is missing from ${evidence.path}`);
    }
  }
  for (const path of fixedRuntimeSources) {
    const source = readSource(path);
    for (const host of fixedRuntimeHosts(path, source)) {
      if (!hosts.has(host)) errors.push(`runtime remote host is not declared: ${host} (${path})`);
    }
  }
  return [...new Set(errors)];
}

export function currentDataFlowInventoryErrors(path = resolve(repositoryRoot, "legal/DATA-FLOW-INVENTORY.json")) {
  if (!existsSync(path)) return ["legal/DATA-FLOW-INVENTORY.json is missing"];
  try { return dataFlowInventoryErrors(JSON.parse(readFileSync(path, "utf8"))); }
  catch { return ["legal/DATA-FLOW-INVENTORY.json is not valid JSON"]; }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentDataFlowInventoryErrors();
  if (errors.length) {
    console.error(`Data-flow inventory check failed:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else console.log("Data-flow inventory is internally consistent and covers fixed runtime hosts.");
}
