import { SHARED_QC_ASSISTANT_TOOLS, assistantAccessPermitsTool, assistantSystemInstructions, booleanAssistantArgument, isReadOnlyQcAssistantTool, numericAssistantArgument, type AssistantAccessMode, type AssistantToolCall, type AssistantToolDefinition } from "@qc-remote/core";

export type ChatRole = "user" | "assistant";
export type ChatAttachment = { name: string; mediaType: string; data: string };
export type ChatMessage = { role: ChatRole; content: string; attachments?: ChatAttachment[] };
export type ChatToolCall = AssistantToolCall;
export type ChatTool = AssistantToolDefinition;

export type ChatCompletionRequest = {
  requestId: string;
  instructions?: string;
  context?: unknown;
  messages: ChatMessage[];
  tools?: ChatTool[];
  maxOutputTokens?: number;
};

export type ChatCompletionResponse = {
  requestId: string;
  responseId?: string;
  text: string;
  toolCalls: ChatToolCall[];
  finishReason: string;
  usage?: ChatUsage;
};

export type ChatUsage = { inputTokens: number; outputTokens: number; thinkingTokens: number; cacheReadTokens: number; totalTokens: number; cumulative: boolean };
export type ChatQuotaGroup = { name: string; label: string; remainingFraction?: number; resetTime?: string };
export type ChatQuota = { available: boolean; label: string; remainingFraction?: number; resetTime?: string; groups?: ChatQuotaGroup[] };
export type AntigravityModel = { id: string; label: string };

export type ChatSettings = {
  provider: ChatProviderId;
  providerName: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  apiKeyConfigured: boolean;
  apiKeyRequired: boolean;
  apiKeySource?: "credential-manager" | "environment" | "none" | "not-required";
  available: boolean;
  detail?: string;
  oauthAvailable: boolean;
  oauthConfigured: boolean;
  oauthProject?: string;
};

export type GoogleProject = { id: string; name: string };
export type GoogleOAuthResult = { projects: GoogleProject[]; selectedProject?: string };

export type ChatSettingsUpdate = Pick<ChatSettings, "provider" | "model" | "baseUrl" | "timeoutMs">;

export type ChatProviderId = "openai-responses" | "antigravity-cli" | "gemini-openai" | "anthropic-messages" | "local-responses";

export type ChatProviderDefinition = {
  label: string;
  shortLabel: string;
  model: string;
  baseUrl: string;
  endpointEditable: boolean;
  credentialLabel: string;
  setupUrl?: string;
  pricingUrl?: string;
  guidance: string;
};

export const chatProviderDefaults: Record<ChatProviderId, ChatProviderDefinition> = {
  "openai-responses": {
    label: "OpenAI API", shortLabel: "OpenAI", model: "gpt-5-mini", baseUrl: "https://api.openai.com/v1", endpointEditable: true,
    credentialLabel: "OpenAI project API key", setupUrl: "https://platform.openai.com/api-keys", pricingUrl: "https://openai.com/api/pricing/",
    guidance: "OpenAI API billing is separate from ChatGPT. Create a project key, paste it once, and QC Remote stores it in Windows Credential Manager."
  },
  "antigravity-cli": {
    label: "Google AI subscription (Antigravity)", shortLabel: "Google subscription", model: "gemini-3.7-flash-medium", baseUrl: "https://antigravity.google", endpointEditable: false,
    credentialLabel: "Google account", setupUrl: "https://antigravity.google/docs/cli/install/", pricingUrl: "https://antigravity.google/pricing",
    guidance: "Uses a separately installed Antigravity CLI and the account signed in there. Availability, eligibility, quota, and terms are controlled by that provider; QC Remote does not supply an account or API key."
  },
  "gemini-openai": {
    label: "Google Gemini API", shortLabel: "Gemini", model: "gemini-3.1-flash-lite", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", endpointEditable: false,
    credentialLabel: "Gemini auth key", setupUrl: "https://aistudio.google.com/app/apikey", pricingUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    guidance: "Continue with Google to use an eligible Google Cloud project's Gemini quota, or paste a Gemini auth key as a fallback. Consumer Gemini subscriptions do not include API quota."
  },
  "anthropic-messages": {
    label: "Anthropic Claude API", shortLabel: "Anthropic", model: "claude-haiku-4-5-20251001", baseUrl: "https://api.anthropic.com/v1", endpointEditable: false,
    credentialLabel: "Anthropic personal API key", setupUrl: "https://platform.claude.com/settings/keys", pricingUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    guidance: "Claude subscriptions and API usage are separate. Create a personal API key in Claude Console and paste it once."
  },
  "local-responses": {
    label: "Local model server", shortLabel: "Local", model: "gpt-oss:20b", baseUrl: "http://127.0.0.1:11434/v1", endpointEditable: true,
    credentialLabel: "No credential required", guidance: "Run Ollama or LM Studio locally. The server must support the OpenAI Responses API and function tools."
  }
} as const;

