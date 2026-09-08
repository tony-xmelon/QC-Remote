import brand from "./brand.json" with { type: "json" };

export const QC_LEGAL = {
  copyright: brand.copyrightNotice,
  independence: "QC Remote is an independent, unofficial application. It is not affiliated with, authorized, sponsored, endorsed, or supported by Neural DSP Technologies Oy.",
  trademarks: "Neural DSP and Quad Cortex are trademarks of Neural DSP Technologies Oy. Those names are used only to identify the product with which this application is compatible. All other trademarks belong to their respective owners.",
  productSafety: "QC Remote uses the connected device's existing interface. It does not contain, replace, or modify Quad Cortex firmware. Review device changes, use safe output levels, and keep independent backups of important presets.",
  aiTransparency: "When an online response is labelled AI, you are interacting with an AI system, not a human or the connected device. App status and verified device results are labelled separately. AI output may be inaccurate; verify proposed changes and resulting device state.",
  publisher: {
    legalName: [brand.publisherLegalName, brand.publisherLegalForm].filter(Boolean).join(" "),
    jurisdiction: brand.publisherJurisdiction,
    registeredAddress: brand.publisherRegisteredAddress,
    registerEntry: [brand.publisherTradeRegister, brand.publisherRegistrationNumber].filter(Boolean).join(" · "),
    vatId: brand.publisherVatId,
    website: brand.publisherPublicWebsite,
    phone: brand.publisherPublicPhone,
    supportEmail: brand.supportEmail,
    securityEmail: brand.securityEmail,
    privacyEmail: brand.privacyEmail,
    takedownEmail: brand.takedownEmail,
    securityPolicyUrl: brand.securityPolicyUrl
  },
  privacy: {
    local: "Manual device control, local workspaces, and diagnostics run on this device. QC Remote does not include advertising or analytics.",
    models: "Online model sharing is disabled until you explicitly enable it. When enabled, your message, relevant device context, attachment content or metadata supported by the current platform, and service metadata such as app/model/runtime versions or integrity information may be sent to the provider you choose. The provider's terms, retention rules, and privacy policy apply. Do not submit sensitive material or anything you are not permitted to share. QC Remote blocks recognizable credential-bearing URLs, but this is not a substitute for removing secrets before sending.",
    antigravity: "Antigravity is separate software. QC Remote starts its CLI in a dedicated working directory, but this is not an operating-system sandbox. The CLI runs with your Windows account permissions, and Antigravity's own permissions, terms, and privacy practices apply.",
    voice: "Voice input is used only after you start it. Android requests an on-device recognizer when one is available; otherwise audio may be processed by the operating system or its configured speech provider.",
    relay: "A remote relay terminates its secure connection and can access routed commands and device-state responses while processing them. Pair only with a relay operator you trust; that operator's logging, retention, security, and privacy practices apply."
  },
  thirdParty: [
    "The application includes open-source components under their respective licenses, including React, Tauri or Capacitor, and the native Rust device stack. Complete locked dependency notices and a machine-readable license inventory are included with each build.",
    "Protocol work incorporates information derived from the MIT-licensed pyquadcortex community project. QC Remote is independently developed and does not include Quad Cortex firmware.",
    "Audio, video, images, presets, and other files may be processed only when the user has the necessary rights. Public builds accept direct user attachments and do not download or extract media from streaming services."
  ]
} as const;
