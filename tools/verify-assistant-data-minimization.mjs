import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function assistantDataMinimizationErrors(readSource = (path) => readFileSync(resolve(repositoryRoot, path), "utf8")) {
  const errors = [];
  const tools = readSource("packages/typescript/qc-core/src/assistant-tools.ts");
  const assistant = readSource("packages/typescript/qc-core/src/assistant.ts");
  const windowsTools = readSource("apps/windows/src/model-chat.ts");
  const windowsApp = readSource("apps/windows/src/App.tsx");
  const windowsNativeChat = readSource("apps/windows/src-tauri/src/chat.rs");
  const android = readSource("apps/android/src/App.tsx");
  const contract = readSource("contracts/qc-actions.v1.json");
  const exposedMcpAndRelaySources = [
    "services/mcp-server/src/qc_mcp_server/generated_tools.py",
    "services/rust-mcp/src/generated_actions.rs",
    "services/qc-relay/src/generated_actions.rs",
    "packages/rust/qc-relay-client/src/generated_actions.rs"
  ].map(readSource);
  const rustMcp = readSource("services/rust-mcp/src/server.rs");
  const pythonMcp = readSource("services/mcp-server/src/qc_mcp_server/server.py");
  const relay = readSource("services/qc-relay/src/relay.rs");
  const legalCopy = readSource("packages/typescript/qc-theme/src/legal.ts");
  const providerDocumentation = readSource("docs/MODEL_PROVIDERS.md");
  const privacyPolicy = readSource("docs/PRIVACY_POLICY_DRAFT.md");

  if (!/MODEL_PRIVATE_QC_ACTIONS\s*=\s*\["get_device_identity"\]/.test(tools)) {
    errors.push("persistent device identity is not classified as private from model providers");
  }
  if (/"name"\s*:\s*"get_device_identity"/.test(contract)
    || exposedMcpAndRelaySources.some((source) => /get_device_identity|device\.identity/.test(source))) {
    errors.push("persistent device identity remains exposed through a model, MCP, or public-relay action catalog");
  }
  if (!/SHARED_QC_ACTIONS[\s\S]*filter\(\(\{ name \}\) => assistantProviderPermitsTool\("full", name\)\)[\s\S]*\.map/.test(tools)) {
    errors.push("native model tool declarations do not apply the provider privacy filter");
  }
  if (!/assistantCompactToolCatalog[\s\S]*filter\(\(action\) => assistantProviderPermitsTool\(mode, action\.name\)\)/.test(tools)) {
    errors.push("text-model tool catalogs do not apply the provider privacy filter");
  }
  if (!/validateAssistantToolCalls[\s\S]*assistantProviderPermitsTool\(mode, name\)/.test(tools)) {
    errors.push("text-model action validation does not enforce the provider privacy filter");
  }
  if (!/return assistantProviderPermitsTool\(mode, name\)/.test(windowsTools)) {
    errors.push("Windows model tool dispatch does not enforce the provider privacy filter");
  }
  if (!/validateAssistantToolCalls\(parsed, controlAccessMode\)/.test(android)) {
    errors.push("Android model tool dispatch does not use the shared privacy-aware validator");
  }
  if (!windowsApp.includes('settings.provider !== "gemini-openai" || geminiAgeEligible')
    || !windowsApp.includes("remoteChatConsentAllows(chatSettings, remoteChatConsent) && providerAgeEligibilityAllows(chatSettings, geminiAgeEligible)")) {
    errors.push("Windows direct Gemini API access is not feature-gated by a locally stored 18+ eligibility confirmation");
  }
  if (!/native && directGeminiAvailable && onlineModelsAllowed && geminiAgeEligible/.test(android)
    || !/androidGeminiAgeEligibilityKey/.test(android)
    || !/I confirm I am 18 or older to use the development Gemini feature/.test(android)) {
    errors.push("Android development Gemini access is not both public-build-excluded and feature-gated by a local eligibility confirmation");
  }
  const summaryBody = assistant.match(/export function formatSnapshotSummary[\s\S]*?\n\}/)?.[0] ?? "";
  if (!summaryBody || /snapshot\.deviceName/.test(summaryBody)) {
    errors.push("assistant snapshot summaries may disclose the user's custom device name");
  }
  if (!/sanitize_model_result\(result\)/.test(rustMcp)
    || !/_sanitize_model_result\([\s\S]*_validated_backend_result/.test(pythonMcp)
    || !/map\(sanitize_public_result\)/.test(relay)) {
    errors.push("MCP or public-relay responses do not recursively remove persistent device identifiers");
  }
  if (!windowsTools.includes("Analyze only media files the user attaches directly")
    || !windowsTools.includes("Do not download, extract, or request copies from streaming-service URLs")
    || !windowsNativeChat.includes("never interact with pages, sign in, submit data, download or extract media, or run commands")
    || !legalCopy.includes("do not download or extract media from streaming services")) {
    errors.push("public assistant boundaries permit streaming-media extraction or omit the user-rights disclosure");
  }
  if (!/recentModelConversation\(messages, historyLimit, \{ includeAttachments: false \}\)/.test(windowsApp)
    || !/recentModelConversation\(messages, 6, \{ includeAttachments: false \}\)/.test(android)) {
    errors.push("previous attachment payloads may be silently retransmitted with later model requests");
  }
  if (!windowsApp.includes("remotePromptContainsCredentialUrl(text)")
    || !android.includes("remotePromptContainsCredentialUrl(input)")) {
    errors.push("remote model prompts do not block credential-bearing URLs before transmission");
  }
  if (windowsNativeChat.includes("isolated Antigravity workspace")
    || !windowsNativeChat.includes("dedicated Antigravity working directory")
    || !providerDocumentation.includes("not an operating-system sandbox")
    || !privacyPolicy.includes("not an operating-system sandbox")
    || !legalCopy.includes("not an operating-system sandbox")
    || !legalCopy.includes("Windows account permissions")
    || !windowsApp.includes("QC_LEGAL.privacy.antigravity")) {
    errors.push("Antigravity execution is described as isolated or its Windows-account permission boundary is not disclosed at consent");
  }
  return errors;
}

export function currentAssistantDataMinimizationErrors() {
  return assistantDataMinimizationErrors();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentAssistantDataMinimizationErrors();
  if (errors.length) {
    console.error(`Assistant data-minimization check failed:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else console.log("Assistant model boundaries exclude persistent device identifiers and enforce Gemini feature eligibility.");
}
