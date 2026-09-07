import brand from "./brand.json" with { type: "json" };

export const QC_LEGAL = {
  copyright: brand.copyrightNotice,
  independence: "QC Remote is an independent, unofficial application. It is not affiliated with, authorized, sponsored, endorsed, or supported by Neural DSP Technologies Oy.",
  trademarks: "Neural DSP and Quad Cortex are trademarks of Neural DSP Technologies Oy. Those names are used only to identify the product with which this application is compatible. All other trademarks belong to their respective owners.",
  productSafety: "QC Remote uses the connected device's existing interface. It does not contain, replace, or modify Quad Cortex firmware. Use it at your own risk and keep independent backups of important presets.",
  privacy: {
    local: "Manual device control, local workspaces, and diagnostics run on this device. QC Remote does not include advertising or analytics.",
    relay: "Remote access sends encrypted control traffic through the relay you pair. The relay can route commands and device state, but it does not make the Quad Cortex publicly discoverable.",
    models: "Online model sharing is disabled until you explicitly enable it. When enabled, your message, selected attachments, relevant device context, and service metadata such as app/model/runtime versions or integrity information may be sent to the provider you choose. The provider's terms, retention rules, and privacy policy apply. Do not submit sensitive material or anything you are not permitted to share.",
    voice: "Voice input is used only after you start it. Depending on platform and configuration, audio may be processed by the operating system or its speech provider."
  },
  thirdParty: [
    "The application includes open-source components under their respective licenses, including React, Tauri or Capacitor, and the native Rust device stack. Complete locked dependency notices and a machine-readable license inventory are included with each build.",
    "Protocol work incorporates information derived from the MIT-licensed pyquadcortex community project. QC Remote is independently developed and does not include Quad Cortex firmware.",
    "Audio, video, images, presets, and other files may be processed only when the user has the necessary rights. Public builds accept direct user attachments and do not download or extract media from streaming services."
  ]
} as const;
