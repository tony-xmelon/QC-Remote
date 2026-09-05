import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("contracts/pyquadcortex-parity.v1.json", "utf8"));
const gateway = JSON.parse(await readFile("contracts/gateway-methods.v1.json", "utf8"));
const gatewayMethods = new Set(gateway.methods.map((entry) => entry.rpc));

const baselineExpected = new Set(manifest.upstreamMethods);
if (baselineExpected.size !== manifest.upstreamMethods.length) {
  throw new Error("The pyquadcortex baseline contains duplicate public method names.");
}
const pendingPullRequests = manifest.pendingPullRequests ?? [];
const pullRequestNumbers = new Set();
const pendingMethods = new Set();
for (const pullRequest of pendingPullRequests) {
  if (!Number.isInteger(pullRequest.number) || pullRequestNumbers.has(pullRequest.number)) {
    throw new Error(`Duplicate or invalid pending pyquadcortex pull request: ${pullRequest.number}`);
  }
  pullRequestNumbers.add(pullRequest.number);
  if (!/^[0-9a-f]{40}$/.test(pullRequest.head ?? "")) {
    throw new Error(`Pending pyquadcortex PR #${pullRequest.number} needs a full pinned head SHA.`);
  }
  if (!Array.isArray(pullRequest.methods)) {
    throw new Error(`Pending pyquadcortex PR #${pullRequest.number} needs a methods array.`);
  }
  for (const method of pullRequest.methods) {
    if (baselineExpected.has(method) || pendingMethods.has(method)) {
      throw new Error(`Duplicate pending pyquadcortex public method: ${method}`);
    }
    pendingMethods.add(method);
  }
}
const expected = new Set([...baselineExpected, ...pendingMethods]);

const covered = new Map();
for (const group of manifest.coverage) {
  if (!group.status || !Array.isArray(group.methods) || group.methods.length === 0) {
    throw new Error("Every parity group must have a status and at least one method.");
  }
  for (const method of group.methods) {
    if (covered.has(method)) throw new Error(`pyquadcortex method is covered twice: ${method}`);
    covered.set(method, group.status);
  }
  for (const rpc of group.rpcs ?? []) {
    if (!gatewayMethods.has(rpc)) throw new Error(`Parity evidence references an absent gateway RPC: ${rpc}`);
  }
  if (["expansion-backlog", "hazard-excluded", "upstream-incomplete", "upstream-no-op"].includes(group.status) && !group.reason) {
    throw new Error(`Non-native parity group requires an explicit reason: ${group.methods.join(", ")}`);
  }
}

if (manifest.requireNativeCoverage) {
  const nonNative = manifest.coverage.filter((group) => !group.status.startsWith("native"));
  if (nonNative.length) {
    throw new Error(
      `Native supersession is incomplete: ${nonNative
        .map((group) => `${group.methods.join(", ")} (${group.status})`)
        .join("; ")}`,
    );
  }
}

const missing = [...expected].filter((method) => !covered.has(method));
const unknown = [...covered.keys()].filter((method) => !expected.has(method));
if (missing.length || unknown.length) {
  throw new Error(`pyquadcortex parity drift; missing=[${missing}], unknown=[${unknown}]`);
}

