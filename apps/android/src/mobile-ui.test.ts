import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the mobile control deck follows the physical three-row QC layout", () => {
  const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const performanceWorkflow = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-performance-workflow.ts", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  const domain = JSON.parse(readFileSync(new URL("../../../contracts/qc-domain.v1.json", import.meta.url), "utf8"));

  assert.equal(domain.limits.scenes, 8);
  assert.match(appSource, /Array\.from\(\{ length: QC_SCENE_COUNT \}/, "A through H must come from the shared scene definition");
  assert.match(appSource, /QcMasterVolumeKnob value=\{snapshot\.masterVolume\} readout=\{`\$\{snapshot\.masterVolume\}`\}/);
  assert.match(appSource, /const toggleIoView = async \(\) => \{[\s\S]*QcUsbNative\.swipeScreen\(qcRemoteScreen\.openIo\)[\s\S]*setMobileScreenView\("io-overview"\)/);
  assert.match(appSource, /else if \(ioViewOpen\) await QcUsbNative\.tapScreenDirect\(qcRemoteScreen\.done\)/);
  assert.match(appSource, /const toggleGigView = async \(\) => \{[\s\S]*androidGatewayTransport\.showGigView\(true\)[\s\S]*setMobileScreenView\("gig"\)/);
  assert.match(appSource, /gigPresetList=\{presetWorkflow\.presetList\}/);
  assert.match(appSource, /onClick=\{toggleIoView\} aria-pressed=\{ioViewOpen\}/);
  assert.match(appSource, /onClick=\{toggleGigView\} aria-pressed=\{gigViewOpen\}/);
  assert.match(appSource, /QcHardwareSwitch role="bank:up" label=\{<QcUiIcon kind="up" \/>\}/);
  assert.match(appSource, /QcHardwareSwitch role="bank:down" label=\{<span className="mobile-down-glyph"><QcUiIcon kind="up" \/><\/span>\}/);
  assert.doesNotMatch(appSource, />SCENE</);
  assert.match(appSource, /footswitchLeds\(snapshot\)/);
  assert.match(appSource, /useQcWorkflows\(\{/);
  assert.match(performanceWorkflow, /controller\.beginFootswitch/);
  assert.match(appSource, /QcHardwareSwitch role="tempo" label="" ariaLabel="Tap tempo" readout=\{`\$\{snapshot\.tempo\}`\}/);
  assert.match(appSource, /useContinuousControlWorkflow\(\{/);
  assert.match(appSource, /adjustEditorParameter\(role, delta\)/);
  assert.doesNotMatch(appSource, /> BLOCK<\/button>/);
  assert.doesNotMatch(appSource, />EDIT BLOCK<\/button>/);
  assert.doesNotMatch(appSource, />REDO<\/button>/);
  assert.doesNotMatch(appSource, /className="workflow-actions"/);
  assert.doesNotMatch(appSource, />ROUTING<\/button>/);
  assert.doesNotMatch(appSource, />SCENES<\/button>/);
  assert.match(styles, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(styles, /grid-template-rows: repeat\(3, minmax\(66px, 1fr\)\)/);
  assert.match(styles, /\.quick-controls \.switch-ring \{ order: 3; width: 50px;/);
  assert.match(styles, /\.quick-controls \.switch-label \{ order: 1; align-self: end;/);
  assert.match(styles, /\.quick-controls \.switch-led \{ position: relative; order: 2; width: 10px;/);
  assert.match(styles, /\.quick-controls \.switch-ring \{ order: 3; width: 50px;/);
  assert.match(styles, /\.mobile-up-control \{ grid-column: 5; grid-row: 1; \}/);
  assert.match(styles, /\.mobile-down-control \{ grid-column: 5; grid-row: 2; \}/);
  assert.match(styles, /\.mobile-tempo-control \{ grid-column: 5; grid-row: 3; \}/);
  assert.match(styles, /\.hardware-switch\.is-tempo-pulse\.is-active \.switch-led::before/);
  assert.match(styles, /\.mobile-down-glyph \{ display: inline-grid; transform: rotate\(180deg\); \}/);
  assert.match(styles, /\.mobile-volume-control \{ grid-column: 1; grid-row: 1;/);
  assert.match(styles, /@media \(orientation: landscape\)[\s\S]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/);
});

test("tapping a live Grid block opens the shared parameter editor and commits over USB", () => {
  const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const gridWorkflow = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-grid-workflow.ts", import.meta.url), "utf8");
  const parameterWorkflow = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-parameter-workflow.ts", import.meta.url), "utf8");
  const parameterBindings = readFileSync(new URL("../../../packages/typescript/qc-ui/src/qc-parameter-editor-bindings.ts", import.meta.url), "utf8");
  const surfaceActions = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-qc-surface-actions.ts", import.meta.url), "utf8");
  const nativeSource = readFileSync(new URL("./native-services.ts", import.meta.url), "utf8");
  const coreSource = readFileSync(new URL("../../../packages/typescript/qc-core/src/state.ts", import.meta.url), "utf8");
  const liveStateSource = readFileSync(new URL("../../../packages/typescript/qc-ui/src/use-qc-live-state.ts", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(gridWorkflow, /gateway\.blockDetails\(block\.row, block\.column, snapshot\.presetName\)/);
  assert.match(appSource, /parameterEditor=\{parameterEditorBindings\}/);
  assert.match(parameterBindings, /const details = editor\.details;[\s\S]*if \(!details\) return undefined/);
  assert.match(parameterWorkflow, /gateway\.setParameter\(row, column, parameter\.index, value/);
  assert.match(nativeSource, /createAndroidQcTransport[\s\S]*createQcGatewayTransport/);
  assert.doesNotMatch(nativeSource, /QcUsbNative\.(?:blockDetails|setParameter)/);
  assert.match(appSource, /useQcSurfaceActions\(\{/);
  assert.match(surfaceActions, /blockSelectionIntent\(selectedBlockId, blockId\)/);
  assert.match(appSource, /consumeQcNativeStateFrame\(frame/);
  assert.match(liveStateSource, /reconcileFrame\(states, observedAt\)/);
  assert.match(coreSource, /dirty: state\.catalogRefresh \? snapshot\.dirty : false/);
  assert.match(styles, /\.preset-title\.is-dirty \{ font-style: italic; font-weight: 500; \}/);
});

test("Android exposes an allowlisted Gemini selector and a compact persisted quota estimate", () => {
  const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const servicesSource = readFileSync(new URL("./native-services.ts", import.meta.url), "utf8");
  const javaSource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/GeminiPlugin.java", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
  const quotaSource = readFileSync(new URL("./gemini-quota.ts", import.meta.url), "utf8");

  for (const model of ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]) {
    assert.match(appSource, new RegExp(model));
    assert.match(javaSource, new RegExp(model));
  }
  assert.match(servicesSource, /inputTokens: number;[\s\S]*thinkingTokens: number;[\s\S]*totalTokens: number/);
  assert.match(javaSource, /response\.getUsageMetadata\(\)/);
  assert.match(javaSource, /ALLOWED_MODELS\.contains\(modelName\)/);
  assert.match(appSource, /aria-label="Gemini model"/);
  assert.match(appSource, /androidQuotaStorageKey/);
  assert.match(appSource, /dayRemaining.*requestsPerDay/);
  assert.match(appSource, /minuteRemaining.*requestsPerMinute/);
  assert.match(appSource, /Device estimate for the current Pacific quota day/);
  assert.match(quotaSource, /America\/Los_Angeles/);
  assert.match(quotaSource, /"gemini-3\.7-flash": \{ requestsPerMinute: 5, requestsPerDay: 20/);
  assert.match(quotaSource, /"gemini-3\.5-flash-lite": \{ requestsPerMinute: 15, requestsPerDay: 500/);
  assert.match(styles, /\.chat-model-bar/);
});

test("Android chat is a compact, persistent, collapsible panel", () => {
  const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

  assert.match(appSource, /androidChatCollapsedStorageKey/);
  assert.match(appSource, /window\.localStorage\.setItem\(androidChatCollapsedStorageKey/);
  assert.match(appSource, /className=\{`mobile-chat\$\{chatCollapsed \? " is-collapsed" : ""\}`\}/);
  assert.match(appSource, /aria-label=\{chatCollapsed \? "Expand chat" : "Collapse chat"\}/);
  assert.match(appSource, /\{busy \? "THINKING" : "CHAT"\}/);
  assert.doesNotMatch(appSource, /QC ASSISTANT/);
  assert.match(styles, /\.chat-toggle \{ position: absolute;/);
  assert.match(styles, /\.message-list \{[^}]*padding: 45px 12px 12px;/);
  assert.match(appSource, /<form className="message-composer"[\s\S]*<div className="chat-model-bar">/);
  assert.match(styles, /\.android-app\.chat-collapsed/);
});

test("Android exposes shared About, privacy, legal, and third-party notices", () => {
  const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const themeSource = readFileSync(new URL("../../../packages/typescript/qc-theme/src/legal.ts", import.meta.url), "utf8");

  assert.match(appSource, /QC_LEGAL/);
  assert.match(appSource, /About \$\{QC_BRAND\.appName\}/);
  for (const panel of ["about", "privacy", "legal", "notices"]) {
    assert.match(appSource, new RegExp(`workflowPanel === "${panel}"`));
  }
  assert.match(themeSource, /not affiliated with, authorized, sponsored, endorsed, or supported/);
  assert.match(themeSource, /identify the product with which this application is compatible/);
});

test("assistant and relay access defaults to full control and enforces four tiers", () => {
  const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const servicesSource = readFileSync(new URL("./native-services.ts", import.meta.url), "utf8");
  const primitivesSource = readFileSync(new URL("../../../packages/typescript/qc-ui/src/assistant-chat-primitives.tsx", import.meta.url), "utf8");
  const executorSource = readFileSync(new URL("../../../packages/typescript/qc-ui/src/qc-action-executor.ts", import.meta.url), "utf8");
  const relaySource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/QcRelayService.java", import.meta.url), "utf8");
  const policySource = readFileSync(new URL("../android/app/src/main/java/com/qccontrol/mobile/RelayAccessPolicy.java", import.meta.url), "utf8");

  assert.match(appSource, /readAssistantAccessMode\(window\.localStorage, \[legacyControlAccessModeKey\]\)/);
  assert.match(appSource, /writeAssistantAccessMode\(window\.localStorage, mode\)/);
  assert.match(appSource, /ariaLabel="Assistant and remote device access"/);
  assert.match(appSource, /accessMode: controlAccessMode/);
  assert.match(executorSource, /assistantAccessPermitsTool\(accessMode, call\.name\)/);
  assert.match(primitivesSource, /value: "performance", label: "Performance"/);
  assert.match(primitivesSource, /value: "modify", label: "Modify"/);
  assert.match(servicesSource, /type PublicRelayState, type PublicRelayStatus/);
  assert.match(servicesSource, /setAccessMode\(options: \{ mode: AssistantAccessMode \}\)/);
  assert.match(servicesSource, /publicRelay: PublicRelayPort/);
  assert.match(appSource, /relayWorkflow\.pair\(endpoint, pairingCode\)/);
  assert.match(appSource, /usePublicRelayWorkflow\(\{ relay: publicRelay/);
  assert.match(policySource, /getString\(MODE, FULL\)/);
  assert.match(policySource, /GeneratedRemoteActions\.isPerformance/);
  assert.match(policySource, /GeneratedRemoteActions\.isModify/);
  assert.match(relaySource, /RelayAccessPolicy\.permits/);
  assert.match(relaySource, /"ACCESS_MODE_RESTRICTED"/);
});
