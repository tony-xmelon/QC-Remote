import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { demoSnapshot, QC_SCENE_COUNT } from "@qc-remote/client";
import { assistantToolActionPrompt, footswitchLeds, parseAssistantIntent, parseAssistantReply, recentModelConversation, runToolConversation, sceneLetter, textModelConversationPrompt, validateAssistantToolCalls, type AssistantAccessMode as ControlAccessMode, type AssistantToolCall, type PublicRelayState as RelayState } from "@qc-remote/core";
import { formFactors, skins } from "@qc-remote/form-factors";
import { QC_BRAND, QC_COLORS, QC_LEGAL, QC_VISUAL_ASSETS } from "@qc-remote/theme";
import { AddBlockPanel, applyPreparedOfflineAssistantAction, AssistantAccessSelect, AssistantAttachmentList, browserWorkflowPrompts, consumeQcNativeStateFrame, corosFixtureConfiguration, corOsUnavailableContextActionMessage, executeAndReconcileQcAction, GridManagementPanel, offlineAssistantEditConfirmation, parameterEditorAccent, parameterEditorControlSlots, parameterEditorPageSize, qcParameterEditorBindings, qcRelayLabel, QcHardwareSwitch, QcMasterVolumeKnob, QcUiIcon, QuadCortexSurface, readAssistantAccessMode, RoutingEditor, runOfflineAssistantIntent, SceneEditor, useAssistantAutoScroll, useAssistantConversation, useBlockEditorSession, useContinuousControlWorkflow, usePublicRelayWorkflow, useQcConnectionWorkflow, useQcController, useQcLiveState, useQcSurfaceActions, useQcWorkflows, writeAssistantAccessMode, type CorOsContextAction, type CorOsScreenView } from "@qc-remote/ui";
import { androidGatewayTransport, createAndroidQcTransport, GeminiNative, publicRelay, QcUsbNative, ScreenWakeNative, subscribeRelayState, VoiceInputNative } from "./native-services";
import { quotaSummary, recordGeminiUsage, type GeminiModelId, type GeminiQuotaLedger } from "./gemini-quota";
import appPackage from "../package.json";

type AndroidGeminiModel = GeminiModelId;
type AndroidAttachment = { name: string; mediaType: "image/png"; data: string };

const formFactor = formFactors[0];
const skin = skins.find((entry) => entry.id === formFactor.defaultSkinId) ?? skins[0];
const { enabled: corpusFixtureEnabled, screenView: fixtureScreenView, initialSnapshot: fixtureInitialSnapshot } =
  corosFixtureConfiguration(window.location.search, demoSnapshot);
const sceneFootswitches = Array.from({ length: QC_SCENE_COUNT }, (_, index) => ({ index, label: sceneLetter(index) }));
const androidGeminiModels: ReadonlyArray<{ id: AndroidGeminiModel; label: string }> = [
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" }
];
const androidModelStorageKey = "qc-control.android-gemini-model";
const androidQuotaStorageKey = "qc-control.android-gemini-quota-v1";
const androidChatCollapsedStorageKey = "qc-control.android-chat-collapsed-v1";
const androidKeepScreenAwakeStorageKey = "qc-control.android-keep-screen-awake-v1";
const androidOnlineModelConsentKey = "qc-remote.android-online-model-consent-v1";
const screenDimAfterMs = 90_000;
const legacyControlAccessModeKey = "qc-control.device-access-mode-v1";
const qcRemoteScreen = {
  openIo: { x: 400, y: 8, toX: 400, toY: 220 },
  done: { x: 744, y: 30 }
} as const;
const storedControlAccessMode = (): ControlAccessMode => readAssistantAccessMode(window.localStorage, [legacyControlAccessModeKey]);
function loadQuotaLedger(): GeminiQuotaLedger {
  try {
    const saved = JSON.parse(window.localStorage.getItem(androidQuotaStorageKey) ?? "{}");
    return saved && typeof saved === "object" ? saved as GeminiQuotaLedger : {};
  } catch { return {}; }
}

function AppMark({ onClick }: { onClick: () => void }) {
  return <button type="button" className="app-mark" onClick={onClick} aria-label={`About ${QC_BRAND.appName}`}><img src={QC_VISUAL_ASSETS.appIcon.url} alt="" /></button>;
}

