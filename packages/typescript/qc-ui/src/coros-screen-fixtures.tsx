import { useState, type CSSProperties, type ReactNode } from "react";
import type { GridBlock, PresetList, PresetSnapshot } from "@qc-remote/client";
import { QC_COLORS, QC_TYPOGRAPHY } from "@qc-remote/theme";
import { officialBlockVisual } from "./block-visuals";
import { openSplitPath } from "./coros-ui";
import { QcDeviceGlyph } from "./device-glyph";
import { QcDeviceCategoryGlyph as DeviceCategoryGlyph } from "./device-category-glyph";
import { QcCaptureFilterIcon, QcDirectoryIcon, QcEditorIcon, QcEqIcon, QcHardwareIcon, QcLibraryIcon, QcModeGlyph, QcPresetStackIcon, QcScreenHeaderGlyph, QcSettingsIcon, QcUiIcon } from "./theme-icons";
import { QcCaptureKindGlyph, QcGigStompGlyph, QcHeadphonesGlyph, QcIoPortGlyph, QcLooperActionGlyph, QcScreenGlyph, type QcLooperActionGlyphName, type QcScreenGlyphName } from "./screen-glyphs";
import "./fixture-live-surface.css";
import "./remaining-fixtures.css";
import "./remaining-fixtures-fixes.css";
import "./official-settings-midi.css";
import "./official-expression.css";
import "./official-empty-slot.css";
import "./official-plugin-folders.css";
import "./official-directory.css";
import "./official-device-browser.css";
import "./official-looper-eq.css";
import "./official-io.css";
import "./official-gig.css";
import "./official-modes.css";
import "./official-settings-device.css";
import "./official-tuner.css";
import "./settings-system-panes.css";
import "./qc-device-typography.css";

type OfficialGigMode = "preset" | "scene" | "stomp" | "hybrid";

function GigStompGlyph({ index }: { index: number }) {
  return <QcGigStompGlyph index={index} />;
}

function OfficialGigModeIcon({ mode }: { mode: OfficialGigMode }) {
  if (mode === "hybrid") return <span className="gig-mode-hybrid"><svg viewBox="0 0 24 24" aria-hidden="true"><QcModeGlyph mode="SCENE" /></svg><b>+</b><svg viewBox="0 0 24 24" aria-hidden="true"><QcModeGlyph mode="STOMP" /></svg></span>;
  return <svg className={`gig-mode-icon gig-mode-icon-${mode}`} viewBox="0 0 24 24" aria-hidden="true"><QcModeGlyph mode={mode.toUpperCase() as PresetSnapshot["mode"]} /></svg>;
}

function CorOsOfficialGig({ mode }: { mode: OfficialGigMode }) {
  const preset = [["1A", "Brit 2203"], ["1B", "Brit\nPlexi100\nNormal"], ["1C", "US TWN\nVibrato"], ["1D", "Rols Jazz\nCH120"], ["1E", "California\nTremo\nRed"], ["1F", "EV101III\nRed"], ["1G", "Freeman\n100\nRhythm"], ["1H", "D-Cell H4\nCh3"]];
  const scenes = ["British\n2203", "+MX OD\n+Doubler", "+Brit\nGovernor", "+Rodent\nDrive", "Dry\nDouble", "+MX &\nDlys", "Solo\nBoost", "Juicy Low\nGain"];
  const stomps = [["A", "Crying\nWah"], ["B", "MX\nClassicOD 4"], ["C", "Brit\nGovernor"], ["D", "Rodent\nDrive"], ["E", "Looper X"], ["F", "Transpose"], ["G", "Multiple\ndevices (2)"], ["H", "Room"]];
  const sceneMode = mode === "scene";
  const stompMode = mode === "stomp";
  return <section className={`qc-screen gig-official is-${mode === "hybrid" ? "hybrid" : sceneMode ? "scene" : stompMode ? "stomp" : "preset"}`}><header><span>1A Brit 2203</span><button><OfficialGigModeIcon mode={mode} /></button><button><b>A</b></button><button><QcUiIcon kind="check" /></button></header><i /><main className="gig-official-tiles">{mode === "preset" ? preset.map(([location, name]) => <article key={location}><small>{location}</small><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>) : sceneMode ? scenes.map((name, index) => <article key={name} data-letter={String.fromCharCode(65 + index)}><SceneTileTools /><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>) : mode === "hybrid" ? [...scenes.slice(0, 4).map((name, index) => ({ letter: String.fromCharCode(65 + index), name, scene: true })), ...stomps.slice(4).map(([letter, name]) => ({ letter, name, scene: false }))].map(({ letter, name, scene }, index) => <article key={letter} className={scene ? "hybrid-scene" : "hybrid-stomp"} data-letter={letter} style={{ background: ["#ff272d", "#0b2027", "#302f10", "#301021", "#ff272d", "#302f10", "#171b18", "#10ead5"][index] }}>{scene ? <SceneTileTools /> : <small><QcEditorIcon kind="footswitch" />{letter}</small>}{!scene && <b className="has-device-glyph"><GigStompGlyph index={index} /></b>}<strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>) : stomps.map(([letter, name], index) => <article key={letter}><small><QcEditorIcon kind="footswitch" />{letter}</small><b className="has-device-glyph"><GigStompGlyph index={index} /></b><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>)}</main></section>;
}

export type { CorOsScreenView } from "./coros-screen-fixture-data";
import type { CorOsScreenView } from "./coros-screen-fixture-data";
function ModeGlyph({ mode }: { mode: PresetSnapshot["mode"] }) {
  return <QcModeGlyph mode={mode} />;
}

function DirectoryIcon({ kind, number }: Parameters<typeof QcDirectoryIcon>[0]) {
  return <QcDirectoryIcon kind={kind} number={number} />;
}

function PhysicalDirectoryStatusIcon() {
  return <QcScreenGlyph kind="status" className="physical-directory-status" />;
}

function CaptureLibraryIcon() {
  return <QcLibraryIcon kind="capture-library" />;
}

function CaptureHeaderIcon() {
  return <QcLibraryIcon kind="capture-header" />;
}

function FavoriteIcon({ kind }: { kind: "heart" | "clock" | "binoculars" | "broken-heart" }) {
  return <QcLibraryIcon kind={kind} />;
}

function DirectoryCategoryGlyph({ label }: { label: string }) {
  if (label === "Presets") return <QcDirectoryIcon kind="grid" />;
  if (label === "Neural Captures") return <QcLibraryIcon kind="capture-header" />;
  if (label === "Impulse Responses") return <QcLibraryIcon kind="impulse-response" />;
  return <DeviceCategoryGlyph label="Plugins" />;
}

type DirectoryFixtureView = "directory-presets" | "directory-categories" | "directory-captures" | "directory-irs" | "directory-plugins" | "directory-favorites" | "directory-search" | "directory-search-results" | "directory-sort" | "directory-filter" | "directory-arrange" | "directory-copy" | "directory-nested" | "directory-new-folder" | "directory-item-context" | "directory-cloud-upload";
type OfficialDirectoryView = "directory-presets" | "directory-captures" | "directory-irs" | "directory-plugins" | "directory-favorites" | "directory-search-results" | "directory-nested" | "directory-cloud-upload";
const CAPTURE_FILTERS = ["Default", "Amp", "Combo Amp", "Amp + Cab", "Cab", "Overdrive", "Fuzz", "Compressor"] as const;

