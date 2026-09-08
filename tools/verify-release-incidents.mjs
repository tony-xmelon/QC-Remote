import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function releaseIncidentErrors(records) {
  const errors = [];
  const allowedStatuses = new Set(["open-investigation", "mitigated-monitoring", "resolved", "closed"]);
  for (const record of records) {
    const label = String(record?.incidentId ?? "unnamed incident");
    if (!record || typeof record !== "object") {
      errors.push("incident evidence contains a malformed record");
      continue;
    }
    if (!label.trim() || label === "unnamed incident") errors.push("incident evidence is missing an incidentId");
    const status = String(record.status ?? "").trim();
    if (!status) errors.push(`${label} is missing a status`);
    else if (!allowedStatuses.has(status)) errors.push(`${label} has an unrecognized incident status`);
    if (record.releaseBlocking === true && !["resolved", "closed"].includes(record.status)) {
      errors.push(`${label} is an unresolved release-blocking safety incident`);
    }
    if (status === "open-investigation" && record.releaseBlocking !== true) {
      errors.push(`${label} is under investigation but is not explicitly release-blocking`);
    }
    if (status === "mitigated-monitoring") {
      if (record.releaseBlocking !== false) errors.push(`${label} is in mitigation monitoring but has no explicit releaseBlocking=false decision`);
      if (!Array.isArray(record?.mitigationUnderTest?.softwareValidation) || record.mitigationUnderTest.softwareValidation.length === 0
        || !String(record?.mitigationUnderTest?.physicalValidation ?? "").trim()) {
        errors.push(`${label} cannot enter mitigation monitoring without retained software and physical validation evidence`);
      }
    }
    if (["resolved", "closed"].includes(status) && record.releaseBlocking !== false) {
      errors.push(`${label} is closed but has no explicit releaseBlocking=false decision`);
    }
    if (["resolved", "closed"].includes(status)) {
      if (!/^\d{4}-\d{2}-\d{2}T/.test(String(record?.resolution?.closedAt ?? ""))
        || !String(record?.resolution?.rootCauseOrRiskDecision ?? "").trim()
        || !Array.isArray(record?.resolution?.verificationEvidence)
        || record.resolution.verificationEvidence.length === 0) {
        errors.push(`${label} cannot close without a dated root-cause or risk decision and retained verification evidence`);
      }
    }
  }
  return errors;
}

export function currentReleaseIncidentErrors(root = repositoryRoot) {
  const directory = resolve(root, "docs/incidents");
  if (!existsSync(directory)) return [];
  const records = [];
  const errors = [];
  for (const name of readdirSync(directory).filter((entry) => entry.endsWith(".json"))) {
    try {
      records.push(JSON.parse(readFileSync(resolve(directory, name), "utf8")));
    } catch {
      errors.push(`${name} is not valid JSON incident evidence`);
    }
  }
  return [...errors, ...releaseIncidentErrors(records)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentReleaseIncidentErrors();
  if (errors.length) {
    console.error(`Release incident gate failed:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else console.log("No unresolved release-blocking safety incident is recorded.");
}