export function App() {
  const native = Capacitor.isNativePlatform();
  const qcController = useQcController(demoSnapshot);
  const {
    snapshot, snapshotRef, setSnapshot, updateSnapshot,
    resetCommands, reconcileFrame
  } = qcController;
  useEffect(() => { if (corpusFixtureEnabled) setSnapshot(fixtureInitialSnapshot); }, [setSnapshot]);
  const qcTransport = useMemo(() => createAndroidQcTransport(() => snapshotRef.current), [snapshotRef]);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const editor = useBlockEditorSession();
  const { details: blockDetails } = editor;
  const [devicePending, setDevicePending] = useState(false);
  const conversation = useAssistantConversation<AndroidAttachment>({
    initialMessages: [{ id: 1, role: "assistant", text: "Ready. Connect the Quad Cortex by USB, type a request, or use the microphone to speak." }],
    maximumInputLength: 2000
  });
  const { input: message, setInput: setMessage, messages, pending: busy } = conversation;
  const assistantScroll = useAssistantAutoScroll(true, messages);
  const deviceConnection = useQcConnectionWorkflow({
    phase: native ? "discovering" : "disconnected",
    detail: native ? "Looking for the Quad Cortex…" : "Android USB is unavailable in browser preview.",
    demo: true
  });
  const { connection, transition: transitionConnection, connected: usbConnected, busy: usbBusy, appearance: usbState } = deviceConnection;
  const [selectedModel, setSelectedModel] = useState<AndroidGeminiModel>(() => {
    const saved = window.localStorage.getItem(androidModelStorageKey);
    return androidGeminiModels.some((model) => model.id === saved) ? saved as AndroidGeminiModel : "gemini-3.7-flash";
  });
  const [quotaLedger, setQuotaLedger] = useState<GeminiQuotaLedger>(loadQuotaLedger);
  const [quotaState, setQuotaState] = useState<"unreported" | "available" | "exhausted">("unreported");
  const [quotaNow, setQuotaNow] = useState(Date.now());
  const [chatCollapsed, setChatCollapsed] = useState(() => window.localStorage.getItem(androidChatCollapsedStorageKey) === "true");
  const [keepScreenAwake, setKeepScreenAwake] = useState(() => window.localStorage.getItem(androidKeepScreenAwakeStorageKey) !== "false");
  const [onlineModelsAllowed, setOnlineModelsAllowed] = useState(() => window.localStorage.getItem(androidOnlineModelConsentKey) === "accepted");
  const [screenDimmed, setScreenDimmed] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [controlAccessMode, setControlAccessMode] = useState<ControlAccessMode>(storedControlAccessMode);
  const relayWorkflow = usePublicRelayWorkflow({ relay: publicRelay, enabled: native, autoStart: true, subscribe: subscribeRelayState });
  const relayState: RelayState = relayWorkflow.status?.state ?? "stopped";
  const relayPaired = relayWorkflow.status?.paired ?? false;
  const [workflowPanel, setWorkflowPanel] = useState<"block" | "add" | "routing" | "scene" | "usb" | "remote" | "chat" | "about" | "display" | "privacy" | "legal" | "notices" | null>(null);
  const [usbPanelDetail, setUsbPanelDetail] = useState("Checking direct USB status…");
  const [mobileScreenView, setMobileScreenView] = useState<CorOsScreenView | null>(null);
  const connectInFlight = useRef(false);
  const presetSynchronized = useRef(false);
  const usbSessionReady = useRef(false);
  const nativeStateSequence = useRef(0);
  const screenDimTimer = useRef<number | undefined>(undefined);
  const appendAssistant = useCallback((text: string, attachments?: AndroidAttachment[]) => conversation.append("assistant", text, attachments), [conversation.append]);
  useEffect(() => {
    if (!native) return;
    const enabled = keepScreenAwake && usbConnected;
    void ScreenWakeNative.setEnabled({ enabled });
    return () => { void ScreenWakeNative.setEnabled({ enabled: false }); };
  }, [keepScreenAwake, native, usbConnected]);
  const changeKeepScreenAwake = (enabled: boolean) => {
    setKeepScreenAwake(enabled);
    window.localStorage.setItem(androidKeepScreenAwakeStorageKey, String(enabled));
  };
  const resetScreenDimmer = useCallback(() => {
    if (!native || !keepScreenAwake || !usbConnected) return;
    if (screenDimTimer.current !== undefined) window.clearTimeout(screenDimTimer.current);
    setScreenDimmed(false);
    screenDimTimer.current = window.setTimeout(() => setScreenDimmed(true), screenDimAfterMs);
  }, [keepScreenAwake, native, usbConnected]);
  useEffect(() => {
    if (!native || !keepScreenAwake || !usbConnected) {
      if (screenDimTimer.current !== undefined) window.clearTimeout(screenDimTimer.current);
      screenDimTimer.current = undefined;
      setScreenDimmed(false);
      return;
    }
    resetScreenDimmer();
    return () => { if (screenDimTimer.current !== undefined) window.clearTimeout(screenDimTimer.current); };
  }, [keepScreenAwake, native, resetScreenDimmer, usbConnected]);
  const workflows = useQcWorkflows({
    controller: qcController,
    transport: qcTransport,
    gateway: androidGatewayTransport,
    editor,
    selectedBlockId,
    setSelectedBlockId,
    connected: corpusFixtureEnabled || usbConnected,
    demo: corpusFixtureEnabled || !native,
    pending: devicePending,
    setPending: setDevicePending,
    prompts: browserWorkflowPrompts,
    panels: {
      openRouting: () => setWorkflowPanel("routing"),
      openBlock: () => setWorkflowPanel("block"),
      openAddBlock: () => setWorkflowPanel("add"),
      openScenes: () => setWorkflowPanel("scene"),
      close: () => setWorkflowPanel(null)
    },
    notice: appendAssistant,
    fail: (error) => appendAssistant(error instanceof Error ? error.message : String(error)),
    performanceFail: (error) => {
      transitionConnection("error");
      appendAssistant(error instanceof Error ? error.message : String(error));
    }
  });
  const {
    reconcile: reconcileWorkflowSnapshot,
    history: deviceHistory,
    preset: presetWorkflow,
    routing: routingWorkflow,
    grid: gridWorkflow,
    parameter: parameterWorkflow,
    scene: sceneWorkflow,
    performance: performanceWorkflow
  } = workflows;
  const continuousControls = useContinuousControlWorkflow({
    controller: qcController,
    gateway: androidGatewayTransport,
    connected: usbConnected,
    demo: corpusFixtureEnabled || !native,
    reconcile: reconcileWorkflowSnapshot,
    recordHistory: deviceHistory.record,
    notice: appendAssistant,
    fail: (error) => appendAssistant(error instanceof Error ? error.message : String(error))
  });
  const parameterEditorBindings = qcParameterEditorBindings({
    snapshot,
    selectedBlockId,
    editor,
    grid: gridWorkflow,
    parameter: parameterWorkflow,
    performance: performanceWorkflow,
    connected: usbConnected,
    pending: devicePending,
    notice: appendAssistant,
    openExpression: () => setWorkflowPanel("block")
  });
  const selectedQuota = quotaSummary(selectedModel, quotaLedger[selectedModel], quotaNow);
  const switchLeds = useMemo(() => footswitchLeds(snapshot), [snapshot]);
  const consumeLiveState = useQcLiveState({
    reconcileFrame,
    editor,
    onStates: (states) => {
      if (states.some((state) => state.kind === "preset")) {
        presetSynchronized.current = true;
        if (usbSessionReady.current) transitionConnection("connected");
      }
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => setQuotaNow(Date.now()), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  const attemptUsbConnection = async (announce = false) => {
    if (!native || connectInFlight.current) return;
    connectInFlight.current = true;
    presetSynchronized.current = false;
    nativeStateSequence.current = 0;
    transitionConnection("connecting");
    try {
      const result = await QcUsbNative.connect();
      usbSessionReady.current = true;
      if (result.synchronized) presetSynchronized.current = true;
      transitionConnection(presetSynchronized.current ? "connected" : "syncing");
      if (announce) appendAssistant("Quad Cortex connected directly over USB.");
    } catch (error) {
      usbSessionReady.current = false;
      transitionConnection("error");
      if (announce) {
        const primary = error instanceof Error ? error.message : "Could not connect to the Quad Cortex.";
        try { appendAssistant(`${primary} ${await usbDiagnostics()}`); }
        catch { appendAssistant(primary); }
      }
    } finally {
      connectInFlight.current = false;
    }
  };

  useEffect(() => {
    if (!native) return;
    let cancelled = false;
    const listenerPromises = [
      VoiceInputNative.addListener("partialResult", ({ transcript }) => setMessage(transcript)),
      VoiceInputNative.addListener("voiceState", ({ state }) => setVoiceState(state)),
      QcUsbNative.addListener("qcConnection", ({ state }) => {
        if (state === "available") {
          transitionConnection("available");
          void attemptUsbConnection();
        } else {
          usbSessionReady.current = false;
          presetSynchronized.current = false;
          nativeStateSequence.current = 0;
          resetCommands();
          transitionConnection("absent");
        }
      }),
      QcUsbNative.addListener("qcStateBatch", (frame) => {
        consumeQcNativeStateFrame(frame, {
          sequence: nativeStateSequence,
          consume: consumeLiveState,
          setSnapshot,
          // A restarted native stream numbers its frames from the beginning
          // again, and frames are deltas: read the whole state back so the
          // screen rejoins the device where it actually is.
          onStreamRestart: () => {
            void androidGatewayTransport.currentSnapshot().then(setSnapshot).catch(() => undefined);
          }
        });
      })
    ];
    // Register every native listener before scanning/handshaking so no initial
    // preset frame can beat the Capacitor bridge subscription.
    void Promise.all(listenerPromises).then(async () => {
      if (cancelled) return;
      const { devices, connected, synchronized } = await QcUsbNative.scan();
      if (cancelled) return;
      if (connected) {
        usbSessionReady.current = true;
        presetSynchronized.current = synchronized;
        transitionConnection(synchronized ? "connected" : "syncing");
        return;
      }
      if (!devices.length) { transitionConnection("absent"); return; }
      await attemptUsbConnection();
    }).catch(() => !cancelled && transitionConnection("error"));
    return () => {
      cancelled = true;
      for (const promise of listenerPromises) void promise.then((listener) => listener.remove());
    };
  }, [native]);

  useEffect(() => {
    if (!relayWorkflow.status) return;
    setControlAccessMode(relayWorkflow.status.accessMode);
    writeAssistantAccessMode(window.localStorage, relayWorkflow.status.accessMode);
  }, [relayWorkflow.status?.accessMode]);

  const openBlockEditor = gridWorkflow.openBlock;
  const closeBlockEditor = gridWorkflow.close;

  const usbDiagnostics = async () => {
    if (!native) return "USB diagnostics are available in the installed Android app.";
    const result = await QcUsbNative.diagnostics();
    const traffic = `${result.messagesReceived} received / ${result.messagesSent} sent`;
    const last = result.lastMessageType >= 0 ? `; last message type ${result.lastMessageType}` : "";
    const errors = result.decodeErrors ? `; ${result.decodeErrors} decode error${result.decodeErrors === 1 ? "" : "s"}` : "";
    const stalls = result.expectedWriteStalls ? `; ${result.expectedWriteStalls} expected QC write stalls` : "";
    const catalog = result.modelCount ? `; ${result.modelCount} models loaded` : "";
    const stateAge = result.lastStateAt ? `; latest state ${Math.max(0, Date.now() - result.lastStateAt)} ms ago` : "";
    const endpoint = result.interfaceId >= 0 ? ` Interface ${result.interfaceId}, input endpoint 0x${result.inputEndpointAddress.toString(16)}, max packet ${result.inputMaxPacketSize}; ${result.readAttempts} read polls (${result.negativeReads} negative); ${result.reportBytes}-byte output framing.` : "";
    const midi = result.midiAvailable ? ` USB-MIDI interface ${result.midiInterfaceId}, output endpoint 0x${result.midiOutputEndpointAddress.toString(16)}; MIDI queue ${result.lastMidiQueueDelayMs} ms (max ${result.maxMidiQueueDelayMs} ms).` : " USB-MIDI output unavailable.";
    const problem = result.lastError ? ` Last error: ${result.lastError}` : "";
    return `USB ${result.connected ? "connected" : "not connected"}: ${traffic}${last}${errors}${stalls}${catalog}${stateAge}.${endpoint}${midi}${problem}`;
  };

  const connectUsb = async () => {
    if (!native || usbBusy) return;
    await attemptUsbConnection(true);
  };
  const openUsbStatusPanel = async () => {
    setWorkflowPanel("usb");
    try { setUsbPanelDetail(await usbDiagnostics()); }
    catch (error) { setUsbPanelDetail(error instanceof Error ? error.message : "USB status could not be read."); }
  };
  const openRemoteStatusPanel = async () => {
    setWorkflowPanel("remote");
    if (native) await relayWorkflow.refresh().catch(() => undefined);
  };

  const adjustEditorParameter = useCallback((role: string, delta: number) => {
    return parameterWorkflow.adjustEncoder(role, delta, appendAssistant, false);
  }, [appendAssistant, parameterWorkflow]);
  const handleSurfaceAction = useQcSurfaceActions({
    snapshot,
    selectedBlockId,
    blockDetails,
    grid: gridWorkflow,
    performance: performanceWorkflow,
    openBlock: (block) => { void openBlockEditor(block); },
    closeBlock: closeBlockEditor,
    rotate: (role, delta) => {
      if (adjustEditorParameter(role, delta)) return;
      if (role === "tempo") continuousControls.adjustTempo(delta);
      else if (role === "master-volume") continuousControls.adjustMasterVolume(delta);
      else appendAssistant(`${role} has no parameter on the current screen.`);
    },
    editorUnhandled: (action) => appendAssistant(`${action.role} is mapped to the on-screen parameter above it; drag vertically to adjust it.`)
  });
  const parameterLeds = parameterEditorBindings ? (() => {
    const accent = parameterEditorAccent(parameterEditorBindings.details.name, parameterEditorBindings.accent);
    const visible = parameterEditorControlSlots(
      parameterEditorBindings.details.parameters.filter((parameter) => parameter.normalizedValue !== null),
      parameterEditorBindings.details.category,
      parameterEditorBindings.page,
      parameterEditorPageSize(parameterEditorBindings.details.category, parameterEditorBindings.details.parameters)
    );
    return Array.from({ length: 10 }, (_, index) => ({
      active: Boolean(visible[index]),
      assigned: Boolean(visible[index]),
      color: /\bcab\b/i.test(parameterEditorBindings.details.category) && ((parameterEditorBindings.page === 0 && index >= 5 && index <= 8) || (parameterEditorBindings.page === 1 && index === 2))
        ? QC_COLORS.category.pitch
        : accent
    }));
  })() : undefined;
  const mobileLed = (slot: number, fallback: { active: boolean; assigned: boolean; color: string }) => parameterLeds?.[slot] ?? fallback;
  const ioViewOpen = Boolean(mobileScreenView?.startsWith("io-"));
  const gigViewOpen = Boolean(mobileScreenView?.startsWith("gig"));
  const closeMobileScreen = async () => {
    try {
      if (native && usbConnected) {
        if (gigViewOpen) await androidGatewayTransport.showGigView(false);
        else if (ioViewOpen) await QcUsbNative.tapScreenDirect(qcRemoteScreen.done);
      }
      setMobileScreenView(null);
    } catch (error) {
      appendAssistant(error instanceof Error ? error.message : "The Quad Cortex screen did not close.");
    }
  };
  const toggleIoView = async () => {
    if (ioViewOpen) { await closeMobileScreen(); return; }
    try {
      if (native && usbConnected) await QcUsbNative.swipeScreen(qcRemoteScreen.openIo);
      setMobileScreenView("io-overview");
    } catch (error) {
      appendAssistant(error instanceof Error ? error.message : "The Quad Cortex did not open I/O Settings.");
    }
  };
  const toggleGigView = async () => {
    if (gigViewOpen) {
      await closeMobileScreen();
      return;
    }
    try {
      if (native && usbConnected) await androidGatewayTransport.showGigView(true);
      setMobileScreenView("gig");
      if (!presetWorkflow.presetList || presetWorkflow.presetList.setlistKey !== snapshot.setlistKey) {
        void presetWorkflow.loadDirectory(false, snapshot.setlistKey, true);
      }
    } catch (error) {
      appendAssistant(error instanceof Error ? error.message : "The Quad Cortex did not open Gig View.");
    }
  };
  const handleCorOsContextAction = (action: CorOsContextAction) => {
    if (action === "edit-details") presetWorkflow.openSave();
    else if (action === "settings") appendAssistant("Model, access, relay, and voice settings are available in the assistant controls below the Grid.");
    else appendAssistant(corOsUnavailableContextActionMessage(action));
  };

  const localFallback = async (input: string, remoteStatus = "Gemini is unavailable right now."): Promise<string> => {
    const intent = parseAssistantIntent(input);
    try {
      const outcome = await runOfflineAssistantIntent(intent, {
        gateway: androidGatewayTransport,
        snapshot,
        selectedBlockId,
        accessMode: controlAccessMode,
        connected: usbConnected,
        demo: !native,
        performance: performanceWorkflow,
        preset: presetWorkflow
      });
      if (outcome.kind === "response") {
        if (outcome.intent === "inspect") return outcome.detail;
        return native
          ? `${remoteStatus} ${outcome.detail}`
          : "Browser preview is offline. On Android, Gemini chat, voice input, and direct Quad Cortex USB are enabled.";
      }
      if (outcome.kind === "prepared") {
        if (!await browserWorkflowPrompts.confirm(offlineAssistantEditConfirmation(outcome.action))) {
          return `Temporary ${outcome.action.kind} edit cancelled.`;
        }
        return applyPreparedOfflineAssistantAction(outcome.action, performanceWorkflow, parameterWorkflow);
      }
      return outcome.detail;
    } catch (error) {
      return error instanceof Error ? error.message : "That QC command could not be completed.";
    }
  };

  const recordAndroidUsage = (result: Awaited<ReturnType<typeof GeminiNative.generate>>) => {
    setQuotaState("available");
    setQuotaLedger((current) => {
      const next = { ...current, [selectedModel]: recordGeminiUsage(current[selectedModel], {
        input: result.inputTokens, output: result.outputTokens,
        thinking: result.thinkingTokens, total: result.totalTokens
      }) };
      window.localStorage.setItem(androidQuotaStorageKey, JSON.stringify(next));
      return next;
    });
    setQuotaNow(Date.now());
  };

  const completeGeminiRound = async (roundMessages: ReturnType<typeof recentModelConversation<AndroidAttachment>>) => {
    const prompt = assistantToolActionPrompt(snapshotRef.current, `USB ${connection.phase}`, selectedBlockId, textModelConversationPrompt(roundMessages), controlAccessMode);
    try {
      const result = await GeminiNative.generate({ prompt, model: selectedModel });
      recordAndroidUsage(result);
      const parsed = parseAssistantReply(result.text);
      if (!parsed) return { text: result.text, toolCalls: [] as AssistantToolCall[], usage: result };
      const proposedCount = Array.isArray(parsed.actions) ? parsed.actions.length : 0;
      const toolCalls = validateAssistantToolCalls(parsed, controlAccessMode);
      const policyNote = toolCalls.length !== proposedCount ? `Some proposed actions were invalid or blocked by ${controlAccessMode} access.` : "";
      return { text: [parsed.reply?.trim(), policyNote].filter(Boolean).join(" "), toolCalls, usage: result };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (/quota|429|resource.?exhausted/i.test(detail)) setQuotaState("exhausted");
      throw error;
    }
  };

  const executeGeminiTool = async (action: AssistantToolCall) => {
    try {
      const connectionAction = action.name === "reconnect_device" || action.name === "reset_device_session" || action.name === "disconnect_device";
      if (!usbConnected && !connectionAction) throw new Error("Connect the Quad Cortex first.");
      const { result: outcome, attachment } = await executeAndReconcileQcAction(action, {
        gateway: androidGatewayTransport,
        snapshot: snapshotRef.current,
        connected: usbConnected,
        accessMode: controlAccessMode,
        selectedBlockId
      }, {
        setConnection: deviceConnection.setConnection,
        commitSavedPreset: presetWorkflow.commitSavedPreset,
        commitSnapshot: workflows.reconcile,
        currentBlock: blockDetails,
        updateBlock: parameterWorkflow.updateDetails,
        clearSelection: closeBlockEditor
      });
      const attachments = attachment ? [attachment] : [];
      conversation.append("tool", outcome.detail, attachments);
      return { detail: outcome.detail, attachments };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The QC command failed; reconnect and try again.";
      conversation.append("tool", detail);
      return { detail };
    }
  };

  const runGeminiConversation = async (input: string) => {
    const outcome = await runToolConversation<AssistantToolCall, Awaited<ReturnType<typeof GeminiNative.generate>>, AndroidAttachment>({
      messages: [...recentModelConversation(messages, 6), { role: "user", content: input }],
      instructions: "Use the text-only QC action contract and wait for verified tool output before claiming success.",
      continuationInstructions: "Continue the original request using verified QC tool output. Do not repeat completed operations.",
      complete: ({ messages: roundMessages }) => completeGeminiRound(roundMessages),
      execute: executeGeminiTool,
      toolName: (call) => call.name,
      onAssistantText: (text) => appendAssistant(text),
      maxToolCalls: 8
    });
    if (!outcome.producedResponse) appendAssistant("Gemini returned no response. Please try again.");
  };

  const sendInput = async (input: string) => {
    const submission = conversation.begin(input);
    if (!submission) return;
    try {
      if (/^(usb\s+)?(diagnostics?|status)$/i.test(submission.promptText)) appendAssistant(await usbDiagnostics());
      else if (native && onlineModelsAllowed) await runGeminiConversation(submission.promptText);
      else if (native) {
        appendAssistant(await localFallback(submission.promptText, "Online model sharing is disabled; no data was sent."));
      }
      else appendAssistant(await localFallback(submission.promptText));
    }
    catch { appendAssistant(await localFallback(submission.promptText)); }
    finally { conversation.finish(submission.token); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void sendInput(message); };

  const toggleVoice = async () => {
    if (!native || busy) return;
    if (voiceState !== "idle") { await VoiceInputNative.stop(); return; }
    setVoiceState("starting");
    try {
      const { transcript } = await VoiceInputNative.start();
      setVoiceState("idle");
      await sendInput(transcript);
    } catch (error) {
      setVoiceState("idle");
      appendAssistant(error instanceof Error ? error.message : "Voice input failed.");
    }
  };

  const configureRelay = async () => {
    if (!native) return;
    if (relayPaired) {
      if (!window.confirm("Unpair this phone from the remote QC relay?")) return;
      await relayWorkflow.unpair(); return;
    }
    const endpoint = window.prompt("Secure relay URL (https://…)", "https://")?.trim();
    if (!endpoint) return;
    const pairingCode = window.prompt("One-time pairing code")?.trim();
    if (!pairingCode) return;
    try {
      await relayWorkflow.pair(endpoint, pairingCode);
      appendAssistant("Phone paired. The secure remote relay is connecting in the background.");
    } catch (error) { appendAssistant(error instanceof Error ? error.message : "Relay pairing failed."); }
  };

  const changeControlAccessMode = async (mode: ControlAccessMode) => {
    const previous = controlAccessMode;
    setControlAccessMode(mode);
    writeAssistantAccessMode(window.localStorage, mode);
    if (!native) return;
    try {
      await relayWorkflow.setAccessMode(mode);
      appendAssistant(`Assistant and remote access changed to ${mode}. Guarded confirmations still apply; manual controls remain available.`);
    } catch (error) {
      setControlAccessMode(previous);
      writeAssistantAccessMode(window.localStorage, previous);
      appendAssistant(error instanceof Error ? error.message : "Could not change the remote access mode.");
    }
  };

  const toggleChat = () => setChatCollapsed((collapsed) => {
    const next = !collapsed;
    window.localStorage.setItem(androidChatCollapsedStorageKey, String(next));
    return next;
  });

  return <main className={`android-app${chatCollapsed ? " chat-collapsed" : ""}${screenDimmed ? " screen-dimmed" : ""}`} onPointerDown={resetScreenDimmer} onKeyDown={resetScreenDimmer} onTouchStart={resetScreenDimmer}>
    <header className="mobile-header">
      <div className="mobile-brand"><AppMark onClick={() => setWorkflowPanel("about")} /><span><strong>{QC_BRAND.appName}</strong><small>v{appPackage.version}</small></span></div>
      <div className="connection-pills">
        <button className={`connection-pill relay-${relayState}`} onClick={() => void openRemoteStatusPanel()} aria-haspopup="dialog" aria-expanded={workflowPanel === "remote"} aria-label={`${qcRelayLabel(relayWorkflow.status)}; open remote relay details`}><i /> {qcRelayLabel(relayWorkflow.status)}</button>
        <button className={`connection-pill ${usbState}`} onClick={() => void openUsbStatusPanel()} aria-haspopup="dialog" aria-expanded={workflowPanel === "usb"} aria-label="USB; open Quad Cortex connection details"><i /> USB</button>
      </div>
    </header>

    <section className="mobile-screen" aria-label="Quad Cortex display">
      <QuadCortexSurface formFactor={formFactor} snapshot={snapshot} selectedBlockId={selectedBlockId} skin={skin}
        screenView={fixtureScreenView ?? mobileScreenView ?? undefined} onCloseScreen={closeMobileScreen}
        onAction={handleSurfaceAction} onOpenPreset={() => void presetWorkflow.openDirectory()} onUndo={() => void deviceHistory.undo()} canUndo={Boolean(deviceHistory.undoEntry)} undoLabel={deviceHistory.undoEntry?.label}
        onSave={presetWorkflow.openSave} onOpenRouting={routingWorkflow.openPicker} onRefresh={() => void presetWorkflow.refresh()}
        savePreset={presetWorkflow.saveProps} presetDirectory={presetWorkflow.directoryProps} routingPicker={routingWorkflow.pickerProps}
        parameterEditor={parameterEditorBindings} gigPresetList={presetWorkflow.presetList} onContextAction={handleCorOsContextAction} />
    </section>

    <nav className="quick-controls" aria-label="Quick device controls">
      <div className="mobile-volume-control"><QcMasterVolumeKnob value={snapshot.masterVolume} readout={`${snapshot.masterVolume}`} onAction={handleSurfaceAction} /></div>
      <button className={`device-view-control mobile-io-control${ioViewOpen ? " is-active" : ""}`} onClick={toggleIoView} aria-pressed={ioViewOpen} aria-label={ioViewOpen ? "Hide I/O Settings quick control" : "Open I/O Settings"}><span>I/O</span></button>
      <button className={`device-view-control mobile-gig-control${gigViewOpen ? " is-active" : ""}`} onClick={toggleGigView} aria-pressed={gigViewOpen} aria-label={gigViewOpen ? "Hide Gig View quick control" : "Open Gig View"}><span>GIG</span></button>
      <div className="mobile-up-control"><QcHardwareSwitch role="bank:up" label={<QcUiIcon kind="up" />} ariaLabel="Previous preset" active={Boolean(parameterEditorBindings)} assigned={Boolean(parameterEditorBindings)} accent={QC_COLORS.hardware.whiteLed} onAction={handleSurfaceAction} /></div>
      {sceneFootswitches.map(({ index, label }) => {
        const slot = index < 4 ? index : index + 1;
        const led = mobileLed(slot, switchLeds[index]);
        return <div className={`mobile-encoder-control mobile-encoder-${index}`} key={label}>
          <QcHardwareSwitch role={`footswitch:${label}`} label={label} active={led.active} assigned={led.assigned} accent={led.color} onAction={handleSurfaceAction} />
        </div>;
      })}
      {(() => { const led = mobileLed(4, { active: false, assigned: false, color: QC_COLORS.hardware.whiteLed }); return <div className="mobile-down-control"><QcHardwareSwitch role="bank:down" label={<span className="mobile-down-glyph"><QcUiIcon kind="up" /></span>} ariaLabel="Next preset" active={led.active} assigned={led.assigned} accent={led.color} onAction={handleSurfaceAction} /></div>; })()}
      <div className="mobile-tempo-control"><QcHardwareSwitch role="tempo" label="" ariaLabel="Tap tempo" readout={`${snapshot.tempo}`} active={parameterLeds ? parameterLeds[9].active : snapshot.tempoLedEnabled} assigned={parameterLeds ? parameterLeds[9].assigned : snapshot.tempoLedEnabled} accent={parameterLeds ? parameterLeds[9].color : QC_COLORS.device.tempoLed} pulseBpm={!parameterLeds && snapshot.tempoLedEnabled ? snapshot.tempo : undefined} pulseEpochMs={!parameterLeds ? snapshot.tempoPulseEpochMs : undefined} onAction={handleSurfaceAction} /></div>
    </nav>

    <section className={`mobile-chat${chatCollapsed ? " is-collapsed" : ""}`} aria-label="Chat">
      <button className={`chat-toggle${busy ? " is-thinking" : ""}`} type="button" onClick={() => setWorkflowPanel("chat")} aria-haspopup="dialog" aria-expanded={workflowPanel === "chat"} aria-label={`${busy ? "Chat is thinking" : "Chat"}; open chat details`}><i /> {busy ? "THINKING" : "CHAT"}</button>
      {!chatCollapsed && <>
        <div ref={assistantScroll.containerRef} className="message-list" tabIndex={0} aria-live="polite" aria-label="Assistant conversation" onScroll={assistantScroll.onScroll} onWheel={assistantScroll.onUserScroll} onTouchMove={assistantScroll.onUserScroll} onPointerDown={assistantScroll.onUserScroll}>
          {messages.map((entry) => <div key={entry.id} className={`message ${entry.role}`}><span>{entry.role === "user" ? "YOU" : "QC"}</span><div><p>{entry.text}</p><AssistantAttachmentList attachments={entry.attachments} imageClassName="message-image" /></div></div>)}
          {busy && <div className="message assistant pending"><span>QC</span><p>•••</p></div>}
        </div>
        <form className="message-composer" onSubmit={submit}>
          <button className={`voice-button ${voiceState !== "idle" ? "is-listening" : ""}`} type="button" disabled={!native || busy} onClick={() => void toggleVoice()} aria-label="Speak a command"><QcUiIcon kind="microphone" /></button>
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={voiceState !== "idle" ? "Listening…" : `Ask ${QC_BRAND.appName}…`} aria-label={`Message ${QC_BRAND.appName}`} />
          <button className="send-button" type="submit" disabled={!message.trim() || busy} aria-label="Send message"><QcUiIcon kind="send" /></button>
        </form>
        <div className="chat-model-bar">
          <select value={selectedModel} aria-label="Gemini model" disabled={busy || !onlineModelsAllowed} onChange={(event) => {
            const model = event.target.value as AndroidGeminiModel;
            setSelectedModel(model);
            setQuotaState("unreported");
            window.localStorage.setItem(androidModelStorageKey, model);
          }}>
            {androidGeminiModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
          </select>
          <AssistantAccessSelect value={controlAccessMode} ariaLabel="Assistant and remote device access" disabled={busy} onChange={(mode) => void changeControlAccessMode(mode)} />
          <span title={`Device estimate for the current Pacific quota day. ${selectedQuota.dayRemaining} of ${selectedQuota.limits.requestsPerDay} daily requests left; ${selectedQuota.minuteRemaining} of ${selectedQuota.limits.requestsPerMinute} per-minute requests left; ${selectedQuota.minuteInputRemaining.toLocaleString()} of ${selectedQuota.limits.inputTokensPerMinute.toLocaleString()} input tokens/min left. Input ${selectedQuota.usage.input.toLocaleString()}, output ${selectedQuota.usage.output.toLocaleString()}, thinking ${selectedQuota.usage.thinking.toLocaleString()} tokens today.`}>
            {quotaState === "exhausted" ? "LIMIT · " : ""}{selectedQuota.dayRemaining}/{selectedQuota.limits.requestsPerDay} day · {selectedQuota.minuteRemaining}/{selectedQuota.limits.requestsPerMinute} min · {selectedQuota.usage.total.toLocaleString()} tok
          </span>
        </div>
      </>}
    </section>

    {workflowPanel && <div className="mobile-workflow-backdrop" role="presentation" onClick={() => setWorkflowPanel(null)}>
      <section className="mobile-workflow-panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(event) => event.stopPropagation()}>
        <button className="mobile-workflow-close" aria-label="Close" onClick={() => setWorkflowPanel(null)}><QcUiIcon kind="close" /></button>
        {workflowPanel === "routing" && <RoutingEditor snapshot={snapshot} drafts={routingWorkflow.drafts} pending={devicePending} setDrafts={routingWorkflow.setDrafts} applyRoute={(row, side) => void routingWorkflow.applyRoute(row, side)} applySplitRoute={(row) => void routingWorkflow.applySplit(row)} />}
        {workflowPanel === "block" && <GridManagementPanel snapshot={snapshot} details={blockDetails} loading={gridWorkflow.detailsLoading} pending={devicePending} moveDestination={gridWorkflow.moveDestination} setMoveDestination={gridWorkflow.setMoveDestination} footswitchDraft={gridWorkflow.footswitchDraft} setFootswitchDraft={gridWorkflow.setFootswitchDraft} move={() => void gridWorkflow.move()} assignFootswitch={() => void gridWorkflow.assignFootswitch()} remove={() => void gridWorkflow.remove()} />}
        {workflowPanel === "add" && <AddBlockPanel snapshot={snapshot} filteredModels={gridWorkflow.filteredModels} loading={gridWorkflow.modelsLoading} pending={devicePending} modelFilter={gridWorkflow.modelFilter} setModelFilter={gridWorkflow.setModelFilter} addCell={gridWorkflow.addCell} setAddCell={gridWorkflow.setAddCell} addModelId={gridWorkflow.addModelId} setAddModelId={gridWorkflow.setAddModelId} add={() => void gridWorkflow.add()} cancel={() => setWorkflowPanel(null)} />}
        {workflowPanel === "scene" && <SceneEditor snapshot={snapshot} pending={devicePending} sourceScene={sceneWorkflow.sourceScene} setSourceScene={sceneWorkflow.setSourceScene} destinationScene={sceneWorkflow.destinationScene} setDestinationScene={sceneWorkflow.setDestinationScene} swap={sceneWorkflow.swap} setSwap={sceneWorkflow.setSwap} label={sceneWorkflow.label} setLabel={sceneWorkflow.setLabel} color={sceneWorkflow.color} setColor={sceneWorkflow.setColor} colors={sceneWorkflow.colors} copy={() => void sceneWorkflow.copy()} saveLabel={() => void sceneWorkflow.saveLabel()} saveColor={() => void sceneWorkflow.saveColor()} />}
        {workflowPanel === "usb" && <><div className="dialog-kicker">DIRECT USB</div><h2 id="dialog-title">Quad Cortex connection</h2><p>{connection.detail || (usbConnected ? "The Quad Cortex is connected directly over USB." : "No Quad Cortex is connected directly over USB.")}</p><p className="mobile-status-detail">{usbPanelDetail}</p><div className="mobile-legal-actions"><button className="primary" disabled={!native || usbBusy} onClick={() => void connectUsb().then(openUsbStatusPanel)}>{usbConnected ? "Reconnect" : "Connect"}</button><button disabled={!native} onClick={() => void openUsbStatusPanel()}>Refresh</button></div></>}
        {workflowPanel === "remote" && <><div className="dialog-kicker">REMOTE RELAY</div><h2 id="dialog-title">Remote access</h2><p>{!relayPaired ? "This phone is not paired to a remote relay." : relayState === "connected" ? "A paired remote client can reach this Quad Cortex." : relayState === "connecting" || relayState === "reconnecting" ? "The outbound relay is connecting." : "This phone is paired, but the relay is not connected."}</p>{relayWorkflow.status?.endpoint && <p className="mobile-status-detail">{relayWorkflow.status.endpoint}</p>}<div className="mobile-legal-actions"><button className="primary" disabled={!native || relayWorkflow.pending} onClick={() => void (relayPaired ? relayWorkflow.start() : configureRelay())}>{relayPaired ? "Connect" : "Pair"}</button><button disabled={!native || relayWorkflow.pending} onClick={() => void openRemoteStatusPanel()}>Refresh</button>{relayPaired && <button className="danger" disabled={relayWorkflow.pending} onClick={() => void configureRelay()}>Unpair</button>}</div></>}
        {workflowPanel === "chat" && <><div className="dialog-kicker">CHAT</div><h2 id="dialog-title">Assistant status</h2><p>{busy ? "The assistant is preparing a response." : onlineModelsAllowed ? "Gemini chat is enabled for this device." : "Local assistant commands are available. Gemini chat is disabled."}</p><p className="mobile-status-detail">{androidGeminiModels.find((model) => model.id === selectedModel)?.label ?? selectedModel} · {quotaState === "exhausted" ? "Limit reached" : `${selectedQuota.dayRemaining}/${selectedQuota.limits.requestsPerDay} requests today`} · {messages.length} messages</p><div className="mobile-legal-actions"><button className="primary" onClick={() => { if (chatCollapsed) toggleChat(); setWorkflowPanel(null); }}>{chatCollapsed ? "Open Chat" : "Chat Open"}</button><button onClick={() => setWorkflowPanel("privacy")}>Chat settings</button><button className="danger" disabled={busy || messages.length === 0} onClick={() => { conversation.setMessages([]); setMessage(""); setWorkflowPanel(null); }}>Clear chat</button></div></>}
        {workflowPanel === "about" && <><div className="dialog-kicker">ABOUT</div><h2 id="dialog-title">{QC_BRAND.appName} <small>{appPackage.version}</small></h2><p>An independent mobile companion for controlling a connected Quad Cortex.</p><p className="mobile-legal-note">{QC_LEGAL.independence}</p><p>{QC_LEGAL.copyright}</p><div className="mobile-legal-actions"><button onClick={() => setWorkflowPanel("display")}>Display</button><button onClick={() => setWorkflowPanel("privacy")}>Privacy</button><button onClick={() => setWorkflowPanel("legal")}>Legal</button><button onClick={() => setWorkflowPanel("notices")}>Notices</button></div></>}
        {workflowPanel === "display" && <><div className="dialog-kicker">DISPLAY</div><h2 id="dialog-title">Screen wake</h2><p>Keep this screen on while QC Remote is in front and a Quad Cortex is connected. It automatically releases when you disconnect or leave the app.</p><label className="mobile-setting-toggle"><input type="checkbox" checked={keepScreenAwake} onChange={(event) => changeKeepScreenAwake(event.target.checked)} /> Keep screen awake while connected</label><div className="mobile-legal-actions"><button onClick={() => setWorkflowPanel("about")}>Back to About</button></div></>}
        {workflowPanel === "privacy" && <><div className="dialog-kicker">PRIVACY</div><h2 id="dialog-title">Local control, optional services</h2><p>{QC_LEGAL.privacy.local}</p><p>{QC_LEGAL.privacy.models}</p><p>{QC_LEGAL.privacy.voice}</p><label className="mobile-setting-toggle"><input type="checkbox" checked={onlineModelsAllowed} onChange={(event) => { const allowed = event.target.checked; setOnlineModelsAllowed(allowed); window.localStorage.setItem(androidOnlineModelConsentKey, allowed ? "accepted" : "declined"); }} /> Allow messages, attachments, and relevant device context to be sent to Gemini</label><div className="mobile-legal-actions"><button onClick={() => { conversation.setMessages([]); setMessage(""); setWorkflowPanel("about"); }}>Clear conversation</button><button onClick={() => setWorkflowPanel("about")}>Back to About</button></div></>}
        {workflowPanel === "legal" && <><div className="dialog-kicker">LEGAL</div><h2 id="dialog-title">Independent companion</h2><p>{QC_LEGAL.independence}</p><p>{QC_LEGAL.trademarks}</p><p>{QC_LEGAL.productSafety}</p><p>{QC_LEGAL.copyright}</p><div className="mobile-legal-actions"><button onClick={() => setWorkflowPanel("about")}>Back to About</button></div></>}
        {workflowPanel === "notices" && <><div className="dialog-kicker">THIRD-PARTY NOTICES</div><h2 id="dialog-title">Runtime components</h2>{QC_LEGAL.thirdParty.map((notice) => <p key={notice}>{notice}</p>)}<p><a href="./legal/THIRD_PARTY-NOTICES.md" target="_blank" rel="noreferrer">Open the complete locked dependency notices</a></p><p><a href="./legal/THIRD_PARTY-LICENSE-TEXTS.txt" target="_blank" rel="noreferrer">Open bundled license and NOTICE texts</a></p><p><a href="./legal/THIRD_PARTY-SOURCE-OFFER.md" target="_blank" rel="noreferrer">Open exact-version third-party source availability</a></p><p><a href="./legal/THIRD_PARTY-LICENSE-INVENTORY.json" target="_blank" rel="noreferrer">Open the machine-readable license inventory</a></p><div className="mobile-legal-actions"><button onClick={() => setWorkflowPanel("about")}>Back to About</button></div></>}
      </section>
    </div>}
  </main>;
}