function CorOsOfficialDirectory({ view, filter = false }: { view: OfficialDirectoryView; filter?: boolean }) {
  if (filter) return <section className="qc-screen directory-official directory-captures-official directory-filter-official"><header><button className="directory-official-category"><QcLibraryIcon kind="capture-header" /><span>Neural Captures</span><b><QcUiIcon kind="down" /></b></button><span /><button><QcDirectoryIcon kind="filter" /></button><button><QcUiIcon kind="check" /></button></header><main><nav className="directory-filter-list">{CAPTURE_FILTERS.map((label, index) => <button key={label} className={index === 0 ? "is-active" : undefined}><b><QcCaptureFilterIcon kind={label} /></b><span>{label}</span>{index === 0 && <i><QcUiIcon kind="check" /></i>}</button>)}</nav></main></section>;
  if (view === "directory-presets") {
    const rows = ["1A Brit 2203", "1B Brit Plexi100 Normal", "1C US TWN Vibrato", "1D Rols Jazz CH120", "1E California Tremo Red", "1F EV101III Red", "1G Freeman 100 Rhythm", "1H D-Cell H4 Ch3"];
    return <section className="qc-screen directory-official directory-presets-official"><header><button className="directory-official-category"><DirectoryIcon kind="grid" />Presets <b><QcUiIcon kind="down" /></b></button><span /><button><DirectoryIcon kind="sort" /></button><button><DirectoryIcon kind="arrange" /></button><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></header><main><nav><button><b><DirectoryIcon kind="download" /></b><span>Downloads</span></button><button><b><DirectoryIcon kind="cloud" /></b><span>Cloud Presets</span></button><button className="is-active"><b><DirectoryIcon kind="folder" number={0} /></b><span>Factory Presets</span></button><button><b><DirectoryIcon kind="folder" number={1} /></b><span>My Presets</span><small><QcUiIcon kind="more" /></small></button><button className="is-muted"><b><DirectoryIcon kind="new-folder" /></b><span>New Setlist</span></button></nav><nav className="directory-preset-banks">{Array.from({ length: 14 }, (_, index) => <button key={index}>{index + 1}</button>)}</nav><section className="directory-official-list">{rows.map((name, index) => <button key={name} style={index === 0 ? { color: "#2df36a" } : undefined}><span>{name}</span><b><QcUiIcon kind="more" /></b></button>)}</section></main></section>;
  }
  if (view === "directory-cloud-upload") {
    const rows = ["1A My Main Rig", "1B Nano Cortex FX Loop", "1C 65' Deluxe Reverb", "1D Synth Arp", "1E Lofi Bass", "1F Jazz Solo", "1G Full Band Recording", "1H Parallax Chain"];
    return <section className="qc-screen directory-official directory-upload-official"><header><button className="directory-official-category"><DirectoryIcon kind="grid" />Presets <b><QcUiIcon kind="down" /></b></button><button className="is-cloud"><DirectoryIcon kind="cloud-upload" /></button><span /><button><DirectoryIcon kind="upload" /></button><button><DirectoryIcon kind="done" /></button></header><main><nav><button className="is-active"><b><DirectoryIcon kind="folder" number={1} /></b><span>My Presets</span><small><QcUiIcon kind="more" /></small></button></nav><nav className="directory-upload-banks">{Array.from({ length: 14 }, (_, index) => <button key={index}>{index + 1}</button>)}</nav><section className="directory-official-list">{rows.map(name => <button key={name}><span>{name}</span><b><DirectoryIcon kind="cloud-upload" /></b></button>)}</section></main></section>;
  }
  if (view === "directory-search-results") {
    const rows = ["Blasted Brit", "Bright Brit", "Brit 2203", "Brit Bass 50 Normal", "Brit Bass 50 Patch", "Brit Plexi 50 Patch"];
    return <section className="qc-screen directory-official directory-search-official"><header><button className="directory-search-field"><DirectoryIcon kind="search" /><span>Brit</span></button><button className="directory-search-tab is-active"><DirectoryCategoryGlyph label="Presets" /> (15)</button><button className="directory-search-tab"><DirectoryCategoryGlyph label="Neural Captures" /> (50)</button><button className="directory-search-tab"><DirectoryCategoryGlyph label="Impulse Responses" /> (0)</button><span /><button><QcUiIcon kind="up" /></button><button><QcUiIcon kind="check" /></button></header><main><section className="directory-official-list"><header>DEVICE DIRECTORIES <b><QcUiIcon kind="down" /></b></header>{rows.map(name => <button key={name}><span>{name}<small>Neural DSP</small></span><b>B　<QcUiIcon kind="more" /></b></button>)}</section></main></section>;
  }
  if (view === "directory-nested") {
    const rows = ["4-Comp Custom 1", "4-Comp Custom 2", "4-Comp Custom 3", "4-Comp Custom 4", "4-Comp Custom 5", "4-Comp Custom 6", "4-Comp Custom 7"];
    return <section className="qc-screen directory-official directory-nested-official"><header><button className="directory-nested-back"><QcUiIcon kind="previous" /></button><button className="directory-official-category"><CaptureHeaderIcon /><span>Captures</span><b><QcUiIcon kind="down" /></b></button><span /><button><DirectoryIcon kind="sort" /></button><button><QcDirectoryIcon kind="filter" /></button><button><DirectoryIcon kind="arrange" /></button><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></header><main><nav><button className="directory-nested-root"><b><DirectoryIcon kind="folder" /></b><span><small>Captures Library</small>Factory Captures V2</span></button>{["Amp", "Combo Amp", "Compressor", "Fuzz", "Overdrive"].map(label => <button key={label} className="is-child"><b><DirectoryIcon kind="folder" /></b><span>{label}</span></button>)}</nav><section className="directory-official-list">{rows.map(name => <button key={name}><span>{name}<small>NeuralDSP</small></span><b>4　<QcUiIcon kind="more" /></b></button>)}<aside className="directory-nested-index">{["#", "•", "A", "•", "I", "•", "R", "•", "Z"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</aside></section></main></section>;
  }
  const favorite = view === "directory-favorites";
  const captures = view === "directory-captures";
  const irs = view === "directory-irs";
  const category = favorite ? "Favorites and Recent" : captures ? "Neural Captures" : irs ? "Impulse Responses" : "Plugin Presets";
  const rows = favorite ? ["Deep Underground", "Elegance", "Helsinki Complex", "Miller Lite", "My Brit Sound", "Wild Buffalo", "You Have"] : captures ? ["4-Comp Custom 1", "4-Comp Custom 2", "4-Comp Custom 3", "4-Comp Custom 4", "4-Comp Custom 5", "4-Comp Custom 6", "4-Comp Custom 7"] : irs ? ["IR21", "IR20", "IR19", "IR18", "IR17", "IR16", "IR15"] : [];
  const nav = favorite ? [["category", "Presets", "active"], ["category", "Neural Captures", ""], ["category", "Impulse Responses", ""]] : captures ? [["download", "Downloads", ""], ["cloud", "Cloud Captures", ""], ["capture-library", "Captures Library", "active"], ["folder", "Factory Captures V1", "child"], ["folder", "Factory Captures V2", "child"], ["folder", "My Captures", "child"], ["folder", "New Folder", "child muted"]] : irs ? [["cloud", "Cloud IRs", "active"], ["category", "IRs Library", ""], ["folder", "My IRs", "child"], ["folder", "New Folder", "child muted"]] : [["folder", "Archetype: Cory Wong X", ""], ["folder", "Archetype: Gojira X", ""], ["folder", "Archetype: Nolly X", ""], ["folder", "Archetype: Plini X", ""], ["folder", "Fortin Nameless Suite X", ""], ["folder", "Parallax X", ""], ["folder", "Soldano SLO-100 X", ""]];
  return <section className={`qc-screen directory-official${view === "directory-plugins" ? " is-plugins" : ""}${favorite ? " directory-favorites-official" : ""}${captures ? " directory-captures-official" : ""}${irs ? " directory-irs-official" : ""}`}><header><button className="directory-official-category">{view === "directory-plugins" ? <><DeviceCategoryGlyph label="Plugins" fallback="" /><span>{category}</span></> : captures ? <><CaptureHeaderIcon /><span>{category}</span></> : favorite ? <><FavoriteIcon kind="heart" /><span>{category}</span></> : <><DirectoryCategoryGlyph label="Impulse Responses" /><span>{category}</span></>}<b><QcUiIcon kind="down" /></b></button>{favorite ? <><button className="favorite-tab"><FavoriteIcon kind="heart" /></button><button className="favorite-tab"><FavoriteIcon kind="clock" /></button><button className="favorite-sort"><DirectoryIcon kind="sort" /></button><button><DirectoryIcon kind="arrange" /></button><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></> : view === "directory-plugins" ? <><button className="plugin-refresh"><GridToolbarIcon kind="refresh" /></button><span /><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></> : captures ? <><button className="directory-primary-action"><DirectoryIcon kind="cloud-upload" /></button><span /><button><DirectoryIcon kind="sort" /></button><button><DirectoryIcon kind="filter" /></button><button><DirectoryIcon kind="arrange" /></button><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></> : <><button className="directory-primary-action"><GridToolbarIcon kind="refresh" /></button><span /><button><DirectoryIcon kind="sort" /></button><button><DirectoryIcon kind="arrange" /></button><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></>}</header><main><nav>{nav.map(([glyph, label, className]) => <button key={label} className={className?.split(" ").map(name => `is-${name}`).join(" ")}><b>{glyph === "folder" ? <DirectoryIcon kind="folder" /> : glyph === "download" ? <DirectoryIcon kind="download" /> : glyph === "cloud" ? <DirectoryIcon kind="cloud" /> : glyph === "capture-library" ? <CaptureLibraryIcon /> : <DirectoryCategoryGlyph label={label} />}</b><span>{label}</span></button>)}</nav><section className="directory-official-list">{view === "directory-plugins" ? <DeviceCategoryGlyph className="plugin-directory-logo" label="Plugins" /> : rows.map((name, index) => <button key={name}><span>{name}{!favorite && <small>{captures ? "NeuralDSP" : irs ? "On device" : ""}</small>}</span>{favorite ? <i><b><FavoriteIcon kind="binoculars" /></b><b><FavoriteIcon kind="broken-heart" /></b></i> : irs ? <i><b><span><QcUiIcon kind="check" /></span></b><b><DirectoryIcon kind="trash" /></b></i> : <b>{captures && "4　"}<QcUiIcon kind="more" /></b>}</button>)}{favorite && <aside className="directory-favorite-index">{["#", "•", "A", "•", "I", "•", "R", "•", "Z"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</aside>}{captures && <aside className="directory-capture-index">{["#", "•", "A", "•", "I", "•", "R", "•", "Z"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</aside>}</section></main></section>;
}

function CorOsDirectoryFixture({ view, physicalContext = false }: { view: DirectoryFixtureView; physicalContext?: boolean }) {
  const itemContext = view === "directory-item-context" || physicalContext;
  const category = view === "directory-captures" ? "Neural Captures" : view === "directory-irs" ? "Impulse Responses" : view === "directory-plugins" ? "Plugin Presets" : "Presets";

  const categoryItems = ["Presets", "Neural Captures", "Impulse Responses", "Plugin Presets"];
  const names = itemContext ? ["Demo Clean", "Demo Chorus", "Demo Crunch", "Demo Ambient", "Demo Lead", "Demo Rhythm", "Demo Acoustic"] : category === "Neural Captures" ? ["Demo Bass DI", "Brit Crunch 57", "Cali Recto Lead", "Chief OD Push", "Clean Twin 121", "German High Gain", "Vintage Fuzz"] : category === "Impulse Responses" ? ["1x12 Blue Alnico", "2x12 UK C30 65", "4x10 Bass Modern", "4x12 Green 25", "Room Ribbon 160", "Studio 121 Dark", "User IR 01"] : category === "Plugin Presets" ? ["Plugin Clean", "Plugin Rhythm", "Plugin Lead", "Plugin Crystal", "Plugin Modern", "Plugin Crunch", "Plugin Grind"] : ["Demo Scratch", "Clean Platform", "Edge of Breakup", "Ambient Lead", "Modern Rhythm", "Bass Parallel", "Acoustic Live"];
  const search = view === "directory-search" || view === "directory-search-results";
  const results = view === "directory-search-results" ? names.filter((name) => /clean|crunch|scratch/i.test(name)) : names;
  return <section className={`qc-screen coros-directory-fixture${itemContext ? " is-physical-context" : ""}`} aria-label={view.replaceAll("-", " ")}>
    <header><button className="directory-fixture-category">{itemContext ? <DirectoryIcon kind="grid" /> : <span><DirectoryCategoryGlyph label={category} /></span>}<strong>{category}</strong><b><QcUiIcon kind="down" /></b></button><button className={view === "directory-cloud-upload" ? "is-cloud" : ""}>{itemContext ? <PhysicalDirectoryStatusIcon /> : <QcDirectoryIcon kind="cloud" />}</button><i /><button>{<DirectoryIcon kind="sort" />}</button><button>{<DirectoryIcon kind="arrange" />}</button><button>{<DirectoryIcon kind="search" />}</button><em /><button>{<DirectoryIcon kind="done" />}</button></header>
    <main>
      <nav className="directory-fixture-folders">{itemContext ? <><button><b><DirectoryIcon kind="download" /></b><span>Downloads</span></button><button><b><DirectoryIcon kind="cloud" /></b><span>Cloud Presets</span></button><button><b><DirectoryIcon kind="folder" number={0} /></b><span>Factory Presets</span></button><button className="is-active"><b><DirectoryIcon kind="folder" number={1} /></b><span>My Presets</span><b><QcUiIcon kind="more" /></b></button><button className="is-child"><b><DirectoryIcon kind="folder" number={2} /></b><span>Live Set</span><b><QcUiIcon kind="more" /></b></button><button className="is-child"><b><DirectoryIcon kind="folder" number={3} /></b><span>Recording Set</span><b><QcUiIcon kind="more" /></b></button><button className="is-child"><b><DirectoryIcon kind="folder" number={4} /></b><span>Acoustic Set</span><b><QcUiIcon kind="more" /></b></button></> : <><button><DirectoryIcon kind="download" /><span>Downloads</span></button><button><DirectoryIcon kind="cloud" /><span>Cloud {category}</span></button><button><DirectoryIcon kind="folder" /><span>Factory {category}</span></button><button className="is-active"><DirectoryIcon kind="folder" /><span>My {category}</span><b><QcUiIcon kind="more" /></b></button>{view === "directory-nested" ? <><button className="is-child"><DirectoryIcon kind="folder" /><span>Live Set</span></button><button className="is-child is-active"><DirectoryIcon kind="folder" /><span>Festival</span></button></> : <button className="is-child"><DirectoryIcon kind="folder" /><span>Live Set</span></button>}<button className="is-new"><DirectoryIcon kind="new-folder" /><span>New {category === "Presets" ? "Setlist" : "Folder"}</span></button></>}</nav>
      <nav className="directory-fixture-banks">{(itemContext ? Array.from({ length: 14 }, (_, index) => index + 1) : [29, 30, 31, 32, 33, 34, 35]).map((bank) => <button key={bank} className={bank === (itemContext ? 2 : 32) ? "is-active" : ""}>{bank}</button>)}</nav>
      <section className="directory-fixture-items">{search && <div className="directory-search-field"><span><DirectoryIcon kind="search" /></span><strong>{view === "directory-search-results" ? "Clean" : "Search Directory"}</strong><button><QcUiIcon kind="close" /></button></div>}{(search ? results : names).map((name, index) => itemContext ? <button key={name} className={index === 6 ? "is-current" : ""}><span className="physical-preset-name">{`2${String.fromCharCode(65 + index)} ${name}`}</span><b><QcUiIcon kind="more" /></b></button> : <button key={name} className={index === 0 ? "is-current" : ""}><strong>{category === "Presets" ? `32${String.fromCharCode(65 + index)}` : <DirectoryCategoryGlyph label={category} />}</strong><span>{name}<small>{category === "Neural Captures" ? "GUITAR · AMP" : category === "Impulse Responses" ? "48 kHz · 1024 samples" : category === "Plugin Presets" ? "NEURAL DSP X" : "USER"}</small></span>{view === "directory-arrange" ? <i><DirectoryIcon kind="arrange" /></i> : <b><QcUiIcon kind="more" /></b>}</button>)}</section>
    </main>
    {view === "directory-categories" && <aside className="directory-category-menu">{categoryItems.map((label) => <button key={label}><span><DirectoryCategoryGlyph label={label} /></span>{label}<b><QcUiIcon kind="next" /></b></button>)}</aside>}
    {view === "directory-favorites" && <aside className="directory-favorites-panel"><header><button className="is-active">FAVORITES</button><button>RECENT</button></header>{names.slice(0, 5).map((name) => <button key={name}><span><QcUiIcon kind="favorite" /></span>{name}<b><QcUiIcon kind="more" /></b></button>)}</aside>}
    {view === "directory-sort" && <aside className="directory-tool-menu"><strong>SORT BY</strong>{["Position", "Name A–Z", "Name Z–A", "Date created", "Recently used"].map((label, index) => <button key={label} className={index === 0 ? "is-active" : ""}>{label}<b>{index === 0 && <QcUiIcon kind="check" />}</b></button>)}</aside>}
    {view === "directory-filter" && <aside className="directory-tool-menu is-filter"><strong>FILTER</strong>{["All items", "Favorites", "Downloaded", "My items", "Factory"].map((label, index) => <button key={label} className={index === 0 ? "is-active" : ""}>{label}<b>{index === 0 && <QcUiIcon kind="check" />}</b></button>)}</aside>}
    {view === "directory-arrange" && <div className="directory-mode-bar"><strong>ARRANGE</strong><span>Drag items to reorder them</span><button>CANCEL</button><button>DONE</button></div>}
    {view === "directory-copy" && <aside className="directory-copy-dialog"><header>Copy 3 items to…</header>{["My Presets", "Live Set", "Festival", "Studio"].map((label, index) => <button key={label} className={index === 2 ? "is-active" : ""}><DirectoryIcon kind="folder" />{label}<b><QcUiIcon kind="next" /></b></button>)}<footer><button>CANCEL</button><button>COPY HERE</button></footer></aside>}
    {view === "directory-new-folder" && <aside className="directory-name-dialog"><header>New Setlist</header><label>NAME<input readOnly value="New Setlist" /></label><footer><button>CANCEL</button><button>CREATE</button></footer></aside>}
    {view === "directory-item-context" && <><i className="directory-context-scrim" /><aside className="directory-item-menu">{["Edit", "Copy", "Cut", "Delete"].map(label => <button key={label}>{label}</button>)}</aside></>}
    {view === "directory-cloud-upload" && <div className="directory-mode-bar is-cloud"><strong>UPLOAD TO CORTEX CLOUD</strong><span>Select Presets, Neural Captures, or IRs</span><button>CANCEL</button><button>UPLOAD (2)</button></div>}
  </section>;
}

type RemainingFixtureView = "fixture-boot" | "fixture-shutdown" | "fixture-copy-scene" | "fixture-swap-scene" | "fixture-delete" | "fixture-input-gate" | "fixture-editor-pages" | "fixture-editor-cab" | "fixture-editor-eq" | "fixture-editor-capture" | "fixture-warning-clip" | "fixture-warning-dsp";

function CorOsRemainingFixture({ view }: { view: RemainingFixtureView }) {
  if (view === "fixture-boot") return <section className="qc-screen coros-boot"><b><QcHardwareIcon kind="brand-pulse" /></b><h1>QUAD CORTEX</h1><i><span /></i><small>STARTING COROS</small></section>;
  if (view === "fixture-delete") return <CorOsDeleteConfirmation />;
  const dialog = view === "fixture-shutdown" ? ["POWER OFF?", "Any unsaved changes will be lost.", "POWER OFF"] : view === "fixture-warning-clip" ? ["INPUT CLIPPING", "Reduce Input 1 gain to prevent unwanted distortion.", "OPEN I/O SETTINGS"] : view === "fixture-warning-dsp" ? ["DSP LIMIT REACHED", "There is not enough processing power to add this device.", "OK"] : undefined;
  if (dialog) return <section className="qc-screen coros-fixture-dialog"><div className="fixture-grid-ghost">{Array.from({length:7},(_,i)=><i key={i}/>)}</div><aside className={view.includes("warning") ? "is-warning" : ""}><b>{view.includes("warning") ? "!" : "?"}</b><h1>{dialog[0]}</h1><p>{dialog[1]}</p><footer><button>CANCEL</button><button>{dialog[2]}</button></footer></aside></section>;
  if (view === "fixture-copy-scene" || view === "fixture-swap-scene") return <section className="qc-screen coros-fixture-dialog is-scene-command"><div className="scene-command-grid"><header><strong><span>32</span>D</strong><span>Unsaved</span><nav><GridToolbarIcon kind="undo" /><b>A</b><GridToolbarIcon kind="save" /><QcUiIcon kind="more" /></nav></header><span className="scene-command-mode"><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="STOMP" /></svg><b>STOMP</b></span><main><span className="scene-command-insert"><QcUiIcon kind="add" /></span>{Array.from({ length: 8 }, (_, index) => <i key={index}>{index === 0 ? <>In<br />1</> : index === 1 ? <>Multi<br />Out</> : <QcUiIcon kind="add" />}</i>)}</main></div><aside><h1>{view === "fixture-copy-scene" ? "Copy Scene A" : "Swap Scene A"}</h1><p>Press Scene destination footswitch.</p><footer><button>CANCEL</button></footer></aside></section>;
  if (view === "fixture-editor-capture") return <section className="qc-screen capture-editor-physical" aria-label="Neural Capture editor">
    <header><strong><span>1</span>D</strong><h1>Fender Deluxe Reverb</h1><nav><i><GridToolbarIcon kind="undo" /></i><b>A</b><i><GridToolbarIcon kind="save" /></i><i><QcUiIcon kind="more" /></i></nav><em><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="PRESET" /></svg><span>PRESET</span></em></header>
    <div className="capture-editor-grid"><span>In<br />1</span><i className="capture-cable" /><i className="capture-block is-gate"><DeviceCategoryGlyph label="Filter" /></i><i className="capture-block is-capture"><DeviceCategoryGlyph label="Neural Capture" /></i><i className="capture-block"><DeviceCategoryGlyph label="Neural Capture" /></i><span>Row<br />3</span></div>
    <section className="capture-editor-panel"><header><button><QcUiIcon kind="more" /></button><span><small>NEURAL CAPTURE</small><strong>Keeley Mod BD-2 3</strong></span><nav><i><QcUiIcon kind="previous" /></i><b>A</b><i><QcUiIcon kind="next" /></i></nav><button><QcScreenGlyph kind="power" /></button><button><QcUiIcon kind="check" /></button></header><main>{[["GAIN","-3.8 dB",-28],["BASS","1.0 dB",18],["MID","0.0 dB",0],["TREBLE","1.6 dB",28],["VOLUME","-3.8 dB",-28]].map(([label,value,angle])=><section key={label as string}><span>{label}</span><i><b style={{transform:`rotate(${angle}deg)`}} /></i><strong>{value}</strong></section>)}</main></section>
  </section>;
  if (view === "fixture-input-gate") return <section className="qc-screen coros-input-gate" aria-label="Input Gate Control">
    <div className="input-gate-grid">
      <header><strong><span>2</span>H</strong><h1>QC-MCP-TEST-mtniwbfb-R</h1><nav><i className="input-gate-undo"><GridToolbarIcon kind="undo" /></i><b>A</b><i><GridToolbarIcon kind="save" /></i><i><QcUiIcon kind="more" /></i></nav><em><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="STOMP" /></svg><span>STOMP</span></em></header>
      <main><span className="input-gate-route">In<br />1</span><i className="input-gate-cable" /><span className="input-gate-device"><DeviceCategoryGlyph label="Filter" /></span><span className="input-gate-output">Multi<br />Out</span>{[0, 1, 2].map(row => <span className="input-gate-plus" style={{ top: `${50 + row * 32}%` }} key={row}><QcUiIcon kind="add" /></span>)}</main>
    </div>
    <section className="input-gate-panel">
      <header><button><QcUiIcon kind="more" /></button><span><small>INPUT GATE CONTROL</small><strong>Path 1</strong></span><nav><i><QcEditorIcon kind="scene-previous" /></i><b>A</b><i><QcEditorIcon kind="scene-next" /></i></nav><em /><button className="input-gate-power"><QcEditorIcon kind="bypass" /></button><button><QcUiIcon kind="check" /></button></header>
      <main><section><span>NOISE REDUCTION</span><i className="input-gate-knob reduction"><b /></i><strong>30.0 <small>%</small></strong></section><section><span>GAIN REDUCTION</span><strong>0.0 <small>dB</small></strong><i className="input-gate-meter"><b /></i></section><section><span>INPUT GAIN</span><i className="input-gate-knob gain"><b /></i><strong>0.0 <small>dB</small></strong></section></main>
    </section>
  </section>;
  // fixture-editor-pages.png: the amp editor is the shared Grid + action bar
  // with two parameter strips, not the manual's full-screen page layout.
  if (view === "fixture-editor-pages") return <section className="qc-screen coros-assignment is-amp-editor" aria-label="Amp parameter pages">
    <PhysicalEditorUnderlay slot="4" letter="E" title="QC MCP TEST_2*" category="GUITAR AMP" device="Brit 2203" blocks={2} blockGlyphs={["Utility", "Amp"]} expression={false} mode="PRESET">
      <div className="assignment-parameters">{[["GAIN", "5.0"], ["BASS", "5.0"], ["MID", "5.0"], ["TREBLE", "5.0"], ["PRESENCE", "5.0"]].map(([label, value]) => <section key={label}><span>{label}</span><i className="assignment-knob"><b /></i><strong>{value}</strong></section>)}</div>
      <div className="assignment-parameters is-row-2">{[["MASTER", "3.0"], ["OUTPUT", "0.0 dB"]].map(([label, value], index) => <section key={label}>{index < 2 && <><span>{label}</span><i className="assignment-knob"><b /></i><strong>{value}</strong></>}</section>)}{[0, 1, 2].map((index) => <section key={`empty-${index}`} />)}</div>
    </PhysicalEditorUnderlay>
  </section>;
  const editor = view === "fixture-editor-cab" ? ["2x12 UK C30 65 (M)","CABINET",["MIC 1 · 57","MIC 2 · 121","POSITION","DISTANCE","LEVEL","PAN"]] : view === "fixture-editor-eq" ? ["Parametric-8","EQUALIZER",["LOW CUT","BAND 1","BAND 2","BAND 3","HIGH CUT","LEVEL"]] : ["Ambience","REVERB · PAGE 2/2",["MOD RATE","MOD DEPTH","DUCKING","TRAILS","WIDTH","MIX"]];
  return <section className={`qc-screen coros-detail-editor ${view}`}><header><button><QcUiIcon kind="more" /></button><span><small>{editor[1] as string}</small><strong>{editor[0] as string}</strong></span><i className="status-dot" /><button><QcUiIcon kind="check" /></button></header>{view === "fixture-editor-cab" && <div className="cab-stage"><span>57</span><b><DeviceCategoryGlyph label="Cab" /></b><span>121</span></div>}{view === "fixture-editor-eq" && <svg viewBox="0 0 800 150" preserveAspectRatio="none"><path d="M0 120 C100 120 110 35 205 55 S335 115 410 70 S565 20 640 75 S735 105 800 60" /></svg>}<main>{(editor[2] as string[]).map((label,index)=><section key={label}><span>{label}</span><i><b style={{transform:`rotate(${index*23-35}deg)`}} /></i><strong>{index%2 ? "0.0 dB" : index===0 ? "80 Hz" : "5.0"}</strong></section>)}</main><footer><button>1</button><button className="is-active">2</button><span /><button>BYPASS</button></footer></section>;
}

type SystemFixtureView = "recovery-entry" | "recovery-options" | "overlay-keyboard" | "overlay-confirmation" | "overlay-error" | "overlay-busy";

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", "Backspace"],
  ["123", ",", "Space", ".", "Done"],
] as const;

function CorOsKeyboardScreen() {
  const shifted = ["", "", "", "", "", "", "'", "(", ")"];
  return <section className="qc-screen coros-physical-keyboard" aria-label="On-screen keyboard">
    <header><button><QcUiIcon kind="close" /></button><button className="keyboard-default-mark" aria-label="Save as default User Preset" /><span>Save as default User Preset</span><b>#</b><button className="keyboard-save-mark"><QcEditorIcon kind="save" /></button></header>
    <h1>Name your Virtual Device Preset</h1>
    <div className="physical-keyboard-rows">{KEYBOARD_ROWS.map((row, rowIndex) => <div key={rowIndex}>{row.map((key, keyIndex) => <button key={key} className={key === "Space" ? "is-space" : key === "Shift" ? "is-shift" : key === "Backspace" ? "is-backspace" : key === "Done" ? "is-done" : key === "123" ? "is-numeric" : ""}>{rowIndex < 2 && <small>{rowIndex === 0 ? (keyIndex + 1) % 10 : shifted[keyIndex]}</small>}{key === "Backspace" ? <QcUiIcon kind="backspace" /> : key === "Shift" ? <QcScreenGlyph kind="shift" /> : key}</button>)}</div>)}</div>
  </section>;
}

function CorOsDirectoryNameScreen() {
  const shifted = ["", "", "", "", "", "", "'", "(", ")"];
  return <section className="qc-screen coros-physical-keyboard is-name-editor" aria-label="New setlist name">
    <header><button><QcUiIcon kind="close" /></button><span>New Setlist</span><button className="keyboard-save-mark" aria-label="Create setlist"><QcEditorIcon kind="save" /></button></header>
    <h1><b>New Setlist</b></h1>
    <div className="physical-keyboard-rows">{KEYBOARD_ROWS.map((row, rowIndex) => <div key={rowIndex}>{row.map((key, keyIndex) => <button key={key} className={key === "Space" ? "is-space" : key === "Shift" ? "is-shift" : key === "Backspace" ? "is-backspace" : key === "Done" ? "is-done" : key === "123" ? "is-numeric" : ""}>{rowIndex < 2 && <small>{rowIndex === 0 ? (keyIndex + 1) % 10 : shifted[keyIndex]}</small>}{key === "Backspace" ? <QcUiIcon kind="backspace" /> : key === "Shift" ? <QcScreenGlyph kind="shift" /> : key}</button>)}</div>)}</div>
  </section>;
}

function CorOsDeleteConfirmation({ overGrid = false }: { overGrid?: boolean } = {}) {
  return <section className={`qc-screen coros-physical-confirmation${overGrid ? " is-over-grid" : ""}`} aria-label="Delete preset confirmation">
    <CorOsDirectoryFixture view="directory-presets" physicalContext />
    <i className="confirmation-scrim" />
    <aside><h1>Demo Rhythm</h1><p>Are you sure you want to delete this item?</p><footer><button>CANCEL</button><button>DELETE</button></footer></aside>
  </section>;
}

function CorOsSystemFixture({ view }: { view: SystemFixtureView }) {
  if (view === "recovery-entry") return <section className="qc-screen coros-recovery"><div className="recovery-logo"><QcHardwareIcon kind="brand-pulse" /></div><h1>Recovery Mode</h1><p>Keep footswitches A and H pressed while powering on Quad Cortex.</p><div className="recovery-switches"><b>A</b><span>HOLD</span><b>H</b></div><small>Release the switches when the recovery menu appears.</small></section>;
  if (view === "recovery-options") return <section className="qc-screen coros-recovery"><div className="recovery-logo"><QcHardwareIcon kind="brand-pulse" /></div><h1>Recovery Mode</h1><p>Select an option to continue.</p><div className="recovery-options">{[["RESTART QUAD CORTEX","Boot CorOS normally"],["REINSTALL COROS","Install the latest available system image"],["FACTORY RESET","Erase user data and restore defaults"],["SHUT DOWN","Power off safely"]].map(([title,detail], index) => <button key={title} className={index === 0 ? "is-active" : index === 2 ? "is-danger" : ""}><strong>{title}</strong><small>{detail}</small><b><QcUiIcon kind="next" /></b></button>)}</div></section>;
  return <section className="qc-screen coros-system-overlay"><div className="overlay-underlay"><header><span>32H Demo Scratch</span><b>A</b></header><main>{[1,2,3,4,5].map(item => <i key={item} />)}</main></div>
    {view === "overlay-keyboard" && <CorOsKeyboardScreen />}
    {view === "overlay-confirmation" && <CorOsDeleteConfirmation overGrid />}
    {view === "overlay-error" && <aside className="system-dialog"><b className="dialog-icon is-error">!</b><h1>Action unavailable</h1><p>Quad Cortex could not complete the request. Check the connection and try again.</p><footer><button>OK</button></footer></aside>}
    {view === "overlay-busy" && <aside className="system-dialog is-busy"><b className="dialog-spinner" /><h1>Saving preset</h1><p>Please wait. Do not disconnect or power off Quad Cortex.</p></aside>}
  </section>;
}

type CaptureFixtureView = "capture-intro" | "capture-type" | "capture-routing" | "capture-calibration" | "capture-progress" | "capture-result" | "capture-save";

function CaptureTargetIcon() {
  return <span className="capture-target-icon"><QcScreenGlyph kind="capture-target" /></span>;
}

function CaptureKindGlyph({ index }: { index: number }) {
  return <QcCaptureKindGlyph index={index} />;
}

function CorOsOfficialCapture({ view }: { view: "capture-calibration" | "capture-progress" | "capture-result" | "capture-save" }) {
  if (view === "capture-progress") return <section className="qc-screen capture-official capture-official-progress"><header><span>Neural Capture</span><button><QcUiIcon kind="close" /></button></header><main><nav>{["Calibration", "Recording Signals", "Sanity Check", "Training"].map((label, index) => <div key={label}><b>{index < 3 ? <QcUiIcon kind="check" /> : <QcUiIcon kind="next" />}</b>{label}</div>)}</nav><section><h1>Neural Capture in progress</h1><p>The core of Neural Capture. Training a neural network to<br />emulate the sound of your favorite device.</p><strong>30%</strong><i className="capture-official-progress-bar"><b /></i><em><QcScreenGlyph kind="progress" /></em></section></main></section>;
  if (view === "capture-save") return <section className="qc-screen capture-official capture-official-save"><header><button><QcUiIcon kind="close" /></button><button className="capture-folder"><DirectoryIcon kind="folder" /><span>My Captures</span></button><button>Name</button><button className="capture-note"><QcUiIcon kind="file" /></button><button className="capture-save-now"><QcEditorIcon kind="save" /></button></header><main><small>TYPE OF CAPTURE</small><h1>Amp</h1><div className="capture-kinds">{Array.from({ length: 6 }, (_, index) => <button key={index} className={index === 1 ? "is-active" : ""}><CaptureKindGlyph index={index} />{index > 0 && <i />}</button>)}</div><small>PREFERRED INSTRUMENT</small><div className="capture-instruments">{["Guitar", "Bass", "Synth", "Vocal", "Other"].map((label, index) => <button key={label} className={index === 0 ? "is-active" : ""}>{label}</button>)}</div></main></section>;
  if (view === "capture-result") return <section className="qc-screen capture-official capture-official-result"><header><span>Neural Capture</span><button><QcUiIcon kind="close" /></button></header><p>Your Neural Capture is ready. Switch between the reference and Quad Cortex using<br />the buttons below.</p><div className="capture-result-actions"><button>BACK TO CALIBRATION</button><button>SAVE</button><CaptureTargetIcon /></div><main><section><button>CORTEX</button><label><span className="capture-level-label"><IoHeadphonesGlyph />LEVEL</span><b className="capture-level-dial" /><small>0.0 dB</small></label></section><section><button>REFERENCE</button></section></main></section>;
  return <section className="qc-screen capture-official capture-official-settings"><header><span>Neural Capture</span><button><QcUiIcon kind="close" /></button></header><ul><li>Please verify your Quad Cortex is properly connected to the target device.</li><li>Reduce levels if any of the meters detect clipping.</li><li>The IN 2 GROUND LIFT can mitigate noise caused by ground loops between Quad<br />Cortex and the target device.</li></ul><div className="capture-setting-actions"><button>CONNECTION DIAGRAM</button><button>START CAPTURE</button><CaptureTargetIcon /><nav><button className="is-active">1</button><button>2</button></nav></div><main><section><span>IN 1 LEVEL</span><em className="capture-info">i</em><small>INST</small><b>0.0 dB</b><i className="capture-level-dial" /></section><section><span>IN 2 LEVEL</span><em className="capture-info">i</em><small>DEVICE</small><b>0.0 dB</b><i className="capture-level-dial" /></section><section className="capture-input-type"><span>IN 1 TYPE</span><label><i /><small>Mic</small><b>Instrument</b></label></section><section className="capture-input-type"><span>IN 2 TYPE</span><label><i /><small>Mic</small><b>Instrument</b></label></section><section><span>IN 1 LEVEL</span><b>-40.0 <small>dB</small></b><i className="capture-meter" /></section><section><span>IN 2 LEVEL</span><b>-40.0 <small>dB</small></b><i className="capture-meter" /></section><section><span><QcHeadphonesGlyph /> LEVEL</span><i className="capture-level-dial" /><b>0.0 <small>dB</small></b></section></main></section>;
}

function CorOsCaptureFixture({ view }: { view: CaptureFixtureView }) {
  if (view === "capture-calibration" || view === "capture-progress" || view === "capture-result" || view === "capture-save") return <CorOsOfficialCapture view={view} />;
  const steps: Array<[string, CaptureFixtureView]> = [["TYPE", "capture-type"], ["CONNECTIONS", "capture-routing"], ["CALIBRATE", "capture-calibration"], ["CAPTURE", "capture-progress"], ["RESULT", "capture-result"], ["SAVE", "capture-save"]];
  const current = Math.max(0, steps.findIndex(([, step]) => step === view));
  return <section className="qc-screen coros-capture-fixture" aria-label={view.replaceAll("-", " ")}>
    <header><button><QcUiIcon kind="previous" /></button><strong>New Neural Capture</strong><button><QcUiIcon kind="close" /></button></header>
    {view === "capture-intro" ? <main className="capture-intro">
      <div className="capture-orbit"><i><QcScreenGlyph kind="capture-target" /></i><span /><span /><span /></div><h1>Neural Capture</h1><p>Create a digital replica of your amplifier, cabinet, or drive pedal.</p><aside><b>1</b><span>Connect your gear</span><b>2</b><span>Set levels and calibrate</span><b>3</b><span>Capture, compare, and save</span></aside><button>GET STARTED</button>
    </main> : <><nav className="capture-steps">{steps.map(([label, step], index) => <span key={step} className={index === current ? "is-active" : index < current ? "is-done" : ""}><b>{index < current ? <QcUiIcon kind="check" /> : index + 1}</b>{label}</span>)}</nav><main className={`capture-workspace ${view}`}>
      {view === "capture-type" && <><h1>What would you like to capture?</h1><p>Select the device type for the most accurate result.</p><div className="capture-type-grid">{[["Cab", "AMP + CAB", "A complete amplifier and cabinet"], ["Amp", "AMP", "Amplifier or preamp only"], ["Overdrive", "DRIVE", "Overdrive, distortion, or fuzz"], ["Utility", "OTHER", "Compressors and other devices"]].map(([category, title, text], index) => <button key={title} className={index === 0 ? "is-active" : ""}><b><DeviceCategoryGlyph label={category} /></b><strong>{title}</strong><small>{text}</small></button>)}</div></>}
      {view === "capture-routing" && <><h1>Connect your equipment</h1><p>Follow the signal path below, then confirm that all cables are connected.</p><div className="capture-routing-map"><span><b>QC SEND 1</b><i>OUT</i></span><em><QcUiIcon kind="arrow-right" /></em><span className="capture-gear"><b>AMPLIFIER</b><i>INPUT</i></span><em><QcUiIcon kind="arrow-right" /></em><span className="capture-gear"><b>CAB / LOAD</b><i>OUTPUT</i></span><em><QcUiIcon kind="arrow-right" /></em><span><b>QC RETURN 1</b><i>IN</i></span></div><div className="capture-check"><i><QcUiIcon kind="check" /></i><span><strong>Connections complete</strong><small>Use a load box when capturing an amplifier without a cabinet.</small></span></div></>}
      <button className="capture-next">NEXT</button>
    </main></>}
  </section>;
}

type SettingsFixtureView = "settings-account" | "settings-system" | "settings-device" | "settings-support" | "settings-wifi" | "settings-storage" | "settings-midi" | "settings-info" | "settings-diagnostics"
  | "settings-system-power" | "settings-system-volume" | "settings-update-idle";

function SettingsAccountGlyph({ kind }: { kind: "cloud" | "user" | "backup" }) {
  return <QcScreenGlyph kind={kind} />;
}

function SettingsPowerIcon() {
  return <QcScreenGlyph kind="power" />;
}

function SettingsDeviceSectionIcon() {
  return <QcScreenGlyph kind="device" />;
}

function SettingsDeviceIcon({ label }: { label: string }) {
  const kind: QcScreenGlyphName = label === "Global Bypass" ? "global-bypass" : label === "Scene Bypass Behavior" ? "power" : label === "Stomp Mode Bypass" ? "stomp-bypass" : label === "Swap Tempo and Tuner" ? "swap" : label === "Gig View Access" ? "gig-view" : "volume";
  return <QcScreenGlyph kind={kind} />;
}

function SettingsSectionGlyph({ view, label }: { view: "settings-account" | "settings-system" | "settings-device" | "settings-midi"; label?: string }) {
  if (view === "settings-account") return <SettingsAccountGlyph kind={label === "Backups" ? "backup" : label ? "user" : "cloud"} />;
  if (view === "settings-system") {
    const kind = label === "Connection" ? "connection" : label === "Updates" ? "updates" : label === "Brightness" ? "brightness" : label === "Power Functions" ? "power" : label === "Master Volume Knob" ? "volume" : label === "Device Storage" ? "storage" : "factory-reset";
    return <QcSettingsIcon kind={kind} />;
  }
  if (view === "settings-midi" && label === "MIDI") return <QcUiIcon kind="midi" />;
  return label ? <SettingsDeviceIcon label={label} /> : <QcScreenGlyph kind="device" />;
}

function SettingsDeviceModelIcon({ kind }: { kind: string }) {
  return <DeviceCategoryGlyph label={kind === "ir" ? "IR Loader" : "Cab"} />;
}

function CorOsOfficialSettings({ view }: { view: "settings-account" | "settings-system" | "settings-device" | "settings-midi" }) {
  const data = view === "settings-midi"
    ? { title: "Device", active: 6, rows: ["Scene Bypass Behavior", "Stomp Mode Bypass", "Hold Timing", "Swap Tempo and Tuner", "Gig View Access", "Latency Compensation", "MIDI"] }
    : view === "settings-account"
    ? { title: "Account", active: 0, rows: ["My Account", "Backups"] }
    : view === "settings-system"
      ? { title: "System", active: 2, rows: ["Connection", "Updates", "Brightness", "Power Functions", "Master Volume Knob", "Device Storage", "Factory Reset"] }
      : { title: "Device", active: 0, rows: ["Global Bypass", "Scene Bypass Behavior", "Stomp Mode Bypass", "Hold Timing", "Swap Tempo and Tuner", "Gig View Access", "Latency Compensation"] };
  return <section className={`qc-screen coros-settings-official ${view}`} aria-label={`${data.title} Settings`}>
    <header><button className="settings-section"><b><SettingsSectionGlyph view={view} /></b>{data.title}<i /></button><button className="settings-done"><QcUiIcon kind="check" /></button></header>
    <main><nav>{data.rows.map((label, index) => <button key={label} className={index === data.active ? "is-active" : ""}><b><SettingsSectionGlyph view={view} label={label} /></b>{label}</button>)}</nav>
      {view === "settings-account" ? <section className="settings-account-detail is-my-account"><h1>Device linked to</h1><p>You are ready to send &amp; receive Presets &amp; Neural Captures and use Cloud backups.</p><button>UNLINK DEVICE</button></section>
        : view === "settings-system" ? <section className="settings-system-detail"><h1>Brightness</h1><p>Turn the UP, DOWN, and TEMPO footswitches to adjust the<br />brightness. Tap the Modes at the bottom to toggle dimmed<br />LED lights for each one individually.</p>{[["Screen", "16", 16], ["LEDs", "32", 32], ["Dimmed LEDs", "2", 2]].map(([label, value, bars]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong><i>{Array.from({ length: 32 }, (_, index) => <b key={index} className={index < Number(bars) ? "is-on" : ""} />)}</i></div>)}<footer><QcModeGlyph mode="PRESET" /><QcModeGlyph mode="SCENE" /><QcModeGlyph mode="STOMP" /></footer></section>
          : view === "settings-midi" ? <section className="settings-midi-detail"><h1>MIDI Settings</h1>{[["MIDI Channel", "select", "1"], ["MIDI Thru", "toggle", "Off"], ["MIDI Over USB", "toggle", "On"], ["Ignore Duplicate PC", "toggle", "Off"], ["MIDI Clock Out", "select", "OFF"], ["MIDI Clock In", "toggle", "Off"]].map(([label, kind, value]) => <div key={label}><b>i</b><span>{label}</span>{kind === "select" ? <button>{value}<i><QcUiIcon kind="down" /></i></button> : <label><small>On</small><small>Off</small><i className={value === "On" ? "is-on" : ""} /></label>}</div>)}</section>
          : <section className="settings-device-detail"><h1>Global Bypass</h1><p>Globally bypass Cabs, IR Loaders, or Neural Captures of<br />cabs* on any row. Globally bypassed devices will have a<br />bypass icon <span className="inline-settings-power"><SettingsPowerIcon /></span> but will not appear bypassed on The Grid.</p><small>*Neural Captures need to have the Capture Type set to "Cab" to be<br />bypassed.</small>{["cab", "ir"].map((key) => <div key={key}><b><SettingsDeviceModelIcon kind={key} /></b>{[1,2,3,4].map(row => <label key={row}><span>ROW {row}</span><i><SettingsPowerIcon /></i></label>)}</div>)}</section>}
    </main>
  </section>;
}

type CapturedSettingsView = "settings-support" | "settings-wifi" | "settings-storage" | "settings-info" | "settings-diagnostics"
  | "settings-system-power" | "settings-system-volume" | "settings-update-idle" | "settings-system-reset";

function CapturedSettingsIcon({ kind }: { kind: string }) {
  if (kind === "headphones") return <QcHeadphonesGlyph />;
  const normalized = kind === "support" ? "info" : kind === "power" ? "power-functions" : (["about", "info", "report", "diagnostics", "licenses", "wifi", "updates", "brightness", "volume", "storage", "system"] as const).includes(kind as never) ? kind : "factory";
  return <QcScreenGlyph kind={normalized as QcScreenGlyphName} />;
}

function CorOsCapturedSettings({ view }: { view: CapturedSettingsView }) {
  const support = view === "settings-support" || view === "settings-info" || view === "settings-diagnostics";
  // The category selector is drawn on some panes and not others. Every frame
  // that reaches these three shows the dialog without it, and the menu below
  // does not move when it goes, so only the header changes.
  const selector = !["settings-system-power", "settings-system-volume", "settings-update-idle", "settings-system-reset"].includes(view);
  const rows = support
    ? [["about", "About and Contact"], ["info", "Device Information"], ["report", "Send Report"], ["diagnostics", "Diagnostics"], ["licenses", "3rd Party Licenses"]]
    : [["wifi", "Connection"], ["updates", "Updates"], ["brightness", "Brightness"], ["power", "Power Functions"], ["volume", "Master Volume Knob"], ["storage", "Device Storage"], ["factory", "Factory Reset"]];
  const active = ({
    "settings-support": 0, "settings-info": 1, "settings-diagnostics": 3, "settings-wifi": 0,
    "settings-update-idle": 1, "settings-system-power": 3, "settings-system-volume": 4, "settings-storage": 5, "settings-system-reset": 6
  } as Record<string, number>)[view] ?? 5;
  return <section className={`qc-screen coros-settings-official coros-settings-captured ${view}`} aria-label={view.replaceAll("-", " ")}>
    <header>{selector && <button className="settings-section"><b><CapturedSettingsIcon kind={support ? "support" : "system"} /></b>{support ? "Support" : "System"}<i /></button>}{view === "settings-info" && <button className="settings-edit" aria-label="Edit device name"><QcScreenGlyph kind="edit" /></button>}<button className="settings-done"><QcUiIcon kind="check" /></button></header>
    <main><nav>{rows.map(([icon, label], index) => <button key={label} className={index === active ? "is-active" : ""}><b><CapturedSettingsIcon kind={icon} /></b>{label}</button>)}</nav>
      <section className="captured-settings-detail">
        {view === "settings-support" && <><h1>Device support</h1><div className="support-company"><span><strong>Connected-device information</strong><br />Support details are intentionally not reproduced in QC Remote.</span></div><hr /><div className="support-contact"><span>Use the manufacturer's official support resources for device and firmware assistance.</span></div></>}
        {view === "settings-diagnostics" && <div className="captured-list">{["DSP Diagnostics", "Footswitch Statistics", "USB Statistics"].map(label => <button key={label}>{label}<span><QcUiIcon kind="next" /></span></button>)}</div>}
        {view === "settings-storage" && <><h1>Device Storage</h1><div className="storage-captured">{[["presets", "My Presets", "270/3072", 9], ["captures", "My Captures", "65/2048", 3], ["irs", "My Impulse Responses", "0/2048", 0]].map(([kind, label, value, amount]) => <div key={String(label)}><span><CapturedSettingsIcon kind={String(kind)} /><strong>{label}</strong><i><QcUiIcon kind="next" /></i><em>{value}</em></span><b><i style={{ width: `${amount}%` }} /></b></div>)}</div></>}
        {view === "settings-info" && <><h1>Device information</h1><div className="information-table"><span><b>Serial number:</b><i /></span><span><b>Device name:</b><i>Neural DSP Quad Cortex</i></span><span><b>MAC address:</b><i /></span></div><hr /><h1>Software information</h1><div className="information-table"><span><b>CorOS:</b><i>4.1.0</i></span><span><b>Linux kernel:</b><i>Linux buildroot 4.0.0-ADI-1.3.0 #1 PREEMPT Tue<br />Aug 18 01:26:58 EEST 2026 armv7l (none)</i></span><span><b>U-Boot:</b><i>U-Boot 2015.01 ADI-1.3.0 (Sep 30 2021 -<br />01:01:44)</i></span><span><b>Zeniack FW app:</b><i>d14e</i></span></div></>}
        {view === "settings-system-power" && <><h1>Power Functions</h1><h2>Power Button Sensitivity</h2><p>Configure the sensitivity below. Tap the power button above the volume knob to verify the response.</p><div className="power-scale">{["Off", "Low", "Medium", "High"].map((label, index) => <span key={label} className={index === 3 ? "is-active" : ""}>{label}</span>)}</div><div className="power-bar">{[0, 1, 2, 3].map((index) => <i key={index} />)}</div><button className="power-restart">RESTART</button></>}
        {view === "settings-system-volume" && <><h1>Master Volume Knob Assignment</h1><p className="volume-lead">Master Volume can control different outputs</p><hr /><div className="volume-assignments">{["OUT 1/2", "OUT 3/4", "SEND 1/2", ""].map((label, index) => <span key={index}>{label ? <em>{label}</em> : <CapturedSettingsIcon kind="headphones" />}<i><QcUiIcon kind="check" /></i></span>)}</div></>}
        {view === "settings-system-reset" && <>
          <h1>Choose a Recovery option</h1>
          <p className="reset-lead"><strong>Reset Settings</strong> restores device settings to their defaults without removing user presets, captures, or impulse responses.</p>
          <button className="reset-settings">RESET SETTINGS</button>
          <p className="reset-factory-lead"><strong>Factory Reset</strong> restores defaults and removes user data stored on the device.</p>
          <button className="reset-factory">FACTORY RESET</button>
        </>}
        {view === "settings-update-idle" && <><h1>Device Updates</h1><p className="update-version">Your Quad Cortex is currently running<br /><strong>CorOS: 4.1.0</strong></p><hr /><button className="update-check">CHECK FOR UPDATES</button><div className="update-news"><h2>Updates</h2><p>Use the connected device's official update service to check for current firmware.</p></div></>}
        {view === "settings-wifi" && <><header className="wifi-header"><h1>Internet Connected</h1><button>Domain Settings</button><button>Internet Check</button></header><div className="wifi-network"><span><QcScreenGlyph kind="wifi" /></span><b /><em>Weak connection</em><i><QcScreenGlyph kind="status" /></i><strong /></div><div className="wifi-secondary"><span><QcScreenGlyph kind="wifi" /></span><strong /></div><button className="wifi-reset">RESET WI-FI SETTINGS</button></>}
      </section>
    </main>
  </section>;
}

function CorOsSettingsFixture({ view }: { view: SettingsFixtureView }) {
  if (view === "settings-account" || view === "settings-system" || view === "settings-device" || view === "settings-midi") return <CorOsOfficialSettings view={view} />;
  return <CorOsCapturedSettings view={view} />;
}

function SceneTileTools() {
  return <span className="gig-scene-tools" aria-hidden="true">
    <QcUiIcon kind="edit" />
    <QcScreenGlyph kind="swap" />
    <QcScreenGlyph kind="copy" />
  </span>;
}

function CorOsGigView({ snapshot, presetList, onClose, liveTuner = false, presetTone = "#ff2727" }: { snapshot: PresetSnapshot; presetList?: PresetList; onClose: () => void; liveTuner?: boolean; presetTone?: string }) {
  const gridBlocks = snapshot.blocks.filter((block) => block.column >= 0 && block.column < 8);
  const assignments = Array.from({ length: 8 }, (_, index) => snapshot.blocks
    .filter((block) => block.footswitch === index)
    .sort((left, right) => (left.footswitchOrder ?? 0) - (right.footswitchOrder ?? 0))[0]);
  const sceneColors = ["#ff2421", "#101c21", "#292410", "#291021", "#102818", "#291810", "#181829", "#102821"];
  const sceneLetterColors = ["#e72018", "#082029", "#393408", "#390c29", "#083818", "#391c08", "#181c39", "#083c29"];
  const letterColors = ["#4df379", "#079dff", "#ff7d00", "#ff00b7", "#5beaff", "#7358ff", "#ffd333", "#f4f4f4"];
  const bankStart = Math.floor(snapshot.presetPosition / 8) * 8;
  const listedPresets = presetList?.setlistKey === snapshot.setlistKey ? presetList.presets : [];
  const presetTiles = Array.from({ length: 8 }, (_, index) => {
    const position = bankStart + index;
    const active = position === snapshot.presetPosition;
    const entry = listedPresets.find((candidate) => candidate.position === position);
    const name = active ? snapshot.presetName : entry?.name ?? "Unsaved";
    return <button key={index} className={`gig-preset-tile${active ? " is-active" : ""}`} style={active ? { "--gig-preset-tone": presetTone } as CSSProperties : undefined}><span>{Math.floor(position / 8) + 1}<b style={{ color: letterColors[index] }}>{String.fromCharCode(65 + index)}</b></span><strong>{name}</strong></button>;
  });
  const sceneTiles = Array.from({ length: 8 }, (_, index) => <button key={index} className={`gig-scene-tile${index === snapshot.activeScene ? " is-active" : ""}`} style={{ "--gig-color": sceneColors[index], "--gig-letter": sceneLetterColors[index] } as CSSProperties}><SceneTileTools /><b>{String.fromCharCode(65 + index)}</b><strong>{snapshot.scenes[index] ?? `Scene ${String.fromCharCode(65 + index)}`}</strong></button>);
  const stompTiles = assignments.map((assigned, index) => {
    const block = assigned ?? gridBlocks[index];
    const color = !block ? "#292c29" : block.bypassed ? "#101c21" : block.name === "Simple Gate" ? "#949694" : block.name === "Chief DS1" ? "#ff7100" : block.name === "UK C30 TopBoost" ? "#ff2421" : block.name === "212 UK C30 65 (M)" ? "#6b55ff" : block.name === "Parametric-8" ? "#0875e7" : block.name === "Ambience" ? "#00ffde" : officialBlockVisual(block).color;
    return <button key={index} className={!block ? "is-empty" : ""} style={{ "--gig-color": color } as CSSProperties} aria-label={`Footswitch ${String.fromCharCode(65 + index)}${block ? `, ${block.name}` : ", empty"}`}>
      {block && <span className="gig-device-icon"><QcDeviceGlyph block={block} x={43} y={43} size={70} /></span>}
      {block && <span className="gig-edit" aria-hidden="true"><QcUiIcon kind="edit" /></span>}<b>{String.fromCharCode(65 + index)}</b>{block && <strong className={block.name === "Parametric-8" ? "is-compact" : ""}>{block.name}</strong>}
    </button>;
  });
  const tileForMode = (mode: "PRESET" | "SCENE" | "STOMP", index: number) => mode === "PRESET" ? presetTiles[index] : mode === "SCENE" ? sceneTiles[index] : stompTiles[index];
  const tiles = snapshot.mode === "HYBRID"
    ? Array.from({ length: 8 }, (_, index) => tileForMode(snapshot.footswitchModes?.[index < 4 ? 0 : 1] ?? (index < 4 ? "SCENE" : "STOMP"), index))
    : Array.from({ length: 8 }, (_, index) => tileForMode(snapshot.mode as Exclude<PresetSnapshot["mode"], "HYBRID">, index));
  return <section className={`coros-gig-view${liveTuner ? " has-live-tuner" : ""}`} aria-label={liveTuner ? "Gig View with Live Tuner" : "Gig View"}>
    <header><strong>{snapshot.presetLocation} {snapshot.presetName}</strong><span className="gig-mode"><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode={snapshot.mode} /></svg></span><span className="gig-scene">{String.fromCharCode(65 + snapshot.activeScene)}</span><button aria-label="Close Gig View" onClick={onClose}><QcUiIcon kind="check" /></button></header>
    {liveTuner && <div className="live-tuner-strip" aria-label="Live Tuner dormant" />}
    <div className={`gig-tiles is-${snapshot.mode.toLowerCase()}`}>{tiles}</div>
  </section>;
}

function CorOsTuner({ onClose, liveTuner = false }: { onClose: () => void; liveTuner?: boolean }) {
  const official = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tunerState") === "official";
  return <section className={`coros-tuner${official ? " tuner-official" : ""}`} aria-label={liveTuner ? "Tuner with Live Tuner enabled" : "Tuner"}>
    <header><span>Tuner</span><button aria-label="Close Tuner" onClick={onClose}><QcUiIcon kind="check" /></button></header>
    <div className="tuner-scale"><span>-50</span>{official && <><em className="tuner-flat">D#/Eb</em><em className="tuner-note">E</em><em className="tuner-sharp">F</em><strong className="tuner-reading">-1.4</strong><small className="tuner-left-arrow"><QcUiIcon kind="next" /></small><small className="tuner-right-arrow"><QcUiIcon kind="previous" /></small></>}<i /><b /><span>+50</span></div>
    <footer>
      <section><span>FREQ [Hz]</span><div className="tuner-frequency"><i /><strong>{official ? "440.0" : "422.0"}</strong></div></section>
      <section><button>INPUT 1 <b><QcUiIcon kind="down" /></b></button></section>
      <section><button className="tuner-muted">MUTED</button></section>
      <section><span>LIVE TUNER</span><label><i className={liveTuner || official ? "is-active" : ""} /> <b>Yes</b></label><label><i className={liveTuner || official ? "" : "is-active"} /> <b>No</b></label></section>
    </footer>
  </section>;
}

function CorOsTempo({ bpm, onClose }: { bpm: number; onClose: () => void }) {
  const official = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tempoState") === "official";
  return <section className={`coros-tempo${official ? " tempo-official" : ""}`} aria-label="Tempo and Metronome">
    <header><span>Tempo</span><div className="tempo-scene"><b><QcUiIcon kind="previous" /></b><strong>A</strong><b><QcUiIcon kind="next" /></b></div><button aria-label="Close Tempo and Metronome" onClick={onClose}><QcUiIcon kind="check" /></button></header>
    <div className="tempo-display"><strong>{Math.round(bpm)}</strong><small>BPM = QUARTERS</small><div>{[0, 1, 2, 3].map((beat) => <i key={beat} className={beat === (official ? 1 : 0) ? "is-active" : ""} />)}</div></div>
    <div className="tempo-controls">
      <section className="tempo-control is-tempo"><span>TEMPO</span><div className="tempo-dial"><i /></div><strong>{Math.round(bpm)} BPM</strong></section>
      <section className="tempo-control is-radio"><span>MODE <b className="tempo-info">i</b></span><label><i className={official ? "is-active" : ""} />Global</label><label><i className={official ? "" : "is-active"} />Preset</label></section>
      <section className="tempo-control is-radio"><span>TEMPO LED</span><label><i className="is-active" />On</label><label><i />Off</label></section>
      <section className="tempo-control is-volume"><span>VOLUME</span><div className="tempo-dial"><i /></div><strong>0.0 dB</strong></section>
      <section className="tempo-control is-mute"><button>UNMUTE</button></section>
      <section className="tempo-control is-pan"><span>PAN</span><div className="tempo-dial"><i /></div><strong>C</strong></section>
      {[["T/SIGNATURE", "4/4"], ["SUBDIVISIONS", "1/4"], ["SOUND", "BLIP"], ["ROUTING", "MULTI"]].map(([label, value]) => <section className="tempo-control is-select" key={label}><span>{label}</span><button>{value}<b><QcUiIcon kind="down" /></b></button></section>)}
    </div>
  </section>;
}

function CorOsMidiOut({ onClose }: { onClose: () => void }) {
  return <section className="coros-midi-out" aria-label="Preset MIDI Out">
    <header><span>Preset MIDI Out settings</span><button className="midi-trash" aria-label="Clear MIDI assignments"><QcDirectoryIcon kind="trash" /></button><button aria-label="Close Preset MIDI Out" onClick={onClose}><QcUiIcon kind="check" /></button></header>
    <div className="midi-assignment-surface">
      <section className="midi-footswitches"><button className="midi-preset-load">ON PRESET LOAD<br />MESSAGE</button>{["A", "B", "C", "D", "E", "F", "G", "H"].map((label) => <button className="midi-switch" key={label}><i />{label}</button>)}</section>
      <section className="midi-expression"><label><span>EXP 1</span><div><i /></div></label><label><span>EXP 2</span><div><i /></div></label></section>
    </div>
  </section>;
}

function CorOsCpuMonitor({ snapshot, onClose }: { snapshot: PresetSnapshot; onClose: () => void }) {
  const loads = [3, 7, 5, 11, 4, 8, 6, 2];
  return <section className="coros-cpu-monitor" aria-label="CPU Monitor">
    <header><span>CPU Monitor</span><strong>CPU 26%</strong><button aria-label="Close CPU Monitor" onClick={onClose}><QcUiIcon kind="check" /></button></header>
    <div className="cpu-summary"><span>PROCESSING LOAD</span><div><i style={{ width: "26%" }} /></div><strong>26%</strong></div>
    <div className="cpu-grid">{Array.from({ length: 32 }, (_, index) => {
      const row = Math.floor(index / 8), column = index % 8;
      const block = snapshot.blocks.find((candidate) => candidate.row === row && candidate.column === column);
      const load = block ? loads[index % loads.length] : 0;
      return <div key={index} className={block ? "has-block" : ""}>{block && <><span className="cpu-block-icon"><QcDeviceGlyph block={block} x={30} y={30} size={56} /></span><strong>{load}%</strong><small>{block.name}</small></>}</div>;
    })}</div>
    <footer><span><i className="cpu-legend-active" /> ACTIVE</span><span><i className="cpu-legend-bypassed" /> BYPASSED</span><span>GLOBAL EQ <b>ON</b></span><span>INPUT GATES <b>ON</b></span></footer>
  </section>;
}

type IoView = "overview" | "input" | "output" | "send-return" | "usb" | "headphones";
const IO_PORTS: Array<{ id: IoView; label: string; sub: string; kind?: "square" | "midi" | "input" | "combo"; paired?: boolean }> = [
  { id: "usb", label: "", sub: "USB", kind: "square" }, { id: "send-return", label: "EXP 2", sub: "EXP 1", paired: true },
  { id: "send-return", label: "", sub: "MIDI OUT", kind: "midi" }, { id: "send-return", label: "", sub: "MIDI IN", kind: "midi" },
  { id: "output", label: "", sub: "OUT 2/R", kind: "combo", paired: true }, { id: "output", label: "", sub: "OUT 1/L", kind: "combo", paired: true },
  { id: "headphones", label: "", sub: "CAPTURE OUT", paired: true }, { id: "output", label: "OUT 4/R", sub: "OUT 3/L", paired: true },
  { id: "send-return", label: "RET 2", sub: "RET 1", paired: true }, { id: "send-return", label: "SEND 2", sub: "SEND 1", paired: true },
  { id: "input", label: "INPUT 2", sub: "", kind: "input" }, { id: "input", label: "INPUT 1", sub: "", kind: "input" }
];

function IoDial({ value }: { value: string }) {
  return <span className="io-dial-wrap"><i className="io-dial"><b /></i><strong>{value}</strong></span>;
}

function IoPortGlyph({ kind = "jack", primary = false }: { kind?: "square" | "midi" | "input" | "combo" | "jack"; primary?: boolean }) {
  return <QcIoPortGlyph kind={kind} primary={primary} />;
}

function IoHeadphonesGlyph() {
  return <QcHeadphonesGlyph />;
}

function CorOsIoSettings({ initialView, onClose }: { initialView: IoView; onClose: () => void }) {
  const [view, setView] = useState<IoView>(initialView === "overview" ? "input" : initialView);
  const [globalEqOpen, setGlobalEqOpen] = useState(false);
  if (globalEqOpen) return <CorOsGlobalEq onClose={() => setGlobalEqOpen(false)} />;
  const title = view === "input" ? "Input 1" : view === "output" ? "Output 1/L" : view === "send-return" ? "Return 1" : view === "usb" ? "USB" : "Headphones";
  const meters = view === "usb" ? ["IN 1/2", "IN 3/4", "IN 5/6", "IN 7/8", "OUT 1/2", "OUT 3/4", "OUT 5/6", "OUT 7/8"] : [];
  return <section className={`coros-io-settings is-${view}`} aria-label={`I/O Settings ${title}`}>
    <header><span className="io-heading"><i aria-hidden="true" /><span><small>I/O SETTINGS</small><strong>{title}</strong></span></span><button className="io-global-eq" onClick={() => setGlobalEqOpen(true)}>GLOBAL EQ</button><button aria-label="Close I/O Settings" onClick={onClose}><QcUiIcon kind="check" /></button></header>
    <div className="io-ports">{IO_PORTS.map((port, index) => <button key={`${port.label}-${index}`} className={`${port.id === view && (view !== "input" || index === IO_PORTS.length - 1) ? "is-active" : ""} is-${port.kind ?? "jack"}${port.paired ? " is-paired" : ""}`} onClick={() => setView(port.id)}><span className={port.id === "headphones" ? "io-headphone-label" : undefined}>{port.id === "headphones" ? <IoHeadphonesGlyph /> : port.label}</span><i><IoPortGlyph kind={port.kind ?? "jack"} primary={index === IO_PORTS.length - 1} /></i>{port.paired && <i><IoPortGlyph /></i>}<small>{port.sub}</small></button>)}{view === "usb" && <div className="io-input-selectors"><button>1</button><button>2</button></div>}</div>
    {view === "usb" ? <div className="io-editor is-usb"><section><span>USB LEVEL</span><IoDial value="0.0 dB" /></section><section><span>HP SOURCE</span><IoDial value="BOTH" /></section><div className="io-meter-grid">{meters.map((meter) => <span key={meter}><b>{meter}</b><i>i</i><small>-40.0 dB　　　-40.0</small><em /><em /></span>)}</div></div>
      : view === "headphones" ? <div className="io-editor is-headphones">
        <section><span>HP LEVEL</span><IoDial value="0.0 dB" /></section>
        <section><span>MULTI OUT</span><IoDial value="0.0 dB" /></section>
        <div className="io-headphone-meter"><span>LEVEL</span><small>-40.0 dB　　　0.00</small><i /><i /></div>
        <div className="io-headphone-meter"><span>MULTI OUT</span><small>-40.0 dB　　　0.00</small><i /><i /></div>
      </div>
      : <div className="io-editor is-analog">
        <section><span>{view === "input" ? "IN 1 LEVEL" : view === "output" ? "OUT 1 LEVEL" : view === "send-return" ? "RETURN 1 LEVEL" : "HP LEVEL"}</span><IoDial value="0.0 dB" /></section>
        {view === "input" && <><section><span>IMPEDANCE</span><IoDial value="1M Ω" /></section><section className="io-switch"><span>TYPE</span><label><i />Mic</label><label><i className="is-active" />Instrument</label></section><section className="io-switch is-disabled"><span>PHANTOM 48V</span><label><i />On</label><label><i className="is-active" />Off</label></section></>}
        <section className="io-switch"><span>GROUND LIFT</span><label><i />On</label><label><i className="is-active" />Off</label></section>
        {view !== "input" && <section className="io-switch"><span>MUTE</span><label><i />On</label><label><i className="is-active" />Off</label></section>}
        <div className="io-level-meter"><span>{view === "input" ? "IN 1 LEVEL" : `${title.toUpperCase()} LEVEL`}</span><strong>-40.0 dB</strong><i /></div>
      </div>}
  </section>;
}

function CorOsGlobalEq({ onClose }: { onClose: () => void }) {
  const verticals = [46, 79, 105, 125, 143, 158, 172, 184, 263, 343, 369, 389, 407, 422, 436, 448, 527, 574, 607, 633, 653, 671, 686, 700, 712, 791].map((pixel) => pixel / 8);
  return <section className="coros-global-eq" aria-label="Global EQ">
    <header><button className="global-eq-more"><QcUiIcon kind="more" /></button><span><small>GLOBAL EQ</small><strong>Parametric-5</strong></span><button className="global-eq-power"><i /> ON</button><button aria-label="Close Global EQ" onClick={onClose}><QcUiIcon kind="check" /></button></header>
    <div className="global-eq-graph"><div>{verticals.map((left) => <i key={left} style={{ left: `${left}%` }} />)}</div><svg viewBox="0 0 800 255" preserveAspectRatio="none"><g className="eq-axis-labels"><text x="208" y="13">100</text><text x="471" y="13">1k</text><text x="736" y="13">10k</text></g><path d="M25 252 C78 186 99 110 243 104 C400 125 513 115 513 146 C540 115 590 105 644 104 C700 95 750 82 800 80" /><g>{[[104,158],[243,105],[513,146],[607,126],[644,104]].map(([x,y], index) => <g key={index}><circle cx={x} cy={y} r="18" className={index === 0 ? "is-active" : ""} /><text x={x} y={y + 5}>{index + 1}</text></g>)}</g></svg></div>
    <div className="global-eq-tabs">{[1,2,3,4,5].map((tab) => <button key={tab} className={tab === 1 ? "is-active" : ""}>{tab}</button>)}<button>OUT</button></div>
    <div className="global-eq-controls"><section><span>TYPE</span><button><QcEqIcon kind="high-pass" /> HI PASS <QcUiIcon kind="down" /></button></section>{[["GAIN","0.0 dB"],["FREQ","50 Hz"],["Q","0.10"]].map(([label,value]) => <section key={label}><span>{label}</span><IoDial value={value} /></section>)}<section className="global-eq-bypass"><span>BYPASS 1</span><button><ExpressionPowerIcon /></button></section></div>
  </section>;
}

function CorOsPowerOverlay({ onClose }: { onClose: () => void }) {
  return <section className="coros-power-overlay" aria-label="Power and Locking Functions">
    <div className="power-actions"><button className="power-lock"><QcScreenGlyph kind="lock" /><span>Lock Touchscreen and Master Volume knob</span></button><div><button onClick={onClose}>CANCEL</button><button>SHUT DOWN</button><button>REBOOT</button><button>BE RIGHT BACK</button></div></div>
  </section>;
}

function InformationGlyph() {
  return <QcScreenGlyph kind="info" />;
}

function CorOsModesConfiguration({ onClose }: { onClose: () => void }) {
  const modes = ["PRESET", "SCENE", "STOMP"] as const;
  return <section className="coros-modes-configuration" aria-label="Modes Configuration">
    <header><span>Modes configuration</span><div><button aria-label="Modes Configuration information"><InformationGlyph /></button><button aria-label="Close Modes Configuration" onClick={onClose}><QcUiIcon kind="check" /></button></div></header>
    <p>Drag a Mode on top of another to create a Hybrid<br />Mode. Use a long press to break a Hybrid Mode apart.</p>
    <div className="modes-cycle"><span>CYCLE</span><i /><i /><div>{modes.map((mode) => <button key={mode}><b><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode={mode} /></svg></b>{mode[0] + mode.slice(1).toLowerCase()}</button>)}</div></div>
  </section>;
}

function CorOsOfficialModes({ onClose }: { onClose: () => void }) {
  return <section className="coros-modes-configuration modes-official" aria-label="Modes Configuration">
    <header><span>Modes configuration</span><div><button aria-label="Modes Configuration information"><InformationGlyph /></button><button aria-label="Close Modes Configuration" onClick={onClose}><QcUiIcon kind="check" /></button></div></header>
    <p>Drag a Mode on top of another to create a Hybrid<br />Mode. Use a long press to break a Hybrid Mode apart.</p>
    <div className="modes-cycle"><span>CYCLE</span><i /><div><button><b><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="PRESET" /></svg></b>Preset</button><button className="hybrid-mode"><b><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="SCENE" /></svg><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="STOMP" /></svg></b><span>Scene<br />Stomp</span><em><i /><QcUiIcon kind="down" /><i /></em></button></div></div>
    <svg className="modes-device" viewBox="0 0 240 152" aria-hidden="true"><path d="M7 12 Q5 76 7 140 Q7 150 18 150 H222 Q233 150 233 140 Q235 76 233 12 Q233 2 222 2 H18 Q7 2 7 12 Z"/><rect x="67" y="10" width="106" height="62" rx="3"/><circle cx="38" cy="42" r="11"/><circle cx="203" cy="42" r="7"/>{[38,79,120,162,203].map((x)=><circle key={`a${x}`} cx={x} cy="98" r="6" className={x===203?"off":"yellow"}/>)}{[38,79,120,162,203].map((x)=><circle key={`b${x}`} cx={x} cy="132" r="6" className={x===203?"off":"purple"}/>)}</svg>
  </section>;
}

function CorOsSaveAs({ onClose }: { onClose: () => void }) {
  const folders = ["My Presets", "Live Set", "Recording Set", "Acoustic Set", "Downloaded", "Downloaded 2"];
  const presets = ["2A Demo Clean", "2B Demo Chorus", "2C Demo Crunch", "2D Demo Ambient", "2E Demo Lead", "2F Unsaved", "2G Demo Rhythm", "2H Unsaved"];
  return <section className="coros-save-as" aria-label="Save As destination">
    <header><button className="save-as-type"><b><DirectoryIcon kind="grid" /></b>Presets <i><QcUiIcon kind="down" /></i></button><span>Save to...</span><button className="save-as-close" aria-label="Close Save As" onClick={onClose}><QcUiIcon kind="close" /></button></header>
    <div className="save-as-content">
      <nav>{folders.map((folder, index) => <button key={folder} className={index === 0 ? "is-active" : ""}><b><DirectoryIcon kind="folder" number={index + 1} /></b><span>{folder}</span><i><QcUiIcon kind="more" /></i></button>)}<button className="save-as-new"><b><DirectoryIcon kind="new-folder" /></b><span>New Setlist</span></button></nav>
      <aside>{Array.from({ length: 14 }, (_, index) => <button key={index} className={index === 1 ? "is-active" : ""}>{index + 1}</button>)}</aside>
      <section>{presets.map((preset, index) => <button key={preset} className={index === 5 ? "is-active" : index === 7 ? "is-disabled" : ""}>{preset}<i><QcUiIcon kind="more" /></i></button>)}</section>
    </div>
  </section>;
}

function CorOsPresetNameEditor({ snapshot, onClose }: { snapshot: PresetSnapshot; onClose: () => void }) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Shift", "Z", "X", "C", "V", "B", "N", "M", "Backspace"]
  ];
  return <section className="coros-name-editor" aria-label="Preset name editor">
    <header>
      <button className="name-editor-close" aria-label="Close preset name editor" onClick={onClose}><QcUiIcon kind="close" /></button>
      <span className="name-editor-divider" />
      <button className="name-editor-folder"><QcDirectoryIcon kind="folder" /><span>My Pre... / {snapshot.presetLocation}</span></button>
      <button className="name-editor-tab is-active">Name</button>
      <button className="name-editor-metadata" aria-label="Preset metadata"><QcUiIcon kind="file" /></button>
      <button className="name-editor-next" aria-label="Continue"><QcUiIcon kind="arrow-right" /></button>
    </header>
    <div className="name-editor-value"><span>{snapshot.presetName}</span></div>
    <div className="name-editor-keyboard">
      {rows.map((row, rowIndex) => <div className={`name-key-row row-${rowIndex + 1}`} key={rowIndex}>{row.map((key, index) => <button key={`${key}-${index}`} className={key === "Shift" || key === "Backspace" ? "is-wide" : ""}>{key === "Shift" ? <QcScreenGlyph kind="shift" /> : key === "Backspace" ? <QcUiIcon kind="backspace" /> : key}<small>{rowIndex === 0 ? (index + 1) % 10 : rowIndex === 1 && index > 6 ? index === 7 ? "(" : ")" : ""}</small></button>)}</div>)}
      <div className="name-key-row row-4"><button>123</button><button>,</button><button className="name-key-space">Space</button><button>.</button><button>Next</button></div>
    </div>
  </section>;
}

function RoutingToken({ kind, x, y, selected = false }: { kind: "S" | "M"; x: number; y: number; selected?: boolean }) {
  const color = kind === "S" ? "#087cea" : "#e73e60";
  return <g className={selected ? "routing-token is-selected" : "routing-token"}>
    {selected && <circle cx={x} cy={y} r="20" fill="none" stroke="#f5f5f5" strokeWidth="2" />}
    <circle cx={x} cy={y} r="15" fill="#050505" stroke="#202020" strokeWidth="2" />
    <circle cx={x} cy={y} r="12" fill={color} />
    <text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="700" fontSize="15">{kind}</text>
  </g>;
}

function RoutingGridDiagram({ placement = false, selected }: { placement?: boolean; selected?: "S" | "M" }) {
  const cells = [112, 198, 284, 370, 456, 542, 628, 714];
  const blocks = [[112, "Filter", "#eeeeee"], [198, "Overdrive", "#ff7900"], [284, "Amp", "#ff424c"], [370, "Cab", "#7257ff"], [542, "Utility", "#02d2bc"], [628, "Reverb", "#35b9ff"]] as const;
  return <svg className="routing-grid-diagram" viewBox="0 0 800 250" preserveAspectRatio="none" aria-label={placement ? "Empty Grid slots available for Splitter or Mixer placement" : "Parallel Grid signal paths"}>
    <rect width="800" height="250" fill="#030303" />
    <g fill="none" stroke="#8e8f91" strokeWidth="1.5"><path d="M52 92H748" /><path d="M284 92C284 118 284 143 284 168H628C628 143 628 118 628 92" /></g>
    <g fill="#171719" stroke="#050505" strokeWidth="2"><rect x="8" y="52" width="44" height="80" rx="15" /><rect x="748" y="52" width="44" height="80" rx="15" /></g>
    <g fill="#eee" fontFamily={QC_TYPOGRAPHY.deviceRoute} fontSize="14" textAnchor="middle"><text x="30" y="86">In</text><text x="30" y="106">1</text><text x="770" y="84">Multi</text><text x="770" y="105">Out</text></g>
    {blocks.map(([x, label, color]) => <g key={x}><rect x={x - 31} y="61" width="62" height="62" rx="14" fill="#090909" stroke={color} strokeWidth="3" /><DeviceCategoryGlyph label={label} x={x - 20} y={72} width={40} height={40} /></g>)}
    {!placement && <><RoutingToken kind="S" x={284} y={92} selected={selected === "S"} /><RoutingToken kind="M" x={628} y={92} selected={selected === "M"} /></>}
    {placement && cells.map((x, index) => <g key={x} className={index === 3 ? "placement-target is-active" : "placement-target"} transform={`translate(${x} 145)`}><path d="M-17 35v-24c0-5 7-6 8-1V-1c0-6 8-6 8 0v8-15c0-6 8-6 8 0V7-4c0-6 8-6 8 0v14c4-5 10-2 9 4l-2 17c-1 10-9 16-19 16H0c-7 0-12-4-17-12Z" fill="#3df269" stroke="#0d8e38" strokeWidth="2" /><circle cx="24" cy="31" r="13" fill="#fff" stroke="#168a40" strokeWidth="2" /><path d="M24 23v9l6 3" fill="none" stroke="#168a40" strokeWidth="2" strokeLinecap="round" /></g>)}
  </svg>;
}

function RoutingControl({ label, value, kind = "dial", accent = "#087cea" }: { label: string; value: string; kind?: "dial" | "toggle" | "select"; accent?: string }) {
  return <div className={`routing-control is-${kind}`}><strong>{label}</strong>{kind === "dial" ? <i className="routing-dial" style={{ "--routing-accent": accent } as CSSProperties}><b /></i> : kind === "toggle" ? <i className="routing-toggle"><b /></i> : <i className="routing-select">{value}<b><QcUiIcon kind="down" /></b></i>}<small>{kind === "dial" ? value : ""}</small></div>;
}

function ChoiceToken({ kind }: { kind: "S" | "M" }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><RoutingToken kind={kind} x={24} y={24} /></svg>;
}

function PhysicalRoutingGrid({ snapshot, selected }: { snapshot: PresetSnapshot; selected: "S" | "M" }) {
  const mixerSelected = selected === "M";
  return <svg className="splitter-grid" viewBox="0 0 800 196" aria-hidden="true">
    <rect width="800" height="196" fill="#020202" />
    {[3, 97].flatMap((y, row) => [<g key={`l${row}`}><rect x="8" y={y} width="44" height="77" rx="14" fill="#171719" />{row === 0 ? <text x="30" y={y + 32} textAnchor="middle" fill="#eee" fontFamily={QC_TYPOGRAPHY.deviceRoute} fontSize="14"><tspan x="30">In</tspan><tspan x="30" dy="20">1</tspan></text> : <path d={`M19 ${y + 38.5}h22M30 ${y + 27.5}v22`} stroke="#a8aaab" strokeWidth="1.5" />}</g>, <g key={`r${row}`}><rect x="750" y={y} width="44" height="77" rx="14" fill="#171719" />{row === 0 ? <text x="772" y={y + 30} textAnchor="middle" fill="#eee" fontFamily={QC_TYPOGRAPHY.deviceRoute} fontSize="14"><tspan x="772">Multi</tspan><tspan x="772" dy="20">Out</tspan></text> : <path d={`M761 ${y + 38.5}h22M772 ${y + 27.5}v22`} stroke="#a8aaab" strokeWidth="1.5" />}</g>])}
    <path d="M60 41H740" stroke="#bfc1c0" strokeWidth="2" />
    {[60, 142, 228, 314, 400, 486, 572, 658, 740].map((x) => <circle key={x} cx={x} cy="41" r="5" fill="#020202" stroke="#f4f4f4" strokeWidth="2" />)}
    {snapshot.blocks.filter((block) => block.row === 0).map((block) => {
      const x = [101, 187, 273, 357, 443, 529, 615, 701][block.column] ?? 101;
      return <g key={block.id} opacity={block.bypassed ? .48 : 1}>
        <QcDeviceGlyph block={block} x={x} y={41} />
        {block.bypassed && <path d={`M${x - 32} 41H${x + 32}`} fill="none" stroke="#c9c9ca" strokeWidth="2" opacity=".9" />}
      </g>;
    })}
    <circle cx="60" cy="135" r="18" fill={mixerSelected ? "#020202" : "#087cea"} stroke={mixerSelected ? "#087cea" : "none"} strokeWidth="2" /><text x="60" y="141" textAnchor="middle" fill={mixerSelected ? "#087cea" : "#fff"} fontFamily={QC_TYPOGRAPHY.devicePlain} fontSize="18">S</text>
    <circle cx="740" cy="135" r="18" fill={mixerSelected ? "#f00063" : "#020202"} stroke={mixerSelected ? "none" : "#f00063"} strokeWidth="2" /><text x="740" y="141" textAnchor="middle" fill={mixerSelected ? "#fff" : "#f00063"} fontFamily={QC_TYPOGRAPHY.devicePlain} fontSize="18">M</text>
  </svg>;
}

function RoutingEditorHeaderControls() {
  return <>
    <svg viewBox="0 0 230 44" aria-hidden="true"><circle cx="18" cy="12" r="6" fill="#087cea"/><path d="M18 18v12h87v-12M105 30v-12" fill="none" stroke="#eee" strokeWidth="2"/><circle cx="105" cy="30" r="6" fill="#f00063"/><circle cx="140" cy="12" r="6" fill="#087cea"/><path d="M140 18v12h87v-12M227 30v-12" fill="none" stroke="#eee" strokeWidth="2"/><circle cx="227" cy="12" r="6" fill="#f00063"/></svg>
    <b className="splitter-scene"><span><QcEditorIcon kind="scene-previous" /></span><i>A</i><span><QcEditorIcon kind="scene-next" /></span></b>
    <em><svg viewBox="0 0 66 43" aria-hidden="true"><rect x="23" y="11" width="20" height="20" rx="3"/><path d="M27 27V15l6 7 6-7v12"/></svg></em>
  </>;
}

function CorOsRoutingScreen({ view, snapshot }: { view: "splitter-placement" | "splitter-editor" | "mixer-editor" | "empty-slot"; snapshot: PresetSnapshot }) {
  if (view === "empty-slot") return <section className="qc-screen empty-slot-official" aria-label="Empty-slot device browser"><nav className="empty-slot-categories">{COROS_DEVICE_CATEGORIES.slice(0, 6).map(([label, color], index) => <button key={label} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} /></i><span>{label}</span>{index === 0 && <b>New</b>}</button>)}</nav><section className="empty-slot-grid"><header><strong><span>4</span>E</strong><h1>QC MCP TEST_2</h1><span className="empty-undo"><GridToolbarIcon kind="undo" /></span><b>A</b><span className="empty-save"><GridToolbarIcon kind="save" /></span><span className="empty-more"><GridToolbarIcon kind="more" /></span></header><div className="empty-mode"><GridToolbarIcon kind="mode" /><strong>PRESET</strong></div><main><span className="empty-route">In<br />1</span><span className="empty-route is-row-3">In<br />1</span><i className="empty-cable" /><i className="empty-cable is-row-3" /><i className="empty-add"><QcUiIcon kind="add" /></i><i className="empty-row is-row-2"><QcUiIcon kind="add" /></i><i className="empty-row is-row-4"><QcUiIcon kind="add" /></i><i className="empty-out">Multi<br />Out</i></main></section></section>;
  const placement = view === "splitter-placement";
  const splitter = view === "splitter-editor" || placement;
  if (splitter) return <section className="qc-screen coros-splitter-physical" aria-label={placement ? "Splitter and Mixer placement handles" : "Splitter parameter editor"}>
    <PhysicalRoutingGrid snapshot={snapshot} selected="S" />
    <section className="splitter-panel">
      <header><button><QcUiIcon kind="more" /></button><span><strong>Splitter</strong></span><RoutingEditorHeaderControls /><button><QcUiIcon kind="check" /></button></header>
      <div className="splitter-controls">
        <label><strong>TYPE</strong><span className="splitter-toggle"><i/><b>Crossover<br/>A/B<br/><em>Balance</em></b></span></label>
        <label><strong>STEREO</strong><span className="splitter-toggle"><i/><b>Split<br/><em>Normal</em></b></span></label>
        <label><strong>BALANCE</strong><span className="splitter-knob"/><small>5.0</small></label>
        <label><strong>LEVEL TO A</strong><span className="splitter-knob angle-a"/><small>0.0 <em>dB</em></small></label>
        <label><strong>LEVEL TO B</strong><span className="splitter-knob angle-b"/><small>0.0 <em>dB</em></small></label>
        <label><strong>FREQUENCY</strong><span className="splitter-knob frequency"/><small>400 <em>Hz</em></small></label>
        <label><strong>MODE</strong><span className="splitter-toggle"><i/><b>Invert<br/><em>Regular</em></b></span></label>
        <span className="splitter-empty"/><span className="splitter-empty"/><span className="splitter-empty"/>
      </div>
    </section>
  </section>;
  return <section className="qc-screen coros-splitter-physical coros-mixer-physical" aria-label="Mixer parameter editor">
    <PhysicalRoutingGrid snapshot={snapshot} selected="M" />
    <section className="splitter-panel mixer-panel">
      <header><button><QcUiIcon kind="more" /></button><span><strong>Mixer</strong></span><RoutingEditorHeaderControls /><button><QcUiIcon kind="check" /></button></header>
      <div className="splitter-controls mixer-controls">
        <label><strong>LEVEL A</strong><span className="splitter-knob mixer-knob level-a"/><small>0.0 <em>dB</em></small></label>
        <label><strong>PAN A</strong><span className="splitter-knob mixer-knob pan"/><small>C</small></label>
        <label><strong>LEVEL B</strong><span className="splitter-knob mixer-knob level-b"/><small>0.0 <em>dB</em></small></label>
        <label><strong>PAN B</strong><span className="splitter-knob mixer-knob pan"/><small>C</small></label>
        <label><strong>PHASE</strong><span className="splitter-toggle mixer-toggle"><i/><b>On<br/><em>Off</em></b></span></label>
        <label><strong>MIXER LEVEL</strong><span className="splitter-knob mixer-knob level-a"/><small>0.0 <em>dB</em></small></label>
        <span className="splitter-empty"/><span className="splitter-empty"/><span className="splitter-empty"/><span className="splitter-empty"/>
      </div>
    </section>
  </section>;
}

const PLUGIN_LICENSES = [
  ["Archetype: Plini X", true], ["Archetype: Cory Wong X", false], ["Archetype: Gojira X", false],
  ["Archetype: John Mayer X", false], ["Archetype: Misha Mansoor X", false], ["Archetype: Nolly X", false],
  ["Archetype: Petrucci X", false], ["Archetype: Rabea X", false], ["Archetype: Tim Henson X", false],
  ["Fortin Nameless Suite X", false], ["Parallax X", false], ["Soldano SLO-100 X", false]
] as const;
const PLINI_MODELS = [["Plini Clean", "amp"], ["Plini Crunch", "amp"], ["Plini Lead", "amp"], ["Plini Cab (M)", "cab"], ["Plini Cab (ST)", "cab"], ["Plini Drive", "drive"]] as const;
const CORY_WONG_MODELS = [["Cory Wong D.I. Funk Console", "amp"], ["Cory Wong The Amp Snob", "amp"], ["Cory Wong The Clean Machine", "amp"], ["Cory Wong Cab 1 (M)", "cab"], ["Cory Wong Cab 2 (M)", "cab"], ["Cory Wong Wah", "drive"]] as const;

function PluginGridGlyph({ kind }: { kind: "gate" | "amp" | "capture" | "cab" | "wave" | "cube" | "dual" }) {
  const label = kind === "amp" ? "Amp" : kind === "capture" ? "Neural Capture" : kind === "cab" ? "Cab" : kind === "wave" ? "Modulation" : kind === "gate" ? "Filter" : "Utility";
  return <DeviceCategoryGlyph label={label} />;
}

function GridToolbarIcon({ kind }: { kind: "undo" | "export" | "save" | "more" | "mode" | "refresh" }) {
  if (kind === "undo") return <svg viewBox="600 0 48 48" aria-hidden="true"><QcScreenHeaderGlyph kind="undo" /></svg>;
  if (kind === "export" || kind === "save") return <svg viewBox="695 0 48 48" aria-hidden="true"><QcScreenHeaderGlyph kind={kind} /></svg>;
  if (kind === "more") return <svg viewBox="748 0 48 48" aria-hidden="true"><QcScreenHeaderGlyph kind="menu" /></svg>;
  return <QcUiIcon kind={kind === "mode" ? "modes" : "refresh"} />;
}

function CorOsOfficialDeviceBrowser({ plugins }: { plugins: boolean }) {
  const rows = plugins ? ["Archetype: Cory Wong X", "Archetype: Gojira X", "Archetype: Nolly X", "Archetype: Plini X", "Fortin Nameless Suite X", "Parallax X", "Soldano SLO-100 X"] : ["Bogna Uber Clean", "Bogna Uber Lead", "Bogna Vishnu 20th Clean", "Brit 2203", "Brit 900 Clean", "Brit 900 Lead", "Brit Plexi 100 Bright"];
  return <section className={`qc-screen device-browser-official${plugins ? " is-plugins" : ""}`}><main><nav>{COROS_DEVICE_CATEGORIES.slice(0, 6).map(([label], index) => <button key={label} className={index === (plugins ? 0 : 1) ? "is-active" : ""}><i><DeviceCategoryGlyph label={label} /></i></button>)}</nav><section className="device-browser-list"><header>{plugins ? <><b>Add device</b><i><QcUiIcon kind="refresh" /></i></> : <><button className="is-active">GUITAR</button><button>BASS</button></>}</header>{rows.map((name, index) => <button key={name}>{plugins ? <b className={index === 4 ? "is-placeholder" : undefined} aria-hidden="true" /> : null}{name}</button>)}</section></main><section className="device-browser-grid"><header>{plugins ? <><em>3</em><span className="plugin-undo"><GridToolbarIcon kind="undo" /></span><b>A</b><span className="plugin-save"><GridToolbarIcon kind="export" /></span><span className="plugin-more"><GridToolbarIcon kind="more" /></span><strong className="plugin-mode"><span className="plugin-mode-matrix"><i>A</i><i>B</i><i>C</i><i>D</i></span><span>SCENE</span></strong></> : <><span className="amp-undo"><GridToolbarIcon kind="undo" /></span><b>A</b><span className="amp-save"><GridToolbarIcon kind="save" /></span><span className="amp-more"><QcUiIcon kind="more" /></span><i className="amp-status" /></>}</header>{!plugins && <div className="amp-mode"><QcModeGlyph mode="PRESET" /><span>PRESET</span></div>}<main>{plugins && <>{(["gate", "amp", "capture", "cab", "wave", "cube", "dual"] as const).map((kind, index) => <span key={kind} className={`grid-block b${index + 1}`}><PluginGridGlyph kind={kind} /></span>)}</>}{plugins ? <><i><QcUiIcon kind="add" /></i><i>Row<br />3</i><i><QcUiIcon kind="add" /></i><i>Multi<br />Out</i><i><QcUiIcon kind="add" /></i></> : <><i><QcUiIcon kind="add" /></i><i>Multi<br />Out</i><i><QcUiIcon kind="add" /></i><i><QcUiIcon kind="add" /></i><i><QcUiIcon kind="add" /></i></>}</main></section></section>;
}

function PluginModelGlyph({ name, kind }: { name: string; kind: "amp" | "cab" | "drive" }) {
  const category = kind === "cab" ? "CAB" : kind === "drive" ? "OVERDRIVE" : "AMP";
  const blockKind = kind === "drive" ? "utility" : kind;
  const block: GridBlock = { id: `plugin-${name}`, name, kind: blockKind, category, row: 0, column: 0, bypassed: false };
  return <svg viewBox="0 0 70 70" aria-hidden="true"><QcDeviceGlyph block={block} x={35} y={35} size={70} /></svg>;
}

function CorOsDeviceBrowserFixture({ view }: { view: "device-search" | "device-favorites" | "plugin-folders" | "plugin-list" | "plugin-models" | "plugin-locked" | "plugin-refresh" }) {
  if (view === "plugin-folders") return <section className="qc-screen plugin-folders-official" aria-label="Plugin folders"><header><button><QcUiIcon kind="previous" /></button><button className="plugin-folder-category"><DeviceCategoryGlyph label="Plugins" fallback="" /><span>Plugins</span><small><QcUiIcon kind="down" /></small></button><span /><button><DirectoryIcon kind="arrange" /></button><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></header><main><nav><button><b><DirectoryIcon kind="folder" /></b><span><small>Plugins</small>Parallax X</span></button>{["Artists", "Neural DSP", "User"].map(label => <button key={label}><b><DirectoryIcon kind="folder" /></b><span>{label}</span>{label === "User" && <i><QcUiIcon kind="more" /></i>}</button>)}</nav><section><button><span>Default<small>Bass</small></span><i>D</i><b><GridToolbarIcon kind="export" /></b></button></section></main></section>;
  const plugins = view.startsWith("plugin-");
  const pluginModels = view === "plugin-models" || view === "plugin-locked";
  const lockedPlugin = view === "plugin-locked";
  const pluginModelRows: ReadonlyArray<readonly [string, "amp" | "cab" | "drive"]> = lockedPlugin ? [
    ["Cory Wong D.I. Funk Console", "amp"], ["Cory Wong The Amp Snob", "amp"], ["Cory Wong The Clean Machine", "amp"], ["Cory Wong Cab 1 (M)", "cab"], ["Cory Wong Cab 2 (M)", "cab"]
  ] : [
    ["Plini Clean", "amp"], ["Plini Crunch", "amp"], ["Plini Lead", "amp"], ["Plini Cab (M)", "cab"], ["Plini Cab (ST)", "cab"], ["Plini Drive", "drive"]
  ];
  const rows = view === "device-favorites" ? [["Chief DS1", "OVERDRIVE", true], ["Brit 2203", "AMP", true], ["212 UK C30 65 (M)", "CAB", true], ["Digital Flanger", "MODULATION", true], ["Ambience", "REVERB", true]] as const : view === "device-search" ? [["Chief DS1", "OVERDRIVE", true], ["Chief SD1", "OVERDRIVE", true], ["Chief OD1", "OVERDRIVE", true]] as const : undefined;
  return <section className={`qc-screen coros-browser-fixture${view === "plugin-list" || view === "plugin-refresh" ? " is-physical-plugin-list" : pluginModels ? ` is-physical-plugin-models${lockedPlugin ? " is-physical-plugin-locked" : ""}` : ""}`} aria-label={view.replaceAll("-", " ")}>
    <div className="browser-fixture-panel">
      <nav>{COROS_DEVICE_CATEGORIES.slice(0, 8).map(([label, color], index) => <button key={label} className={(plugins ? index === 0 : index === 4) ? "is-active" : ""} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} /></i></button>)}</nav>
      <main>
        <header><strong>{view === "plugin-refresh" ? "Refreshing the list can take 10-20 seconds." : view === "plugin-list" ? "Add device" : plugins ? "Plugins" : view === "device-favorites" ? "Favorites & Recent" : "Search devices"}</strong><button className={view === "plugin-refresh" ? "is-refreshing" : ""}><GridToolbarIcon kind="refresh" /></button></header>
        {view === "device-search" && <div className="browser-search"><span><QcDirectoryIcon kind="search" /></span><b>Chief</b><button><QcUiIcon kind="close" /></button></div>}
        {view === "device-favorites" && <div className="browser-tabs"><button className="is-active">FAVORITES</button><button>RECENT</button></div>}
        {pluginModels ? <div className="browser-result-list is-plugin-licenses">{PLUGIN_LICENSES.map(([name, available]) => { const selected = name === (lockedPlugin ? "Archetype: Cory Wong X" : "Archetype: Plini X"); return <button key={name} className={`${available ? "is-licensed" : "is-locked"}${selected ? " is-selected" : ""}`}>{!available && <i className="plugin-license-lock"><PluginLockIcon /></i>}<span><strong>{name}</strong></span>{selected && <em><QcUiIcon kind="next" /></em>}</button>; })}</div> : view === "plugin-list" || view === "plugin-refresh" ? <div className="browser-result-list is-plugin-licenses">{PLUGIN_LICENSES.map(([name, available]) => <button key={name} className={available ? "is-licensed" : "is-locked"}>{!available && <i className="plugin-license-lock"><PluginLockIcon /></i>}<span><strong>{name}</strong></span></button>)}</div> : <div className="browser-result-list">{rows?.map(([name, category]) => <button key={name}><i style={{ "--result-color": category === "AMP" ? "#ff424c" : category === "CAB" ? "#7257ff" : category === "MODULATION" ? "#a95cff" : category === "REVERB" ? "#35b9ff" : "#ff7900" } as CSSProperties}><DeviceCategoryGlyph label={category === "AMP" ? "Amp" : category === "CAB" ? "Cab" : category === "MODULATION" ? "Modulation" : category === "REVERB" ? "Reverb" : "Overdrive"} /></i><span><strong>{name}</strong><small>{category}</small></span><b><QcUiIcon kind="favorite" /></b></button>)}</div>}
      </main>
      {pluginModels && <><header className="plugin-model-header"><strong>{lockedPlugin ? "Plugin license not found" : "Add device"}</strong><button><GridToolbarIcon kind="refresh" /></button><button><QcUiIcon kind="close" /></button></header><section className="plugin-model-list">{pluginModelRows.map(([name, kind]) => <button key={name}><i className={kind === "cab" ? "is-cab" : kind === "drive" ? "is-drive" : ""}><PluginModelGlyph name={name} kind={kind} /></i>{lockedPlugin && <i className="plugin-model-lock"><PluginLockIcon /></i>}<span>{name}</span><em><DevicePresetGlyph /></em></button>)}</section></>}
    </div>
    {view === "plugin-list" || view === "plugin-refresh" ? <div className="plugin-grid-underlay"><header><strong>2<span>F</span></strong><em>QC MCP TEST</em></header><main><i className="underlay-input">In<br />1</i><i className="underlay-plus"><QcUiIcon kind="add" /></i><i className="underlay-add"><QcUiIcon kind="add" /></i><i className="underlay-row-2"><QcUiIcon kind="add" /></i><i className="underlay-row-3"><QcUiIcon kind="add" /></i><i className="underlay-row-4"><QcUiIcon kind="add" /></i></main></div> : <div className="browser-grid-ghost"><b>3B</b><span>SCENE</span><i><QcUiIcon kind="add" /></i><i><QcUiIcon kind="add" /></i><i><QcUiIcon kind="add" /></i></div>}
  </section>;
}

function CorOsLooperEditor() {
  const actions: Array<[string, QcLooperActionGlyphName, string]> = [["DUPLICATE", "duplicate", "A"], ["ONE SHOT", "one-shot", "B"], ["HALF SPEED", "half-speed", "C"], ["PUNCH IN", "punch-in", "D"], ["RECORD", "record", "E"], ["PLAY", "play", "F"], ["REVERSE", "reverse", "G"], ["UNDO", "undo", "H"]];
  return <section className="qc-screen coros-looper" aria-label="Looper X editor"><header><button aria-label="Open Looper menu"><QcUiIcon kind="more" /></button><span><small>LOOPER</small><strong>Looper X</strong></span><i /><button className="looper-params"><QcEditorIcon kind="looper" />Params</button><button className="looper-scene"><QcEditorIcon kind="scene-previous" /><b>A</b><QcEditorIcon kind="scene-next" /></button><button aria-label="Confirm"><QcEditorIcon kind="confirm" /></button></header><div className="looper-timeline"><span>USE <b><QcLooperActionGlyph kind="record" /></b> TO START RECORDING</span><span>USE <b className="looper-close-caret"><QcUiIcon kind="up" /></b> TO CLOSE THE LOOPER VIEW</span><em>AVAILABLE 4:38</em></div><div className="looper-actions">{actions.map(([label, glyph, key]) => <button key={label}><small>{label}</small><strong><QcLooperActionGlyph kind={glyph} /></strong><b>{key}</b></button>)}</div></section>;
}

type CaptureLibraryView = "device-favorites" | "device-recents" | "device-browser-neural-capture" | "device-search" | "device-search-entry" | "device-search-suggestions" | "device-search-results";

function CaptureLibraryRail() {
  return <nav className="capture-library-rail">{COROS_DEVICE_CATEGORIES.slice(0, 6).map(([label], index) => <button key={label} className={index === 2 ? "is-active" : ""}><i><DeviceCategoryGlyph label={label} /></i></button>)}</nav>;
}

function CaptureLibraryKeyboard({ query = "" }: { query?: string }) {
  const rows = [["q","w","e","r","t","y","u","i","o","p"],["a","s","d","f","g","h","j","k","l"],["Shift","z","x","c","v","b","n","m","Backspace"],["123",",","Space",".",query ? "Search" : "Done"]];
  return <section className="capture-search-keyboard"><header><button aria-label="Close search"><QcUiIcon kind="close" /></button><button className={query ? "is-ready" : ""} aria-label="Run search"><QcDirectoryIcon kind="search" /></button></header><h1 className={query ? "is-query" : ""}>{query || "Search for ..."}</h1><small>{query ? "Suggestions" : "Recently searched"}</small>{query ? <div className="capture-search-suggestion"><i><QcLibraryIcon kind="capture-library" /></i> JQ~Marshall JMP (Gary Moore)~</div> : <div className="capture-recent-searches"><b>gary</b><b>whammy</b><b>still</b><button>Clear all</button></div>}<main>{rows.map((row, rowIndex) => <div key={rowIndex}>{row.map((key) => <button key={key} className={key === "Space" ? "is-space" : key === "Search" || key === "Done" ? "is-done" : key === "123" ? "is-numeric" : key === "Shift" ? "is-shift" : key === "Backspace" ? "is-backspace" : ""}>{key === "Shift" ? <QcScreenGlyph kind="shift" /> : key === "Backspace" ? <QcUiIcon kind="backspace" /> : key}</button>)}</div>)}</main></section>;
}

function CorOsCaptureLibrary({ view }: { view: CaptureLibraryView }) {
  if (view === "device-search-entry") return <CaptureLibraryKeyboard />;
  if (view === "device-search-suggestions") return <CaptureLibraryKeyboard query="gary" />;
  if (view === "device-search" || view === "device-search-results") return <section className="qc-screen capture-search-results"><header><button><QcDirectoryIcon kind="search" /> gary</button><i /><button><QcDirectoryIcon kind="grid" /> (0)</button><button className="is-active"><QcLibraryIcon kind="capture-library" /> (1)</button><button><QcLibraryIcon kind="capture-header" /> (0)</button><button aria-label="Filter"><QcDirectoryIcon kind="filter" /></button><button aria-label="Arrange"><QcDirectoryIcon kind="arrange" /></button><button aria-label="Done"><QcDirectoryIcon kind="done" /></button></header><main><h2>DEVICE DIRECTORIES <b><QcUiIcon kind="down" /></b></h2><article><strong>JQ~Marshall JMP (Gary Moore)~</strong><small>Josepqr</small><em>J</em></article><h2>DOWNLOADS <b><QcUiIcon kind="down" /></b></h2><p>No results</p></main></section>;
  const recent = view === "device-recents";
  const library = view === "device-browser-neural-capture";
  const captures = ["4-Comp Custom 1", "4-Comp Custom 2", "4-Comp Custom 3", "4-Comp Custom 4", "4-Comp Custom 5", "4-Comp Custom 6", "4-Comp Custom 7"];
  return <section className="qc-screen capture-library-browser"><CaptureLibraryRail /><header><span>Add device</span>{!recent && <button aria-label="Filter"><QcDirectoryIcon kind="filter" /></button>}{!recent && <button aria-label="Arrange"><QcDirectoryIcon kind="arrange" /></button>}<button aria-label="Search"><QcDirectoryIcon kind="search" /></button><button aria-label="Close"><QcUiIcon kind="close" /></button></header><aside><button className={!recent && !library ? "is-active" : ""}><b><QcLibraryIcon kind="heart" /></b><span>Favorites</span></button><button className={recent ? "is-active" : ""}><b><QcLibraryIcon kind="clock" /></b><span>Recent</span></button><button><b><QcDirectoryIcon kind="download" /></b><span>Downloads</span></button><button className={library ? "is-active" : ""}><b><QcLibraryIcon kind="capture-library" /></b><span>Captures Library</span><small>2127</small></button><i />{["Factory Captures V1","Factory Captures V2","My Captures"].map(label => <button key={label}><b><QcDirectoryIcon kind="folder" /></b><span>{label}</span></button>)}</aside><main>{library
      ? <div className="capture-library-rows">{captures.map((name) => <button key={name}><span>{name}<small>NeuralDSP</small></span><b>4</b></button>)}<aside className="capture-library-index">{["#", "•", "A", "•", "I", "•", "R", "•", "Z"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</aside></div>
      : <QcEditorIcon kind="waveform" className="capture-library-placeholder" />}</main></section>;
}

function CorOsDevicePresetScreen({ save = false, view = "factory" }: { save?: boolean; view?: "factory" | "user" | "actions" | "official-actions" | "official-factory" }) {
  const officialActions = view === "official-actions";
  const officialFactory = view === "official-factory";
  const categories = officialActions ? COROS_DEVICE_CATEGORIES.slice(1, 7) : COROS_DEVICE_CATEGORIES.slice(0, 6);
  const devices = officialActions || officialFactory ? ["Bogna Uber Clean", "Bogna Uber Lead", "Bogna Vishnu 20th Clean", "Brit 2203", "Brit 900 Clean", "Brit 900 Lead", "Brit Plexi 100 Bright"] : ["Exotic Z Boost", "81 Creations Drive", "Brit Blues", "Brit Governor", "Chief BD2", "Chief DS1", "Chief MT"];
  const presets = officialActions ? ["Lead Tone", "Low Gain"] : officialFactory ? ["Neural DSP® Default", "Balanced Crunch", "Basic Clean", "Bass Clean", "Bass Punk Drive", "Bass Tube Drive", "Bass Verge Of OD"] : ["Neural DSP® Default", "Bass More Push", "Bass Push", "Bass Tube Drive", "Bass Tube OD", "Bigger Maker", "Bright Boost"];
  if (save) return <CorOsKeyboardScreen />;
  const user = view === "user" || officialActions;
  return <section className={`qc-screen coros-device-presets is-physical is-${officialActions ? "official-actions" : officialFactory ? "official-factory" : view}`} aria-label="Virtual Device preset browser"><nav>{categories.map(([label, color], index) => <button key={label} className={index === (officialActions ? 0 : officialFactory ? 1 : 4) ? "is-active" : ""} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} /></i></button>)}</nav><main><section><header><button className="is-active">GUITAR</button><button>BASS</button></header>{devices.map((name, index) => <button key={name} className={index === (officialActions ? 1 : officialFactory ? 3 : 0) ? "is-active" : ""}>{!officialActions && !officialFactory && index === 0 && <i className="device-pin"><QcUiIcon kind="pin" /></i>}<span>{name}</span><b><DevicePresetGlyph /></b></button>)}</section><section><header><button className={user ? "" : "is-active"}>FACTORY</button><button className={user ? "is-active" : ""}>USER</button><span /><button className="preset-close"><QcUiIcon kind="close" /></button>{officialFactory && <button className="preset-confirm"><QcUiIcon kind="check" /></button>}</header>{(officialActions || !user) && presets.map((name, index) => <button key={name}><span className={officialFactory && index === 1 ? "is-italic" : ""}>{name}<small>{officialActions ? "" : index ? "" : "Default"}</small></span><b><QcUiIcon kind="more" /></b></button>)}</section></main>{(view === "actions" || officialActions) && <aside className="device-preset-actions"><button>Set as Default</button><button>Edit Name</button><button>Overwrite</button><button>Delete</button></aside>}</section>;
}

function ExpressionPowerIcon() {
  return <QcScreenGlyph kind="power" />;
}

function ExpressionLinkIcon() {
  return <QcScreenGlyph kind="link" />;
}

function ExpressionChooser({ trim }: { trim: boolean }) {
  const tiles: Array<[string, boolean]> = [["NOISE REDUCTION", false], ["BYPASS", !trim]];
  return <section className={`qc-screen expression-bypass-official${trim ? " is-trim" : ""}`} aria-label={trim ? "Expression parameter assignment" : "Expression bypass assignment"}>
    <header><button><QcUiIcon kind="close" /></button><button>Expression 1</button><button>Expression 2</button><button><QcScreenHeaderGlyph kind="save" /></button></header>
    <p>Please choose which parameters you wish to control.<br />You can assign multiple at once.</p>
    {trim
      ? <main className="expression-switch-panel is-trim">
          <section className="trim-hint"><span>Tap <b><ExpressionLinkIcon /></b> to trim</span><small>Max and Min values of the preferred parameter</small></section>
          <section className="switch-delay"><span>MIN RANGE</span><b>0.00 %</b><i className="capture-level-dial is-unlit" /></section>
          <section className="switch-delay"><span>MAX RANGE</span><b>100 %</b><i className="capture-level-dial" /></section>
        </main>
      : <main className="expression-switch-panel">
          <section><button><ExpressionPowerIcon /></button></section>
          <section><span>SWITCH ON</span><label><i /><b>Heel-Toe</b><small>Switch<br />Stop</small></label></section>
          <section><span>INVERT RANGE</span><label><i /><b>On</b><small>Off</small></label></section>
          <section className="switch-delay"><span>SWITCH DELAY</span><b>600 ms</b><i className="capture-level-dial" /></section>
          <section className="switch-latch"><span>LATCH EMULATION</span><label><i /><b>On</b><small>Off</small></label></section>
        </main>}
    <div className="expression-parameter-grid">{tiles.map(([label, assigned]) => <section key={label}><span>{label}<b><ExpressionLinkIcon /></b></span><button className={assigned ? "is-assigned" : ""}>{assigned ? "ASSIGNED" : "ASSIGN"}</button></section>)}</div>
  </section>;
}

// The Grid, its title and the editor action bar are one screen on the unit:
// `block-context.png`, `scene-assignment.png` and `stomp-assignment.png` all
// draw it and differ only in what sits over it.
function PhysicalEditorUnderlay({ slot, letter, title, scene = "A", category, device, blocks = 0, blockGlyphs = [], output = ["Multi", "Out"], fit = false, expression = true, mode = "STOMP", children }: { slot: string; letter: string; title: string; scene?: string; category?: string; device?: string; blocks?: number; blockGlyphs?: string[]; output?: [string, string]; fit?: boolean; expression?: boolean; mode?: "STOMP" | "PRESET"; children?: ReactNode }) {
  return <div className={`physical-grid-underlay${fit ? " is-long-title" : ""}`}>
    <div className="underlay-grid">
      <header><strong><span>{slot}</span>{letter}</strong><h1>{title}</h1><nav><i><GridToolbarIcon kind="undo" /></i><b>{scene}</b><i><GridToolbarIcon kind="save" /></i><i><QcUiIcon kind="more" /></i></nav><em><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode={mode} /></svg>{mode}</em></header>
      <main><span className="underlay-route">In<br />1</span><i className="underlay-cable" />{Array.from({ length: blocks }, (_, index) => <i key={index} className={`underlay-block is-block-${index + 1}`}>{blockGlyphs[index] && <DeviceCategoryGlyph label={blockGlyphs[index]} fallback="" />}</i>)}<span className="underlay-output">{output[0]}<br />{output[1]}</span></main>
    </div>
    {category && <button className="underlay-editor-more"><QcUiIcon kind="more" /></button>}
    {category && <span className="underlay-editor-label"><small>{category}</small><strong>{device}</strong></span>}
    <nav className="underlay-editor-bar">
      {expression && <button className="editor-expression"><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="STOMP" /></svg><small>?</small></button>}
      <button className="editor-scene"><QcEditorIcon kind="scene-previous" /><b>{scene}</b><QcEditorIcon kind="scene-next" /></button>
      <i className="editor-divider" />
      <button className="editor-bypass" aria-label="Mute"><QcEditorIcon kind="bypass" /></button>
      <button className="editor-confirm"><QcUiIcon kind="check" /></button>
    </nav>
    {children}
  </div>;
}

function CorOsAssignmentScreen({ view }: { view: "stomp-assignment" | "scene-assignment" }) {
  const scene = view === "scene-assignment";
  const parameters: Array<[string, string]> = scene ? [["NOISE REDUCTION", "17.3 %"]] : [["GAIN", "0.0 dB"], ["BASS", "6.5"], ["MID", "5.0"], ["TREBLE", "5.0"], ["VOLUME", "14.9 dB"]];
  return <section className={`qc-screen coros-assignment is-${scene ? "scene" : "stomp"}`} aria-label={view.replaceAll("-", " ")}>
    <PhysicalEditorUnderlay slot="4" letter={scene ? "E" : "B"} title={scene ? "QC MCP TEST_2*" : "Top 3 Acoustic Sims"} scene={scene ? "A" : "F"} category={scene ? "UTILITY" : "NEURAL CAPTURE"} device={scene ? "Adaptive Gate" : "Akustyczna"} blocks={scene ? 1 : 2} blockGlyphs={scene ? ["Utility"] : ["Utility", "Neural Capture"]} output={scene ? ["Multi", "Out"] : ["Row", "3/4"]} fit={!scene}>
      <div className="assignment-parameters">{Array.from({ length: 5 }, (_, index) => parameters[index]).map((parameter, index) => <section key={index}>{parameter && <><span>{parameter[0]}</span>{scene && <em>A B<br />C D</em>}<i className="assignment-knob"><b /></i><strong>{parameter[1]}</strong></>}</section>)}</div>
    </PhysicalEditorUnderlay>
    {!scene && <div className="assignment-stomp-message"><aside className="assignment-stomp-dialog"><h1>Assign footswitch</h1><p>Press the target footswitch to assign</p><div className="assignment-stomp-latch"><button className="is-active"><QcEditorIcon kind="footswitch" />Latching</button><button><QcEditorIcon kind="band-power" />Momentary</button></div><footer><button>CANCEL</button><button className="is-primary">UNASSIGN</button></footer></aside></div>}
  </section>;
  return <section className="qc-screen coros-assignment is-expression" aria-label={view.replaceAll("-", " ")}><header><button><QcUiIcon kind="close" /></button><span><small>EXPRESSION PEDAL ASSIGNMENT</small><strong>DISTORTION</strong></span><button><QcUiIcon kind="check" /></button></header><p>Move an expression pedal to assign its range</p><div className="expression-pedals"><button className="is-active"><b>EXP 1</b><i /><span>HEEL　0.0</span><span>TOE　10.0</span></button><button><b>EXP 2</b><i /><span>NOT ASSIGNED</span></button></div><footer><button>BYPASS ASSIGN</button><button>SWAP MIN / MAX</button><button>REMOVE</button></footer></section>;
}

function BlockContextIcon({ kind }: { kind: "change" | "copy" | "paste" | "reset" | "save" | "expression" | "bypass" | "model-update" | "model-downgrade" | "remove" }) {
  return <QcEditorIcon kind={kind === "bypass" ? "mute" : kind} />;
}

type GridPopupView = "capture-type" | "grid-context-menu" | "grid-context-menu-favorite" | "grid-context-menu-bottom"
  | "input-route-selector" | "input-route-selector-top"
  | "output-route-selector" | "output-route-selector-top" | "grid-scene-selector";

type PopupCell = { label: string; caption?: boolean; icon?: ReactNode; note?: string; active?: boolean };

// `grid-context-menu.tree.txt` lists the preset menu in one table, captions
// included; the three frames of it differ only in how far it is scrolled.
const GRID_MENU_CELLS: Array<[string, string]> = [
  ["FILE", ""], ["Create New", "add"], ["Save as...", "save-as"], ["Edit Details", "edit"],
  ["Copy Scene A", "copy"], ["Swap Scene A", "change"], ["Preset MIDI Out", "midi"],
  ["Add to favorites", "favorite"], ["Delete Preset", "delete"], ["QUAD CORTEX", ""],
  ["New Neural Capture", "capture"], ["Modes Configuration", "modes"], ["Tempo", "tempo"],
  ["CPU Monitor", "cpu"], ["Settings", "settings"],
];

const ROUTE_INPUT_CELLS: Array<[string, string]> = [
  ["MONO", ""], ["Input 1", "mono"], ["Input 2", "mono"], ["Return 1", "fx"], ["Return 2", "fx"],
  ["USB input 5", "USB"], ["USB input 6", "USB"], ["USB input 7", "USB"], ["USB input 8", "USB"],
  ["STEREO", ""], ["Input 1/2", "stereo"], ["Return 1/2", "fx"], ["USB input 5/6", "usb"],
  ["USB input 7/8", "usb"], ["OTHER", ""], ["Prev. Row", "mono"], ["Not In Use", "add"],
];

const ROUTE_OUTPUT_CELLS: Array<[string, string]> = [
  ["STEREO", ""], ["Multiple Outputs", "stereo"], ["Output 1/2", "stereo"], ["Output 3/4", "stereo"],
  ["Send 1/2", "fx"], ["USB Output 3/4", "usb"], ["USB Output 5/6", "usb"], ["USB Output 7/8", "usb"],
  ["MONO", ""], ["Output 1", "mono"], ["Output 2", "mono"], ["Output 3", "mono"], ["Output 4", "mono"],
  ["Send 1", "fx"], ["Send 2", "fx"], ["USB Output 3", "usb"], ["USB Output 4", "usb"],
  ["USB Output 5", "usb"], ["USB Output 6", "usb"], ["USB Output 7", "usb"], ["USB Output 8", "usb"],
  ["OTHER", ""], ["Row 3", "mono"], ["Row 4", "mono"], ["Row 3/4", "stereo"], ["Not In Use", "add"],
];

function RouteGlyph({ kind }: { kind: string }) {
  if (kind === "mono") return <QcScreenGlyph kind="route-output" className="route-glyph" />;
  if (kind === "stereo") return <QcScreenGlyph kind="route-input" className="route-glyph" />;
  if (kind === "fx") return <span className="route-glyph route-fx">FX</span>;
  if (kind === "usb") return <QcScreenGlyph kind="route-usb" className="route-glyph" />;
  return <QcUiIcon kind="add" className="route-plus" />;
}

function GridMenuIcon({ kind }: { kind: string }) {
  if (kind === "copy" || kind === "change") return <QcEditorIcon kind={kind as "copy" | "change"} />;
  return <QcUiIcon kind={kind as Parameters<typeof QcUiIcon>[0]["kind"]} />;
}

// Grid, popup box and scroll offset for each frame, all read off the captures.
const GRID_POPUP_STATE: Record<GridPopupView, {
  slot: string; letter: string; tone: string; name: string; mode: "STOMP" | "PRESET";
  blocks: Array<[number, string, string]>; highlight?: "input" | "output";
  kind: "menu" | "input" | "output" | "scene" | "none"; offset: number;
}> = {
  "capture-type": { slot: "2", letter: "F", tone: "#6748ff", name: "QC MCP TEST", mode: "PRESET", blocks: [[0, "#2df36a", "Utility"]], kind: "none", offset: 0 },
  "grid-context-menu": { slot: "32", letter: "H", tone: "#ff2421", name: "pyquadcortex scratch", mode: "STOMP", blocks: [[0, "#949694", "Utility"], [1, "#ff7100", "Overdrive"], [2, "#525152", "Modulation"], [3, "#ff2421", "Amp"], [4, "#6748ff", "Cab"], [5, "#16dfcc", "Equalizer"], [6, "#16dfcc", "Reverb"]], kind: "menu", offset: 0 },
  "grid-context-menu-favorite": { slot: "5", letter: "C", tone: "#ff7100", name: "Ilia", mode: "PRESET", blocks: [[1, "#16dfcc", "Reverb"], [2, "#ff2421", "Amp"]], kind: "menu", offset: 420 },
  "grid-context-menu-bottom": { slot: "2", letter: "F", tone: "#6748ff", name: "QC MCP TEST_2", mode: "PRESET", blocks: [[0, "#2df36a", "Utility"]], kind: "menu", offset: 480 },
  "input-route-selector": { slot: "32", letter: "H", tone: "#ff2421", name: "pyquadcortex scratch", mode: "STOMP", blocks: [[0, "#949694", "Utility"], [1, "#ff7100", "Overdrive"], [2, "#525152", "Modulation"], [3, "#ff2421", "Amp"], [4, "#6748ff", "Cab"], [5, "#16dfcc", "Equalizer"], [6, "#16dfcc", "Reverb"]], highlight: "input", kind: "input", offset: 480 },
  "input-route-selector-top": { slot: "5", letter: "C", tone: "#ff7100", name: "Ilia", mode: "PRESET", blocks: [[1, "#16dfcc", "Reverb"], [2, "#ff2421", "Amp"]], highlight: "input", kind: "input", offset: 0 },
  "output-route-selector": { slot: "32", letter: "H", tone: "#ff2421", name: "pyquadcortex scratch", mode: "STOMP", blocks: [[0, "#949694", "Utility"], [1, "#ff7100", "Overdrive"], [2, "#525152", "Modulation"], [3, "#ff2421", "Amp"], [4, "#6748ff", "Cab"], [5, "#16dfcc", "Equalizer"], [6, "#16dfcc", "Reverb"]], highlight: "output", kind: "output", offset: 1152 },
  "output-route-selector-top": { slot: "5", letter: "C", tone: "#ff7100", name: "Ilia", mode: "PRESET", blocks: [[1, "#16dfcc", "Reverb"], [2, "#ff2421", "Amp"]], highlight: "output", kind: "output", offset: 0 },
  "grid-scene-selector": { slot: "32", letter: "H", tone: "#ff2421", name: "pyquadcortex scratch", mode: "STOMP", blocks: [[0, "#949694", "Utility"], [1, "#ff7100", "Overdrive"], [2, "#525152", "Modulation"], [3, "#ff2421", "Amp"], [4, "#6748ff", "Cab"], [5, "#16dfcc", "Equalizer"], [6, "#16dfcc", "Reverb"]], kind: "scene", offset: 0 },
};

function CorOsGridPopup({ view }: { view: GridPopupView }) {
  const state = GRID_POPUP_STATE[view];
  const scenes = ["Default scene", "Scene B", "Scene C", "Scene D", "Scene E", "Scene F", "Scene G", "Scene H"];
  const source = state.kind === "menu" ? GRID_MENU_CELLS : state.kind === "input" ? ROUTE_INPUT_CELLS : ROUTE_OUTPUT_CELLS;
  const cells: PopupCell[] = state.kind === "scene"
    ? scenes.map((label, index) => ({ label, active: index === 0 }))
    : source.map(([label, icon]) => ({
        label,
        caption: !icon,
        icon: state.kind === "menu" ? (icon ? <GridMenuIcon kind={icon} /> : undefined) : icon ? <RouteGlyph kind={icon} /> : undefined,
        note: label === "Multiple Outputs" ? "1/2 + 3/4 + USB 3/4" : undefined,
        active: label === "Input 1" || label === "Multiple Outputs",
      }));
  return <section className={`qc-screen coros-grid-popup is-${state.kind}`} aria-label={view.replaceAll("-", " ")}>
    <div className="popup-grid">
      <header><strong><span>{state.slot}</span><b style={{ color: state.tone }}>{state.letter}</b></strong><h1 style={{ fontSize: `${state.name.length > 15 ? 40 : 58}px`, marginTop: state.name.length > 15 ? "11px" : "6px" }}>{state.name}</h1>
        <nav><i><GridToolbarIcon kind="undo" /></i><b>A</b><i><GridToolbarIcon kind="save" /></i><i><QcUiIcon kind="more" /></i></nav>
        <em><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode={state.mode} /></svg>{state.mode}</em></header>
      <main>
        <span className={`popup-route${state.highlight === "input" ? " is-open" : ""}`}>In<br />1</span>
        <i className="popup-cable" />
        {state.blocks.map(([index, tone, label]) => <i key={index} className="popup-block" style={{ left: `${69 + Number(index) * 86}px`, borderColor: tone, color: tone }}><DeviceCategoryGlyph label={label as string} fallback="" /></i>)}
        <span className={`popup-output${state.highlight === "output" ? " is-open" : ""}`}>Multi<br />Out</span>
        {[1, 2, 3].map((row) => <span key={row} className="popup-plus" style={{ top: `${13 + row * 94}px` }}><QcUiIcon kind="add" /></span>)}
        {[1, 2, 3].map((row) => <span key={`r${row}`} className="popup-plus is-right" style={{ top: `${13 + row * 94}px` }}><QcUiIcon kind="add" /></span>)}
      </main>
    </div>
    {state.kind !== "scene" && state.kind !== "none" && <i className="popup-scrim" />}
    {state.kind !== "none" && <aside className="popup-panel">
      <div className="popup-list" style={{ top: `${-state.offset}px` }}>
        {cells.map((cell, index) => <div key={`${cell.label}-${index}`} className={`popup-cell${cell.caption ? " is-caption" : ""}${cell.active ? " is-active" : ""}`}>
          {state.kind === "scene" ? <b className="scene-badge">{String.fromCharCode(65 + index)}</b> : cell.icon}
          <span>{cell.label}{cell.note && <small>{cell.note}</small>}</span>
        </div>)}
      </div>
      <i className="popup-scrollbar" />
    </aside>}
  </section>;
}

function CorOsBlockContext({ bottom = false }: { bottom?: boolean }) {
  const rows: Array<[Parameters<typeof BlockContextIcon>[0]["kind"], string, string]> = [
    ["change", "Change device", ""],
    ["copy", "Copy device", ""],
    ["paste", "Paste device", "is-disabled"],
    ["reset", "Reset to defaults", ""],
    ["save", "Save Current Parameters as...", ""],
    ["expression", "Assign expression pedal", ""],
    ["bypass", "Mute/bypass", ""],
    ["model-update", "Model update available", "is-disabled"],
    ["model-downgrade", "Change to legacy version", "is-disabled"],
    ["remove", "Remove block from the grid", ""],
  ];
  const reverb: Array<[string, string]> = [["MIX", "12.0 %"], ["SIZE", "Med"], ["PRE DELAY", "20.0 ms"], ["DAMPING", "50 %"], ["HIGH PASS", "80 Hz"]];
  return <section className={`qc-screen coros-block-context${bottom ? " is-bottom" : ""}`} aria-label="Block contextual actions">
    {bottom
      ? <PhysicalEditorUnderlay slot="5" letter="C" title="Ilia" category="REVERB" device="Ambience" blocks={2} blockGlyphs={["Utility", "Reverb"]} expression={false}>
          <div className="assignment-parameters">{reverb.map(([label, value]) => <section key={label}><span>{label}</span><i className="assignment-knob"><b /></i><strong>{value}</strong></section>)}</div>
          <div className="assignment-parameters is-row-2">{[["LOW PASS", "6000 Hz"]].map(([label, value]) => <section key={label}><span>{label}</span><i className="assignment-knob"><b /></i><strong>{value}</strong></section>)}{[0, 1, 2, 3].map((index) => <section key={`empty-${index}`} />)}</div>
        </PhysicalEditorUnderlay>
      : <div className="physical-eq-underlay"><header><button className="physical-eq-more" aria-label="More"><QcUiIcon kind="more" /></button><span className="physical-eq-title"><small>EQ</small><strong>Parametric-8</strong></span><nav><button aria-label="Previous scene"><QcEditorIcon kind="scene-previous" /></button><b>A</b><button aria-label="Next scene"><QcEditorIcon kind="scene-next" /></button><i /><button className="physical-eq-save" aria-label="Save"><QcEditorIcon kind="save" /></button><button className="physical-eq-confirm" aria-label="Confirm"><QcEditorIcon kind="confirm" /></button></nav></header><svg viewBox="0 0 800 480" aria-hidden="true"><g className="physical-eq-grid"><path d="M449 60v250M712 60v250" /><text x="465" y="71">1k</text><text x="728" y="71">10k</text></g><path className="physical-eq-curve" d="M0 300C80 180 180 195 310 165S500 42 610 92 750 170 790 310" />{[[105,185],[185,185],[512,119],[600,113],[770,219]].map(([cx,cy], index) => <g key={index}><circle cx={cx} cy={cy} r="20" /><text x={cx} y={cy + 5} textAnchor="middle">{index + 1}</text></g>)}</svg><footer><span>TYPE</span><span>GAIN</span><span>FREQ<i className="physical-eq-footer-dial is-frequency" /><strong>50 <small>Hz</small></strong></span><span>Q<i className="physical-eq-footer-dial is-q" /><strong>0.10</strong></span><span>BYPASS 1<i className="physical-eq-footer-power" /></span></footer></div>}
    <i className="block-context-scrim" />
    <aside style={bottom ? { marginTop: "-180px" } : undefined}>{rows.map(([kind, label, className], index) => <button key={label} className={`${className}${index === 3 ? " has-gap" : ""}`}><span><BlockContextIcon kind={kind} /></span>{label}</button>)}</aside>
  </section>;
}

const COROS_INPUT_MONO_ROUTES = ["Input 1", "Input 2", "Return 1", "Return 2", "USB input 5", "USB input 6", "USB input 7", "USB input 8"];
const COROS_INPUT_ROUTES = ["Input 1/2", "Return 1/2", "USB input 5/6", "USB input 7/8", "Not In Use"];
const COROS_OUTPUT_ROUTES = ["Multi Out", "Output 1/2", "Output 3/4", "Output 1", "Output 2", "Output 3", "Output 4", "Send 1", "Send 2", "Send 1/2", "USB Output 3", "USB Output 4", "USB Output 3/4", "USB Output 5", "USB Output 6", "USB Output 7", "USB Output 8", "OTHER", "Row 3", "Row 4", "Row 3/4", "Not In Use"];
const COROS_DEVICE_CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ["Plugins", QC_COLORS.browserCategory.plugin], ["Amp", QC_COLORS.browserCategory.amp], ["Neural Capture", QC_COLORS.browserCategory.capture],
  ["Cab", QC_COLORS.browserCategory.cab], ["Overdrive", QC_COLORS.browserCategory.overdrive], ["Delay", QC_COLORS.browserCategory.delay],
  ["Reverb", QC_COLORS.browserCategory.reverb], ["Compressor", QC_COLORS.browserCategory.compressor], ["Pitch", QC_COLORS.browserCategory.pitch],
  ["Modulation", QC_COLORS.browserCategory.modulation], ["Morph", QC_COLORS.browserCategory.morph], ["Synth", QC_COLORS.browserCategory.synth],
  ["Filter", QC_COLORS.browserCategory.filter], ["Equalizer", QC_COLORS.browserCategory.equalizer], ["IR Loader", QC_COLORS.browserCategory.irLoader],
  ["Wah", QC_COLORS.browserCategory.wah], ["FX Loop", QC_COLORS.browserCategory.fxLoop], ["Looper", QC_COLORS.browserCategory.looper], ["Utility", QC_COLORS.browserCategory.utility]
];
const COROS_OVERDRIVE_MODELS = ["Exotic Z Boost", "81 Creations Drive", "Brit Blues", "Brit Governor", "Chief BD2", "Chief DS1", "Chief MT", "Chief OD1", "Chief SD1", "Exotic", "Facial Fuzz", "Freeman BOD"];

function DevicePresetGlyph() {
  return <QcPresetStackIcon />;
}

function PluginLockIcon() {
  return <QcScreenGlyph kind="lock" />;
}

function RouteSymbol({ label }: { label: string }) {
  if (label.startsWith("USB")) return <span className="route-symbol"><QcScreenGlyph kind="route-usb" /></span>;
  if (label.startsWith("Return")) return <span className="route-symbol route-fx">FX</span>;
  if (label === "Not In Use") return <span className="route-symbol route-unused"><QcUiIcon kind="add" /></span>;
  if (label.startsWith("Input")) return <span className="route-symbol route-stereo-input"><QcScreenGlyph kind="route-input" /></span>;
  if (label.startsWith("Row")) return <span className="route-symbol"><QcScreenGlyph kind="route-row" /></span>;
  return <span className="route-symbol"><QcScreenGlyph kind="route-output" /></span>;
}

const CORPUS_DEVICE_CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ["Plugins", QC_COLORS.browserCategory.plugin], ["Amp", QC_COLORS.browserCategory.amp], ["Neural Capture", QC_COLORS.browserCategory.capture],
  ["Cab", QC_COLORS.browserCategory.cab], ["Overdrive", QC_COLORS.browserCategory.overdrive], ["Delay", QC_COLORS.browserCategory.delay],
  ["Reverb", QC_COLORS.browserCategory.reverb], ["Compressor", QC_COLORS.browserCategory.compressor], ["Pitch", QC_COLORS.browserCategory.pitch],
  ["Modulation", QC_COLORS.browserCategory.modulation], ["Morph", QC_COLORS.browserCategory.morph], ["Synth", QC_COLORS.browserCategory.synth],
  ["Filter", QC_COLORS.browserCategory.filter], ["Equalizer", QC_COLORS.browserCategory.equalizer], ["IR Loader", QC_COLORS.browserCategory.irLoader],
  ["Wah", QC_COLORS.browserCategory.wah], ["FX Loop", QC_COLORS.browserCategory.fxLoop], ["Looper", QC_COLORS.browserCategory.looper], ["Utility", QC_COLORS.browserCategory.utility]
] as const;
const CORPUS_OVERDRIVE_MODELS = ["Exotic Z Boost", "81 Creations Drive", "Brit Blues", "Brit Governor", "Chief BD2", "Chief DS1", "Chief MT", "Chief OD1", "Chief SD1", "Exotic", "Facial Fuzz", "Freeman BOD"];

function CorOsOfficialGrid({ snapshot, children, browserChrome = false, letterTone }: { snapshot: PresetSnapshot; children?: ReactNode; browserChrome?: boolean; letterTone?: string }) {
  const columns = [101, 187, 272, 357, 443, 529, 615, 701];
  const rowY = [147, 241, 335, 429];
  const screenBlocks = snapshot.blocks.filter((block) => block.row >= 0 && block.row < 4 && block.column >= 0 && block.column < 8);
  const routes = rowY.map((_, row) => snapshot.routes.find((route) => route.row === row));
  const routeLines = (label: string | undefined) => {
    const value = label || "+";
    const words = value.split(" ");
    return words.length > 1 ? [words[0], words.slice(1).join(" ")] : [value];
  };
  const railLabel = (label: string | undefined, x: number, y: number) => {
    const lines = routeLines(label);
    if ((label || "+") === "+") return <g stroke="#dedede" strokeWidth="1.7" strokeLinecap="round"><path d={`M${x - 10} ${y}h20`} /><path d={`M${x} ${y - 10}v20`} /></g>;
    return <text x={x} y={y - (lines.length - 1) * 8.5} fill="#e6e6e6" stroke="none" fontFamily={QC_TYPOGRAPHY.deviceRoute} fontWeight="400" fontSize="14.5">{lines.map((line, index) => <tspan key={`${line}-${index}`} x={x} dy={index ? 17 : 0}>{line}</tspan>)}</text>;
  };
  return <div className="qc-screen coros-vector-screen" aria-label="CorOS Grid">
    <svg className="coros-vector-canvas" viewBox="0 0 800 480" preserveAspectRatio="none" role="img" aria-label={`${snapshot.presetLocation} ${snapshot.presetName}, ${snapshot.mode} mode`}>
      <rect width="800" height="480" fill="#020202" />
      <text x="14" y="76" fill="#f4f4f4" fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="800" fontSize="64"><tspan letterSpacing="-2">{snapshot.presetLocation.slice(0, -1)}</tspan><tspan fill={letterTone ?? (browserChrome ? "#d63b3e" : "#2df36a")} letterSpacing="-2">{snapshot.presetLocation.slice(-1)}</tspan><tspan dx={16} dy={browserChrome ? -11 : 0} fill="#f4f4f4" fontSize={browserChrome ? 40 : 64} letterSpacing={browserChrome ? 0 : -2} textLength={browserChrome ? undefined : 313} lengthAdjust={browserChrome ? undefined : "spacingAndGlyphs"}>{snapshot.presetName}</tspan></text>
      <QcScreenHeaderGlyph kind="undo" />
      <QcScreenHeaderGlyph kind="export" />
      <g className="grid-scene-badge"><rect x="656" y="12" width="25" height="25" rx="3" fill="#f2cf32" /><text x="668.5" y="33" textAnchor="middle" fill="#141414" fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="800" fontSize="22">A</text></g>
      <QcScreenHeaderGlyph kind="menu" />
      <g transform="translate(657 55)"><ModeGlyph mode={snapshot.mode} /></g><text x="693" y="78" fill="#f0f0f0" fontFamily={QC_TYPOGRAPHY.devicePlain} fontWeight="800" fontSize="21.5">{snapshot.mode}</text>
      <g fill="#171719" stroke="#050505" strokeWidth="1.5" fontFamily={QC_TYPOGRAPHY.deviceRoute} textAnchor="middle">
        {rowY.flatMap((y, row) => [<rect key={`in-${row}`} x="8" y={y - 39} width="44" height="78" rx="15" />, <rect key={`out-${row}`} x="748" y={y - 39} width="44" height="78" rx="15" />])}
        {rowY.map((y, row) => <g key={`rails-${row}`}>{railLabel(routes[row]?.input, 30, y)}{railLabel(routes[row]?.output, 770, y)}</g>)}
      </g>
      <g fill="none" stroke="#8f9092" strokeWidth="1.4">{rowY.map((y, row) => screenBlocks.some((block) => block.row === row) ? <path key={row} d={`M52 ${y}H748`} /> : null)}</g>
      {!browserChrome && <g aria-hidden="true">
        {[[53, 147, false], [587, 147, false], [159, 335, true]].map(([x, y, dimmed]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} opacity={dimmed ? .42 : 1}><rect x="-8" y="-7" width="16" height="14" rx="5" fill="#f1f2f1" /><circle cx="-3" cy="0" r="2" fill="#171917" /><path d="M0-3 5 0 0 3Z" fill="#171917" /></g>)}
      </g>}
      <g>{screenBlocks.map((block) => { const cx = columns[block.column]; const cy = rowY[block.row]; return <g key={block.id} opacity={block.bypassed ? .48 : 1}><QcDeviceGlyph block={block} x={cx} y={cy} />{block.bypassed && <path d={`M${cx - 32} ${cy}H${cx + 32}`} fill="none" stroke="#c9c9ca" strokeWidth="2" opacity=".9" />}</g>; })}</g>
    </svg>{children}
  </div>;
}

function CorOsCorpusDeviceBrowser({ snapshot, view }: { snapshot: PresetSnapshot; view: "corpus-device-browser-root" | "corpus-device-browser-models" | "corpus-device-browser-models-clean" | "device-browser-middle-deep" | "device-browser-middle-reverb" }) {
  const models = view === "corpus-device-browser-models" || view === "corpus-device-browser-models-clean";
  // device-browser-middle-deep.png opens on Compressor and -reverb on Cab:
  // the same list, scrolled seven and three of its 78px rows.
  const scrolled = view === "device-browser-middle-deep" ? 7 : view === "device-browser-middle-reverb" ? 3 : 0;
  // Both middle frames were taken in 3C over a four-row grid, read off
  // device-browser-middle-reverb.png.
  const gridSnapshot: PresetSnapshot = scrolled ? { ...snapshot, presetLocation: "3C", presetName: "12 String Bass", routes: [{ row: 0, inputId: 0, outputId: 0, input: "In 1", output: "", splitMuted: false }, { row: 1, inputId: 0, outputId: 0, input: "In 1", output: "", splitMuted: false }, { row: 2, inputId: 0, outputId: 0, input: "Prev. Row", output: "", splitMuted: false }, { row: 3, inputId: 0, outputId: 0, input: "In 1", output: "", splitMuted: false }], blocks: [{ id: "c3-0-0", name: "Simple Gate", kind: "utility", category: "Utility", row: 0, column: 0 }, { id: "c3-0-1", name: "Digital Delay", kind: "delay", category: "Delay", row: 0, column: 1 }, { id: "c3-0-2", name: "Studio Comp", kind: "utility", category: "Compressor", row: 0, column: 2 }, { id: "c3-0-3", name: "Transpose", kind: "utility", category: "Pitch", row: 0, column: 3 }, { id: "c3-1-0", name: "Simple Gate", kind: "utility", category: "Utility", row: 1, column: 0 }, { id: "c3-1-1", name: "Digital Delay", kind: "delay", category: "Delay", row: 1, column: 1 }, { id: "c3-1-2", name: "Studio Comp", kind: "utility", category: "Compressor", row: 1, column: 2 }, { id: "c3-1-3", name: "Transpose", kind: "utility", category: "Pitch", row: 1, column: 3 }, { id: "c3-2-2", name: "Studio Comp", kind: "utility", category: "Compressor", row: 2, column: 2 }, { id: "c3-2-3", name: "Transpose", kind: "utility", category: "Pitch", row: 2, column: 3, bypassed: true }, { id: "c3-3-0", name: "Simple Gate", kind: "utility", category: "Utility", row: 3, column: 0 }, { id: "c3-3-2", name: "Studio Comp", kind: "utility", category: "Compressor", row: 3, column: 2 }] } : snapshot;
  return <CorOsOfficialGrid snapshot={gridSnapshot} browserChrome letterTone={scrolled ? "#ff7100" : undefined}>
    <span className={`coros-device-empty-slot${scrolled ? " is-row-4" : ""}`}><QcUiIcon kind="add" /></span>
    <button className="coros-device-dismiss" aria-label="Close device browser" />
    <section className="coros-device-browser" aria-label="Virtual Device browser">
      <nav style={scrolled ? { marginTop: `${-scrolled * 78}px` } : undefined}>{CORPUS_DEVICE_CATEGORIES.map(([label, color]) => <button key={label} data-category={label} className={models && label === "Overdrive" ? "is-active" : ""} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} /></i><span>{label === "Equalizer" ? "EQ" : label}</span>{label === "Delay" && <b>New</b>}</button>)}</nav>
      {models && <div className="coros-device-models"><header><button className="is-active">GUITAR</button><button>BASS</button></header>{CORPUS_OVERDRIVE_MODELS.map((model, index) => <button key={model}><span>{index === 0 ? <b className="device-model-pin"><QcScreenGlyph kind="pin" /></b> : null}{model}</span><i><DevicePresetGlyph /></i></button>)}</div>}
    </section>
    {models && view !== "corpus-device-browser-models-clean" && <aside className="coros-device-preset-tip"><button aria-label="Dismiss Virtual Device Presets tip"><QcUiIcon kind="close" /></button><strong>VIRTUAL DEVICE PRESETS</strong><span>Tap the preset icon next to each virtual device to access its Factory and User Presets.</span></aside>}
  </CorOsOfficialGrid>;
}

function IconographyAuditFixture() {
  const ui = ["subtract", "up", "microphone", "attachment", "send", "stop"] as const;
  const editor = ["assignment-expression", "waveform"] as const;
  const hardware = ["power", "brand-pulse"] as const;
  return <section className="qc-screen iconography-audit-fixture" aria-label="App-owned iconography audit">
    <main>
      {ui.map((kind) => <figure key={kind} data-icon={kind}><QcUiIcon kind={kind} /><figcaption>{kind}</figcaption></figure>)}
      {editor.map((kind) => <figure key={kind} data-icon={kind}><QcEditorIcon kind={kind} /><figcaption>{kind}</figcaption></figure>)}
      {hardware.map((kind) => <figure key={kind} data-icon={kind}><QcHardwareIcon kind={kind} /><figcaption>{kind}</figcaption></figure>)}
      <figure data-icon="previous"><QcUiIcon kind="previous" /><figcaption>previous</figcaption></figure>
    </main>
  </section>;
}

export function CorOsScreenFixture({ view, snapshot, gigPresetList, onClose = () => undefined }: { view: CorOsScreenView; snapshot: PresetSnapshot; gigPresetList?: PresetList; onClose?: () => void }) {
  if ((view as string) === "iconography-audit") return <IconographyAuditFixture />;
  if (view === "grid-official-brit") return <CorOsOfficialGrid snapshot={snapshot} />;
  if (view === "corpus-device-browser-root" || view === "corpus-device-browser-models" || view === "corpus-device-browser-models-clean" || view === "device-browser-middle-deep" || view === "device-browser-middle-reverb") return <CorOsCorpusDeviceBrowser snapshot={snapshot} view={view} />;
  if (view.startsWith("fixture-")) return <CorOsRemainingFixture view={view as RemainingFixtureView} />;
  if (view.startsWith("recovery-") || view.startsWith("overlay-")) return <CorOsSystemFixture view={view as SystemFixtureView} />;
  if (view === "tuner-live-enabled") return <CorOsTuner liveTuner onClose={onClose} />;
  if (view.startsWith("gig-official-")) return <CorOsOfficialGig mode={view.replace("gig-official-", "") as OfficialGigMode} />;
  if (view === "device-presets-official") return <CorOsDevicePresetScreen view="official-factory" />;
  if (view === "gig" || view === "gig-live-tuner") return <CorOsGigView snapshot={snapshot} presetList={gigPresetList} liveTuner={view === "gig-live-tuner"} onClose={onClose} />;
  if (view === "gig-view-preset" || view === "gig-view-scene") return <CorOsGigView snapshot={{ ...snapshot, mode: view === "gig-view-preset" ? "PRESET" : "SCENE" }} presetList={gigPresetList} onClose={onClose} />;
  // gig-view-hybrid.png was taken in 7B with scene F live, and its two rows are
  // presets over scenes.
  if (view === "gig-view-hybrid") return <CorOsGigView snapshot={{ ...snapshot, mode: "HYBRID", footswitchModes: ["PRESET", "SCENE"], presetLocation: "7B", presetName: "Top 3 Acoustic Sims", presetPosition: 49, activeScene: 5,  scenes: ["Scene A", "Scene B", "Scene C", "Scene D", "mono", "stereo", "chor", "fx"] }} presetList={{ setlistKey: snapshot.setlistKey, setlistName: "My Presets", currentPosition: 49, folders: [], presets: [{ position: 48, location: "7A", name: "Acoustic sim-_1", instrument: 0 }, { position: 49, location: "7B", name: "Top 3 Acoustic Sims", instrument: 0 }, { position: 50, location: "7C", name: "XUSH 12string Bass", instrument: 0 }, { position: 51, location: "7D", name: "QC-MCP-TEST-mtniwb_1", instrument: 0 }] }} presetTone="#0875e7" onClose={onClose} />;
  if (view === "tuner") return <CorOsTuner onClose={onClose} />;
  if (view === "tempo") return <CorOsTempo bpm={snapshot.tempo} onClose={onClose} />;
  if (view === "midi-out") return <CorOsMidiOut onClose={onClose} />;
  if (view === "cpu-monitor") return <CorOsCpuMonitor snapshot={snapshot} onClose={onClose} />;
  if (view === "global-eq") return <CorOsGlobalEq onClose={onClose} />;
  if (view.startsWith("io-")) return <CorOsIoSettings initialView={view.slice(3) as IoView} onClose={onClose} />;
  if (view === "power-overlay") return <CorOsPowerOverlay onClose={onClose} />;
  if (view === "device-browser-amp-official" || view === "plugin-devices-official") return <CorOsOfficialDeviceBrowser plugins={view === "plugin-devices-official"} />;
  if (view === "device-preset-actions-official") return <CorOsDevicePresetScreen view="official-actions" />;
  if (view === "modes-official") return <CorOsOfficialModes onClose={onClose} />;
  if (view === "splitter-placement" || view === "splitter-editor" || view === "mixer-editor" || view === "empty-slot") return <CorOsRoutingScreen view={view} snapshot={snapshot} />;
  if (view === "device-search" || view === "device-search-entry" || view === "device-search-suggestions" || view === "device-search-results" || view === "device-favorites" || view === "device-recents" || view === "device-browser-neural-capture") return <CorOsCaptureLibrary view={view} />;
  if (view === "plugin-folders" || view === "plugin-list" || view === "plugin-models" || view === "plugin-locked" || view === "plugin-refresh") return <CorOsDeviceBrowserFixture view={view} />;
  if (view === "looper-editor") return <CorOsLooperEditor />;
  if (view === "device-presets" || view === "device-presets-user" || view === "device-preset-actions" || view === "device-preset-save") return <CorOsDevicePresetScreen save={view === "device-preset-save"} view={view === "device-presets-user" ? "user" : view === "device-preset-actions" ? "actions" : "factory"} />;
  if (view === "expression-parameter" || view === "expression-bypass") return <ExpressionChooser trim={view === "expression-parameter"} />;
  if (view === "stomp-assignment" || view === "scene-assignment") return <CorOsAssignmentScreen view={view} />;
  if (view === "block-context" || view === "block-context-bottom") return <CorOsBlockContext bottom={view === "block-context-bottom"} />;
  if (view === "capture-type" || view === "grid-scene-selector" || view.endsWith("-route-selector") || view.endsWith("-route-selector-top") || view.startsWith("grid-context-menu")) return <CorOsGridPopup view={view as GridPopupView} />;
  if (view === "directory-new-folder") return <CorOsDirectoryNameScreen />;
  if (view === "directory-filter") return <CorOsOfficialDirectory view="directory-captures" filter />;
  if (view === "directory-captures-official") return <CorOsOfficialDirectory view="directory-captures" />;
  if (view === "directory-irs-official") return <CorOsOfficialDirectory view="directory-irs" />;
  if (view.startsWith("directory-")) return (["directory-presets", "directory-captures", "directory-irs", "directory-plugins", "directory-favorites", "directory-search-results", "directory-nested", "directory-cloud-upload"] as string[]).includes(view) ? <CorOsOfficialDirectory view={view as OfficialDirectoryView} /> : <CorOsDirectoryFixture view={view as DirectoryFixtureView} />;
  if (view.startsWith("capture-")) return <CorOsCaptureFixture view={view as CaptureFixtureView} />;
  if (view.startsWith("settings-")) return <CorOsSettingsFixture view={view as SettingsFixtureView} />;
  if (view === "modes") return <CorOsModesConfiguration onClose={onClose} />;
  if (view === "save-as") return <CorOsSaveAs onClose={onClose} />;
  if (view === "edit-details") return <CorOsPresetNameEditor snapshot={snapshot} onClose={onClose} />;
  return null;
}
