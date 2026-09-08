import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const defaultExecutable = "C:\\Program Files\\Neural DSP\\Cortex Control\\Cortex Control.exe";
const defaultOutput = "packages/typescript/qc-theme/assets/fonts";

const expectedFaces = new Map([
  ["IBMPlexSans-Light", "9532b4f0b680f5a598838b96ac431fad33abd42f3a5e90d93b8d88fb5da06261"],
  ["IBMPlexSans-LightItalic", "f20290b06d781a3d501c1e881297a7432e54ffde893e79a98ff8381319d52b45"],
  ["IBMPlexSans", "1306c741d8d26fab364dd6d4b0dc73852de42d42523979f452c77e2e7753dbce"],
  ["IBMPlexSans-Italic", "70dae45e6326cbfc2efcb041d81ee2e0448f4f64eecd2d335b413a178a694523"],
  ["IBMPlexSans-Medium", "d19b58422cc69c86166ed39dc28b3151b27482a64e7661bd642c5d5f7b9e7f95"],
  ["IBMPlexSans-MediumItalic", "9bff925ff21ac9b84668af1b8338498796fe7fb835c1581ed56fb2fb6d7bef89"],
  ["IBMPlexSans-Bold", "afb18cee6998d476be0964c0058cfcceb02f066cc6319c1edeff49aa78cd3517"],
  ["IBMPlexSans-BoldItalic", "2eeb46dcc64482d50723e6f8e381325caae1060701b6cdd6725e348a87432c13"],
]);

function tag(buffer, offset) {
  return buffer.toString("ascii", offset, offset + 4);
}

function decodeName(buffer, platform, offset, length) {
  const bytes = buffer.subarray(offset, offset + length);
  if (platform !== 0 && platform !== 3) return bytes.toString("latin1");
  let value = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    value += String.fromCharCode(bytes.readUInt16BE(index));
  }
  return value;
}

function readPostScriptName(buffer, fontOffset, table) {
  const base = fontOffset + table.offset;
  const count = buffer.readUInt16BE(base + 2);
  const storageOffset = buffer.readUInt16BE(base + 4);
  let fallback;
  for (let index = 0; index < count; index += 1) {
    const record = base + 6 + index * 12;
    const platform = buffer.readUInt16BE(record);
    const language = buffer.readUInt16BE(record + 4);
    const nameId = buffer.readUInt16BE(record + 6);
    if (nameId !== 6) continue;
    const length = buffer.readUInt16BE(record + 8);
    const offset = buffer.readUInt16BE(record + 10);
    const value = decodeName(buffer, platform, base + storageOffset + offset, length);
    fallback ??= value;
    if (language === 0x0409) return value;
  }
  return fallback;
}

function findFonts(buffer) {
  const fonts = [];
  for (let offset = 0; offset + 12 < buffer.length; offset += 1) {
    if (buffer.readUInt32BE(offset) !== 0x00010000) continue;
    const tableCount = buffer.readUInt16BE(offset + 4);
    if (tableCount < 5 || tableCount > 64 || offset + 12 + tableCount * 16 > buffer.length) continue;
    const tables = new Map();
    let length = 12 + tableCount * 16;
    let valid = true;
    for (let index = 0; index < tableCount; index += 1) {
      const record = offset + 12 + index * 16;
      const tableOffset = buffer.readUInt32BE(record + 8);
      const tableLength = buffer.readUInt32BE(record + 12);
      if (tableOffset + tableLength > buffer.length - offset) {
        valid = false;
        break;
      }
      tables.set(tag(buffer, record), { offset: tableOffset, length: tableLength });
      length = Math.max(length, tableOffset + tableLength);
    }
    if (!valid || !tables.has("head") || !tables.has("maxp") || !tables.has("name")) continue;
    const postScriptName = readPostScriptName(buffer, offset, tables.get("name"));
    if (!expectedFaces.has(postScriptName)) continue;
    fonts.push({ offset, length, postScriptName });
    offset += length - 1;
  }
  return fonts;
}

const executable = resolve(process.argv[2] ?? defaultExecutable);
const output = resolve(process.argv[3] ?? defaultOutput);
const executableBytes = await readFile(executable);
const fonts = findFonts(executableBytes);

const allowSubset = process.env.QC_FONT_ALLOW_SUBSET === "1";
if ((!allowSubset && fonts.length !== expectedFaces.size) || (allowSubset && fonts.length === 0)) {
  throw new Error(`Expected ${expectedFaces.size} IBM Plex Sans faces in ${executable}, found ${fonts.length}.`);
}

await mkdir(output, { recursive: true });
for (const font of fonts) {
  const bytes = executableBytes.subarray(font.offset, font.offset + font.length);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const expectedDigest = expectedFaces.get(font.postScriptName);
  if (digest !== expectedDigest) {
    throw new Error(`${font.postScriptName} hash mismatch: expected ${expectedDigest}, received ${digest}.`);
  }
  const target = join(output, `${font.postScriptName}.ttf`);
  await writeFile(target, bytes);
  console.log(`${basename(target)} ${bytes.length} bytes sha256=${digest}`);
}