const sourcePath = process.env.PYQUADCORTEX_CLIENT;
if (sourcePath) {
  const source = await readFile(sourcePath, "utf8");
  const canonicalSource = source.replace(/\r\n/g, "\n");
  const hash = createHash("sha256").update(canonicalSource).digest("hex");
  if (hash !== manifest.upstream.clientSha256) {
    throw new Error(`Pinned pyquadcortex client hash changed: ${hash}`);
  }
  const classStart = source.indexOf("class QuadCortex:");
  const nextClass = source.slice(classStart + 1).search(/^class /m);
  if (classStart < 0) throw new Error("Pinned source no longer defines QuadCortex.");
  const classSource = nextClass < 0
    ? source.slice(classStart)
    : source.slice(classStart, classStart + 1 + nextClass);
  const publicMethods = [...classSource.matchAll(/^    def ([a-zA-Z_][a-zA-Z0-9_]*)\(/gm)]
    .map((match) => match[1])
    .filter((name) => !name.startsWith("_"));
  const actual = [...new Set(publicMethods)];
  const sourceMissing = manifest.upstreamMethods.filter((method) => !actual.includes(method));
  const sourceAdded = actual.filter((method) => !baselineExpected.has(method));
  if (sourceMissing.length || sourceAdded.length) {
    throw new Error(`Pinned source/API mismatch; missing=[${sourceMissing}], added=[${sourceAdded}]`);
  }
}

const publicClientMethods = (source) => {
  const classStart = source.indexOf("class QuadCortex:");
  if (classStart < 0) throw new Error("pyquadcortex source no longer defines QuadCortex.");
  const tail = source.slice(classStart);
  const nextClass = tail.slice(1).search(/^class /m);
  const classSource = nextClass < 0 ? tail : tail.slice(0, nextClass + 1);
  return [...new Set(
    [...classSource.matchAll(/^    def ([a-zA-Z_][a-zA-Z0-9_]*)\(/gm)]
      .map((match) => match[1])
      .filter((name) => !name.startsWith("_")),
  )];
};

const fetchGitHub = async (url, raw = false) => {
  const headers = {
    Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
    "User-Agent": "ndsp-qc-mcp-parity-audit",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub parity request failed (${response.status}): ${url}`);
  return raw ? response.text() : response.json();
};

let githubVerified = false;
if (process.argv.includes("--github")) {
  const repository = new URL(manifest.upstream.repository).pathname.replace(/^\//, "");
  const upstream = await fetchGitHub(`https://api.github.com/repos/${repository}/commits/main`);
  if (upstream.sha !== manifest.upstream.commit) {
    throw new Error(`Pinned pyquadcortex main changed: expected ${manifest.upstream.commit}, got ${upstream.sha}`);
  }
  for (const expectedPullRequest of pendingPullRequests) {
    const pullRequest = await fetchGitHub(
      `https://api.github.com/repos/${repository}/pulls/${expectedPullRequest.number}`,
    );
    const actualState = pullRequest.state.toLowerCase();
    if (actualState !== expectedPullRequest.state || pullRequest.draft !== expectedPullRequest.draft) {
      throw new Error(
        `pyquadcortex PR #${expectedPullRequest.number} state drifted: `
        + `expected ${expectedPullRequest.state}/draft=${expectedPullRequest.draft}, `
        + `got ${actualState}/draft=${pullRequest.draft}`,
      );
    }
    if (pullRequest.head.sha !== expectedPullRequest.head) {
      throw new Error(
        `pyquadcortex PR #${expectedPullRequest.number} head changed: `
        + `expected ${expectedPullRequest.head}, got ${pullRequest.head.sha}`,
      );
    }
    const clientSource = await fetchGitHub(
      `https://api.github.com/repos/${pullRequest.head.repo.full_name}/contents/pyquadcortex/protocol/client.py?ref=${pullRequest.head.sha}`,
      true,
    );
    const actualAdded = publicClientMethods(clientSource)
      .filter((method) => !baselineExpected.has(method))
      .sort();
    const declaredAdded = [...expectedPullRequest.methods].sort();
    if (JSON.stringify(actualAdded) !== JSON.stringify(declaredAdded)) {
      throw new Error(
        `pyquadcortex PR #${expectedPullRequest.number} public methods drifted: `
        + `expected [${declaredAdded}], got [${actualAdded}]`,
      );
    }
  }
  githubVerified = true;
}

const counts = Object.fromEntries(
  [...covered.values()].reduce((map, status) => map.set(status, (map.get(status) ?? 0) + 1), new Map()),
);
console.log(JSON.stringify({
  verified: true,
  upstreamMethods: baselineExpected.size,
  pendingMethods: pendingMethods.size,
  totalMethods: expected.size,
  pendingPullRequests: pendingPullRequests.length,
  counts,
  sourceVerified: Boolean(sourcePath),
  githubVerified,
}));
