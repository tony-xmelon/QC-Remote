import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const main = git("rev-parse", "main");
const current = git("rev-parse", "HEAD");
if (current !== main) throw new Error("The history consolidation audit must run from the current local main commit.");

const decisions = new Map([
  ["c6c20a7837c86bc7da99ceb6beb4fad9414ce4c4", { outcome: "ported-neutral", evidence: "b5ced78b" }],
  ["8993d4f12578b6ba67598eed3f73d4a7265e50f9", { outcome: "retained-research", evidence: "docs/GIT_HISTORY_CONSOLIDATION.md" }]
]);

const branches = git("for-each-ref", "--format=%(refname:short)", "refs/heads").split(/\r?\n/).filter(Boolean).filter((branch) => branch !== "main");
const unresolved = [];
const patchEquivalent = [];
const decided = [];
for (const branch of branches) {
  const entries = git("cherry", "main", branch).split(/\r?\n/).filter(Boolean);
  for (const entry of entries) {
    const [status, commit] = entry.split(/\s+/);
    if (status === "-") {
      patchEquivalent.push({ branch, commit });
      continue;
    }
    const decision = decisions.get(commit);
    if (!decision) unresolved.push({ branch, commit, subject: git("show", "-s", "--format=%s", commit) });
    else {
      if (decision.outcome === "ported-neutral") git("merge-base", "--is-ancestor", decision.evidence, "main");
      decided.push({ branch, commit, ...decision });
    }
  }
}

if (unresolved.length) {
  console.error(JSON.stringify({ verified: false, unresolved }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ verified: true, main: main.slice(0, 8), branches: branches.length, patchEquivalent, decided }));
