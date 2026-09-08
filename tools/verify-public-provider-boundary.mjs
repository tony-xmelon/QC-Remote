import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function publicProviderBoundaryErrors(sources) {
  const checks = [
    ["Windows public build flag is not compiled into the web app", sources.windowsVite, /__QC_DIRECT_GEMINI_ENABLED__.*VITE_QC_PUBLIC_RELEASE/s],
    ["Windows provider registry does not omit direct Gemini from public builds", sources.windowsProviders, /directGeminiEnabled[\s\S]*"gemini-openai"/],
    ["Windows native provider validation does not reject direct Gemini in public builds", sources.windowsNative, /fn direct_gemini_enabled\(\)[\s\S]*option_env!\("QC_PUBLIC_RELEASE"\)[\s\S]*GEMINI_PROVIDER if direct_gemini_enabled\(\)/],
    ["Windows Google OAuth entry points are not protected by the public-build boundary", sources.windowsNative, /configure_google_oauth_app[\s\S]{0,300}require_direct_gemini\(\)\?/],
    ["Windows Google OAuth connection is not protected by the public-build boundary", sources.windowsNative, /connect_google_oauth[\s\S]{0,180}require_direct_gemini\(\)\?/],
    ["Android web UI does not disable direct Gemini in public builds", sources.androidApp, /directGeminiAvailable = import\.meta\.env\.VITE_QC_PUBLIC_RELEASE !== "1"/],
    ["Android public builds do not exclude the native Gemini plugin source", sources.androidBuild, /qcPublicRelease[\s\S]*exclude 'com\/qccontrol\/mobile\/GeminiPlugin\.java'/],
    ["Android public builds do not omit Firebase AI runtime dependencies", sources.androidBuild, /if \(!qcPublicRelease\) \{[\s\S]{0,260}firebase-ai[\s\S]{0,160}firebase-appcheck-playintegrity/],
    ["Android native plugin registration does not honor the public-build flag", sources.androidMain, /BuildConfig\.QC_DIRECT_GEMINI_ENABLED/],
    ["CI does not pass the public provider boundary into both platform builds", sources.workflow, /Build Android APK[\s\S]*QC_PUBLIC_RELEASE:[\s\S]*VITE_QC_PUBLIC_RELEASE:[\s\S]*Build Windows installer[\s\S]*QC_PUBLIC_RELEASE:[\s\S]*VITE_QC_PUBLIC_RELEASE:/],
    ["Android packaging does not inspect the final APK for disabled provider code", sources.androidPackage, /QC_PUBLIC_RELEASE[\s\S]*GeminiPlugin[\s\S]*firebase\/ai[\s\S]*generativelanguage\.googleapis\.com/],
    ["Windows packaging does not inspect final web assets for the direct Gemini endpoint", sources.windowsPackage, /QC_PUBLIC_RELEASE[\s\S]*generativelanguage\.googleapis\.com[\s\S]*Google Gemini API/],
  ];
  return checks.filter(([, source, pattern]) => !pattern.test(source)).map(([message]) => message);
}

export function currentPublicProviderBoundaryErrors(root = repositoryRoot) {
  const read = (path) => readFileSync(resolve(root, path), "utf8");
  return publicProviderBoundaryErrors({
    windowsVite: read("apps/windows/vite.config.ts"),
    windowsProviders: read("apps/windows/src/model-chat.ts"),
    windowsNative: read("apps/windows/src-tauri/src/chat.rs"),
    androidApp: read("apps/android/src/App.tsx"),
    androidBuild: read("apps/android/android/app/build.gradle"),
    androidMain: read("apps/android/android/app/src/main/java/com/qccontrol/mobile/MainActivity.java"),
    workflow: read(".github/workflows/software-parity.yml"),
    androidPackage: read("scripts/build-android-debug.ps1"),
    windowsPackage: read("scripts/build-windows-installer.ps1"),
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const errors = currentPublicProviderBoundaryErrors();
  if (errors.length) {
    console.error(`Public provider boundary failed:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Public builds exclude direct Gemini API and Firebase AI runtime access.");
  }
}