export function chatProviderDefinition(id: ChatProviderId): ChatProviderDefinition {
  return chatProviderDefaults[id];
}

export const chatCredentialInputProps = {
  type: "password",
  autoComplete: "new-password",
  spellCheck: false,
  autoCapitalize: "none"
} as const;

export function chatCredentialStatus(settings?: ChatSettings): string {
  if (!settings) return "Credential status unavailable";
  if (settings.provider === "antigravity-cli") return settings.available ? "Separate Antigravity CLI available · provider-managed sign-in" : settings.detail ?? "Antigravity CLI unavailable";
  if (settings.provider === "gemini-openai" && settings.oauthConfigured) {
    return settings.oauthProject
      ? `Google connected · quota project ${settings.oauthProject}`
      : "Google connected · select a quota project";
  }
  if (!settings.apiKeyRequired) return "No API key required for this loopback provider";
  if (!settings.apiKeyConfigured) return "No API key configured";
  if (settings.apiKeySource === "credential-manager") return "API key stored in Windows Credential Manager";
  if (settings.apiKeySource === "environment") return "API key supplied by the desktop environment";
  return "API key configured";
}

const objectSchema = (properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> => ({
  type: "object", properties, required, additionalProperties: false
});
const number = { type: "number" };
const string = { type: "string" };
const boolean = { type: "boolean" };

export const qcChatTools: ChatTool[] = [
  ...SHARED_QC_ASSISTANT_TOOLS,
  { name: "save_current_unsaved_preset", description: "Save the active Unsaved preset into its current empty device slot under the supplied name. Use this when the user explicitly asks to save the current Unsaved preset; the app supplies the trusted setlist and slot.", inputSchema: objectSchema({ name: string }, ["name"]) }
];

export function isReadOnlyChatTool(name: string): boolean {
  return isReadOnlyQcAssistantTool(name);
}

export function assistantAccessPermitsChatTool(mode: AssistantAccessMode, name: string): boolean {
  if (name === "save_current_unsaved_preset") return mode === "modify" || mode === "full";
  return assistantAccessPermitsTool(mode, name);
}

export function chatInstructions(): string {
  return assistantSystemInstructions([
    "When the active preset is named Unsaved and the user asks to save it in that current slot, use save_current_unsaved_preset rather than rename_current_preset or save_preset_as.",
    "Analyze only media files the user attaches directly. Do not download, extract, or request copies from streaming-service URLs."
  ]);
}

export function isChatUnavailable(error: unknown): boolean {
  const detail = chatErrorMessage(error);
  return /not.configured|unavailable|api.key|provider|connection.refused|chat_(?:completion|with_model)|desktop.runtime.is.not.active/i.test(detail);
}

export function chatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const value = error as { code?: unknown; message?: unknown; retryable?: unknown };
    const message = typeof value.message === "string" ? value.message : "The conversational model request failed.";
    const code = typeof value.code === "string" ? `[${value.code}] ` : "";
    const retry = value.retryable === true ? " You can retry this request." : "";
    return `${code}${message}${retry}`;
  }
  return "The conversational model request failed.";
}

export function isLoopbackChatUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

export function numericArgument(call: ChatToolCall, name: string): number {
  return numericAssistantArgument(call, name);
}

export function booleanArgument(call: ChatToolCall, name: string): boolean {
  return booleanAssistantArgument(call, name);
}
