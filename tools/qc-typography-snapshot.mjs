import { writeFile } from "node:fs/promises";

function rounded(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Persist every visible text run inside an 800x480 QC framebuffer.
 *
 * Raster screenshots remain the authority for visual comparison. This sidecar
 * makes the renderer's typography choices explicit so face, size, color,
 * placement, direction, wrapping, and background can be audited separately.
 */
export async function writeTypographySnapshot(page, screenLocator, outputPath, host, screenId) {
  const snapshot = await page.evaluate(({ host, screenId }) => {
    const root = document.querySelector(".qc-screen-bezel");
    if (!(root instanceof HTMLElement)) throw new Error("QC screen bezel is missing");
    const rootRect = root.getBoundingClientRect();
    const visible = (style, rect) => style.display !== "none"
      && style.visibility !== "hidden"
      && Number(style.opacity || 1) > 0
      && rect.width > 0
      && rect.height > 0
      && rect.right > rootRect.left
      && rect.left < rootRect.right
      && rect.bottom > rootRect.top
      && rect.top < rootRect.bottom;
    const colorVisible = (value) => value && value !== "transparent" && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(value);
    const bounds = (rect) => ({
      x: Math.round((rect.left - rootRect.left) * 100) / 100,
      y: Math.round((rect.top - rootRect.top) * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100
    });
    const background = (element) => {
      for (let current = element; current && root.contains(current); current = current.parentElement) {
        const style = getComputedStyle(current);
        if (colorVisible(style.backgroundColor)) return style.backgroundColor;
      }
      return getComputedStyle(root).backgroundColor;
    };
    const firstFamily = (family) => family.split(",")[0].trim().replace(/^['\"]|['\"]$/g, "");
    const familyList = (family) => family.split(",").map((part) => part.trim().replace(/^['\"]|['\"]$/g, "")).filter(Boolean);
    const fontDetected = (family) => {
      if (["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"].includes(family.toLowerCase())) return true;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return false;
      const sample = "mmmmmmmmmmlliWW00";
      context.font = "72px monospace";
      const fallbackWidth = context.measureText(sample).width;
      context.font = `72px ${JSON.stringify(family)}, monospace`;
      return Math.abs(context.measureText(sample).width - fallbackWidth) > .01;
    };
    const textColor = (style, element) => {
      if (element instanceof SVGElement && style.fill && style.fill !== "none") return style.fill === "currentcolor" ? style.color : style.fill;
      return style.color;
    };
    const styleRecord = (style, element) => ({
      fontFamily: style.fontFamily,
      primaryFontFamily: firstFamily(style.fontFamily),
      primaryFontAvailable: fontDetected(firstFamily(style.fontFamily)),
      resolvedFontFamily: familyList(style.fontFamily).find(fontDetected) ?? familyList(style.fontFamily).at(-1) ?? "sans-serif",
      fontStackAvailable: document.fonts.check(`${style.fontSize} ${style.fontFamily}`),
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      fontStretch: style.fontStretch,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      wordSpacing: style.wordSpacing,
      color: textColor(style, element),
      backgroundColor: background(element),
      textAlign: style.textAlign,
      textTransform: style.textTransform,
      whiteSpace: style.whiteSpace,
      overflowWrap: style.overflowWrap,
      direction: style.direction,
      writingMode: style.writingMode,
      textOrientation: style.textOrientation
    });
    const runs = [];
    const push = (kind, text, element, style, rects) => {
      const normalizedRects = [...rects].filter((rect) => visible(style, rect)).map(bounds);
      const color = textColor(style, element);
      if (!text || !normalizedRects.length || !colorVisible(color)) return;
      runs.push({ kind, text, normalizedText: text.replace(/\s+/g, " ").trim(), lines: normalizedRects, ...styleRecord(style, element) });
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!element) continue;
      const style = getComputedStyle(element);
      const range = document.createRange();
      range.selectNodeContents(node);
      push("text", node.nodeValue ?? "", element, style, range.getClientRects());
    }
    for (const element of root.querySelectorAll("input, textarea, select")) {
      if (!(element instanceof HTMLElement)) continue;
      const style = getComputedStyle(element);
      const text = element instanceof HTMLSelectElement
        ? element.selectedOptions[0]?.textContent ?? ""
        : element.value || element.getAttribute("placeholder") || "";
      push("control", text, element, style, [element.getBoundingClientRect()]);
    }
    for (const element of root.querySelectorAll("*")) {
      if (!(element instanceof HTMLElement)) continue;
      for (const pseudo of ["::before", "::after"]) {
        const style = getComputedStyle(element, pseudo);
        const content = style.content;
        if (!content || content === "none" || content === "normal" || content === "\"\"") continue;
        const text = content.replace(/^['\"]|['\"]$/g, "");
        push(pseudo.slice(2), text, element, style, [element.getBoundingClientRect()]);
      }
    }
    runs.sort((left, right) => left.lines[0].y - right.lines[0].y || left.lines[0].x - right.lines[0].x || left.text.localeCompare(right.text));
    return {
      schemaVersion: 1,
      host,
      screenId,
      viewport: { width: Math.round(rootRect.width), height: Math.round(rootRect.height) },
      textRuns: runs.map((run, index) => ({ id: `text-${String(index + 1).padStart(3, "0")}`, ...run }))
    };
  }, { host, screenId });
  if (snapshot.viewport.width !== 800 || snapshot.viewport.height !== 480) {
    throw new Error(`${screenId}: typography snapshot expected 800x480, got ${snapshot.viewport.width}x${snapshot.viewport.height}`);
  }
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

export async function writeTypographyMask(page, screenLocator, outputPath) {
  await page.evaluate(() => {
    const root = document.querySelector(".qc-screen-bezel");
    if (!(root instanceof HTMLElement)) throw new Error("QC screen bezel is missing");
    const pseudoRules = [];
    for (const element of root.querySelectorAll("*")) {
      if (!(element instanceof HTMLElement)) continue;
      for (const [pseudo, attribute] of [["::before", "data-qc-hide-before"], ["::after", "data-qc-hide-after"]]) {
        const content = getComputedStyle(element, pseudo).content;
        if (!content || content === "none" || content === "normal" || content === "\"\"") continue;
        element.setAttribute(attribute, "");
        pseudoRules.push(`[${attribute}]${pseudo}`);
      }
    }
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim() || node.parentElement?.closest("svg")) return NodeFilter.FILTER_REJECT;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(node.parentElement?.tagName ?? "")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node);
    for (const node of textNodes) {
      const wrapper = document.createElement("span");
      wrapper.setAttribute("data-qc-typography-hidden", "");
      node.parentNode?.insertBefore(wrapper, node);
      wrapper.append(node);
    }
    const style = document.createElement("style");
    style.textContent = `
      [data-qc-typography-hidden] { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }
      .qc-screen-bezel svg text, .qc-screen-bezel svg tspan { color: transparent !important; fill: transparent !important; stroke: transparent !important; text-shadow: none !important; }
      .qc-screen-bezel input, .qc-screen-bezel textarea, .qc-screen-bezel select { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }
      .qc-screen-bezel input::placeholder, .qc-screen-bezel textarea::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; }
      ${pseudoRules.length ? `${pseudoRules.join(",")} { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }` : ""}
    `;
    document.head.append(style);
  });
  await screenLocator.screenshot({ path: outputPath, animations: "disabled", timeout: 15000 });
}
