import { useState, type CSSProperties, type ReactNode } from "react";
import type { GridBlock, PresetList, PresetSnapshot } from "@qc-remote/client";
import { QC_COLORS } from "@qc-remote/theme";
import { officialBlockVisual } from "./block-visuals";
import { openSplitPath } from "./coros-ui";
import { QcDeviceGlyph } from "./device-glyph";
import { QcCaptureFilterIcon, QcDirectoryIcon, QcEditorIcon, QcEqIcon, QcHardwareIcon, QcIoIcon, QcLibraryIcon, QcModeGlyph, QcPresetStackIcon, QcScreenHeaderGlyph, QcSettingsIcon, QcUiIcon, type QcIoIconName, type QcSettingsIconName } from "./theme-icons";
import { QcRotaryDial, type QcRotaryDialProps } from "./qc-rotary-dial";
import "./fixture-live-surface.css";
import "./remaining-fixtures.css";
import { CorOsCaptureConnections, type CaptureConnectionView } from "./coros-capture-connections";
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
import "./qc-device-typography.css";
import "./remaining-fixtures-zenio.css";

type OfficialGigMode = "preset" | "scene" | "stomp" | "hybrid";

function GigStompGlyph({ index }: { index: number }) {
  if (index === 6) return <svg viewBox="0 0 70 70" aria-hidden="true"><rect x="3" y="3" width="64" height="64" rx="14" fill="#050506" stroke="#4f765f" strokeWidth="2.4" /><g fill="none" stroke="#f2f2f2" strokeWidth="2" strokeLinejoin="round"><rect x="24" y="21" width="22" height="22" rx="2" /><rect x="17" y="28" width="22" height="22" rx="2" /><path d="M28 21v-5h22v22h-4" /></g></svg>;
  const colors = ["#2df36a", "#ff7000", "#ff7000", "#ff7000", "#ff2727", "#ffd236", "#4f765f", "#00ffdd"];
  const labels = ["WAH", "DRV", "DRV", "DRV", "LOP", "PIT", "MULTI", "RVB"];
  return <svg viewBox="0 0 70 70" aria-hidden="true"><rect x="4" y="4" width="62" height="62" rx="14" fill="#050506" stroke={colors[index]} strokeWidth="2.4" /><circle cx="35" cy="27" r="9" fill="none" stroke={colors[index]} strokeWidth="2.5" /><text x="35" y="50" textAnchor="middle" fill="#f2f2f2" fontSize="8" fontWeight="800">{labels[index]}</text></svg>;
}

function OfficialGigModeIcon({ mode }: { mode: OfficialGigMode }) {
  if (mode === "hybrid") return <span className="gig-mode-hybrid-raster"><QcModeGlyph mode="HYBRID" /></span>;
  return <svg className={`gig-mode-icon gig-mode-icon-${mode}`} viewBox="0 0 24 24" aria-hidden="true"><QcModeGlyph mode={mode.toUpperCase() as PresetSnapshot["mode"]} /></svg>;
}

function CorOsOfficialGig({ mode, manualHybrid = false }: { mode: OfficialGigMode; manualHybrid?: boolean }) {
  const preset = [["1A", "Brit 2203"], ["1B", "Brit\nPlexi100\nNormal"], ["1C", "US TWN\nVibrato"], ["1D", "Rols Jazz\nCH120"], ["1E", "California\nTremo\nRed"], ["1F", "EV101III\nRed"], ["1G", "Freeman\n100\nRhythm"], ["1H", "D-Cell H4\nCh3"]];
  const scenes = ["British\n2203", "+MX OD\n+Doubler", "+Brit\nGovernor", "+Rodent\nDrive", "Dry\nDouble", "+MX &\nDlys", "Solo\nBoost", "Juicy Low\nGain"];
  const stomps = [["A", "Crying\nWah", "♧"], ["B", "MX\nClassicOD 4", "▥"], ["C", "Brit\nGovernor", "∿"], ["D", "Rodent\nDrive", "∿"], ["E", "Looper X", "♧"], ["F", "Transpose", "⌁"], ["G", "Multiple\ndevices (2)", "▣"], ["H", "Room", "◇"]];
  const sceneMode = mode === "scene";
  const stompMode = mode === "stomp";
  const hybridPresets = [["A", "Acoustic\nsim-_1"], ["B", "Top 3\nAcoustic\nSims"], ["C", "XUSH\n12string\nBass"], ["D", "QC-MCP-\nTEST-\nmtniwb_1"]];
  const hybridScenes = [["C", "mono"], ["F", "stereo"], ["G", "chor"], ["H", "fx"]];
  const manualHybridContent = <>{scenes.slice(0, 4).map((name, index) => <article key={name} className="hybrid-scene" data-letter={String.fromCharCode(65 + index)} style={{ background: ["#ff272d", "#0b2027", "#302f10", "#301021"][index], color: index === 0 ? "#050505" : "#f3f4f3" }}><SceneTileTools /><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>)}{stomps.slice(4).map(([letter, name], index) => <article key={letter} className="hybrid-stomp" data-letter={letter} style={{ background: ["#ff272d", "#302f10", "#171b18", "#10ead5"][index], color: index === 0 || index === 3 ? "#050505" : "#f3f4f3" }}><span className="hybrid-stomp-edit"><QcUiIcon kind="edit" /></span><small>{letter}</small><b className="has-device-glyph"><GigStompGlyph index={index + 4} /></b><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>)}</>;
  return <section className={`qc-screen gig-official is-${mode === "hybrid" ? "hybrid" : sceneMode ? "scene" : stompMode ? "stomp" : "preset"}${manualHybrid ? " is-manual-hybrid" : ""}`}><header><span>{mode === "hybrid" && !manualHybrid ? "7B Top 3 Acoustic Sims" : "1A Brit 2203"}</span><button><OfficialGigModeIcon mode={mode} /></button><button><b>{mode === "hybrid" && !manualHybrid ? "F" : "A"}</b></button><button><QcUiIcon kind="check" /></button></header><i /><main className="gig-official-tiles">{mode === "preset" ? preset.map(([location, name]) => <article key={location}><small>{location}</small><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>) : sceneMode ? scenes.map((name, index) => <article key={name} data-letter={String.fromCharCode(65 + index)}><SceneTileTools /><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>) : mode === "hybrid" ? manualHybrid ? manualHybridContent : <>{hybridPresets.map(([letter, name], index) => <article key={letter} className="hybrid-preset" style={{ background: index === 1 ? "#167ee8" : "#171b18", color: index === 1 ? "#050505" : "#f3f4f3" }}><small><span>7</span><b>{letter}</b></small><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>)}{hybridScenes.map(([letter, name], index) => <article key={letter} className="hybrid-scene" data-letter={letter} style={{ background: ["#0d2716", "#ff7900", "#17182f", "#0c3026"][index], color: index === 1 ? "#050505" : "#f3f4f3" }}><SceneTileTools /><strong>{name}</strong></article>)}</> : stomps.map(([letter, name], index) => <article key={letter}><small>↙ {letter}</small><b className="has-device-glyph"><GigStompGlyph index={index} /></b><strong>{name.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</strong></article>)}</main></section>;
}

export type { CorOsScreenView } from "./coros-screen-fixture-data";
import type { CorOsScreenView } from "./coros-screen-fixture-data";
function ModeGlyph({ mode }: { mode: PresetSnapshot["mode"] }) {
  return <QcModeGlyph mode={mode} />;
}

function DirectoryBroomIcon() {
  return <svg className="qc-directory-icon qc-directory-icon-broom" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 11 13" /><path d="m12 9 6 5-4 5-7-4z" /></svg>;
}

function DirectoryIcon({ kind, number }: Parameters<typeof QcDirectoryIcon>[0]) {
  return <QcDirectoryIcon kind={kind} number={number} />;
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

type DirectoryFixtureView = "directory-presets" | "directory-categories" | "directory-captures" | "directory-irs" | "directory-plugins" | "directory-favorites" | "directory-search" | "directory-search-results" | "directory-sort" | "directory-filter" | "directory-arrange" | "directory-copy" | "directory-nested" | "directory-new-folder" | "directory-item-context" | "directory-cloud-upload";
type OfficialDirectoryView = "directory-presets" | "directory-captures" | "directory-irs" | "directory-plugins" | "directory-favorites" | "directory-search-results" | "directory-nested" | "directory-cloud-upload";

const CAPTURE_FILTERS = ["Default", "Amp", "Combo Amp", "Amp + Cab", "Cab", "Overdrive", "Fuzz", "Compressor"] as const;

function CorOsOfficialDirectory({
  view,
  filter = false,
  manualReference = false,
}: {
  view: OfficialDirectoryView;
  filter?: boolean;
  manualReference?: boolean;
}) {
  if (view === "directory-presets") {
    const rows = [
      "1A Brit 2203",
      "1B Brit Plexi100 Normal",
      "1C US TWN Vibrato",
      "1D Rols Jazz CH120",
      "1E California Tremo Red",
      "1F EV101III Red",
      "1G Freeman 100 Rhythm",
      "1H D-Cell H4 Ch3",
    ];
    return (
      <section className="qc-screen directory-official directory-presets-official">
        <header>
          <button className="directory-official-category">
            <DirectoryIcon kind="grid" />
            Presets <b>▼</b>
          </button>
          <span />
          <button>
            <DirectoryIcon kind="sort" />
          </button>
          <button>
            <DirectoryIcon kind="arrange" />
          </button>
          <button>
            <DirectoryIcon kind="search" />
          </button>
          <button>
            <DirectoryIcon kind="done" />
          </button>
        </header>
        <main>
          <nav>
            <button>
              <b>
                <DirectoryIcon kind="download" />
              </b>
              <span>Downloads</span>
            </button>
            <button>
              <b>
                <DirectoryIcon kind="cloud" />
              </b>
              <span>Cloud Presets</span>
            </button>
            <button className="is-active">
              <b>
                <DirectoryIcon kind="folder" number={0} />
              </b>
              <span>Factory Presets</span>
            </button>
            <button>
              <b>
                <DirectoryIcon kind="folder" number={1} />
              </b>
              <span>My Presets</span>
              <small>⋮</small>
            </button>
            <button className="is-muted">
              <b>
                <DirectoryIcon kind="new-folder" />
              </b>
              <span>New Setlist</span>
            </button>
          </nav>
          <nav className="directory-preset-banks">
            {Array.from({ length: 14 }, (_, index) => (
              <button key={index}>{index + 1}</button>
            ))}
          </nav>
          <section className="directory-official-list">
            {rows.map((name, index) => (
              <button
                key={name}
                style={index === 0 ? { color: "#2df36a" } : undefined}
              >
                <span>{name}</span>
                <b>⋮</b>
              </button>
            ))}
          </section>
        </main>
      </section>
    );
  }
  if (view === "directory-cloud-upload") {
    const rows = [
      "4A Acoustic sim-_1",
      "4B Top 3 Acoustic Sims",
      "4C XUSH 12string Bass",
      "4D QC-MCP-TEST-mtniwb_1",
      "4E QC MCP TEST_2",
      "4F Unsaved",
      "4G Unsaved",
      "4H Unsaved",
    ];
    const folders = ["My Presets", "ALI Live", "ALI Rec", "ALI AcousticLive", "Downloaded", "Downloaded2", "QC-MCP-TEST-mtos3yws-copy"];
    return (
      <section className="qc-screen directory-official directory-upload-official">
        <header>
          <button className="directory-official-category">
            <DirectoryIcon kind="grid" />
            Presets <b>▼</b>
          </button>
          <button className="is-cloud">
            <DirectoryIcon kind="cloud-upload" />
          </button>
          <span />
          <button>
            <DirectoryIcon kind="upload" />
          </button>
          <button>
            <DirectoryIcon kind="done" />
          </button>
        </header>
        <main>
          <nav>
            {folders.map((folder, index) => <button key={folder} className={index === 0 ? "is-active" : undefined}>
              <b><DirectoryIcon kind="folder" number={index + 1} /></b>
              <span>{folder}</span><small>⋮</small>
            </button>)}
          </nav>
          <nav className="directory-upload-banks">
            {Array.from({ length: 14 }, (_, index) => (
              <button key={index}>{index + 1}</button>
            ))}
          </nav>
          <section className="directory-official-list">
            {rows.map((name, index) => (
              <button key={name} className={index === 1 ? "is-selected" : index >= 5 ? "is-muted" : undefined}>
                <span>{name}</span>
                <b>
                  <DirectoryIcon kind="cloud-upload" />
                </b>
              </button>
            ))}
          </section>
        </main>
      </section>
    );
  }
  if (view === "directory-search-results") {
    const rows = [
      "Blasted Brit",
      "Bright Brit",
      "Brit 2203",
      "Brit Bass 50 Normal",
      "Brit Bass 50 Patch",
      "Brit Plexi 50 Patch",
    ];
    return (
      <section className="qc-screen directory-official directory-search-official">
        <header>
          <button className="directory-search-field">
            <DirectoryIcon kind="search" />
            <span>Brit</span>
          </button>
          <button className="directory-search-tab is-active"><QcModeGlyph mode="PRESET" /><span>(15)</span></button>
          <button className="directory-search-tab"><CaptureHeaderIcon /><span>(50)</span></button>
          <button className="directory-search-tab"><QcLibraryIcon kind="impulse-response" /><span>(0)</span></button>
          <span />
          <button><DirectoryIcon kind="arrange" /></button>
          <button><DirectoryIcon kind="done" /></button>
        </header>
        <main>
          <section className="directory-official-list">
            <header>
              DEVICE DIRECTORIES <b><QcUiIcon kind="collapse" /></b>
            </header>
            {rows.map((name) => (
              <button key={name}>
                <span>
                  {name}
                  <small>Neural DSP</small>
                </span>
                <b>B　⋮</b>
              </button>
            ))}
          </section>
        </main>
      </section>
    );
  }
  if (view === "directory-nested") {
    const rows = [
      "4-Comp Custom 1",
      "4-Comp Custom 2",
      "4-Comp Custom 3",
      "4-Comp Custom 4",
      "4-Comp Custom 5",
      "4-Comp Custom 6",
      "4-Comp Custom 7",
    ];
    return (
      <section className="qc-screen directory-official directory-nested-official">
        <header>
          <button className="directory-nested-back">←</button>
          <button className="directory-official-category">
            <CaptureHeaderIcon />
            <span>Captures</span>
            <b>▼</b>
          </button>
          <span />
          <button>
            <DirectoryIcon kind="sort" />
          </button>
          <button>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 5h18l-7 8v6l-4 2v-8Z" fill="none" />
            </svg>
          </button>
          <button>
            <DirectoryIcon kind="arrange" />
          </button>
          <button>
            <DirectoryIcon kind="search" />
          </button>
          <button>
            <DirectoryIcon kind="done" />
          </button>
        </header>
        <main>
          <nav>
            <button className="directory-nested-root">
              <b>
                <DirectoryIcon kind="folder" />
              </b>
              <span>
                <small>Captures Library</small>Factory Captures V2
              </span>
            </button>
            {["Amp", "Combo Amp", "Compressor", "Fuzz", "Overdrive"].map(
              (label) => (
                <button key={label} className="is-child">
                  <b>
                    <DirectoryIcon kind="folder" />
                  </b>
                  <span>{label}</span>
                </button>
              ),
            )}
          </nav>
          <section className="directory-official-list">
            {rows.map((name) => (
              <button key={name}>
                <span>
                  {name}
                  <small>NeuralDSP</small>
                </span>
                <b>4　⋮</b>
              </button>
            ))}
            <aside className="directory-nested-index">
              {["#", "•", "A", "•", "I", "•", "R", "•", "Z"].map(
                (label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ),
              )}
            </aside>
          </section>
        </main>
      </section>
    );
  }
  const favorite = view === "directory-favorites";
  const captures = view === "directory-captures";
  const filteredCaptures = captures && filter;
  const irs = view === "directory-irs";
  const category = favorite
    ? "Favorites and Recent"
    : filteredCaptures
      ? "Captures"
    : captures
      ? "Neural Captures"
      : irs
        ? "Impulse Responses"
        : "Plugin Presets";
  const rows = favorite
    ? ["Fender Deluxe 212"]
    : filteredCaptures
      ? [
          "Beehive Wasp Fuzz",
          "Iba Basic Fuzz",
          "Love Believer",
          "Love Bender Mk3",
          "Love Fuzz Lord III",
          "MKK Bass Lord",
        ]
    : captures
      ? [
          "4-Comp Custom 1",
          "4-Comp Custom 2",
          "4-Comp Custom 3",
          "4-Comp Custom 4",
          "4-Comp Custom 5",
          "4-Comp Custom 6",
          "4-Comp Custom 7",
        ]
      : irs && manualReference
        ? ["IR21", "IR20", "IR19", "IR18", "IR17", "IR16", "IR15"]
        : [];
  const nav = favorite
    ? [
        ["▦", "Presets", "active"],
        ["◉", "Neural Captures", ""],
        ["≋", "Impulse Responses", ""],
      ]
    : filteredCaptures
      ? [
          ["□", "Captures Library", "filter-root"],
          ["□", "Beehive Wasp Fuzz", "filter-child"],
          ["□", "Iba Basic Fuzz", "filter-child"],
          ["□", "Love Believer", "filter-child"],
          ["□", "Love Bender Mk3", "filter-child"],
          ["□", "Love Fuzz Lord III", "filter-child"],
          ["□", "MKK Bass Lord", "filter-child"],
        ]
    : captures
      ? [
          ["⇩", "Downloads", ""],
          ["☁", "Cloud Captures", ""],
          ["≋", "Captures Library", "active"],
          ["□", "Factory Captures V1", "child"],
          ["□", "Factory Captures V2", "child"],
          ["□", "My Captures", "child"],
          ["□", "New Folder", "child muted"],
        ]
      : irs && manualReference
        ? [
            ["☁", "Cloud IRs", "active"],
            ["≋", "IRs Library", "counted"],
            ["□", "My IRs", "child"],
            ["□", "New Folder", "child muted"],
          ]
      : irs
        ? [
            ["☁", "Cloud IRs", ""],
            ["≋", "IRs Library", "counted"],
            ["□", "My IRs", "child active"],
            ["□", "New Folder", "child muted"],
          ]
        : [
            ["□", "Archetype: Plini X", "active"],
            ["lock", "Archetype: Cory Wong X", "muted"],
            ["lock", "Archetype: Gojira X", "muted"],
            ["lock", "Archetype: John Mayer X", "muted"],
            ["lock", "Archetype: Misha Mansoor X", "muted"],
            ["lock", "Archetype: Nolly X", "muted"],
            ["lock", "Archetype: Petrucci X", "muted"],
          ];
  return (
    <section
      className={`qc-screen directory-official${view === "directory-plugins" ? " is-plugins" : ""}${favorite ? " directory-favorites-official" : ""}${captures ? " directory-captures-official" : ""}${filteredCaptures ? " directory-filter-official" : ""}${irs ? " directory-irs-official" : ""}${manualReference ? " is-manual-reference" : ""}`}
    >
      <header>
        {filteredCaptures && <button className="directory-filter-back"><QcUiIcon kind="previous" /></button>}
        <button className="directory-official-category">
          {view === "directory-plugins" ? (
            <>
              <DeviceCategoryGlyph label="Plugins" fallback="" />
              <span>{filteredCaptures ? "Captures" : category}</span>
            </>
          ) : captures ? (
            <>
              <CaptureHeaderIcon />
              <span>{filteredCaptures ? "Captures" : category}</span>
            </>
          ) : favorite ? (
            <>
              <FavoriteIcon kind="heart" />
              <span>{category}</span>
            </>
          ) : irs ? (
            <><QcLibraryIcon kind="impulse-response" /><span>{category}</span></>
          ) : (
            <>≋　{category}</>
          )}
          <b>▼</b>
        </button>
        {favorite ? (
          <>
            <button className="favorite-tab">
              <FavoriteIcon kind="heart" />
            </button>
            <button className="favorite-tab">
              <FavoriteIcon kind="clock" />
            </button>
            <button className="favorite-sort">
              <DirectoryIcon kind="sort" />
            </button>
            <button>
              <DirectoryIcon kind="arrange" />
            </button>
            <button>
              <DirectoryIcon kind="search" />
            </button>
            <button>
              <DirectoryIcon kind="done" />
            </button>
          </>
        ) : view === "directory-plugins" ? (
          <>
            <button className="plugin-refresh">
              <GridToolbarIcon kind="refresh" />
            </button>
            <span />
            <button>
              <DirectoryIcon kind="search" />
            </button>
            <button>
              <DirectoryIcon kind="done" />
            </button>
          </>
        ) : filteredCaptures ? (
          <>
            <span />
            <button><DirectoryIcon kind="sort" /></button>
            <button className="is-filter-active"><DirectoryIcon kind="filter" /></button>
            <button><DirectoryIcon kind="arrange" /></button>
            <button><DirectoryIcon kind="search" /></button>
            <button><DirectoryIcon kind="done" /></button>
          </>
        ) : captures ? (
          <>
            <button className="directory-primary-action">
              <DirectoryIcon kind="cloud-upload" />
            </button>
            <span />
            <button>
              <DirectoryIcon kind="sort" />
            </button>
            <button>
              <DirectoryIcon kind="filter" />
            </button>
            <button>
              <DirectoryIcon kind="arrange" />
            </button>
            <button>
              <DirectoryIcon kind="search" />
            </button>
            <button>
              <DirectoryIcon kind="done" />
            </button>
          </>
        ) : irs ? (
          <>
            {manualReference && (
              <button className="directory-primary-action">
                <GridToolbarIcon kind="refresh" />
              </button>
            )}
            <span />
            <button>
              <DirectoryIcon kind="sort" />
            </button>
            <button>
              <DirectoryIcon kind="arrange" />
            </button>
            <button>
              <DirectoryIcon kind="search" />
            </button>
            <button>
              <DirectoryIcon kind="done" />
            </button>
          </>
        ) : (
          <>
            <button className="directory-primary-action">
              <GridToolbarIcon kind="refresh" />
            </button>
            <span />
            <button>
              <DirectoryIcon kind="sort" />
            </button>
            <button>
              <DirectoryIcon kind="arrange" />
            </button>
            <button>
              <DirectoryIcon kind="search" />
            </button>
            <button>
              <DirectoryIcon kind="done" />
            </button>
          </>
        )}
      </header>
      <main>
        <nav>
          {nav.map(([glyph, label, className]) => (
            <button
              key={label}
              className={className
                ?.split(" ")
                .map((name) => `is-${name}`)
                .join(" ")}
            >
              <b>
                {glyph === "□" ? (
                  <DirectoryIcon kind={(irs || captures) && label === "New Folder" ? "new-folder" : "folder"} />
                ) : glyph === "lock" ? (
                  <PluginLockIcon />
                ) : irs && label === "IRs Library" ? (
                  <QcLibraryIcon kind="impulse-response" />
                ) : captures && label === "Captures Library" ? (
                  <CaptureLibraryIcon />
                ) : (
                  glyph
                )}
              </b>
              <span>{label}{filteredCaptures && label === "Captures Library" && <small>Fuzz</small>}</span>
              {className?.includes("counted") && <em>3</em>}
              {captures && !filteredCaptures && label === "Captures Library" && <em>{manualReference ? 2062 : 2127}</em>}
            </button>
          ))}
        </nav>
        <section className="directory-official-list">
          {view === "directory-plugins" ? (
            <QcLibraryIcon
              kind="neural-mark"
              className="plugin-directory-logo"
            />
          ) : irs && !manualReference ? (
            <svg
              className="ir-directory-logo"
              viewBox="0 0 120 140"
              aria-hidden="true"
            >
              <path d="M0 70h20L38 0l34 140 20-78h14l14 0" />
            </svg>
          ) : (
            rows.map((name, index) => (
              <button key={name}>
                <span>
                  {name}
                  {!favorite && !filteredCaptures && (
                    <small>
                      {captures ? "NeuralDSP" : irs && manualReference ? <><span className="directory-on-device-check"><QcUiIcon kind="check" monochrome /></span><u>On device</u></> : irs ? "✓ On device" : ""}
                    </small>
                  )}
                </span>
                {favorite ? (
                  <i>
                    <b>
                      <FavoriteIcon kind="binoculars" />
                    </b>
                    <b>
                      <FavoriteIcon kind="broken-heart" />
                    </b>
                  </i>
                ) : irs ? (
                  <><em className="directory-ir-mark">I</em><i>
                    <b>
                      <span><QcUiIcon kind="check" monochrome /></span>
                    </b>
                    <b>
                      <DirectoryIcon kind="trash" />
                    </b>
                  </i></>
                ) : (
                  <b>{captures ? `${filteredCaptures ? (index === rows.length - 1 ? "I" : "B") : "4"}　⋮` : "⋮"}</b>
                )}
              </button>
            ))
          )}
          {captures && (
            <aside className="directory-capture-index">
              {["#", "•", "A", "•", "I", "•", "R", "•", "Z"].map(
                (label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ),
              )}
            </aside>
          )}
        </section>
      </main>
      {filter && (
        <>
          <i className="directory-context-scrim" />
          <aside className="directory-tool-menu is-filter">
            {CAPTURE_FILTERS.map((label) => (
              <button key={label}>
                <b>
                  <QcCaptureFilterIcon kind={label} />
                </b>
                {label}
              </button>
            ))}
          </aside>
        </>
      )}
    </section>
  );
}

function CorOsDirectoryFixture({ view, physicalContext = false }: { view: DirectoryFixtureView; physicalContext?: boolean }) {
  // Every directory frame captured over USB draws the same layout - 60px
  // folder rows, a 2x7 bank grid, 52px preset rows. The compact list this
  // used for the paste, sort, category and multi-select screens is the
  // manual's directory, not the unit's.
  const itemContext = ["directory-item-context", "directory-sort", "directory-categories", "directory-copy", "directory-arrange"].includes(view) || physicalContext;
  const multiSelect = view === "directory-arrange" || view === "directory-copy";
  // `physicalContext` is only raised for the cloud-upload overwrite dialog,
  // and that frame shows the directory in upload mode.
  const upload = physicalContext;
  const categoryMenu = view === "directory-categories";
  // The frames were all taken in bank 4 of My Presets. `directory-item-context`
  // and `cloud-upload-overwrite` have 4E selected; the later captures have 4F.
  const currentRow = view === "directory-item-context" || physicalContext ? 4 : 5;
  const category = view === "directory-captures" ? "Neural Captures" : view === "directory-irs" ? "Impulse Responses" : view === "directory-plugins" ? "Plugin Presets" : "Presets";
  const icons: Record<string, string> = { Presets: "▦", "Neural Captures": "◉", "Impulse Responses": "≋", "Plugin Presets": "♜" };
  const names = itemContext ? ["Acoustic sim-_1", "Top 3 Acoustic Sims", "XUSH 12string Bass", "QC-MCP-TEST-mtniwb_1", "QC MCP TEST_2", "Unsaved", "Unsaved", "Unsaved"] : category === "Neural Captures" ? ["ALI Bass DI", "Brit Crunch 57", "Cali Recto Lead", "Chief OD Push", "Clean Twin 121", "German High Gain", "Vintage Fuzz"] : category === "Impulse Responses" ? ["1x12 Blue Alnico", "2x12 UK C30 65", "4x10 Bass Modern", "4x12 Green 25", "Room Ribbon 160", "Studio 121 Dark", "User IR 01"] : category === "Plugin Presets" ? ["Cory Wong - Clean", "Gojira - Rhythm", "Nolly - Lead", "Plini - Crystal", "Parallax - Modern", "SLO-100 - Crunch", "Nameless - Grind"] : ["pyquadcortex scratch", "Clean Platform", "Edge of Breakup", "Ambient Lead", "Modern Rhythm", "Bass Parallel", "Acoustic Live"];
  const search = view === "directory-search" || view === "directory-search-results";
  const results = view === "directory-search-results" ? names.filter((name) => /clean|crunch|scratch/i.test(name)) : names;
  return <section className={`qc-screen coros-directory-fixture${itemContext ? " is-physical-context" : ""}${upload ? " is-cloud-upload" : ""}`} aria-label={view.replaceAll("-", " ")}>
    {multiSelect
      ? <header className="directory-multiselect"><b className="multiselect-all" /><strong>Multi Select</strong><i />{view === "directory-copy"
        ? <><button><QcUiIcon kind="edit" /></button><button><DirectoryBroomIcon /></button><button className="has-count"><QcEditorIcon kind="paste" /><i>1</i></button><button><QcEditorIcon kind="copy" /></button></>
        : <><button><DirectoryIcon kind="trash" /></button><button><QcUiIcon kind="edit" /></button><button><QcEditorIcon kind="copy" /></button><button><DirectoryIcon kind="cloud-upload" /></button><button><QcLibraryIcon kind="heart" /></button></>}<em /><button className="is-done"><DirectoryIcon kind="done" /></button></header>
      : <header><button className="directory-fixture-category">
      {itemContext ? <DirectoryIcon kind="grid" /> : <span>{icons[category]}</span>}<strong>{category}</strong><b>⌄</b></button><button className={view === "directory-cloud-upload" || upload ? "is-cloud" : ""}>{itemContext ? <DirectoryIcon kind="cloud-upload" /> : "☁"}</button><i />{!upload && <button>{itemContext ? <DirectoryIcon kind="sort" /> : "☷"}</button>}{!upload && <button>{itemContext ? <DirectoryIcon kind="arrange" /> : "↕"}</button>}<button>{itemContext ? <DirectoryIcon kind={upload ? "sort" : "search"} /> : "⌕"}</button><em /><button>{itemContext ? <DirectoryIcon kind="done" /> : "✓"}</button></header>}
    <main>
      <nav className="directory-fixture-folders">{itemContext ? <>{!upload && <button><b><DirectoryIcon kind="download" /></b><span>Downloads</span></button>}{!upload && <button><b><DirectoryIcon kind="cloud" /></b><span>Cloud Presets</span></button>}{!upload && <button><b><DirectoryIcon kind="folder" number={0} /></b><span>Factory Presets</span></button>}<button className="is-active"><b><DirectoryIcon kind="folder" number={1} /></b><span>My Presets</span><b>⋮</b></button><button className="is-child"><b><DirectoryIcon kind="folder" number={2} /></b><span>ALI Live</span><b>⋮</b></button>{categoryMenu ? <><button className="is-child"><b><DirectoryIcon kind="folder" number={6} /></b><span>Downloaded2</span><b>⋮</b></button><button className="is-child"><b><DirectoryIcon kind="folder" number={7} /></b><span>QC-MCP-TEST-mtos3yws-copy</span><b>⋮</b></button></> : <><button className="is-child"><b><DirectoryIcon kind="folder" number={3} /></b><span>ALI Rec</span><b>⋮</b></button><button className="is-child"><b><DirectoryIcon kind="folder" number={4} /></b><span>ALI AcousticLive</span><b>⋮</b></button></>}{upload && <button className="is-child"><b><DirectoryIcon kind="folder" number={5} /></b><span>Downloaded</span><b>⋮</b></button>}{upload && <button className="is-child"><b><DirectoryIcon kind="folder" number={6} /></b><span>Downloaded2</span><b>⋮</b></button>}{upload && <button className="is-child"><b><DirectoryIcon kind="folder" number={7} /></b><span>QC-MCP-TEST-mtos3yws-copy</span><b>⋮</b></button>}</> : <><button>⇩ <span>Downloads</span></button><button>☁ <span>Cloud {category}</span></button><button>▰ <span>Factory {category}</span></button><button className="is-active">▰ <span>My {category}</span><b>⋮</b></button>{view === "directory-nested" ? <><button className="is-child">└ ▰ <span>ALI Live</span></button><button className="is-child is-active">　└ ▰ <span>Festival</span></button></> : <button className="is-child">└ ▰ <span>ALI Live</span></button>}<button className="is-new">▰＋ <span>New {category === "Presets" ? "Setlist" : "Folder"}</span></button></>}</nav>
      <nav className="directory-fixture-banks">{(itemContext ? Array.from({ length: 14 }, (_, index) => index + 1) : [29, 30, 31, 32, 33, 34, 35]).map((bank) => <button key={bank} className={bank === (itemContext ? 4 : 32) ? "is-active" : ""}>{bank}</button>)}</nav>
      <section className="directory-fixture-items">{search && <div className="directory-search-field"><span>⌕</span><strong>{view === "directory-search-results" ? "Clean" : "Search Directory"}</strong><button>×</button></div>}{(search ? results : names).map((name, index) => itemContext ? <button key={`${name}-${index}`} className={`${index === currentRow ? "is-current" : ""}${name === "Unsaved" ? " is-empty" : ""}`}>{multiSelect && <b className="preset-select" />}<span className="physical-preset-name">{`4${String.fromCharCode(65 + index)} ${name}`}</span>{upload ? <b className="preset-upload"><DirectoryIcon kind="cloud-upload" /></b> : !multiSelect && <b>⋮</b>}</button> : <button key={name} className={index === 0 ? "is-current" : ""}><strong>{category === "Presets" ? `32${String.fromCharCode(65 + index)}` : icons[category]}</strong><span>{name}<small>{category === "Neural Captures" ? "GUITAR · AMP" : category === "Impulse Responses" ? "48 kHz · 1024 samples" : category === "Plugin Presets" ? "NEURAL DSP X" : "USER"}</small></span>{view === "directory-arrange" ? <i>☰</i> : <b>⋮</b>}</button>)}</section>
    </main>
    {view === "directory-categories" && <><i className="directory-context-scrim" /><aside className="directory-category-menu"><button><span><FavoriteIcon kind="heart" /></span>Favorites and Recent</button><button className="is-active"><span><DirectoryIcon kind="grid" /></span>Presets<b><QcUiIcon kind="check" /></b></button><button><span><CaptureLibraryIcon /></span>Neural Captures</button><button><span><DeviceCategoryGlyph label="Impulse Response" fallback="≋" /></span>Impulse Responses</button><button><span><DeviceCategoryGlyph label="Plugins" fallback="♜" /></span>Plugin Presets</button></aside></>}
    {view === "directory-favorites" && <aside className="directory-favorites-panel"><header><button className="is-active">FAVORITES</button><button>RECENT</button></header>{names.slice(0, 5).map((name) => <button key={name}><span>★</span>{name}<b>⋮</b></button>)}</aside>}
    {/* Title, options and active-item styling taken from the device: the
        CorOS tree for `directory-sort` reads "Sort By" over Banks, Name,
        Date Added, Author, Preferred Instrument, and marks the active row in
        green rather than with a tick. */}
    {view === "directory-sort" && <><i className="directory-context-scrim" /><aside className="directory-tool-menu"><strong>Sort By</strong>{["Banks", "Name", "Date Added", "Author", "Preferred Instrument"].map((label, index) => <button key={label} className={index === 0 ? "is-active" : ""}>{label}</button>)}</aside></>}
    {/* The device's filter is a capture-type list, not a scope list. Captured
        as `directory-filter` from the Neural Captures directory, where the
        funnel appears: Default, Amp, Combo Amp, Amp + Cab, Cab, Overdrive,
        Fuzz, Compressor, each with its category glyph and no heading. The
        previous FILTER / All items / Favorites / Downloaded / My items /
        Factory menu does not exist on the unit. */}
    {/* The device calls this Multi Select, not Arrange, and draws it as a top
        header: a select-all box, the green title, then trash / rename / copy /
        upload / favourite and a done tick. The previous bar - "ARRANGE",
        "Drag items to reorder them", CANCEL and DONE along the bottom - came
        from the manual rather than from the unit. */}
    {/* Pasting does not ask for a destination folder; the destination is
        wherever you already are. It asks how to lay the items into that
        folder's banks. Captured as `directory-copy`; the previous
        "Copy 3 items to..." folder picker with COPY HERE was not on the unit.
        CorOS emits its own <b> markup inside these label strings. */}
    {view === "directory-copy" && <><i className="directory-context-scrim" /><aside className="directory-copy-dialog"><header>Choose pasting option</header><p>Please select how you would like to paste<br />these 1 Preset(s) into the banks in <b>My Presets</b>:</p>{[<>Choose each slot manually</>, <>Paste consecutively from the first <b>chosen</b> slot onwards</>, <>Paste consecutively from the first <b>empty</b> slot onwards</>].map((label, index) => <button key={index} className={index === 0 ? "is-active" : ""}><span>{label}</span>{index === 0 && <i>✓</i>}</button>)}<footer><button>CANCEL</button><button className="is-primary">CONTINUE</button></footer></aside></>}
    {view === "directory-item-context" && <><i className="directory-context-scrim" /><aside className="directory-item-menu">{["Edit", "Copy", "Cut", "Paste to replace", "Delete"].map(label => <button key={label}>{label}</button>)}</aside></>}
    {view === "directory-cloud-upload" && <div className="directory-mode-bar is-cloud"><strong>UPLOAD TO CORTEX CLOUD</strong><span>Select Presets, Neural Captures, or IRs</span><button>CANCEL</button><button>UPLOAD (2)</button></div>}
  </section>;
}

type RemainingFixtureView = "fixture-boot" | "fixture-shutdown" | "fixture-copy-scene" | "fixture-swap-scene" | "fixture-delete" | "fixture-input-gate" | "fixture-editor-pages" | "fixture-editor-cab" | "fixture-editor-eq" | "fixture-editor-capture" | "fixture-warning-clip" | "fixture-warning-dsp";

function CorOsRemainingFixture({ view }: { view: RemainingFixtureView }) {
  if (view === "fixture-boot")
    return (
      <section className="qc-screen coros-boot">
        <b>◫</b>
        <h1>QUAD CORTEX</h1>
        <i>
          <span />
        </i>
        <small>STARTING COROS</small>
      </section>
    );
  if (view === "fixture-delete") return <CorOsDeleteConfirmation />;
  const dialog =
    view === "fixture-shutdown"
      ? ["POWER OFF?", "Any unsaved changes will be lost.", "POWER OFF"]
      : view === "fixture-warning-clip"
        ? [
            "INPUT CLIPPING",
            "Reduce Input 1 gain to prevent unwanted distortion.",
            "OPEN I/O SETTINGS",
          ]
        : view === "fixture-warning-dsp"
          ? [
              "DSP LIMIT REACHED",
              "There is not enough processing power to add this device.",
              "OK",
            ]
          : undefined;
  if (dialog)
    return (
      <section className="qc-screen coros-fixture-dialog">
        <div className="fixture-grid-ghost">
          {Array.from({ length: 7 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <aside className={view.includes("warning") ? "is-warning" : ""}>
          <b>{view.includes("warning") ? "!" : "?"}</b>
          <h1>{dialog[0]}</h1>
          <p>{dialog[1]}</p>
          <footer>
            <button>CANCEL</button>
            <button>{dialog[2]}</button>
          </footer>
        </aside>
      </section>
    );
  if (view === "fixture-copy-scene" || view === "fixture-swap-scene")
    return (
      <section className="qc-screen coros-fixture-dialog is-scene-command">
        <div className="scene-command-grid">
          <header>
            <strong>
              <span>32</span>D
            </strong>
            <span>Unsaved</span>
            <b>A</b>
          </header>
          <span className="scene-command-mode">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <ModeGlyph mode="STOMP" />
            </svg>
            <b>STOMP</b>
          </span>
          <main>
            {Array.from({ length: 8 }, (_, index) => (
              <i key={index} />
            ))}
          </main>
        </div>
        <aside>
          <h1>
            {view === "fixture-copy-scene" ? "Copy Scene A" : "Swap Scene A"}
          </h1>
          <p>Press Scene destination footswitch.</p>
          <footer>
            <button>CANCEL</button>
          </footer>
        </aside>
      </section>
    );
  if (view === "fixture-editor-capture")
    return (
      <section
        className="qc-screen capture-editor-physical"
        aria-label="Neural Capture editor"
      >
        <header>
          <strong>
            <span>1</span>D
          </strong>
          <h1>Fender Deluxe Reverb</h1>
          <nav>
            <i>
              <svg viewBox="607 11 26 27" aria-hidden="true"><QcScreenHeaderGlyph kind="undo" /></svg>
            </i>
            <b>A</b>
            <i>
              <svg viewBox="704 12 24 23" aria-hidden="true"><QcScreenHeaderGlyph kind="save" /></svg>
            </i>
            <i>
              <svg viewBox="762 12 7 23" aria-hidden="true"><QcScreenHeaderGlyph kind="menu" /></svg>
            </i>
          </nav>
          <em>
            <ModeGlyph mode="PRESET" />
            <span>PRESET</span>
          </em>
        </header>
        <div className="capture-editor-grid">
          <span>
            In
            <br />1
          </span>
          <i className="capture-cable" />
          <i className="capture-block is-gate">⌁</i>
          <i className="capture-block is-capture">▤</i>
          <i className="capture-block">▤</i>
          <span>
            Row
            <br />3
          </span>
        </div>
        <section className="capture-editor-panel">
          <header>
            <button>
              <QcUiIcon kind="more" />
            </button>
            <span>
              <small>NEURAL CAPTURE</small>
              <strong>Keeley Mod BD-2 3</strong>
            </span>
            <nav>
              <i><QcEditorIcon kind="scene-previous" /></i>
              <b>A</b>
              <i><QcEditorIcon kind="scene-next" /></i>
            </nav>
            <button><QcEditorIcon kind="bypass" /></button>
            <button><QcEditorIcon kind="confirm" /></button>
          </header>
          <main>
            {[
              ["GAIN", "-3.8 dB", -28],
              ["BASS", "1.0 dB", 18],
              ["MID", "0.0 dB", 0],
              ["TREBLE", "1.6 dB", 28],
              ["VOLUME", "-3.8 dB", -28],
            ].map(([label, value, offset]) => (
              <section key={label as string}>
                <span>{label}</span>
                <QcRotaryDial
                  className="capture-editor-dial"
                  angle={Number(offset)}
                  progress={(140 + Number(offset)) / 3.6}
                  accent="#969b97"
                  pointerStart={36}
                />
                <strong>{value}</strong>
              </section>
            ))}
          </main>
        </section>
      </section>
    );
  if (view === "fixture-input-gate")
    return (
      <section
        className="qc-screen coros-input-gate"
        aria-label="Input Gate Control"
      >
        <div className="input-gate-grid">
          <header>
            <strong>
              <span>4</span>E
            </strong>
            <h1>QC MCP TEST_2</h1>
            <nav>
              <i className="input-gate-undo">
                <GridToolbarIcon kind="undo" />
              </i>
              <b>A</b>
              <i>
                <GridToolbarIcon kind="save" />
              </i>
              <i>
                <QcUiIcon kind="more" />
              </i>
            </nav>
            <em>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <ModeGlyph mode="STOMP" />
              </svg>
              <span>STOMP</span>
            </em>
          </header>
          <main>
            <span className="input-gate-route">
              In
              <br />1
            </span>
            <i className="input-gate-cable" />
            <span className="input-gate-device">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M7 27c4-10 7-10 11 0s7 10 11 0 7-10 12 0" />
              </svg>
            </span>
            <span className="input-gate-output">
              Multi
              <br />
              Out
            </span>
            {[0, 1, 2].map((row) => (
              <span
                className="input-gate-plus"
                style={{ top: `${50 + row * 32}%` }}
                key={row}
              >
                <QcUiIcon kind="add" />
              </span>
            ))}
          </main>
        </div>
        <section className="input-gate-panel">
          <header>
            <button>
              <QcUiIcon kind="more" />
            </button>
            <span>
              <small>INPUT GATE CONTROL</small>
              <strong>Path 1</strong>
            </span>
            <nav>
              <i>
                <QcEditorIcon kind="scene-previous" />
              </i>
              <b>A</b>
              <i>
                <QcEditorIcon kind="scene-next" />
              </i>
            </nav>
            <em />
            <button className="input-gate-power">
              <QcEditorIcon kind="bypass" />
            </button>
            <button>
              <QcUiIcon kind="check" />
            </button>
          </header>
          <main>
            <section>
              <span>NOISE REDUCTION</span>
              <i className="input-gate-knob reduction">
                <b />
              </i>
              <strong>
                30.0 <small>%</small>
              </strong>
            </section>
            <section>
              <span>GAIN REDUCTION</span>
              <strong>
                0.0 <small>dB</small>
              </strong>
              <i className="input-gate-meter">
                <b />
              </i>
            </section>
            <section>
              <span>INPUT GAIN</span>
              <i className="input-gate-knob gain">
                <b />
              </i>
              <strong>
                0.0 <small>dB</small>
              </strong>
            </section>
          </main>
        </section>
      </section>
    );
  if (view === "fixture-editor-pages") {
    const controls = [
      ["GAIN", "5.0", -90, 38.9], ["BASS", "5.0", -90, 38.9], ["MID", "5.0", -90, 38.9],
      ["TREBLE", "5.0", -90, 38.9], ["PRESENCE", "5.0", -90, 38.9], ["MASTER", "3.0", -140, 25],
      ["OUTPUT", "0.0 dB", -90, 38.9],
    ] as const;
    return <section className="qc-screen capture-editor-physical amp-editor-pages" aria-label="Brit 2203 parameter editor page">
      <header>
        <strong><span>4</span>E</strong><h1>QC MCP TEST_2*</h1>
        <nav><i><svg viewBox="607 11 26 27" aria-hidden="true"><QcScreenHeaderGlyph kind="undo" /></svg></i><b>A</b><i><svg viewBox="704 12 24 23" aria-hidden="true"><QcScreenHeaderGlyph kind="save" /></svg></i><i><svg viewBox="762 12 7 23" aria-hidden="true"><QcScreenHeaderGlyph kind="menu" /></svg></i></nav>
        <em><ModeGlyph mode="PRESET" /><span>PRESET</span></em>
      </header>
      <div className="capture-editor-grid">
        <span>In<br />1</span><i className="capture-cable" />
        <i className="capture-block is-gate"><DeviceCategoryGlyph label="Utility" fallback="" /></i>
        <i className="capture-block is-amp"><DeviceCategoryGlyph label="Amp" fallback="" /></i>
        <span>Multi<br />Out</span>
      </div>
      <section className="capture-editor-panel">
        <header><button><QcUiIcon kind="more" /></button><span><small>GUITAR AMP</small><strong>Brit 2203 <QcPresetStackIcon /></strong></span><nav><i><QcEditorIcon kind="scene-previous" /></i><b>A</b><i><QcEditorIcon kind="scene-next" /></i></nav><button><QcEditorIcon kind="bypass" /></button><button><QcEditorIcon kind="confirm" /></button></header>
        <main>{controls.map(([label, value, angle, progress]) => <section key={label}><span>{label}</span><QcRotaryDial className="capture-editor-dial" angle={angle} progress={progress} accent="#ff393d" pointerStart={36} /><strong>{value}</strong></section>)}</main>
      </section>
    </section>;
  }
  const editor =
    view === "fixture-editor-cab"
      ? [
          "2x12 UK C30 65 (M)",
          "CABINET",
          ["MIC 1 · 57", "MIC 2 · 121", "POSITION", "DISTANCE", "LEVEL", "PAN"],
        ]
      : view === "fixture-editor-eq"
        ? [
            "Parametric-8",
            "EQUALIZER",
            ["LOW CUT", "BAND 1", "BAND 2", "BAND 3", "HIGH CUT", "LEVEL"],
          ]
        : [
            "Ambience",
            "REVERB · PAGE 2/2",
            ["MOD RATE", "MOD DEPTH", "DUCKING", "TRAILS", "WIDTH", "MIX"],
          ];
  return (
    <section className={`qc-screen coros-detail-editor ${view}`}>
      <header>
        <button>⋮</button>
        <span>
          <small>{editor[1] as string}</small>
          <strong>{editor[0] as string}</strong>
        </span>
        <i>●</i>
        <button>✓</button>
      </header>
      {view === "fixture-editor-cab" && (
        <div className="cab-stage">
          <span>57</span>
          <b>▰</b>
          <span>121</span>
        </div>
      )}
      {view === "fixture-editor-eq" && (
        <svg viewBox="0 0 800 150" preserveAspectRatio="none">
          <path d="M0 120 C100 120 110 35 205 55 S335 115 410 70 S565 20 640 75 S735 105 800 60" />
        </svg>
      )}
      <main>
        {(editor[2] as string[]).map((label, index) => (
          <section key={label}>
            <span>{label}</span>
            <i>
              <b style={{ transform: `rotate(${index * 23 - 35}deg)` }} />
            </i>
            <strong>
              {index % 2 ? "0.0 dB" : index === 0 ? "80 Hz" : "5.0"}
            </strong>
          </section>
        ))}
      </main>
      <footer>
        <button>1</button>
        <button className="is-active">2</button>
        <span />
        <button>BYPASS</button>
      </footer>
    </section>
  );
}

type SystemFixtureView = "recovery-entry" | "recovery-options" | "overlay-keyboard" | "overlay-confirmation" | "overlay-overwrite" | "overlay-error" | "overlay-busy";

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["⇧", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ["123", ",", "Space", ".", "Done"],
] as const;

// Naming a folder or a preset uses the same keyboard as the Virtual Device
// naming screen; only the header and the selected name differ, and this one
// leaves Done enabled because the field is not empty.
function CorOsDirectoryNameScreen() {
  const shifted = ["", "", "", "", "", "", "", "(", ")"];
  return <section className="qc-screen coros-physical-keyboard is-name-editor" aria-label="Name folder">
    <header><button><QcUiIcon kind="close" /></button><button className="keyboard-save-mark"><svg viewBox="700 8 32 32" aria-hidden="true"><QcScreenHeaderGlyph kind="save" /></svg></button></header>
    <h1><b>My IRs 2</b></h1>
    <div className="physical-keyboard-rows">{KEYBOARD_ROWS.map((row, rowIndex) => <div key={rowIndex}>{row.map((key, keyIndex) => <button key={key} className={key === "Space" ? "is-space" : key === "⇧" ? "is-shift" : key === "⌫" ? "is-backspace" : key === "Done" ? "is-done" : key === "123" ? "is-numeric" : ""}>{rowIndex < 2 && <small>{rowIndex === 0 ? (keyIndex + 1) % 10 : shifted[keyIndex]}</small>}{key === "⌫" ? <QcUiIcon kind="backspace" /> : key}</button>)}</div>)}</div>
  </section>;
}

function CorOsKeyboardScreen() {
  const shifted = ["", "", "", "", "", "", "'", "(", ")"];
  return <section className="qc-screen coros-physical-keyboard" aria-label="On-screen keyboard">
    <header><button><QcUiIcon kind="close" /></button><button className="keyboard-default-mark">○</button><span>Save as default User Preset</span><b>⌗</b><button className="keyboard-save-mark">▣</button></header>
    <h1>Name your Virtual Device Preset</h1>
    <div className="physical-keyboard-rows">{KEYBOARD_ROWS.map((row, rowIndex) => <div key={rowIndex}>{row.map((key, keyIndex) => <button key={key} className={key === "Space" ? "is-space" : key === "⇧" ? "is-shift" : key === "⌫" ? "is-backspace" : key === "Done" ? "is-done" : key === "123" ? "is-numeric" : ""}>{rowIndex < 2 && <small>{rowIndex === 0 ? (keyIndex + 1) % 10 : shifted[keyIndex]}</small>}{key === "⌫" ? <QcUiIcon kind="backspace" /> : key}</button>)}</div>)}</div>
  </section>;
}

// CorOS reuses one confirmation overlay for more than deletion: uploading a
// preset that already exists in Cortex Cloud raises the same dialog with an
// OVERWRITE action, captured as `cloud-upload-overwrite`. Only the copy and
// the confirm label differ. Note the device's own graphics tree exposes just
// the two buttons for this dialog - its title and body are not in the tree.
function PhysicalGridUnderlay({ rows = 1, lit = false }: { rows?: 1 | 2; lit?: boolean }) {
  return <div className={`physical-grid-underlay${rows === 2 ? " is-full-grid" : ""}${lit ? " is-lit" : ""}`}>
    <div className="underlay-grid">
      <header><strong><span>4</span>E</strong><h1>QC MCP TEST_2</h1>
        <nav><i><GridToolbarIcon kind="undo" /></i><b>A</b><i><GridToolbarIcon kind="save" /></i><i><QcUiIcon kind="more" /></i></nav>
        <em><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="STOMP" /></svg>STOMP</em></header>
      <main>
        <span className="underlay-route">In<br />1</span><i className="underlay-cable" /><span className="underlay-output">Multi<br />Out</span>
        {rows === 2 && <>
          <span className="underlay-route is-row-2">In<br />1</span><i className="underlay-cable is-row-2" /><span className="underlay-output is-row-2">Multi<br />Out</span>
          <i className="underlay-slot is-left" /><i className="underlay-slot is-right" />
          <i className="underlay-slot is-left is-row-2" /><i className="underlay-slot is-right is-row-2" />
        </>}
      </main>
    </div>
  </div>;
}

function CorOsDeleteConfirmation({ variant = "delete" }: { variant?: "delete" | "overwrite" }) {
  const copy = variant === "overwrite"
    ? { title: "Preset already exists", body: "Preset Top 3 Acoustic Sims already exists. Overwrite?", confirm: "OVERWRITE", label: "Overwrite cloud preset confirmation" }
    : { title: "QC MCP TEST_2", body: "Are you sure you want to delete this preset?", confirm: "DELETE PRESET", label: "Delete preset confirmation" };
  // The delete variant is raised from the Grid and the overwrite variant from
  // the Directory; the frames show each behind its own dialog.
  const overGrid = variant !== "overwrite";
  return <section className={`qc-screen coros-physical-confirmation${overGrid ? " is-over-grid" : ""}`} aria-label={copy.label}>
    {overGrid
      ? <PhysicalGridUnderlay rows={2} />
      : <CorOsDirectoryFixture view="directory-presets" physicalContext />}
    <i className="confirmation-scrim" />
    <aside><h1>{copy.title}</h1><p>{copy.body}</p><footer><button>CANCEL</button><button>{copy.confirm}</button></footer></aside>
  </section>;
}

function CorOsSystemFixture({ view }: { view: SystemFixtureView }) {
  if (view === "recovery-entry") return <section className="qc-screen coros-recovery"><div className="recovery-logo">◫</div><h1>Recovery Mode</h1><p>Keep footswitches A and H pressed while powering on Quad Cortex.</p><div className="recovery-switches"><b>A</b><span>HOLD</span><b>H</b></div><small>Release the switches when the recovery menu appears.</small></section>;
  if (view === "recovery-options") return <section className="qc-screen coros-recovery"><div className="recovery-logo">◫</div><h1>Recovery Mode</h1><p>Select an option to continue.</p><div className="recovery-options">{[["RESTART QUAD CORTEX","Boot CorOS normally"],["REINSTALL COROS","Install the latest available system image"],["FACTORY RESET","Erase user data and restore defaults"],["SHUT DOWN","Power off safely"]].map(([title,detail], index) => <button key={title} className={index === 0 ? "is-active" : index === 2 ? "is-danger" : ""}><strong>{title}</strong><small>{detail}</small><b>›</b></button>)}</div></section>;
  return <section className="qc-screen coros-system-overlay"><div className="overlay-underlay"><header><span>32H pyquadcortex scratch</span><b>A</b></header><main>{[1,2,3,4,5].map(item => <i key={item} />)}</main></div>
    {view === "overlay-keyboard" && <CorOsKeyboardScreen />}
    {view === "overlay-confirmation" && <CorOsDeleteConfirmation />}
    {view === "overlay-overwrite" && <CorOsDeleteConfirmation variant="overwrite" />}
    {view === "overlay-error" && <aside className="system-dialog"><b className="dialog-icon is-error">!</b><h1>Action unavailable</h1><p>Quad Cortex could not complete the request. Check the connection and try again.</p><footer><button>OK</button></footer></aside>}
    {view === "overlay-busy" && <aside className="system-dialog is-busy"><b className="dialog-spinner" /><h1>Saving preset</h1><p>Please wait. Do not disconnect or power off Quad Cortex.</p></aside>}
  </section>;
}

type CaptureFixtureView = CaptureConnectionView | "capture-calibration" | "capture-progress" | "capture-sanity-error" | "capture-result" | "capture-save";

function CaptureTargetIcon() {
  return <span className="capture-target-icon"><i>⊙</i></span>;
}

function CaptureKindGlyph({ index }: { index: number }) {
  if (index === 0) return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" /><path d="M11 16h26M8 20h32M6 24h36M8 28h32M11 32h26" /></svg>;
  if (index === 1) return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="15" width="36" height="19" rx="1" /><path d="M10 19h28" /></svg>;
  if (index === 2) return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="13" width="34" height="23" rx="1" /><path d="M10 17h28M31 22h6" /></svg>;
  if (index === 3) return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="10" width="34" height="30" rx="1" /><path d="M12 6h24v7" /><circle cx="24" cy="25" r="9" /></svg>;
  if (index === 4) return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" /><circle cx="9" cy="9" r="2" /><circle cx="39" cy="9" r="2" /><circle cx="9" cy="39" r="2" /><circle cx="39" cy="39" r="2" /><circle cx="24" cy="24" r="3" /></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="12" y="8" width="24" height="33" rx="3" /><circle cx="18" cy="15" r="2" /><circle cx="30" cy="15" r="2" /><circle cx="24" cy="27" r="5" /></svg>;
}

const SETTINGS_CLOUD_PATH = "M8 25h16a6 6 0 0 0 1-11.9A9 9 0 0 0 8 11a7 7 0 0 0 0 14Z";

function CorOsOfficialCapture({
  view,
  manualProgress = false,
}: {
  view:
    | "capture-calibration"
    | "capture-progress"
    | "capture-sanity-error"
    | "capture-result"
    | "capture-save";
  manualProgress?: boolean;
}) {
  if (view === "capture-sanity-error")
    return (
      <section className="qc-screen capture-official capture-official-progress capture-official-error">
        <header>
          <span>Neural Capture</span>
          <button>×</button>
        </header>
        <main>
          <nav>
            {(
              [
                ["✓", "Calibration", ""],
                ["✓", "Recording Signals", ""],
                ["!", "Sanity Check", "is-error"],
                ["", "Training", "is-pending"],
              ] as const
            ).map(([icon, label, state]) => (
              <div key={label} className={state}>
                <b>{icon === "✓" || state === "is-pending" ? <QcUiIcon kind="check" /> : icon}</b>
                {label}
              </div>
            ))}
          </nav>
          <section>
            <h1>There was an error during the Sanity Check stage</h1>
            <p>
              No signal detected, or signal too low. Please go back to the
              <br />
              calibration screen and make sure the level meters are at a<br />
              sensible level.
            </p>
            <strong>30 %</strong>
            <i className="capture-official-progress-bar">
              <b />
            </i>
            <button>CALIBRATION SCREEN</button>
          </section>
        </main>
      </section>
    );
  if (view === "capture-progress")
    return (
      <section className={`qc-screen capture-official capture-official-progress${manualProgress ? " is-manual-progress" : ""}`}>
        <header>
          <span>Neural Capture</span>
          <button>×</button>
        </header>
        <main>
          <nav>
            {[
              ["✓", "Calibration"],
              ["✓", "Recording Signals"],
              ["✓", "Sanity Check"],
              ["➜", "Training"],
            ].map(([icon, label]) => (
              <div key={label}>
                <b>{icon === "✓" ? <QcUiIcon kind="check" /> : icon}</b>
                {label}
              </div>
            ))}
          </nav>
          <section>
            <h1>Neural Capture in progress</h1>
            <p>
              The core of Neural Capture. Training a neural network to
              <br />
              emulate the sound of your favorite device.
            </p>
            <strong>{manualProgress ? "30%" : "88 %"}</strong>
            <i className="capture-official-progress-bar">
              <b />
            </i>
            <em>◔</em>
          </section>
        </main>
      </section>
    );
  if (view === "capture-save")
    return (
      <section className="qc-screen capture-official capture-official-save">
        <header>
          <button>
            <QcUiIcon kind="close" />
          </button>
          <button className="capture-folder">
            <DirectoryIcon kind="folder" />
            <span>My Captures</span>
          </button>
          <button>Name</button>
          <button className="capture-note">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3h7l4 4v14H7Z" />
              <path d="M14 3v5h5M10 12h5m-5 3h5m-5 3h5" />
            </svg>
          </button>
          <button className="capture-save-now">
            <QcEditorIcon kind="save" />
          </button>
        </header>
        <main>
          <small>TYPE OF CAPTURE</small>
          <h1>Amp</h1>
          <div className="capture-kinds">
            {Array.from({ length: 6 }, (_, index) => (
              <button key={index} className={index === 1 ? "is-active" : ""}>
                <CaptureKindGlyph index={index} />
                {index > 0 && <i />}
              </button>
            ))}
          </div>
          <small>PREFERRED INSTRUMENT</small>
          <div className="capture-instruments">
            {["Guitar", "Bass", "Synth", "Vocal", "Other"].map(
              (label, index) => (
                <button key={label} className={index === 0 ? "is-active" : ""}>
                  {label}
                </button>
              ),
            )}
          </div>
        </main>
      </section>
    );
  if (view === "capture-result")
    return (
      <section className="qc-screen capture-official capture-official-result">
        <header>
          <span>Neural Capture</span>
          <button>×</button>
        </header>
        <p>
          Your Neural Capture is ready. Switch between the reference and Quad
          Cortex using
          <br />
          the buttons below.
        </p>
        <div className="capture-result-actions">
          <button>BACK TO CALIBRATION</button>
          <button>SAVE</button>
          <CaptureTargetIcon />
        </div>
        <main>
          <section>
            <button>CORTEX</button>
            <label>
              <span className="capture-level-label">
                <IoHeadphonesGlyph />
                LEVEL
              </span>
              <QcRotaryDial className="capture-level-dial" />
              <small>0.0 dB</small>
            </label>
          </section>
          <section>
            <button>REFERENCE</button>
          </section>
        </main>
      </section>
    );
  return (
    <section className="qc-screen capture-official capture-official-settings">
      <header>
        <span>Neural Capture</span>
        <button>×</button>
      </header>
      <ul>
        <li>
          Please verify your Quad Cortex is properly connected to the target
          device.
        </li>
        <li>Reduce levels if any of the meters detect clipping.</li>
        <li>
          The IN 2 GROUND LIFT can mitigate noise caused by ground loops between
          Quad
          <br />
          Cortex and the target device.
        </li>
      </ul>
      <div className="capture-setting-actions">
        <button>CONNECTION DIAGRAM</button>
        <button>START CAPTURE</button>
        <CaptureTargetIcon />
        <nav>
          <button className="is-active">1</button>
          <button>2</button>
        </nav>
      </div>
      <main>
        <section>
          <span>IN 1 LEVEL</span>
          <em className="capture-info">i</em>
          <small>INST</small>
          <b>0.0 dB</b>
          <QcRotaryDial className="capture-level-dial" />
        </section>
        <section>
          <span>IN 2 LEVEL</span>
          <em className="capture-info">i</em>
          <small>DEVICE</small>
          <b>0.0 dB</b>
          <QcRotaryDial className="capture-level-dial" />
        </section>
        <section className="capture-input-type">
          <span>IN 1 TYPE</span>
          <label>
            <i />
            <small>Mic</small>
            <b>Instrument</b>
          </label>
        </section>
        <section className="capture-input-type">
          <span>IN 2 TYPE</span>
          <label>
            <i />
            <small>Mic</small>
            <b>Instrument</b>
          </label>
        </section>
        <section>
          <span>IN 1 LEVEL</span>
          <b>
            -40.0 <small>dB</small>
          </b>
          <i className="capture-meter" />
        </section>
        <section>
          <span>IN 2 LEVEL</span>
          <b>
            -40.0 <small>dB</small>
          </b>
          <i className="capture-meter" />
        </section>
        <section>
          <span><IoHeadphonesGlyph /> LEVEL</span>
          <QcRotaryDial className="capture-level-dial" />
          <b>
            0.0 <small>dB</small>
          </b>
        </section>
      </main>
    </section>
  );
}

function CorOsCaptureFixture({ view }: { view: CaptureFixtureView }) {
  // The wizard's five connection steps are one rear-panel diagram with
  // different jacks highlighted; everything after them is a distinct screen.
  if (view === "capture-intro" || view === "capture-monitoring" || view === "capture-connect-out" || view === "capture-connect-input-2" || view === "capture-routing") return <CorOsCaptureConnections view={view} />;
  return <CorOsOfficialCapture view={view} />;
}

type SettingsFixtureView = "settings-account" | "settings-system" | "settings-device" | "settings-support" | "settings-wifi" | "settings-update" | "settings-storage" | "settings-midi" | "settings-info" | "settings-diagnostics";

function SettingsAccountGlyph({ kind }: { kind: "cloud" | "user" | "backup" }) {
  if (kind === "user") return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="9" r="5" /><path d="M7 29v-7a9 9 0 0 1 18 0v7" /></svg>;
  if (kind === "backup") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d={SETTINGS_CLOUD_PATH} /><path d="m11 16-3 3 3 3m10-6 3 3-3 3M8 19h5m11 0h-5" /></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d={SETTINGS_CLOUD_PATH} /></svg>;
}

function SettingsPowerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v9M7.2 5.7a8 8 0 1 0 9.6 0" /></svg>;
}

function SettingsAccountTransferGlyph({ kind }: { kind: "upload" | "download" }) {
  if (kind === "download") return <svg className="settings-account-transfer" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v15m-5-5 5 5 5-5M7 18v7h18v-7M5 25h22v3H5Z" /></svg>;
  return <svg className="settings-account-transfer" viewBox="0 0 32 32" aria-hidden="true"><path className="cloud" d="M8 25h16a6 6 0 0 0 1-11.9A9 9 0 0 0 8.4 10 7.5 7.5 0 0 0 8 25Z" /><path className="arrow" d="M16 23V13m-4 4 4-4 4 4" /></svg>;
}

function SettingsDeviceSectionIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2" /><rect x="7" y="5" width="10" height="5" /><path d="M8 14h1m3 0h1m3 0h1M8 18h1m3 0h1m3 0h1" /></svg>;
}

function SettingsDeviceIcon({ label }: { label: string }) {
  if (label === "Global Bypass") return <span className="settings-device-icon-raster"><QcEditorIcon kind="bypass" /></span>;
  if (label === "Scene Bypass Behavior") return <SettingsPowerIcon />;
  if (label === "Stomp Mode Bypass") return <span className="settings-device-icon-raster"><QcEditorIcon kind="footswitch" /></span>;
  if (label === "Swap Tempo and Tuner") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h16m0 0-3.5-3.5M19 8l-3.5 3.5M21 16H5m0 0 3.5-3.5M5 16l3.5 3.5" /></svg>;
  if (label === "Gig View Access") return <span className="settings-device-icon-raster"><QcModeGlyph mode="SCENE" /></span>;
  if (label === "MIDI") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 0-11h-3Z" /><circle cx="7.5" cy="10" r="1" /><circle cx="9.5" cy="6.5" r="1" /><circle cx="14" cy="6" r="1" /><circle cx="17.5" cy="9" r="1" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 4v8l6 3" /></svg>;
}

function SettingsDeviceModelIcon({ kind }: { kind: string }) {
  if (kind === "ir") return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 12v8M10 9v14M13 13v6M16 6v20M19 11v10M22 14v4M25 10v12" /></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10" /><circle cx="16" cy="16" r="4" /><circle cx="7" cy="7" r="1" /><circle cx="25" cy="7" r="1" /><circle cx="7" cy="25" r="1" /><circle cx="25" cy="25" r="1" /></svg>;
}

function CorOsOfficialSettings({
  view,
  manualAccount = false,
}: {
  view:
    | "settings-account"
    | "settings-system"
    | "settings-device"
    | "settings-midi";
  manualAccount?: boolean;
}) {
  const data =
    view === "settings-midi"
      ? {
          title: "Device",
          icon: "▣",
          active: 6,
          rows: [
            ["◴", "Scene Bypass Behavior"],
            ["♞", "Stomp Mode Bypass"],
            ["◴", "Hold Timing"],
            ["⇄", "Swap Tempo and Tuner"],
            ["▦", "Gig View Access"],
            ["◷", "Latency Compensation"],
            ["◉", "MIDI"],
          ],
        }
      : view === "settings-account"
        ? // The device lands on My Account, not Backups: entering Account settings
          // shows the linked-account line and UNLINK DEVICE. Captured as
          // `settings-account`, with the address redacted out of the corpus.
          {
            title: "Account",
            icon: "♧",
            active: manualAccount ? 1 : 0,
            rows: [
              ["♙", "My Account"],
              ["♻", "Backups"],
            ],
          }
        : view === "settings-system"
          ? {
              title: "System",
              icon: "⚙",
              active: 2,
              rows: [
                ["connection", "Connection"],
                ["updates", "Updates"],
                ["brightness", "Brightness"],
                ["power", "Power Functions"],
                ["volume", "Master Volume Knob"],
                ["storage", "Device Storage"],
                ["factory-reset", "Factory Reset"],
              ],
            }
          : {
              title: "Device",
              icon: "▣",
              active: 0,
              rows: [
                ["◉", "Global Bypass"],
                ["◴", "Scene Bypass Behavior"],
                ["♞", "Stomp Mode Bypass"],
                ["◴", "Hold Timing"],
                ["⇄", "Swap Tempo and Tuner"],
                ["▦", "Gig View Access"],
                ["◷", "Latency Compensation"],
              ],
            };
  return (
    <section
      className={`qc-screen coros-settings-official ${view}`}
      aria-label={`${data.title} Settings`}
    >
      <header>
        <button className="settings-section">
          <b>
            {view === "settings-account" ? (
              <SettingsAccountGlyph kind="cloud" />
            ) : view === "settings-device" || view === "settings-midi" ? (
              <SettingsDeviceSectionIcon />
            ) : view === "settings-system" ? (
              <CapturedSettingsIcon kind="system" />
            ) : (
              data.icon
            )}
          </b>
          {data.title}
          <i />
        </button>
        <button className="settings-done">
          <QcUiIcon kind="check" />
        </button>
      </header>
      <main>
        <nav>
          {data.rows.map(([icon, label], index) => (
            <button
              key={label}
              className={index === data.active ? "is-active" : ""}
            >
              <b>
                {view === "settings-account" ? (
                  <SettingsAccountGlyph
                    kind={index === 0 ? "user" : "backup"}
                  />
                ) : view === "settings-device" || view === "settings-midi" ? (
                  <SettingsDeviceIcon label={label} />
                ) : view === "settings-system" ? (
                  <QcSettingsIcon kind={icon as QcSettingsIconName} />
                ) : (
                  icon
                )}
              </b>
              {label}
            </button>
          ))}
        </nav>
        {view === "settings-account" && manualAccount ? (
          <section className="settings-account-detail is-backups">
            <header>
              <strong>Cloud Backups&nbsp; <span>3/5</span></strong>
              <small>All timestamps are UTC</small>
            </header>
            <div>
              <strong>My Rig 001</strong>
              <small><SettingsAccountTransferGlyph kind="upload" /> August 29th, 2025, 17:06</small>
              <small><SettingsAccountTransferGlyph kind="download" /> August 29th, 2025, 17:11</small>
              <b>⋮</b>
            </div>
            <div>
              <strong>My Backup</strong>
              <small><SettingsAccountTransferGlyph kind="upload" /> November 15th, 2024, 19:22</small>
              <b>⋮</b>
            </div>
            <div>
              <strong>Tour 2025</strong>
              <small><SettingsAccountTransferGlyph kind="upload" /> August 16th, 2023, 15:38</small>
              <b>⋮</b>
            </div>
            <button>NEW CLOUD BACKUP</button>
          </section>
        ) : view === "settings-account" ? (
          <section className="settings-account-detail is-my-account">
            <h1>Device linked to</h1>
            <p>
              {
                "You are ready to send & receive Presets & Neural Captures and use Cloud backups."
              }
            </p>
            <button>UNLINK DEVICE</button>
          </section>
        ) : view === "settings-system" ? (
          <section className="settings-system-detail">
            <h1>Brightness</h1>
            <p>
              Turn the ▲, ▼, and TEMPO footswitches to adjust the
              <br />
              brightness. Tap the Modes at the bottom to toggle dimmed
              <br />
              LED lights for each one individually.
            </p>
            {[
              ["Screen", "16", 16],
              ["LEDs", "32", 32],
              ["Dimmed LEDs", "2", 2],
            ].map(([label, value, bars]) => (
              <div key={String(label)}>
                <span>{label}</span>
                <strong>{value}</strong>
                <i>
                  {Array.from({ length: 32 }, (_, index) => (
                    <b
                      key={index}
                      className={index < Number(bars) ? "is-on" : ""}
                    />
                  ))}
                </i>
              </div>
            ))}
            <footer aria-label="Footswitch modes">
              <svg viewBox="0 0 24 24" aria-hidden="true"><QcModeGlyph mode="PRESET" /></svg>
              <svg viewBox="0 0 24 24" aria-hidden="true"><QcModeGlyph mode="SCENE" /></svg>
              <svg viewBox="0 0 24 24" aria-hidden="true"><QcModeGlyph mode="STOMP" /></svg>
            </footer>
          </section>
        ) : view === "settings-midi" ? (
          <section className="settings-midi-detail">
            <h1>MIDI Settings</h1>
            {[
              ["MIDI Channel", "select", "1"],
              ["MIDI Thru", "toggle", "Off"],
              ["MIDI Over USB", "toggle", "On"],
              ["Ignore Duplicate PC", "toggle", "Off"],
              ["MIDI Clock Out", "select", "OFF"],
              ["MIDI Clock In", "toggle", "Off"],
            ].map(([label, kind, value]) => (
              <div key={label}>
                <b>i</b>
                <span>{label}</span>
                {kind === "select" ? (
                  <button>
                    {value}
                    <i>▼</i>
                  </button>
                ) : (
                  <label>
                    <small>On</small>
                    <small>Off</small>
                    <i className={value === "On" ? "is-on" : ""} />
                  </label>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="settings-device-detail">
            <h1>Global Bypass</h1>
            <p>
              Globally bypass Cabs, IR Loaders, or Neural Captures of
              <br />
              cabs* on any row. Globally bypassed devices will have a<br />
              bypass icon{" "}
              <span className="inline-settings-power">
                <SettingsPowerIcon />
              </span>{" "}
              but will not appear bypassed on The Grid.
            </p>
            <small>
              *Neural Captures need to have the Capture Type set to "Cab" to be
              <br />
              bypassed.
            </small>
            {["cab", "ir"].map((key) => (
              <div key={key}>
                <b>
                  <SettingsDeviceModelIcon kind={key} />
                </b>
                {[1, 2, 3, 4].map((row) => (
                  <label key={row}>
                    <span>ROW {row}</span>
                    <i>
                      <SettingsPowerIcon />
                    </i>
                  </label>
                ))}
              </div>
            ))}
          </section>
        )}
      </main>
    </section>
  );
}

type CapturedSettingsView = "settings-support" | "settings-wifi" | "settings-storage" | "settings-info" | "settings-diagnostics";

const SUPPORT_QR = [
  "11111111011111001101011111111", "10000001011001011100010000001", "10111101001100011111010111101", "10111101000101111111010111101", "10111101000001111101010111101", "10111101011001111100010111101", "10000001011110110001010000001", "11111111011010101101011111111", "00000000011100001110000000000", "11110011011101100110111110011", "11110111011101110111111111011", "01110100000000110111011011011", "00000001111110100111011011101", "00011000100011101101101111000", "00011011011110100111011000001", "01011100001110010111111000011", "11011101101101010111010011101", "11111111111111011111111111101", "00110010011011001101101111000", "11110101100011001101111110010", "00000000011101110001000110001", "11111111000011000001010110001", "10000001011101101111000110001", "10111101000011000111111110010", "10111101000111110111111110110", "10111101001111110110100110110", "10111101011011000111001111011", "10000001011010100001001110000", "11111111011001100001100011001"
];

function SupportQr() {
  return <b className="support-qr" aria-hidden="true">{SUPPORT_QR.flatMap((row, y) => [...row].map((cell, x) => <i key={`${x}-${y}`} className={cell === "1" ? "is-dark" : ""} />))}</b>;
}

function CapturedSettingsIcon({ kind }: { kind: string }) {
  if (kind === "system") return <QcUiIcon kind="settings" />;
  const systemIcons: Partial<Record<string, QcSettingsIconName>> = {
    connection: "connection",
    updates: "updates",
    brightness: "brightness",
    "power-functions": "power",
    "master-volume-knob": "volume",
    "device-storage": "storage",
    "factory-reset": "factory-reset",
    wifi: "connection",
    power: "power",
    volume: "volume",
    storage: "storage",
    factory: "factory-reset",
  };
  const systemIcon = systemIcons[kind];
  if (systemIcon) return <QcSettingsIcon kind={systemIcon} />;
  if (kind === "support")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 5h19v14h-19zM3 5l9 8 9-8" />
      </svg>
    );
  if (kind === "about")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 16 4-10 4 13 4-8 3 5h3" />
      </svg>
    );
  if (kind === "info")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
        <path d="M12 10v7m0-11v1" stroke="#282c28" strokeWidth="2" />
      </svg>
    );
  if (kind === "report")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M19 5l-3 3M8 16l-3 3" />
      </svg>
    );
  if (kind === "diagnostics")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M10 3h4v18h-4zM3 10h18v4H3z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  if (kind === "licenses")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 2h9l5 5v15H5zM8 12h8M8 16h8M8 8h3" />
      </svg>
    );
  if (kind === "wifi")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0" />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
      </svg>
    );
  if (kind === "updates")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 7V2l-3 3a8 8 0 1 0 4 13M6 17v5l3-3" />
      </svg>
    );
  if (kind === "brightness")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M20 4l-2 2M6 18l-2 2" />
      </svg>
    );
  if (kind === "power")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="3"
          fill="currentColor"
          stroke="none"
        />
        <path d="m13 4-6 10h5l-1 6 6-10h-5z" stroke="#282c28" />
      </svg>
    );
  if (kind === "volume")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 12 18 6" />
      </svg>
    );
  if (kind === "storage")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
        <path d="M12 2v10h10" stroke="#282c28" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18v15H3zM7 2v8m5-8v8m5-8v8M7 16v2m5-2v2m5-2v2" />
    </svg>
  );
}

function CorOsCapturedSettings({ view }: { view: CapturedSettingsView }) {
  const support = view === "settings-support" || view === "settings-info" || view === "settings-diagnostics";
  const rows = support
    ? [["about", "About and Contact"], ["info", "Device Information"], ["report", "Send Report"], ["diagnostics", "Diagnostics"], ["licenses", "3rd Party Licenses"]]
    : [["wifi", "Connection"], ["updates", "Updates"], ["brightness", "Brightness"], ["power", "Power Functions"], ["volume", "Master Volume Knob"], ["storage", "Device Storage"], ["factory", "Factory Reset"]];
  const active = view === "settings-support" ? 0 : view === "settings-info" ? 1 : view === "settings-diagnostics" ? 3 : view === "settings-wifi" ? 0 : 5;
  return <section className={`qc-screen coros-settings-official coros-settings-captured ${view}`} aria-label={view.replaceAll("-", " ")}>
    <header><button className="settings-section"><b><CapturedSettingsIcon kind={support ? "support" : "system"} /></b>{support ? "Support" : "System"}<i /></button>{view === "settings-info" && <button className="settings-edit" aria-label="Edit device name"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v15h15v-8M11 14 20 5l-3-3-9 9-1 4 4-1Z" /></svg></button>}<button className="settings-done"><QcUiIcon kind="check" /></button></header>
    <main><nav>{rows.map(([icon, label], index) => <button key={label} className={index === active ? "is-active" : ""}><b><CapturedSettingsIcon kind={icon} /></b>{label}</button>)}</nav>
      <section className="captured-settings-detail">
        {view === "settings-support" && <><h1>About Us</h1><div className="support-company"><span><strong>Neural DSP Technologies LLC</strong><br />Elimäenkatu 20A<br />00510 Helsinki<br />Finland</span><b><i>ϟ</i> Neural</b></div><hr /><div className="support-contact"><span>If you need support, you can contact<br />support@neuraldsp.com.<br /><br />Also be sure to check out our user forums at<br />unity.neuraldsp.com.</span><SupportQr /></div></>}
        {view === "settings-diagnostics" && <div className="captured-list">{["DSP Diagnostics", "Footswitch Statistics", "USB Statistics"].map(label => <button key={label}>{label}<span>›</span></button>)}</div>}
        {view === "settings-storage" && <><h1>Device Storage</h1><div className="storage-captured">{[["presets", "My Presets", "270/3072", 9], ["captures", "My Captures", "65/2048", 3], ["irs", "My Impulse Responses", "0/2048", 0]].map(([kind, label, value, amount]) => <div key={String(label)}><span><CapturedSettingsIcon kind={String(kind)} /><strong>{label}</strong><i>›</i><em>{value}</em></span><b><i style={{ width: `${amount}%` }} /></b></div>)}</div></>}
        {view === "settings-info" && <><h1>Device information</h1><div className="information-table"><span><b>Serial number:</b><i /></span><span><b>Device name:</b><i>Neural DSP Quad Cortex</i></span><span><b>MAC address:</b><i /></span></div><hr /><h1>Software information</h1><div className="information-table"><span><b>CorOS:</b><i>4.1.0</i></span><span><b>Linux kernel:</b><i>Linux buildroot 4.0.0-ADI-1.3.0 #1 PREEMPT Tue<br />Aug 18 01:26:58 EEST 2026 armv7l (none)</i></span><span><b>U-Boot:</b><i>U-Boot 2015.01 ADI-1.3.0 (Sep 30 2021 -<br />01:01:44)</i></span><span><b>Zenjack FW app:</b><i>d14e</i></span><span><b>Zenjack FW bootloader:</b><i>b113</i></span><span><b>Zencoder FW app:</b><i>d111</i></span><span><b>Zencoder FW bootloader:</b><i>b103</i></span><span><b>Zenwireless FW:</b><i>cf9daede4300aaae664fc527cede12ae</i></span></div></>}
        {view === "settings-wifi" && <><header className="wifi-header"><h1>Internet Connected</h1><button>Domain Settings</button><button>Internet Check</button></header><div className="wifi-network"><span>▣</span><b /><em>Weak connection</em><i>▥</i><strong>▮</strong></div><div className="wifi-secondary"><span>▣</span><strong>▮</strong></div><button className="wifi-reset">RESET WI-FI SETTINGS</button></>}
      </section>
    </main>
  </section>;
}

function CorOsSettingsFixture({ view }: { view: SettingsFixtureView }) {
  if (view === "settings-account" || view === "settings-system" || view === "settings-device" || view === "settings-midi") return <CorOsOfficialSettings view={view} />;
  if (view === "settings-support" || view === "settings-wifi" || view === "settings-storage" || view === "settings-info" || view === "settings-diagnostics") return <CorOsCapturedSettings view={view} />;
  return <section className="qc-screen coros-settings-fixture" aria-label="Device Updates"><header><button>‹</button><strong>Device Updates</strong><button>✓</button></header><main><nav>{[["ACCOUNT", "♙"], ["SYSTEM", "⚙"], ["DEVICE", "▣"], ["SUPPORT", "?"]].map(([label, icon]) => <button key={label} className={label === "SYSTEM" ? "is-active" : ""}><b>{icon}</b><span>{label}</span></button>)}</nav><section className="settings-content"><div className="settings-update"><span>CURRENT VERSION</span><strong>CorOS 4.1.0</strong><i><b /></i><small>Your Quad Cortex is up to date</small><button>CHECK FOR UPDATES</button></div></section></main></section>;
}

function SceneTileTools() {
  return <span className="gig-scene-tools" aria-hidden="true">
    <QcUiIcon kind="edit" />
    <svg viewBox="0 0 24 24"><path d="M3 8h16m0 0-4-4m4 4-4 4M21 16H5m0 0 4-4m-4 4 4 4" /></svg>
    <svg viewBox="0 0 24 24"><rect x="3" y="7" width="14" height="14" rx="2" /><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" /></svg>
  </span>;
}

function CorOsGigView({ snapshot, presetList, onClose, liveTuner = false }: { snapshot: PresetSnapshot; presetList?: PresetList; onClose: () => void; liveTuner?: boolean }) {
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
    return <button key={index} className={`gig-preset-tile${active ? " is-active" : ""}`}><span>{Math.floor(position / 8) + 1}<b style={{ color: letterColors[index] }}>{String.fromCharCode(65 + index)}</b></span><strong>{name}</strong></button>;
  });
  const sceneTiles = Array.from({ length: 8 }, (_, index) => <button key={index} className={`gig-scene-tile${index === snapshot.activeScene ? " is-active" : ""}`} style={{ "--gig-color": sceneColors[index], "--gig-letter": sceneLetterColors[index] } as CSSProperties}><SceneTileTools /><b>{String.fromCharCode(65 + index)}</b><strong>{snapshot.scenes[index] ?? `Scene ${String.fromCharCode(65 + index)}`}</strong></button>);
  const stompTiles = assignments.map((assigned, index) => {
    const block = assigned ?? gridBlocks[index];
    const color = !block ? "#292c29" : block.bypassed ? "#101c21" : block.name === "Simple Gate" ? "#949694" : block.name === "Chief DS1" ? "#ff7100" : block.name === "UK C30 TopBoost" ? "#ff2421" : block.name === "212 UK C30 65 (M)" ? "#6b55ff" : block.name === "Parametric-8" ? "#0875e7" : block.name === "Ambience" ? "#00ffde" : officialBlockVisual(block).color;
    return <button key={index} className={!block ? "is-empty" : ""} style={{ "--gig-color": color } as CSSProperties} aria-label={`Footswitch ${String.fromCharCode(65 + index)}${block ? `, ${block.name}` : ", empty"}`}>
      {block && <span className="gig-device-icon"><svg viewBox="0 0 86 86" aria-hidden="true"><QcDeviceGlyph block={block} x={43} y={43} size={70} /></svg></span>}
      {block && <span className="gig-edit" aria-hidden="true"><QcUiIcon kind="edit" /></span>}<b>{String.fromCharCode(65 + index)}</b>{block && <strong className={block.name === "Parametric-8" ? "is-compact" : ""}>{block.name}</strong>}
    </button>;
  });
  const tileForMode = (mode: "PRESET" | "SCENE" | "STOMP", index: number) => mode === "PRESET" ? presetTiles[index] : mode === "SCENE" ? sceneTiles[index] : stompTiles[index];
  const tiles = snapshot.mode === "HYBRID"
    ? Array.from({ length: 8 }, (_, index) => tileForMode(snapshot.footswitchModes?.[index < 4 ? 0 : 1] ?? (index < 4 ? "SCENE" : "STOMP"), index))
    : Array.from({ length: 8 }, (_, index) => tileForMode(snapshot.mode as Exclude<PresetSnapshot["mode"], "HYBRID">, index));
  return <section className={`coros-gig-view${liveTuner ? " has-live-tuner" : ""}`} aria-label={liveTuner ? "Gig View with Live Tuner" : "Gig View"}>
    <header><strong>{snapshot.presetLocation} {snapshot.presetName}</strong><span className="gig-mode"><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode={snapshot.mode} /></svg></span><span className="gig-scene">{String.fromCharCode(65 + snapshot.activeScene)}</span><button aria-label="Close Gig View" onClick={onClose}>✓</button></header>
    {liveTuner && <div className="live-tuner-strip" aria-label="Live Tuner dormant" />}
    <div className={`gig-tiles is-${snapshot.mode.toLowerCase()}`}>{tiles}</div>
  </section>;
}

function CorOsTuner({ onClose, liveTuner = false }: { onClose: () => void; liveTuner?: boolean }) {
  const official = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tunerState") === "official";
  return <section className={`coros-tuner${official ? " tuner-official" : ""}`} aria-label={liveTuner ? "Tuner with Live Tuner enabled" : "Tuner"}>
    <header><span>Tuner</span><button aria-label="Close Tuner" onClick={onClose}>✓</button></header>
    <div className="tuner-scale"><span>-50</span>{official && <><em className="tuner-flat">D#/Eb</em><em className="tuner-note">E</em><em className="tuner-sharp">F</em><strong className="tuner-reading">-1.4</strong><small className="tuner-left-arrow">›</small><small className="tuner-right-arrow">‹</small></>}<i /><b /><span>+50</span></div>
    <footer>
      <section><span>FREQ [Hz]</span><div className="tuner-frequency"><i /><strong>{official ? "440.0" : "422.0"}</strong></div></section>
      <section><button>INPUT 1 <b>▼</b></button></section>
      <section><button className="tuner-muted">MUTED</button></section>
      <section><span>LIVE TUNER</span><label><i className={liveTuner || official ? "is-active" : ""} /> <b>Yes</b></label><label><i className={liveTuner || official ? "" : "is-active"} /> <b>No</b></label></section>
    </footer>
  </section>;
}

function CorOsTempo({ bpm, onClose }: { bpm: number; onClose: () => void }) {
  const official = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tempoState") === "official";
  return <section className={`coros-tempo${official ? " tempo-official" : ""}`} aria-label="Tempo and Metronome">
    <header><span>Tempo</span><div className="tempo-scene"><b>◀</b><strong>A</strong><b>▶</b></div><button aria-label="Close Tempo and Metronome" onClick={onClose}>✓</button></header>
    <div className="tempo-display"><strong>{Math.round(bpm)}</strong><small>BPM = QUARTERS</small><div>{[0, 1, 2, 3].map((beat) => <i key={beat} className={beat === (official ? 1 : 0) ? "is-active" : ""} />)}</div></div>
    <div className="tempo-controls">
      <section className="tempo-control is-tempo"><span>TEMPO</span><div className="tempo-dial"><i /></div><strong>{Math.round(bpm)} BPM</strong></section>
      <section className="tempo-control is-radio"><span>MODE <b className="tempo-info">i</b></span><label><i className={official ? "is-active" : ""} />Global</label><label><i className={official ? "" : "is-active"} />Preset</label></section>
      <section className="tempo-control is-radio"><span>TEMPO LED</span><label><i className="is-active" />On</label><label><i />Off</label></section>
      <section className="tempo-control is-volume"><span>VOLUME</span><div className="tempo-dial"><i /></div><strong>0.0 dB</strong></section>
      <section className="tempo-control is-mute"><button>UNMUTE</button></section>
      <section className="tempo-control is-pan"><span>PAN</span><div className="tempo-dial"><i /></div><strong>C</strong></section>
      {[["T/SIGNATURE", "4/4"], ["SUBDIVISIONS", "1/4"], ["SOUND", "BLIP"], ["ROUTING", "MULTI"]].map(([label, value]) => <section className="tempo-control is-select" key={label}><span>{label}</span><button>{value}<b>⌄</b></button></section>)}
    </div>
  </section>;
}

function CorOsMidiOut({ onClose }: { onClose: () => void }) {
  return <section className="coros-midi-out" aria-label="Preset MIDI Out">
    <header><span>Preset MIDI Out settings</span><button className="midi-trash" aria-label="Clear MIDI assignments"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10l-1 13H8L7 7Zm-2 0h14M9 4h6l1 3H8l1-3Zm2 6v7m3-7v7" /></svg></button><button aria-label="Close Preset MIDI Out" onClick={onClose}>✓</button></header>
    <div className="midi-assignment-surface">
      <section className="midi-footswitches"><button className="midi-preset-load">ON PRESET LOAD<br />MESSAGE</button>{["A", "B", "C", "D", "E", "F", "G", "H"].map((label) => <button className="midi-switch" key={label}><i />{label}</button>)}</section>
      <section className="midi-expression"><label><span>EXP 1</span><div><i /></div></label><label><span>EXP 2</span><div><i /></div></label></section>
    </div>
  </section>;
}

function CorOsCpuMonitor({ onClose }: { onClose: () => void }) {
  // cpu-monitor.png: the Grid, undimmed, with a 180x78 readout panel at
  // x 606, y 12 carrying a close cross, the mixer glyph, an input badge, the
  // CPU label and the load in green.
  return <section className="coros-cpu-monitor" aria-label="CPU Monitor">
    <PhysicalGridUnderlay rows={2} lit />
    <aside className="cpu-readout">
      <button aria-label="Close CPU Monitor" onClick={onClose}><QcUiIcon kind="close" /></button>
      <i className="cpu-mixer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v18M12 3v18M19 3v18" /><circle cx="5" cy="8" r="2" /><circle cx="12" cy="15" r="2" /><circle cx="19" cy="10" r="2" /></svg></i>
      <b>In</b>
      <span>CPU</span>
      <strong>7%</strong>
    </aside>
  </section>;
}

type IoView = "overview" | "input" | "output" | "send-return" | "usb" | "headphones";
const IO_PORTS: Array<{ id: IoView; label: string; sub: string; kind?: "square" | "midi" | "input" | "combo"; paired?: boolean }> = [
  { id: "usb", label: "", sub: "USB", kind: "square" }, { id: "send-return", label: "EXP 2", sub: "EXP 1", paired: true },
  { id: "send-return", label: "", sub: "MIDI OUT", kind: "midi" }, { id: "send-return", label: "", sub: "MIDI IN", kind: "midi" },
  { id: "output", label: "", sub: "OUT 2/R", kind: "combo" }, { id: "output", label: "", sub: "OUT 1/L", kind: "combo" },
  { id: "headphones", label: "♧", sub: "CAPTURE OUT", paired: true }, { id: "output", label: "OUT 4/R", sub: "OUT 3/L", paired: true },
  { id: "send-return", label: "RET 2", sub: "RET 1", paired: true }, { id: "send-return", label: "SEND 2", sub: "SEND 1", paired: true },
  { id: "input", label: "INPUT 2", sub: "", kind: "input" }, { id: "input", label: "INPUT 1", sub: "", kind: "input" }
];

function IoDial({ value, ...dial }: { value: string } & QcRotaryDialProps) {
  return (
    <span className="io-dial-wrap">
      <QcRotaryDial className="io-dial" {...dial} />
      <strong>{value}</strong>
    </span>
  );
}

function IoPortGlyph({
  kind = "jack",
  active = false,
}: {
  kind?: "square" | "midi" | "input" | "combo" | "jack";
  active?: boolean;
}) {
  const iconKind: QcIoIconName = active && kind === "jack" ? "headphone-active" : kind === "square" ? "usb" : kind;
  return <QcIoIcon kind={iconKind} />;
}

function IoHeadphonesGlyph() {
  return <QcIoIcon kind="headphones-symbol" />;
}

function CorOsIoSettings({
  initialView,
  onClose,
}: {
  initialView: IoView;
  onClose: () => void;
}) {
  const [view, setView] = useState<IoView>(initialView);
  const [globalEqOpen, setGlobalEqOpen] = useState(false);
  if (globalEqOpen)
    return <CorOsGlobalEq onClose={() => setGlobalEqOpen(false)} />;
  const title =
    view === "overview"
      ? "Output 3/4"
      : view === "input"
      ? "Input 1"
      : view === "output"
        ? "Output 1/2"
        : view === "send-return"
          ? "Send 1"
          : view === "usb"
            ? "USB"
            : "Headphones";
  const meters =
    view === "usb"
      ? [
          "IN 1/2",
          "IN 3/4",
          "IN 5/6",
          "IN 7/8",
          "OUT 1/2",
          "OUT 3/4",
          "OUT 5/6",
          "OUT 7/8",
        ]
      : [];
  const activePort = (index: number) => view === "overview" ? index === 7 : view === "output" ? index === 4 || index === 5 : view === "send-return" ? index === 9 : view === "headphones" ? index === 6 : IO_PORTS[index]?.id === view && (view !== "input" || index === IO_PORTS.length - 1);
  const activeHalf = (index: number) => view === "send-return" && index === 9 ? " is-active-secondary" : view === "headphones" && index === 6 ? " is-active-primary" : "";
  return (
    <section
      className={`coros-io-settings is-${view}`}
      aria-label={`I/O Settings ${title}`}
    >
      <header>
        <span className="io-heading">
          <i aria-hidden="true"><QcIoIcon kind="header" /></i>
          <span>
            <small>I/O SETTINGS</small>
            <strong>{title}</strong>
          </span>
        </span>
        <button className="io-global-eq" onClick={() => setGlobalEqOpen(true)}>
          GLOBAL EQ
        </button>
        <button aria-label="Close I/O Settings" onClick={onClose}>
          <QcEditorIcon kind="confirm" />
        </button>
      </header>
      <div className="io-ports">
        {IO_PORTS.map((port, index) => (
          <button
            key={`${port.label}-${index}`}
            className={`${activePort(index) ? `is-active${activeHalf(index)}` : ""} is-${port.kind ?? "jack"}${port.paired ? " is-paired" : ""}`}
            onClick={() => setView(port.id)}
          >
            <span
              className={
                port.id === "headphones" ? "io-headphone-label" : undefined
              }
            >
              {port.id === "headphones" ? <IoHeadphonesGlyph /> : port.label}
            </span>
            <i><IoPortGlyph kind={port.kind ?? "jack"} active={activePort(index) && activeHalf(index) !== " is-active-secondary"} /></i>
            {port.paired && (
              <i>
                <IoPortGlyph active={activePort(index) && activeHalf(index) === " is-active-secondary"} />
              </i>
            )}
            <small>{port.sub}</small>
          </button>
        ))}
        {view === "headphones" && <><i className="io-port-link io-port-link-main"><QcIoIcon kind="linked" /></i><i className="io-port-link io-port-link-capture"><QcIoIcon kind="linked" /></i></>}
        {view === "usb" && (
          <div className="io-input-selectors">
            <button>1</button>
            <button>2</button>
          </div>
        )}
      </div>
      {view === "usb" ? (
        <div className="io-editor is-usb">
          <section>
            <span>USB LEVEL</span>
            <IoDial value="0.0 dB" angle={45} />
          </section>
          <section>
            <span>HP SOURCE</span>
            <IoDial value="BOTH" progress={0} angle={45} accent="#101010" />
          </section>
          <div className="io-meter-grid">
            {meters.map((meter) => (
              <span key={meter}>
                <b>{meter}</b>
                <i>i</i>
                <small>-40.0 dB　　　0.00</small>
                <em />
                <em />
              </span>
            ))}
          </div>
        </div>
      ) : view === "headphones" ? (
        <div className="io-editor is-headphones">
          <section>
            <span>HP LEVEL</span>
            <IoDial value="0.0 dB" />
          </section>
          <section>
            <span>MULTI OUT</span>
            <IoDial value="0.0 dB" />
          </section>
          <div className="io-headphone-meter">
            <span>LEVEL</span>
            <small>-40.0 dB　　　0.00</small>
            <i />
            <i />
          </div>
          <div className="io-headphone-meter">
            <span>MULTI OUT</span>
            <small>-40.0 dB　　　0.00</small>
            <i />
            <i />
          </div>
        </div>
      ) : view === "overview" || view === "output" ? (
        <div className={`io-editor is-output-stereo is-${view}`}>
          {[0, 1].map((row) => <div className="io-output-row" key={row}>
            <section><span>{view === "overview" ? `OUT ${row + 3} LEVEL` : `OUT ${row + 1} LEVEL`}</span><IoDial value="0.0 dB" /></section>
            {view === "output" && <section className="io-switch"><span>GROUND LIFT</span><label><i />On</label><label><i className="is-active" />Off</label></section>}
            <div className="io-inline-meter"><span>OUT LEVEL</span><strong>-40.0 <small>dB</small></strong><i /></div>
            <div className="io-inline-meter"><span>LIMITER</span><strong>0.0 <small>dB</small></strong><i /></div>
            <section className="io-switch"><span>MUTE</span><label><i />On</label><label><i className="is-active" />Off</label></section>
          </div>)}
        </div>
      ) : view === "send-return" ? (
        <div className="io-editor is-send-physical"><div className="io-output-row">
          <section><span>SEND 1 LEVEL</span><IoDial value="0.0" /></section>
          <div className="io-inline-meter"><span>SEND 1 LEVEL</span><strong>-40.0 <small>dB</small></strong><i /></div>
          <div className="io-inline-meter"><span>LIMITER</span><strong>0.0 <small>dB</small></strong><i /></div>
        </div></div>
      ) : (
        <div className="io-editor is-analog">
          <section>
            <span>
              {view === "input"
                ? "IN 1 LEVEL"
                : view === "output"
                  ? "OUT 1 LEVEL"
                  : view === "send-return"
                    ? "RETURN 1 LEVEL"
                    : "HP LEVEL"}
            </span>
            <IoDial value="0.0 dB" angle={view === "input" ? 180 : undefined} />
          </section>
          {view === "input" && (
            <>
              <section>
                <span>IMPEDANCE</span>
                <IoDial value="1M Ω" angle={45} />
              </section>
              <section className="io-switch">
                <span>TYPE</span>
                <label>
                  <i />
                  Mic
                </label>
                <label>
                  <i className="is-active" />
                  Instrument
                </label>
              </section>
              <section className="io-switch is-disabled">
                <span>PHANTOM 48V</span>
                <label>
                  <i />
                  On
                </label>
                <label>
                  <i className="is-active" />
                  Off
                </label>
              </section>
            </>
          )}
          <section className="io-switch">
            <span>GROUND LIFT</span>
            <label>
              <i />
              On
            </label>
            <label>
              <i className="is-active" />
              Off
            </label>
          </section>
          {view !== "input" && (
            <section className="io-switch">
              <span>MUTE</span>
              <label>
                <i />
                On
              </label>
              <label>
                <i className="is-active" />
                Off
              </label>
            </section>
          )}
          <div className="io-level-meter">
            <span>
              {view === "input" ? "IN 1 LEVEL" : `${title.toUpperCase()} LEVEL`}
            </span>
            <strong>-40.0 dB</strong>
            <i />
          </div>
        </div>
      )}
    </section>
  );
}

function CorOsGlobalEq({ onClose }: { onClose: () => void }) {
  const verticals = [
    46, 79, 105, 125, 143, 158, 172, 184, 263, 343, 369, 389, 407, 422, 436,
    448, 527, 574, 607, 633, 653, 671, 686, 700, 712, 791,
  ].map((pixel) => pixel / 8);
  return (
    <section className="coros-global-eq" aria-label="Global EQ">
      <header>
        <button className="global-eq-more"><QcPresetStackIcon /></button>
        <span>
          <small>GLOBAL EQ</small>
          <strong>Parametric-5</strong>
        </span>
        <button className="global-eq-power is-off">
          <i /> OFF
        </button>
        <button aria-label="Close Global EQ" onClick={onClose}>
          <QcUiIcon kind="check" />
        </button>
      </header>
      <div className="global-eq-graph">
        <div>
          {verticals.map((left) => (
            <i key={left} style={{ left: `${left}%` }} />
          ))}
        </div>
        <svg viewBox="0 0 800 255" preserveAspectRatio="none">
          <g className="eq-axis-labels">
            <text x="208" y="13">
              100
            </text>
            <text x="471" y="13">
              1k
            </text>
            <text x="736" y="13">
              10k
            </text>
          </g>
          <path d="M0 125H800" />
          <g>
            {[105, 210, 447, 606, 671].map((x, index) => (
              <g key={x}>
                <circle
                  cx={x}
                  cy={125}
                  r={index === 0 ? 27 : 21}
                  className={index === 0 ? "is-active" : ""}
                />
                <text x={x} y={130}>
                  {index + 1}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="global-eq-tabs">
        {[1, 2, 3, 4, 5].map((tab) => (
          <button key={tab} className={tab === 1 ? "is-active" : ""}>
            {tab}
          </button>
        ))}
        <button>OUT</button>
      </div>
      <div className="global-eq-controls">
        <section>
          <span>TYPE</span>
          <button><QcEqIcon kind="high-pass" />　LO SHELF　<QcUiIcon kind="down" /></button>
        </section>
        {[
          ["GAIN", "0.0 dB"],
          ["FREQ", "50 Hz"],
          ["Q", "0.71"],
        ].map(([label, value], index) => (
          <section key={label}>
            <span>{label}</span>
            <IoDial
              value={value}
              progress={[18, 18, 13][index]}
              angle={[-90, -170, 162][index]}
              accent={index < 2 ? "#082c4a" : "#102c18"}
              track="#080808"
              face="#101410"
              pointer="#596059"
            />
          </section>
        ))}
        <section className="global-eq-bypass">
          <span>BYPASS 1</span>
          <button>
            <ExpressionPowerIcon />
          </button>
        </section>
      </div>
    </section>
  );
}

function CorOsPowerOverlay({ onClose }: { onClose: () => void }) {
  return <section className="coros-power-overlay" aria-label="Power and Locking Functions">
    <div className="power-actions"><button className="power-lock"><svg viewBox="0 0 16 20" aria-hidden="true"><rect x="1" y="8" width="14" height="11" rx="2"/><path d="M4 8V5a4 4 0 0 1 8 0v3"/></svg><span>Lock Touchscreen and Master Volume knob</span></button><div><button onClick={onClose}>CANCEL</button><button>SHUT DOWN</button><button>REBOOT</button><button>BE RIGHT BACK</button></div></div>
  </section>;
}

function InformationGlyph() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 10v7M12 7h.01" /></svg>;
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
    <header><span>Modes configuration</span><div><button aria-label="Modes Configuration information"><InformationGlyph /></button><button aria-label="Close Modes Configuration" onClick={onClose}>✓</button></div></header>
    <p>Drag a Mode on top of another to create a Hybrid<br />Mode. Use a long press to break a Hybrid Mode apart.</p>
    <div className="modes-cycle"><span>CYCLE</span><i /><div><button><b><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="PRESET" /></svg></b>Preset</button><button className="hybrid-mode"><b><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="SCENE" /></svg><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="STOMP" /></svg></b><span>Scene<br />Stomp</span><em><i />↕<i /></em></button></div></div>
    <svg className="modes-device" viewBox="0 0 240 152" aria-hidden="true"><path d="M7 12 Q5 76 7 140 Q7 150 18 150 H222 Q233 150 233 140 Q235 76 233 12 Q233 2 222 2 H18 Q7 2 7 12 Z"/><rect x="67" y="10" width="106" height="62" rx="3"/><circle cx="38" cy="42" r="11"/><circle cx="203" cy="42" r="7"/>{[38,79,120,162,203].map((x)=><circle key={`a${x}`} cx={x} cy="98" r="6" className={x===203?"off":"yellow"}/>)}{[38,79,120,162,203].map((x)=><circle key={`b${x}`} cx={x} cy="132" r="6" className={x===203?"off":"purple"}/>)}</svg>
  </section>;
}

function CorOsSaveAs({ onClose }: { onClose: () => void }) {
  const folders = ["My Presets", "ALI Live", "ALI Rec", "ALI AcousticLive", "Downloaded", "Downloaded2"];
  const presets = ["2A ALI2023", "2B MiniVoicer", "2C No One Knows", "2D ALI Purification", "2E ALI Reach Outside Re_1", "2F Unsaved", "2G ALI The List", "2H Unsaved"];
  return <section className="coros-save-as" aria-label="Save As destination">
    <header><button className="save-as-type"><b><DirectoryIcon kind="grid" /></b>Presets <i>▼</i></button><span>Save to...</span><button className="save-as-close" aria-label="Close Save As" onClick={onClose}>×</button></header>
    <div className="save-as-content">
      <nav>{folders.map((folder, index) => <button key={folder} className={index === 0 ? "is-active" : ""}><b><DirectoryIcon kind="folder" number={index + 1} /></b><span>{folder}</span><i>⋮</i></button>)}<button className="save-as-new"><b><DirectoryIcon kind="new-folder" /></b><span>New Setlist</span></button></nav>
      <aside>{Array.from({ length: 14 }, (_, index) => <button key={index} className={index === 1 ? "is-active" : ""}>{index + 1}</button>)}</aside>
      <section>{presets.map((preset, index) => <button key={preset} className={index === 5 ? "is-active" : index === 7 ? "is-disabled" : ""}>{preset}<i>⋮</i></button>)}</section>
    </div>
  </section>;
}

function CorOsPresetNameEditor({ snapshot, onClose }: { snapshot: PresetSnapshot; onClose: () => void }) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["⇧", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
  ];
  return <section className="coros-name-editor" aria-label="Preset name editor">
    <header>
      <button className="name-editor-close" aria-label="Close preset name editor" onClick={onClose}>×</button>
      <span className="name-editor-divider" />
      <button className="name-editor-folder">▰ <span>My Pre... / {snapshot.presetLocation}</span></button>
      <button className="name-editor-tab is-active">Name</button>
      <button className="name-editor-metadata" aria-label="Preset metadata">▤</button>
      <button className="name-editor-next" aria-label="Continue">→</button>
    </header>
    <div className="name-editor-value"><span>{snapshot.presetName}</span></div>
    <div className="name-editor-keyboard">
      {rows.map((row, rowIndex) => <div className={`name-key-row row-${rowIndex + 1}`} key={rowIndex}>{row.map((key, index) => <button key={`${key}-${index}`} className={key === "⇧" || key === "⌫" ? "is-wide" : ""}>{key}<small>{rowIndex === 0 ? (index + 1) % 10 : rowIndex === 1 && index > 6 ? index === 7 ? "(" : ")" : ""}</small></button>)}</div>)}
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
    <text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontFamily="Arial" fontWeight="700" fontSize="15">{kind}</text>
  </g>;
}

function RoutingGridDiagram({ placement = false, selected }: { placement?: boolean; selected?: "S" | "M" }) {
  const cells = [112, 198, 284, 370, 456, 542, 628, 714];
  const blocks = [[112, "⌁", "#eeeeee"], [198, "∿", "#ff7900"], [284, "▭", "#ff424c"], [370, "⊙", "#7257ff"], [542, "≋", "#02d2bc"], [628, "◇", "#35b9ff"]] as const;
  return <svg className="routing-grid-diagram" viewBox="0 0 800 250" preserveAspectRatio="none" aria-label={placement ? "Empty Grid slots available for Splitter or Mixer placement" : "Parallel Grid signal paths"}>
    <rect width="800" height="250" fill="#030303" />
    <g fill="none" stroke="#8e8f91" strokeWidth="1.5"><path d="M52 92H748" /><path d="M284 92C284 118 284 143 284 168H628C628 143 628 118 628 92" /></g>
    <g fill="#171719" stroke="#050505" strokeWidth="2"><rect x="8" y="52" width="44" height="80" rx="15" /><rect x="748" y="52" width="44" height="80" rx="15" /></g>
    <g fill="#eee" fontFamily="Arial" fontSize="14" textAnchor="middle"><text x="30" y="86">In</text><text x="30" y="106">1</text><text x="770" y="84">Multi</text><text x="770" y="105">Out</text></g>
    {blocks.map(([x, glyph, color]) => <g key={x}><rect x={x - 31} y="61" width="62" height="62" rx="14" fill="#090909" stroke={color} strokeWidth="3" /><text x={x} y="102" fill="#eee" fontFamily="Arial" fontSize="25" textAnchor="middle">{glyph}</text></g>)}
    {!placement && <><RoutingToken kind="S" x={284} y={92} selected={selected === "S"} /><RoutingToken kind="M" x={628} y={92} selected={selected === "M"} /></>}
    {placement && cells.map((x, index) => <g key={x} className={index === 3 ? "placement-target is-active" : "placement-target"} transform={`translate(${x} 145)`}><path d="M-17 35v-24c0-5 7-6 8-1V-1c0-6 8-6 8 0v8-15c0-6 8-6 8 0V7-4c0-6 8-6 8 0v14c4-5 10-2 9 4l-2 17c-1 10-9 16-19 16H0c-7 0-12-4-17-12Z" fill="#3df269" stroke="#0d8e38" strokeWidth="2" /><circle cx="24" cy="31" r="13" fill="#fff" stroke="#168a40" strokeWidth="2" /><path d="M24 23v9l6 3" fill="none" stroke="#168a40" strokeWidth="2" strokeLinecap="round" /></g>)}
  </svg>;
}

function RoutingControl({ label, value, kind = "dial", accent = "#087cea" }: { label: string; value: string; kind?: "dial" | "toggle" | "select"; accent?: string }) {
  return <div className={`routing-control is-${kind}`}><strong>{label}</strong>{kind === "dial" ? <i className="routing-dial" style={{ "--routing-accent": accent } as CSSProperties}><b /></i> : kind === "toggle" ? <i className="routing-toggle"><b /></i> : <i className="routing-select">{value}<b>⌄</b></i>}<small>{kind === "dial" ? value : ""}</small></div>;
}

function ChoiceToken({ kind }: { kind: "S" | "M" }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><RoutingToken kind={kind} x={24} y={24} /></svg>;
}

function PhysicalRoutingGrid({ snapshot, selected }: { snapshot: PresetSnapshot; selected: "S" | "M" }) {
  const mixerSelected = selected === "M";
  return <svg className="splitter-grid" viewBox="0 0 800 196" aria-hidden="true">
    <rect width="800" height="196" fill="#020202" />
    {[3, 97].flatMap((y, row) => [<g key={`l${row}`}><rect x="8" y={y} width="44" height="77" rx="14" fill="#171719" />{row === 0 ? <text x="30" y={y + 32} textAnchor="middle" fill="#eee" fontFamily="Arial" fontSize="14"><tspan x="30">In</tspan><tspan x="30" dy="20">1</tspan></text> : <path d={`M19 ${y + 38.5}h22M30 ${y + 27.5}v22`} stroke="#a8aaab" strokeWidth="1.5" />}</g>, <g key={`r${row}`}><rect x="750" y={y} width="44" height="77" rx="14" fill="#171719" />{row === 0 ? <text x="772" y={y + 30} textAnchor="middle" fill="#eee" fontFamily="Arial" fontSize="14"><tspan x="772">Multi</tspan><tspan x="772" dy="20">Out</tspan></text> : <path d={`M761 ${y + 38.5}h22M772 ${y + 27.5}v22`} stroke="#a8aaab" strokeWidth="1.5" />}</g>])}
    <path d="M60 41H740" stroke="#bfc1c0" strokeWidth="2" />
    {[60, 142, 228, 314, 400, 486, 572, 658, 740].map((x) => <circle key={x} cx={x} cy="41" r="5" fill="#020202" stroke="#f4f4f4" strokeWidth="2" />)}
    {snapshot.blocks.filter((block) => block.row === 0).map((block) => {
      const x = [101, 187, 273, 357, 443, 529, 615, 701][block.column] ?? 101;
      return <g key={block.id} opacity={block.bypassed ? .48 : 1}>
        <QcDeviceGlyph block={block} x={x} y={41} />
        {block.bypassed && <path d={`M${x - 32} 41H${x + 32}`} fill="none" stroke="#c9c9ca" strokeWidth="2" opacity=".9" />}
      </g>;
    })}
    <circle cx="60" cy="135" r="18" fill={mixerSelected ? "#020202" : "#087cea"} stroke={mixerSelected ? "#087cea" : "none"} strokeWidth="2" /><text x="60" y="141" textAnchor="middle" fill={mixerSelected ? "#087cea" : "#fff"} fontFamily="Arial" fontSize="18">S</text>
    <circle cx="740" cy="135" r="18" fill={mixerSelected ? "#f00063" : "#020202"} stroke={mixerSelected ? "none" : "#f00063"} strokeWidth="2" /><text x="740" y="141" textAnchor="middle" fill={mixerSelected ? "#fff" : "#f00063"} fontFamily="Arial" fontSize="18">M</text>
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
  if (view === "empty-slot") return <section className="qc-screen empty-slot-official" aria-label="Empty-slot device browser"><nav className="empty-slot-categories">{COROS_DEVICE_CATEGORIES.slice(0, 6).map(([label, glyph, color]) => <button key={label} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} fallback={glyph} /></i><span>{label}</span></button>)}</nav><PluginGridUnderlay reference /></section>;
  const placement = view === "splitter-placement";
  const splitter = view === "splitter-editor" || placement;
  if (splitter) return <section className="qc-screen coros-splitter-physical" aria-label={placement ? "Splitter and Mixer placement handles" : "Splitter parameter editor"}>
    <PhysicalRoutingGrid snapshot={snapshot} selected="S" />
    <section className="splitter-panel">
      <header><button><QcUiIcon kind="more" /></button><span><strong>Splitter</strong></span><RoutingEditorHeaderControls /><button><QcUiIcon kind="check" /></button></header>
      <div className="splitter-controls">
        <label><strong>TYPE</strong><span className="splitter-toggle"><i/><b>Crossover<br/>A/B<br/><em>Balance</em></b></span></label>
        <label><strong>STEREO</strong><span className="splitter-toggle"><i/><b>Split<br/><em>Normal</em></b></span></label>
        <label><strong>BALANCE</strong><QcRotaryDial className="splitter-knob" progress={37} angle={-90} accent="#10456b"/><small>5.0</small></label>
        <label><strong>LEVEL TO A</strong><QcRotaryDial className="splitter-knob angle-a" progress={58} angle={-18} accent="#10456b"/><small>0.0 <em>dB</em></small></label>
        <label><strong>LEVEL TO B</strong><QcRotaryDial className="splitter-knob angle-b" progress={58} angle={-18} accent="#10456b"/><small>0.0 <em>dB</em></small></label>
        <label><strong>FREQUENCY</strong><QcRotaryDial className="splitter-knob frequency" progress={37} angle={-90} accent="#10456b"/><small>400 <em>Hz</em></small></label>
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
        <label><strong>LEVEL A</strong><QcRotaryDial className="splitter-knob mixer-knob level-a" progress={37} angle={-18} accent="#8c173e"/><small>0.0 <em>dB</em></small></label>
        <label><strong>PAN A</strong><QcRotaryDial className="splitter-knob mixer-knob pan" progress={37} angle={-90} accent="#8c173e"/><small>C</small></label>
        <label><strong>LEVEL B</strong><QcRotaryDial className="splitter-knob mixer-knob level-b" progress={37} angle={-18} accent="#8c173e"/><small>0.0 <em>dB</em></small></label>
        <label><strong>PAN B</strong><QcRotaryDial className="splitter-knob mixer-knob pan" progress={37} angle={-90} accent="#8c173e"/><small>C</small></label>
        <label><strong>PHASE</strong><span className="splitter-toggle mixer-toggle"><i/><b>On<br/><em>Off</em></b></span></label>
        <label><strong>MIXER LEVEL</strong><QcRotaryDial className="splitter-knob mixer-knob level-a" progress={37} angle={-18} accent="#8c173e"/><small>0.0 <em>dB</em></small></label>
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
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "gate") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} d="M10 33h28L31 15H17Z" /></svg>;
  if (kind === "amp") return <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}><rect x="9" y="15" width="30" height="19" /><path d="M12 18h24" /></g></svg>;
  if (kind === "capture") return <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}><path d="m24 6-4 15 10-11-5 14 13-7-11 11 15-3-14 8" /><path d="m24 24-13 14 10-16-15 8 14-10-15 1 16-5" /></g></svg>;
  if (kind === "cab") return <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}><circle cx="24" cy="24" r="12" /><circle cx="24" cy="24" r="3" />{[[10, 10], [38, 10], [10, 38], [38, 38]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />)}</g></svg>;
  if (kind === "wave") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} d="M7 27c5-15 8-15 13 0s8 15 13 0 8-15 10 0" /></svg>;
  if (kind === "cube") return <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}><path d="m24 7 14 8v17l-14 9-14-9V15Z" /><path d="m10 15 14 9 14-9M24 24v17M13 34l23-17" /></g></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}><circle cx="17" cy="24" r="8" /><circle cx="31" cy="24" r="8" /><circle cx="17" cy="24" r="3" /><circle cx="31" cy="24" r="3" /><path d="M17 13v3m0 16v3m-11-11h3m16 0h3m3-11v3m0 16v3m8-11h3" /></g></svg>;
}

function GridToolbarIcon({ kind }: { kind: "undo" | "export" | "save" | "more" | "mode" | "refresh" }) {
  if (kind === "undo") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h6a7 7 0 1 1-6.2 10.2M8 8l3-3M8 8l3 3" /></svg>;
  if (kind === "export") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h12l4 4v12H4Z" /><path d="M8 12h10m-4-4 4 4-4 4" /></svg>;
  if (kind === "save") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13l3 3v15H4Z" /><path d="M8 3v6h8V3M8 21v-8h8v8" /></svg>;
  if (kind === "more") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>;
  if (kind === "mode") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h5v5H3zm7 0h5v5h-5zm7 0h4v5h-4zM3 11h5v5H3zm7 0h5v5h-5zm7 0h4v5h-4zM3 18h5v3H3zm7 0h5v3h-5zm7 0h4v3h-4z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8V3l-2 2a8 8 0 0 0-11 7m1 4v5l2-2a8 8 0 0 0 11-7" /><path d="m18 3 3 3m-15 15-3-3" /></svg>;
}

function CorOsOfficialDeviceBrowser({ plugins }: { plugins: boolean }) {
  const rows = plugins ? ["Archetype: Cory Wong X", "Archetype: Gojira X", "Archetype: Nolly X", "Archetype: Plini X", "Fortin Nameless Suite X", "Parallax X", "Soldano SLO-100 X"] : ["Bogna Uber Clean", "Bogna Uber Lead", "Bogna Vishnu 20th Clean", "Brit 2203", "Brit 900 Clean", "Brit 900 Lead", "Brit Plexi 100 Bright"];
  return <section className={`qc-screen device-browser-official${plugins ? " is-plugins" : ""}`}><main><nav>{COROS_DEVICE_CATEGORIES.slice(0, 6).map(([label, glyph], index) => <button key={label} className={index === (plugins ? 0 : 1) ? "is-active" : ""}><i><DeviceCategoryGlyph label={label} fallback={glyph} /></i></button>)}</nav><section className="device-browser-list"><header>{plugins ? <><b>Add device</b><i><QcUiIcon kind="refresh" /></i></> : <><button className="is-active">GUITAR</button><button>BASS</button></>}</header>{rows.map((name, index) => <button key={name}>{plugins ? <b className={index === 4 ? "is-placeholder" : undefined}>●</b> : null}{name}</button>)}</section></main><section className="device-browser-grid"><header>{plugins ? <><em>3</em><span className="plugin-undo"><GridToolbarIcon kind="undo" /></span><b>A</b><span className="plugin-save"><GridToolbarIcon kind="export" /></span><span className="plugin-more"><GridToolbarIcon kind="more" /></span><strong className="plugin-mode"><span className="plugin-mode-matrix"><i>A</i><i>B</i><i>C</i><i>D</i></span><span>SCENE</span></strong></> : <><span className="amp-undo"><GridToolbarIcon kind="undo" /></span><b>A</b><span className="amp-save"><GridToolbarIcon kind="save" /></span><span className="amp-more">⋮</span><i className="amp-status" /></>}</header>{!plugins && <div className="amp-mode">▦　PRESET</div>}<main>{plugins && <>{(["gate", "amp", "capture", "cab", "wave", "cube", "dual"] as const).map((kind, index) => <span key={kind} className={`grid-block b${index + 1}`}><PluginGridGlyph kind={kind} /></span>)}</>}{plugins ? <><i>＋</i><i>Row<br />3</i><i>＋</i><i>Multi<br />Out</i><i>＋</i></> : <><i>＋</i><i>Multi<br />Out</i><i>＋</i><i>＋</i><i>＋</i></>}</main></section></section>;
}

function PluginModelGlyph({ name, kind }: { name: string; kind: "amp" | "cab" | "drive" }) {
  const category = kind === "cab" ? "CAB" : kind === "drive" ? "OVERDRIVE" : "AMP";
  const blockKind = kind === "drive" ? "utility" : kind;
  const block: GridBlock = { id: `plugin-${name}`, name, kind: blockKind, category, row: 0, column: 0, bypassed: false };
  return <svg viewBox="0 0 70 70" aria-hidden="true"><QcDeviceGlyph block={block} x={35} y={35} size={70} /></svg>;
}

function PluginGridUnderlay({ reference = false }: { reference?: boolean }) {
  return <div className={`plugin-grid-underlay${reference ? " is-reference-grid" : ""}`}><header><strong>{reference ? <>4<span>E</span></> : <>2<span>F</span></>}</strong><em>{reference ? "QC MCP T" : "QC MCP TEST"}</em></header><main><i className="underlay-input">In<br />1</i>{reference && <i className="underlay-gate"><DeviceCategoryGlyph label="Utility" fallback="" /></i>}<i className="underlay-plus">＋</i><i className="underlay-add">＋</i><i className="underlay-row-2">＋</i><i className="underlay-row-3">{reference ? <>In<br />1</> : "＋"}</i><i className="underlay-row-4">＋</i></main></div>;
}

function CorOsDeviceBrowserFixture({ view }: { view: "device-search" | "device-favorites" | "plugin-folders" | "plugin-list" | "plugin-list-reference" | "plugin-models" | "plugin-locked" | "plugin-refresh" }) {
  if (view === "plugin-folders") return <section className="qc-screen plugin-folders-official" aria-label="Plugin folders"><header><button><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H4m0 0 6-6m-6 6 6 6" /></svg></button><button className="plugin-folder-category"><DeviceCategoryGlyph label="Plugins" fallback="" /><span>Plugins</span><small>▼</small></button><span /><button><DirectoryIcon kind="arrange" /></button><button><DirectoryIcon kind="search" /></button><button><DirectoryIcon kind="done" /></button></header><main><nav><button><b><DirectoryIcon kind="folder" /></b><span><small>Plugins</small>Parallax X</span></button>{["Artists", "Neural DSP", "User"].map(label => <button key={label}><b><DirectoryIcon kind="folder" /></b><span>{label}</span>{label === "User" && <i>⋮</i>}</button>)}</nav><section><button><span>Default<small>Bass</small></span><i>D</i><b><GridToolbarIcon kind="export" /></b></button></section></main></section>;
  const plugins = view.startsWith("plugin-");
  const pluginList = view === "plugin-list" || view === "plugin-list-reference" || view === "plugin-refresh";
  const referenceGrid = view === "plugin-list-reference";
  const pluginModels = view === "plugin-models" || view === "plugin-locked";
  const lockedPlugin = view === "plugin-locked";
  const pluginModelRows: ReadonlyArray<readonly [string, "amp" | "cab" | "drive"]> = lockedPlugin ? [
    ["Cory Wong D.I. Funk Console", "amp"], ["Cory Wong The Amp Snob", "amp"], ["Cory Wong The Clean Machine", "amp"], ["Cory Wong Cab 1 (M)", "cab"], ["Cory Wong Cab 2 (M)", "cab"]
  ] : [
    ["Plini Clean", "amp"], ["Plini Crunch", "amp"], ["Plini Lead", "amp"], ["Plini Cab (M)", "cab"], ["Plini Cab (ST)", "cab"], ["Plini Drive", "drive"]
  ];
  const rows = view === "device-favorites" ? [["Chief DS1", "OVERDRIVE", true], ["Brit 2203", "AMP", true], ["212 UK C30 65 (M)", "CAB", true], ["Digital Flanger", "MODULATION", true], ["Ambience", "REVERB", true]] as const : view === "device-search" ? [["Chief DS1", "OVERDRIVE", true], ["Chief SD1", "OVERDRIVE", true], ["Chief OD1", "OVERDRIVE", true]] as const : undefined;
  return <section className={`qc-screen coros-browser-fixture${pluginList ? " is-physical-plugin-list" : pluginModels ? ` is-physical-plugin-models${lockedPlugin ? " is-physical-plugin-locked" : ""}` : ""}`} aria-label={view.replaceAll("-", " ")}>
    <div className="browser-fixture-panel">
      <nav>{COROS_DEVICE_CATEGORIES.slice(0, 8).map(([label, glyph, color], index) => <button key={label} className={(plugins ? index === 0 : index === 4) ? "is-active" : ""} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} fallback={glyph} /></i></button>)}</nav>
      <main>
        <header><strong>{view === "plugin-refresh" ? "Refreshing the list can take 10-20 seconds." : view === "plugin-list" || view === "plugin-list-reference" ? "Add device" : plugins ? "Plugins" : view === "device-favorites" ? "Favorites & Recent" : "Search devices"}</strong><button className={view === "plugin-refresh" ? "is-refreshing" : ""}><GridToolbarIcon kind="refresh" /></button></header>
        {view === "device-search" && <div className="browser-search"><span>⌕</span><b>Chief</b><button>×</button></div>}
        {view === "device-favorites" && <div className="browser-tabs"><button className="is-active">FAVORITES</button><button>RECENT</button></div>}
        {pluginModels ? <div className="browser-result-list is-plugin-licenses">{PLUGIN_LICENSES.map(([name, available]) => { const selected = name === (lockedPlugin ? "Archetype: Cory Wong X" : "Archetype: Plini X"); return <button key={name} className={`${available ? "is-licensed" : "is-locked"}${selected ? " is-selected" : ""}`}>{!available && <i className="plugin-license-lock"><PluginLockIcon /></i>}<span><strong>{name}</strong></span>{selected && <em>›</em>}</button>; })}</div> : pluginList ? <div className="browser-result-list is-plugin-licenses">{PLUGIN_LICENSES.map(([name, available]) => <button key={name} className={available ? "is-licensed" : "is-locked"}>{!available && <i className="plugin-license-lock"><PluginLockIcon /></i>}<span><strong>{name}</strong></span></button>)}</div> : <div className="browser-result-list">{rows?.map(([name, category]) => <button key={name}><i style={{ "--result-color": category === "AMP" ? "#ff424c" : category === "CAB" ? "#7257ff" : category === "MODULATION" ? "#a95cff" : category === "REVERB" ? "#35b9ff" : "#ff7900" } as CSSProperties}>{category === "AMP" ? "▭" : category === "CAB" ? "⊙" : "∿"}</i><span><strong>{name}</strong><small>{category}</small></span><b>★</b></button>)}</div>}
      </main>
      {pluginModels && <><header className="plugin-model-header"><strong>{lockedPlugin ? "Plugin license not found" : "Add device"}</strong><button><GridToolbarIcon kind="refresh" /></button><button>×</button></header><section className="plugin-model-list">{pluginModelRows.map(([name, kind]) => <button key={name}><i className={kind === "cab" ? "is-cab" : kind === "drive" ? "is-drive" : ""}><PluginModelGlyph name={name} kind={kind} /></i>{lockedPlugin && <i className="plugin-model-lock"><PluginLockIcon /></i>}<span>{name}</span><em><DevicePresetGlyph /></em></button>)}</section></>}
    </div>
    {pluginList ? <PluginGridUnderlay reference={referenceGrid} /> : <div className="browser-grid-ghost"><b>3B</b><span>SCENE</span><i>＋</i><i>＋</i><i>＋</i></div>}
  </section>;
}

function CorOsLooperEditor({ manualReference = false }: { manualReference?: boolean }) {
  const actions = [["DUPLICATE", "×1", "A"], ["ONE SHOT", "↻", "B"], ["HALF SPEED", "1/2", "C"], ["PUNCH IN", "▰", "D"], ["RECORD", "●", "E"], ["PLAY", "▶", "F"], ["REVERSE", "◀◀", "G"], ["UNDO", "↶", "H"]];
  return <section className={`qc-screen coros-looper${manualReference ? " is-manual-reference" : ""}`} aria-label="Looper X editor"><header><button aria-label="Open Looper menu"><QcUiIcon kind="more" /></button><span><small>LOOPER</small><strong>Looper X {!manualReference && <QcPresetStackIcon />}</strong></span><i /><button className="looper-params"><QcEditorIcon kind="looper" />Params</button><button className="looper-scene"><QcEditorIcon kind="scene-previous" /><b>A</b><QcEditorIcon kind="scene-next" /></button><button aria-label="Confirm"><QcEditorIcon kind="confirm" /></button></header><div className="looper-timeline"><span>USE <b>●</b> TO START RECORDING</span><span>USE <b className="looper-close-caret">⌃</b> TO CLOSE THE LOOPER VIEW</span><em>AVAILABLE {manualReference ? "4:38" : "4:43"}</em></div><div className="looper-actions">{actions.map(([label, glyph, key], index) => <button key={label} className={!manualReference && index !== 2 && index !== 4 ? "is-dim" : ""}><small>{label}</small><strong>{glyph}</strong><b>{key}</b></button>)}</div></section>;
}

type CaptureLibraryView = "device-browser-neural-capture" | "device-favorites" | "device-recents" | "device-search" | "device-search-entry" | "device-search-suggestions" | "device-search-results";

function CaptureLibraryRail() {
  return <nav className="capture-library-rail">{COROS_DEVICE_CATEGORIES.slice(0, 6).map(([label, glyph], index) => <button key={label} className={index === 2 ? "is-active" : ""}><i><DeviceCategoryGlyph label={label} fallback={glyph} /></i></button>)}</nav>;
}

function CaptureLibraryKeyboard({ query = "" }: { query?: string }) {
  const rows = [["q","w","e","r","t","y","u","i","o","p"],["a","s","d","f","g","h","j","k","l"],["⇧","z","x","c","v","b","n","m","⌫"],["123",",","Space",".",query ? "Search" : "Done"]];
  const shifted = ["", "", "", "", "", "", "", "(", ")"];
  return <section className="capture-search-keyboard"><header><button aria-label="Close search"><QcUiIcon kind="close" /></button><button className={query ? "is-ready" : ""} aria-label="Run search"><QcDirectoryIcon kind="search" /></button></header><h1 className={query ? "is-query" : ""}><span>{query || "Search for ..."}</span><i /></h1><small>{query ? "Suggestions" : "Recently searched"}</small>{query ? <div className="capture-search-suggestion"><i><QcLibraryIcon kind="capture-library" /></i> JQ~Marshall JMP (Gary Moore)~</div> : <div className="capture-recent-searches"><button>Clear all</button></div>}<main>{rows.map((row, rowIndex) => <div key={rowIndex}>{row.map((key, keyIndex) => <button key={key} className={key === "Space" ? "is-space" : key === "⇧" ? "is-shift" : key === "⌫" ? "is-backspace" : key === "Search" || key === "Done" ? "is-done" : key === "123" ? "is-numeric" : ""}>{rowIndex < 2 && <small>{rowIndex === 0 ? (keyIndex + 1) % 10 : shifted[keyIndex]}</small>}{key}</button>)}</div>)}</main></section>;
}

function CorOsCaptureLibrary({ view }: { view: CaptureLibraryView }) {
  if (view === "device-search-entry") return <CaptureLibraryKeyboard />;
  if (view === "device-search-suggestions") return <CaptureLibraryKeyboard query="gary" />;
  if (view === "device-search" || view === "device-search-results") return <section className="qc-screen capture-search-results"><header><button><QcDirectoryIcon kind="search" /></button><i /><button><QcDirectoryIcon kind="grid" /> (0)</button><button className="is-active"><QcLibraryIcon kind="capture-header" /> (1)</button><button><QcLibraryIcon kind="capture-library" /> (0)</button><button aria-label="Filter"><QcDirectoryIcon kind="filter" /></button><button aria-label="Arrange"><QcDirectoryIcon kind="arrange" /></button><button aria-label="Done"><QcDirectoryIcon kind="done" /></button></header><main><h2>DEVICE DIRECTORIES <b><QcUiIcon kind="up" /></b></h2><article><strong>JQ~Marshall JMP (Gary Moore)~</strong><small>Josepqr</small><em>J</em></article><h2>DOWNLOADS <b><QcUiIcon kind="up" /></b></h2><p>No results</p></main></section>;
  const recent = view === "device-recents";
  const captures = view === "device-browser-neural-capture";
  const captureRows = Array.from({ length: 7 }, (_, index) => `4-Comp Custom ${index + 1}`);
  return <section className={`qc-screen capture-library-browser${captures ? " is-capture-directory" : ""}`}><CaptureLibraryRail /><header><span>Add device</span>{!recent && <><button aria-label="Filter"><QcDirectoryIcon kind="filter" /></button><button aria-label="Arrange"><QcDirectoryIcon kind="arrange" /></button></>}<button aria-label="Search"><QcDirectoryIcon kind="search" /></button><button aria-label="Close"><QcUiIcon kind="close" /></button></header><aside><button className={!recent && !captures ? "is-active" : ""}><b><QcLibraryIcon kind="heart" /></b><span>Favorites</span></button><button className={recent ? "is-active" : ""}><b><QcLibraryIcon kind="clock" /></b><span>Recent</span></button><button><b><QcDirectoryIcon kind="download" /></b><span>Downloads</span></button><button className={captures ? "is-active" : ""}><b><QcLibraryIcon kind="capture-library" /></b><span>Captures Library</span><small>2127</small></button><i />{["Factory Captures V1","Factory Captures V2","My Captures"].map(label => <button key={label}><b><QcDirectoryIcon kind="folder" /></b><span>{label}</span></button>)}</aside><main>{captures ? <section className="capture-directory-list">{captureRows.map(name => <button key={name}><span>{name}<small>NeuralDSP</small></span><b>4</b></button>)}<aside>{["#","•","A","•","I","•","R","•","Z"].map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</aside></section> : <i><QcLibraryIcon kind="neural-mark" /></i>}</main></section>;
}

function CorOsDevicePresetScreen({ save = false, view = "factory" }: { save?: boolean; view?: "factory" | "user" | "actions" | "official-actions" | "official-factory" }) {
  const officialActions = view === "official-actions";
  const officialFactory = view === "official-factory";
  const categories = officialActions ? COROS_DEVICE_CATEGORIES.slice(1, 7) : COROS_DEVICE_CATEGORIES.slice(0, 6);
  const devices = officialActions || officialFactory ? ["Bogna Uber Clean", "Bogna Uber Lead", "Bogna Vishnu 20th Clean", "Brit 2203", "Brit 900 Clean", "Brit 900 Lead", "Brit Plexi 100 Bright"] : ["Exotic Z Boost", "81 Creations Drive", "Brit Blues", "Brit Governor", "Chief BD2", "Chief DS1", "Chief MT"];
  const presets = officialActions ? ["Lead Tone", "Low Gain"] : officialFactory ? ["Neural DSP® Default", "Balanced Crunch", "Basic Clean", "Bass Clean", "Bass Punk Drive", "Bass Tube Drive", "Bass Verge Of OD"] : ["Neural DSP® Default", "Bass More Push", "Bass Push", "Bass Tube Drive", "Bass Tube OD", "Bigger Maker", "Bright Boost"];
  if (save) return <CorOsKeyboardScreen />;
  const user = view === "user" || officialActions;
  return <section className={`qc-screen coros-device-presets is-physical is-${officialActions ? "official-actions" : officialFactory ? "official-factory" : view}`} aria-label="Virtual Device preset browser"><nav>{categories.map(([label, glyph, color], index) => <button key={label} className={index === (officialActions ? 0 : officialFactory ? 1 : 4) ? "is-active" : ""} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} fallback={glyph} /></i></button>)}</nav><main><section><header><button className="is-active">GUITAR</button><button>BASS</button></header>{devices.map((name, index) => <button key={name} className={index === (officialActions ? 1 : officialFactory ? 3 : 0) ? "is-active" : ""}>{!officialActions && !officialFactory && index === 0 && <i className="device-pin" />}<span>{name}</span><b><DevicePresetGlyph /></b></button>)}</section><section><header><button className={user ? "" : "is-active"}>FACTORY</button><button className={user ? "is-active" : ""}>USER</button><span /><button className="preset-close">×</button>{officialFactory && <button className="preset-confirm">✓</button>}</header>{(officialActions || !user) && presets.map((name, index) => <button key={name}><span className={officialFactory && index === 1 ? "is-italic" : ""}>{name}<small>{officialActions ? "" : index ? "" : "Default"}</small></span><b>⋮</b></button>)}</section></main>{(view === "actions" || officialActions) && <aside className="device-preset-actions"><button>Set as Default</button><button>Edit Name</button><button>Overwrite</button><button>Delete</button></aside>}</section>;
}

function ExpressionPowerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v9M6.35 5.35a8 8 0 1 0 11.3 0" /></svg>;
}

function ExpressionLinkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3H4v18h3M17 3h3v18h-3M9 12h6" /><rect x="7" y="9" width="2" height="6" /><rect x="15" y="9" width="2" height="6" /></svg>;
}

function ExpressionChooser({ trim, manualAmp = false }: { trim: boolean; manualAmp?: boolean }) {
  const tiles: Array<[string, boolean]> = manualAmp
    ? [["GAIN", false], ["BASS", false], ["MID", false], ["TREBLE", false], ["LEVEL", false], ["BYPASS", false]]
    : [["NOISE REDUCTION", false], ["BYPASS", !trim]];
  return (
    <section
      className={`qc-screen expression-bypass-official${trim ? " is-trim" : ""}${manualAmp ? " is-manual-amp" : ""}`}
      aria-label={
        trim
          ? "Expression parameter assignment"
          : "Expression bypass assignment"
      }
    >
      <header>
        <button>
          <QcUiIcon kind="close" />
        </button>
        <button>Expression 1</button>
        <button>Expression 2</button>
        <button>
          <QcEditorIcon kind="save" />
        </button>
      </header>
      <p>
        Please choose which parameters you wish to control.
        <br />
        You can assign multiple at once.
      </p>
      {trim ? (
        <main className="expression-switch-panel is-trim">
          <section className="trim-hint">
            <span>
              Tap{" "}
              <b>
                <ExpressionLinkIcon />
              </b>{" "}
              to trim
            </span>
            <small>Max and Min values of the preferred parameter</small>
          </section>
          <section className="switch-delay">
            <span>MIN RANGE</span>
            <b>0.00 %</b>
            <QcRotaryDial className="capture-level-dial" progress={0} angle={135} accent="#101210" />
          </section>
          <section className="switch-delay">
            <span>MAX RANGE</span>
            <b>100 %</b>
            <QcRotaryDial className="capture-level-dial" progress={74} angle={45} />
          </section>
        </main>
      ) : (
        <main className="expression-switch-panel">
          <section>
            <button>
              <ExpressionPowerIcon />
            </button>
          </section>
          <section>
            <span>SWITCH ON</span>
            <label>
              <i />
              <b>Heel-Toe</b>
              <small>
                Switch
                <br />
                Stop
              </small>
            </label>
          </section>
          <section>
            <span>INVERT RANGE</span>
            <label>
              <i />
              <b>On</b>
              <small>Off</small>
            </label>
          </section>
          <section className="switch-delay">
            <span>SWITCH DELAY</span>
            <b>600 ms</b>
            <QcRotaryDial className="capture-level-dial" progress={31} angle={-135} />
          </section>
          <section className="switch-latch">
            <span>LATCH EMULATION</span>
            <label>
              <i />
              <b>On</b>
              <small>Off</small>
            </label>
          </section>
        </main>
      )}
      <div className="expression-parameter-grid">
        {tiles.map(([label, assigned]) => (
          <section key={label}>
            <span>
              {label}
              <b>
                <ExpressionLinkIcon />
              </b>
            </span>
            <button className={assigned ? "is-assigned" : ""}>
              {assigned ? "ASSIGNED" : "ASSIGN"}
            </button>
          </section>
        ))}
      </div>
    </section>
  );
}

// The Grid, its title and the editor action bar are one screen on the unit:
// `block-context.png`, `scene-assignment.png` and `stomp-assignment.png` all
// draw it and differ only in what sits over it.
function PhysicalEditorUnderlay({ slot, letter, title, scene = "A", mode = "STOMP", category, device, blocks = 0, output = ["Multi", "Out"], fit = false, children }: { slot: string; letter: string; title: string; scene?: string; mode?: PresetSnapshot["mode"]; category?: string; device?: string; blocks?: number; output?: [string, string]; fit?: boolean; children?: ReactNode }) {
  return <div className={`physical-grid-underlay${fit ? " is-long-title" : ""}`}>
    <div className="underlay-grid">
      <header><strong><span>{slot}</span>{letter}</strong><h1>{title}</h1><nav><i><GridToolbarIcon kind="undo" /></i><b>{scene}</b><i><GridToolbarIcon kind="save" /></i><i><QcUiIcon kind="more" /></i></nav><em><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode={mode} /></svg>{mode}</em></header>
      <main><span className="underlay-route">In<br />1</span><i className="underlay-cable" />{Array.from({ length: blocks }, (_, index) => <i key={index} className={`underlay-block is-block-${index + 1}`} />)}<span className="underlay-output">{output[0]}<br />{output[1]}</span></main>
    </div>
    {category && <button className="underlay-editor-more"><QcUiIcon kind="more" /></button>}
    {category && <span className="underlay-editor-label"><small>{category}</small><strong>{device}</strong></span>}
    <nav className="underlay-editor-bar">
      <button className="editor-expression"><svg viewBox="0 0 24 24" aria-hidden="true"><ModeGlyph mode="STOMP" /></svg><small>?</small></button>
      <button className="editor-scene"><svg viewBox="0 0 21 24" aria-hidden="true" className="editor-step"><path d="M11 5 0 12l11 7Z" /><path className="is-dim" d="M21 6.5 13 12l8 5.5Z" /></svg><b>{scene}</b><svg viewBox="0 0 21 24" aria-hidden="true" className="editor-step"><path className="is-dim" d="M0 6.5 8 12l-8 5.5Z" /><path d="M10 5 21 12l-11 7Z" /></svg></button>
      <i className="editor-divider" />
      <button className="editor-bypass" aria-label="Mute"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="15" rx="5" /><path strokeWidth="2.6" d="M1 11.75h22" /></svg></button>
      <button className="editor-confirm"><QcUiIcon kind="check" /></button>
    </nav>
    {children}
  </div>;
}

function CorOsAssignmentScreen({ view }: { view: "stomp-assignment" | "scene-assignment" }) {
  const scene = view === "scene-assignment";
  const parameters: Array<[string, string]> = scene ? [["NOISE REDUCTION", "17.3 %"]] : [["GAIN", "0.0 dB"], ["BASS", "6.5"], ["MID", "5.0"], ["TREBLE", "5.0"], ["VOLUME", "14.9 dB"]];
  return <section className={`qc-screen coros-assignment is-${scene ? "scene" : "stomp"}`} aria-label={view.replaceAll("-", " ")}>
    <PhysicalEditorUnderlay slot="4" letter={scene ? "E" : "B"} title={scene ? "QC MCP TEST_2*" : "Top 3 Acoustic Sims"} scene={scene ? "A" : "F"} category={scene ? "UTILITY" : "NEURAL CAPTURE"} device={scene ? "Adaptive Gate" : "Akustyczna"} blocks={scene ? 1 : 2} output={scene ? ["Multi", "Out"] : ["Row", "3/4"]} fit={!scene}>
      <div className="assignment-parameters">{Array.from({ length: 5 }, (_, index) => parameters[index]).map((parameter, index) => <section key={index}>{parameter && <><span>{parameter[0]}</span>{scene && <em>A B<br />C D</em>}<QcRotaryDial className="assignment-knob" progress={scene ? 37 : 45} angle={scene ? 180 : -90} accent={scene ? "#526e58" : "#657268"} track="#101410" face="#1d271f" pointer="#737d73" /><strong>{parameter[1]}</strong></>}</section>)}</div>
    </PhysicalEditorUnderlay>
    {!scene && <div className="assignment-stomp-message"><aside className="assignment-stomp-dialog"><h1>Assign footswitch</h1><p>Press the target footswitch to assign</p><div className="assignment-stomp-latch"><button className="is-active"><QcEditorIcon kind="footswitch" />Latching</button><button><QcEditorIcon kind="momentary" />Momentary</button></div><footer><button>CANCEL</button><button className="is-primary">UNASSIGN</button></footer></aside></div>}
  </section>;
}

function BlockContextIcon({ kind }: { kind: "change" | "copy" | "paste" | "reset" | "save" | "expression" | "bypass" | "model-update" | "model-downgrade" | "remove" }) {
  return <QcEditorIcon kind={kind === "bypass" ? "mute" : kind} />;
}

function CorOsBlockContext() {
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
  return <section className="qc-screen coros-block-context" aria-label="Block contextual actions">
    <PhysicalEditorUnderlay slot="4" letter="E" title="QC MCP TEST_2" mode="PRESET" />
    <i className="block-context-scrim" />
    <aside>{rows.map(([kind, label, className], index) => <button key={label} className={`${className}${index === 3 ? " has-gap" : ""}`}><span><BlockContextIcon kind={kind} /></span>{label}</button>)}</aside>
  </section>;
}

const COROS_INPUT_MONO_ROUTES = ["Input 1", "Input 2", "Return 1", "Return 2", "USB input 5", "USB input 6", "USB input 7", "USB input 8"];
const COROS_INPUT_ROUTES = ["Input 1/2", "Return 1/2", "USB input 5/6", "USB input 7/8", "Not In Use"];
const COROS_OUTPUT_ROUTES = ["Multi Out", "Output 1/2", "Output 3/4", "Output 1", "Output 2", "Output 3", "Output 4", "Send 1", "Send 2", "Send 1/2", "USB Output 3", "USB Output 4", "USB Output 3/4", "USB Output 5", "USB Output 6", "USB Output 5/6", "USB Output 7", "USB Output 8", "USB Output 7/8", "OTHER", "Row 3", "Row 4", "Row 3/4", "Not In Use"];
const COROS_DEVICE_CATEGORIES = [
  ["Plugins", "♜", QC_COLORS.browserCategory.plugin], ["Amp", "▭", QC_COLORS.browserCategory.amp], ["Neural Capture", "◉", QC_COLORS.browserCategory.capture],
  ["Cab", "⊙", QC_COLORS.browserCategory.cab], ["Overdrive", "∿", QC_COLORS.browserCategory.overdrive], ["Delay", "〰", QC_COLORS.browserCategory.delay],
  ["Reverb", "◇", QC_COLORS.browserCategory.reverb], ["Compressor", "↕", QC_COLORS.browserCategory.compressor], ["Pitch", "≋", QC_COLORS.browserCategory.pitch],
  ["Modulation", "≈", QC_COLORS.browserCategory.modulation], ["Morph", "⌁", QC_COLORS.browserCategory.morph], ["Synth", "∿", QC_COLORS.browserCategory.synth],
  ["Filter", "⌁", QC_COLORS.browserCategory.filter], ["Equalizer", "≡", QC_COLORS.browserCategory.equalizer], ["IR Loader", "▥", QC_COLORS.browserCategory.irLoader],
  ["Wah", "▱", QC_COLORS.browserCategory.wah], ["FX Loop", "∞", QC_COLORS.browserCategory.fxLoop], ["Looper", "◉", QC_COLORS.browserCategory.looper], ["Utility", "⌁", QC_COLORS.browserCategory.utility]
] as const;
const COROS_OVERDRIVE_MODELS = ["Exotic Z Boost", "81 Creations Drive", "Brit Blues", "Brit Governor", "Chief BD2", "Chief DS1", "Chief MT", "Chief OD1", "Chief SD1", "Exotic", "Facial Fuzz", "Freeman BOD"];

function DeviceCategoryGlyph({ label, fallback }: { label: string; fallback: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (label === "Plugins") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M12 6h3v1h-3ZM25 6h3v1h-3ZM12 7h3v1h-3ZM25 7h3v1h-3ZM12 8h3v1h-3ZM25 8h3v1h-3ZM12 9h3v1h-3ZM25 9h3v1h-3ZM12 10h3v1h-3ZM25 10h3v1h-3ZM8 11h24v1h-24ZM8 12h24v1h-24ZM8 13h2v1h-2ZM30 13h2v1h-2ZM8 14h2v1h-2ZM30 14h2v1h-2ZM8 15h2v1h-2ZM30 15h2v1h-2ZM8 16h2v1h-2ZM30 16h2v1h-2ZM8 17h2v1h-2ZM30 17h2v1h-2ZM8 18h2v1h-2ZM30 18h2v1h-2ZM8 19h2v1h-2ZM30 19h2v1h-2ZM8 20h2v1h-2ZM30 20h2v1h-2ZM8 21h2v1h-2ZM30 21h2v1h-2ZM8 22h2v1h-2ZM30 22h2v1h-2ZM8 23h3v1h-3ZM29 23h3v1h-3ZM8 24h3v1h-3ZM29 24h3v1h-3ZM8 25h4v1h-4ZM28 25h4v1h-4ZM9 26h4v1h-4ZM27 26h4v1h-4ZM10 27h5v1h-5ZM25 27h5v1h-5ZM11 28h18v1h-18ZM12 29h16v1h-16ZM18 30h4v1h-4ZM18 31h4v1h-4ZM18 32h4v1h-4ZM18 33h4v1h-4ZM18 34h4v1h-4Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" /></svg>;
  if (label === "Amp") return <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}><rect x="7" y="15" width="34" height="17" /><path d="M10 24h28" /></g></svg>;
  if (label === "Neural Capture") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M23 3h2v1h-2ZM26 4h2v1h-2ZM28 5h1v1h-1ZM10 6h10v1h-10ZM9 7h11v1h-11ZM8 8h12v1h-12ZM33 10h1v1h-1ZM34 11h1v1h-1ZM5 12h15v1h-15ZM5 13h15v1h-15ZM4 14h16v1h-16ZM35 15h1v1h-1ZM4 18h16v1h-16ZM4 19h16v1h-16ZM4 20h16v1h-16ZM35 22h1v1h-1ZM35 23h1v1h-1ZM5 24h15v1h-15ZM5 25h15v1h-15ZM6 26h14v1h-14ZM33 27h1v1h-1ZM9 30h11v1h-11ZM10 31h10v1h-10ZM11 32h9v1h-9ZM26 33h2v1h-2ZM23 34h2v1h-2Z" fill={QC_COLORS.captured.categoryCaptureMuted} stroke="none" /><path d="M20 3h3v1h-3ZM20 4h6v1h-6ZM20 5h8v1h-8ZM20 9h13v1h-13ZM20 10h13v1h-13ZM20 11h14v1h-14ZM20 15h15v1h-15ZM20 16h16v1h-16ZM20 17h16v1h-16ZM20 21h16v1h-16ZM20 22h15v1h-15ZM20 23h15v1h-15ZM20 27h13v1h-13ZM20 28h13v1h-13ZM20 29h12v1h-12ZM20 33h6v1h-6ZM20 34h3v1h-3Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" /></svg>;
  if (label === "Cab") return <svg viewBox="0 0 48 48" aria-hidden="true"><g {...common}><circle cx="24" cy="24" r="13" /><circle cx="24" cy="24" r="4" fill="currentColor" />{[[9, 9], [39, 9], [9, 39], [39, 39]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="currentColor" />)}</g></svg>;
  if (label === "Overdrive") return <svg viewBox="0 0 48 48" aria-hidden="true"><path {...common} d="m6 24 5-11h7l11 30h6l7-19" /></svg>;
  if (label === "Delay") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M6 6h1v1h-1ZM10 6h2v1h-2ZM20 6h1v1h-1ZM23 6h1v1h-1ZM25 6h3v1h-3ZM7 7h1v1h-1ZM10 7h3v1h-3ZM19 7h1v1h-1ZM26 7h3v1h-3ZM5 8h1v1h-1ZM10 8h3v1h-3ZM18 8h1v1h-1ZM21 8h1v1h-1ZM24 8h1v1h-1ZM27 8h3v1h-3ZM8 9h1v1h-1ZM11 9h2v1h-2ZM18 9h1v1h-1ZM20 9h1v1h-1ZM22 9h1v1h-1ZM27 9h3v1h-3ZM6 10h1v1h-1ZM8 10h1v1h-1ZM11 10h3v1h-3ZM20 10h1v1h-1ZM28 10h2v1h-2ZM6 11h1v1h-1ZM11 11h3v1h-3ZM25 11h1v1h-1ZM28 11h3v1h-3ZM6 12h1v1h-1ZM12 12h2v1h-2ZM17 12h1v1h-1ZM23 12h1v1h-1ZM25 12h1v1h-1ZM28 12h3v1h-3ZM9 13h1v1h-1ZM12 13h2v1h-2ZM17 13h1v1h-1ZM19 13h1v1h-1ZM23 13h1v1h-1ZM28 13h3v1h-3ZM7 14h1v1h-1ZM9 14h1v1h-1ZM12 14h3v1h-3ZM19 14h1v1h-1ZM29 14h2v1h-2ZM7 15h1v1h-1ZM9 15h1v1h-1ZM12 15h3v1h-3ZM19 15h1v1h-1ZM22 15h1v1h-1ZM26 15h1v1h-1ZM29 15h3v1h-3ZM7 16h1v1h-1ZM12 16h3v1h-3ZM22 16h1v1h-1ZM24 16h1v1h-1ZM26 16h1v1h-1ZM29 16h3v1h-3ZM7 17h1v1h-1ZM13 17h2v1h-2ZM16 17h1v1h-1ZM21 17h2v1h-2ZM24 17h1v1h-1ZM26 17h1v1h-1ZM29 17h3v1h-3ZM13 18h2v1h-2ZM16 18h1v1h-1ZM18 18h1v1h-1ZM21 18h4v1h-4ZM29 18h3v1h-3ZM10 19h1v1h-1ZM13 19h2v1h-2ZM16 19h1v1h-1ZM18 19h1v1h-1ZM21 19h4v1h-4ZM30 19h2v1h-2ZM8 20h1v1h-1ZM10 20h1v1h-1ZM13 20h2v1h-2ZM18 20h1v1h-1ZM21 20h3v1h-3ZM27 20h1v1h-1ZM30 20h2v1h-2ZM8 21h1v1h-1ZM10 21h1v1h-1ZM13 21h2v1h-2ZM21 21h2v1h-2ZM27 21h1v1h-1ZM30 21h3v1h-3ZM8 22h1v1h-1ZM13 22h3v1h-3ZM20 22h3v1h-3ZM25 22h1v1h-1ZM27 22h1v1h-1ZM30 22h3v1h-3ZM15 23h1v1h-1ZM20 23h3v1h-3ZM25 23h1v1h-1ZM27 23h1v1h-1ZM30 23h3v1h-3ZM11 24h1v1h-1ZM15 24h1v1h-1ZM17 24h1v1h-1ZM20 24h3v1h-3ZM25 24h1v1h-1ZM31 24h2v1h-2ZM9 25h1v1h-1ZM11 25h1v1h-1ZM17 25h1v1h-1ZM20 25h3v1h-3ZM28 25h1v1h-1ZM31 25h2v1h-2ZM9 26h1v1h-1ZM20 26h2v1h-2ZM28 26h1v1h-1ZM31 26h3v1h-3ZM14 27h1v1h-1ZM19 27h3v1h-3ZM26 27h1v1h-1ZM28 27h1v1h-1ZM31 27h3v1h-3ZM12 28h1v1h-1ZM14 28h1v1h-1ZM16 28h1v1h-1ZM19 28h3v1h-3ZM26 28h1v1h-1ZM32 28h2v1h-2ZM10 29h1v1h-1ZM13 29h1v1h-1ZM16 29h2v1h-2ZM19 29h2v1h-2ZM29 29h1v1h-1ZM32 29h3v1h-3ZM15 30h1v1h-1ZM17 30h4v1h-4ZM27 30h1v1h-1ZM32 30h3v1h-3ZM11 31h1v1h-1ZM14 31h1v1h-1ZM17 31h3v1h-3ZM28 31h1v1h-1ZM33 31h2v1h-2Z" fill={QC_COLORS.captured.categoryTrail} stroke="none" /><path d="M5 6h1v1h-1ZM21 6h2v1h-2ZM5 7h2v1h-2ZM20 7h4v1h-4ZM6 8h2v1h-2ZM19 8h2v1h-2ZM22 8h2v1h-2ZM6 9h2v1h-2ZM19 9h1v1h-1ZM23 9h2v1h-2ZM7 10h1v1h-1ZM18 10h2v1h-2ZM23 10h2v1h-2ZM7 11h2v1h-2ZM18 11h2v1h-2ZM23 11h2v1h-2ZM7 12h2v1h-2ZM18 12h2v1h-2ZM24 12h1v1h-1ZM7 13h2v1h-2ZM18 13h1v1h-1ZM24 13h2v1h-2ZM8 14h1v1h-1ZM17 14h2v1h-2ZM24 14h2v1h-2ZM8 15h1v1h-1ZM17 15h2v1h-2ZM24 15h2v1h-2ZM8 16h2v1h-2ZM17 16h2v1h-2ZM25 16h1v1h-1ZM8 17h2v1h-2ZM17 17h2v1h-2ZM25 17h1v1h-1ZM8 18h2v1h-2ZM17 18h1v1h-1ZM25 18h2v1h-2ZM8 19h2v1h-2ZM17 19h1v1h-1ZM25 19h2v1h-2ZM9 20h1v1h-1ZM16 20h2v1h-2ZM25 20h2v1h-2ZM9 21h1v1h-1ZM16 21h2v1h-2ZM25 21h2v1h-2ZM9 22h2v1h-2ZM16 22h2v1h-2ZM26 22h1v1h-1ZM9 23h2v1h-2ZM16 23h2v1h-2ZM26 23h1v1h-1ZM9 24h2v1h-2ZM16 24h1v1h-1ZM26 24h2v1h-2ZM10 25h1v1h-1ZM15 25h2v1h-2ZM26 25h2v1h-2ZM10 26h2v1h-2ZM15 26h2v1h-2ZM26 26h2v1h-2ZM10 27h2v1h-2ZM15 27h2v1h-2ZM27 27h1v1h-1ZM10 28h2v1h-2ZM15 28h1v1h-1ZM27 28h2v1h-2ZM11 29h2v1h-2ZM14 29h2v1h-2ZM27 29h2v1h-2ZM11 30h4v1h-4ZM28 30h2v1h-2ZM12 31h2v1h-2ZM29 31h1v1h-1Z" fill={QC_COLORS.captured.iconPrimary} stroke="none" /></svg>;
  if (label === "Reverb") return <svg viewBox="255 97 40 40" aria-hidden="true"><path d="M262 131.615L271.454 121L289 121.037M271.347 121.563V104" fill="none" stroke={QC_COLORS.captured.utilityMark} strokeWidth="2" /><path d="M289 104L279.912 112.895L262 113M279.5 113V131" fill="none" stroke={QC_COLORS.captured.primaryText} strokeWidth="2" /><path d="M290 120.5V103H271.407L262 112.716V131H280.01L290 120.5Z" fill="none" stroke={QC_COLORS.captured.primaryText} strokeWidth="2" /></svg>;
  if (label === "Compressor") return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 20.5C20 16.1 16.4 13 12 13C7.6 13 5 16.2 5 20.5M20 20.5C20 24.9 23.6 28 28 28C32.4 28 35 24.8 35 20.5" fill="none" stroke={QC_COLORS.captured.primaryText} strokeWidth="2.2" strokeLinecap="round" /><path d="M20 12L15.5 7H24.5L20 12ZM20 29.5L25 35H15L20 29.5Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "Pitch") return <svg viewBox="15 97 40 40" aria-hidden="true"><path d="M22 116H36.6006L35.5332 118H22V130H20V104H22V116ZM50 116V118H38.8701L40.1855 116H50Z" fill={QC_COLORS.captured.utilityMark} stroke="none" /><path d="M22 129C36 129 36 105 50 105" fill="none" stroke={QC_COLORS.captured.primaryText} strokeWidth="2" /></svg>;
  if (label === "Modulation") return <svg viewBox="175 15 40 40" aria-hidden="true"><path d="M195.075 33.554L195.225 34.3225C196.466 40.6709 197.026 42.3966 198.981 42.3966C200.922 42.3966 201.481 41.0622 202.526 36.6061L202.533 36.5786C203.253 33.5054 203.752 32.3207 204.134 32.3207C204.649 32.3207 204.983 32.8445 205.608 34.716C206.53 37.4731 207.179 38.4923 209 38.4923V36.4706C208.485 36.4706 208.151 35.9467 207.526 34.0752C206.604 31.3181 205.955 30.2991 204.134 30.2991C202.18 30.2991 201.612 31.649 200.565 36.117L200.558 36.1445C199.857 39.1361 199.368 40.3271 199.003 40.3735C199.053 40.3685 199.028 40.3408 198.94 40.2108C198.751 39.9321 198.549 39.4731 198.346 38.848C197.993 37.7578 197.706 36.4777 197.209 33.9345L197.058 33.1661C195.726 26.3507 195.051 24.3235 192.886 24.3235C191.444 24.3235 190.697 25.7329 190.002 28.4693C189.561 30.2103 189.249 31.9837 188.622 36.0061L188.579 36.278C187.978 40.1381 187.677 41.8489 187.271 43.4598C187.026 44.4297 186.78 45.1548 186.536 45.6187C186.499 45.691 186.462 45.7543 186.428 45.8086C186.376 45.7259 186.319 45.6236 186.261 45.5022C185.993 44.9445 185.727 44.0858 185.467 42.9481C185.03 41.0327 184.673 38.7278 184.134 34.6459C184.098 34.3676 183.869 32.6234 183.803 32.1236C182.924 25.4843 182.427 22.9861 181.4 22L180 23.4579C180.491 23.9295 181.053 26.7553 181.799 32.3891C181.865 32.8872 182.093 34.6305 182.13 34.9102C183.47 45.0698 184.139 48 186.425 48C187.838 48 188.556 46.6309 189.231 43.9542C189.659 42.2589 189.965 40.518 190.577 36.5893L190.619 36.3174C191.235 32.3647 191.542 30.6217 191.962 28.9666C192.215 27.9669 192.472 27.2185 192.727 26.7382C192.817 26.5676 192.901 26.4436 192.969 26.368C193.437 26.6179 194.172 28.9338 195.075 33.554Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "Morph") return <svg viewBox="655 97 40 40" aria-hidden="true"><path d="M675 103C677.795 103 680.823 104.185 683.151 106.135C685.478 108.083 687 110.699 687 113.5C687 117.821 684.49 122.217 681.577 125.604C680.135 127.282 678.63 128.669 677.366 129.628C676.733 130.108 676.176 130.468 675.73 130.704C675.508 130.822 675.326 130.901 675.188 130.949C675.039 131 674.984 131 675 131C675.016 131 674.961 131 674.812 130.949C674.674 130.901 674.492 130.822 674.27 130.704C673.824 130.468 673.267 130.108 672.634 129.628C671.37 128.669 669.865 127.282 668.423 125.604C665.51 122.217 663 117.821 663 113.5C663 110.699 664.522 108.083 666.849 106.135C669.177 104.185 672.205 103 675 103Z" fill="none" stroke={QC_COLORS.captured.primaryText} strokeWidth="2" /><path d="M674.1 123C674.1 123 670.407 123.095 668.17 120.61C665.934 118.125 666 114 666 114C666 114 669.693 113.905 671.93 116.39C674.166 118.875 674.1 123 674.1 123ZM675.9 123C675.9 123 679.593 123.095 681.83 120.61C684.066 118.125 684 114 684 114C684 114 680.307 113.905 678.07 116.39C675.834 118.875 675.9 123 675.9 123Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "Synth") return <svg viewBox="495 97 40 40" aria-hidden="true"><path d="M504 124C504 124.552 504.448 125 505 125H506V131H503C501.895 131 501 130.105 501 129V111H504V124ZM512 124C512 124.552 512.448 125 513 125H514V131H508V125H509C509.552 125 510 124.552 510 124V111H512V124ZM520 124C520 124.552 520.448 125 521 125H522V131H516V125H517C517.552 125 518 124.552 518 124V111H520V124ZM529 129C529 130.105 528.105 131 527 131H524V125H525C525.552 125 526 124.552 526 124V111H529V129ZM527 103C528.105 103 529 103.895 529 105V109H501V105C501 103.895 501.895 103 503 103H527ZM504 105C503.448 105 503 105.448 503 106C503 106.552 503.448 107 504 107C504.552 107 505 106.552 505 106C505 105.448 504.552 105 504 105ZM508 105C507.448 105 507 105.448 507 106C507 106.552 507.448 107 508 107C508.552 107 509 106.552 509 106C509 105.448 508.552 105 508 105ZM518 105C517.448 105 517 105.448 517 106C517 106.552 517.448 107 518 107H526C526.552 107 527 106.552 527 106C527 105.448 526.552 105 526 105H518Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "Filter") return <svg viewBox="255 15 40 40" aria-hidden="true"><path d="M259 30H281.099L290 45" fill="none" stroke={QC_COLORS.captured.primaryText} strokeWidth="2" /></svg>;
  if (label === "Equalizer") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M6 1h2v1h-2ZM18 1h2v1h-2ZM30 1h2v1h-2ZM6 2h2v1h-2ZM18 2h2v1h-2ZM30 2h2v1h-2ZM6 3h2v1h-2ZM18 3h2v1h-2ZM30 3h2v1h-2ZM6 4h2v1h-2ZM18 4h2v1h-2ZM30 4h2v1h-2ZM6 5h2v1h-2ZM18 5h2v1h-2ZM30 5h2v1h-2ZM6 6h2v1h-2ZM18 6h2v1h-2ZM30 6h2v1h-2ZM18 7h2v1h-2ZM30 7h2v1h-2ZM18 8h2v1h-2ZM30 8h2v1h-2ZM5 9h4v1h-4ZM18 9h2v1h-2ZM30 9h2v1h-2ZM4 10h6v1h-6ZM18 10h2v1h-2ZM30 10h2v1h-2ZM4 11h6v1h-6ZM18 11h2v1h-2ZM4 12h6v1h-6ZM18 12h2v1h-2ZM4 13h6v1h-6ZM18 13h2v1h-2ZM29 13h4v1h-4ZM5 14h4v1h-4ZM18 14h2v1h-2ZM28 14h6v1h-6ZM18 15h2v1h-2ZM28 15h6v1h-6ZM28 16h6v1h-6ZM6 17h2v1h-2ZM28 17h6v1h-6ZM6 18h2v1h-2ZM17 18h4v1h-4ZM29 18h4v1h-4ZM6 19h2v1h-2ZM16 19h6v1h-6ZM6 20h2v1h-2ZM16 20h6v1h-6ZM6 21h2v1h-2ZM16 21h6v1h-6ZM30 21h2v1h-2ZM6 22h2v1h-2ZM16 22h6v1h-6ZM30 22h2v1h-2ZM6 23h2v1h-2ZM17 23h4v1h-4ZM30 23h2v1h-2ZM6 24h2v1h-2ZM30 24h2v1h-2ZM6 25h2v1h-2ZM30 25h2v1h-2ZM6 26h2v1h-2ZM18 26h2v1h-2ZM30 26h2v1h-2ZM6 27h2v1h-2ZM18 27h2v1h-2ZM30 27h2v1h-2ZM6 28h2v1h-2ZM18 28h2v1h-2ZM30 28h2v1h-2ZM6 29h2v1h-2ZM18 29h2v1h-2ZM30 29h2v1h-2ZM6 30h2v1h-2ZM18 30h2v1h-2ZM30 30h2v1h-2Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "IR Loader") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M6 3h2v1h-2ZM6 4h2v1h-2ZM6 5h2v1h-2ZM6 6h2v1h-2ZM6 7h2v1h-2ZM6 8h2v1h-2ZM6 9h2v1h-2ZM6 10h2v1h-2ZM10 10h2v1h-2ZM6 11h2v1h-2ZM10 11h2v1h-2ZM26 11h2v1h-2ZM6 12h2v1h-2ZM10 12h2v1h-2ZM26 12h2v1h-2ZM6 13h2v1h-2ZM10 13h2v1h-2ZM26 13h2v1h-2ZM6 14h2v1h-2ZM10 14h2v1h-2ZM26 14h2v1h-2ZM6 15h2v1h-2ZM10 15h2v1h-2ZM26 15h2v1h-2ZM30 15h2v1h-2ZM6 16h2v1h-2ZM10 16h2v1h-2ZM26 16h2v1h-2ZM30 16h2v1h-2ZM6 17h2v1h-2ZM10 17h2v1h-2ZM26 17h2v1h-2ZM30 17h2v1h-2ZM6 18h2v1h-2ZM10 18h2v1h-2ZM26 18h2v1h-2ZM30 18h2v1h-2ZM14 19h2v1h-2ZM18 19h2v1h-2ZM22 19h2v1h-2ZM14 20h2v1h-2ZM18 20h2v1h-2ZM22 20h2v1h-2ZM14 21h2v1h-2ZM18 21h2v1h-2ZM22 21h2v1h-2ZM14 22h2v1h-2ZM18 22h2v1h-2ZM22 22h2v1h-2ZM14 23h2v1h-2ZM18 23h2v1h-2ZM14 24h2v1h-2ZM18 24h2v1h-2ZM14 25h2v1h-2ZM18 25h2v1h-2ZM18 26h2v1h-2ZM18 27h2v1h-2ZM18 28h2v1h-2ZM18 29h2v1h-2ZM18 30h2v1h-2Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "Wah") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M9 5h4v1h-4ZM25 5h4v1h-4ZM9 6h4v1h-4ZM15 6h1v1h-1ZM25 6h4v1h-4ZM9 7h3v1h-3ZM15 7h1v1h-1ZM22 7h1v1h-1ZM26 7h3v1h-3ZM9 8h3v1h-3ZM15 8h1v1h-1ZM22 8h1v1h-1ZM24 8h1v1h-1ZM26 8h3v1h-3ZM9 9h3v1h-3ZM13 9h1v1h-1ZM15 9h1v1h-1ZM22 9h1v1h-1ZM24 9h1v1h-1ZM26 9h3v1h-3ZM9 10h3v1h-3ZM13 10h1v1h-1ZM15 10h1v1h-1ZM22 10h1v1h-1ZM24 10h1v1h-1ZM26 10h3v1h-3ZM9 11h3v1h-3ZM13 11h1v1h-1ZM15 11h1v1h-1ZM22 11h1v1h-1ZM24 11h1v1h-1ZM26 11h3v1h-3ZM9 12h3v1h-3ZM13 12h1v1h-1ZM15 12h1v1h-1ZM22 12h1v1h-1ZM24 12h1v1h-1ZM26 12h3v1h-3ZM9 13h3v1h-3ZM13 13h1v1h-1ZM15 13h1v1h-1ZM22 13h1v1h-1ZM24 13h1v1h-1ZM26 13h3v1h-3ZM9 14h3v1h-3ZM13 14h1v1h-1ZM15 14h1v1h-1ZM22 14h1v1h-1ZM24 14h1v1h-1ZM26 14h3v1h-3ZM9 15h3v1h-3ZM13 15h1v1h-1ZM15 15h1v1h-1ZM22 15h1v1h-1ZM24 15h1v1h-1ZM26 15h3v1h-3ZM9 16h3v1h-3ZM13 16h1v1h-1ZM15 16h1v1h-1ZM22 16h1v1h-1ZM24 16h1v1h-1ZM26 16h3v1h-3ZM9 17h3v1h-3ZM13 17h1v1h-1ZM15 17h1v1h-1ZM22 17h1v1h-1ZM24 17h1v1h-1ZM26 17h3v1h-3ZM9 18h3v1h-3ZM13 18h1v1h-1ZM15 18h1v1h-1ZM22 18h1v1h-1ZM24 18h1v1h-1ZM26 18h3v1h-3ZM9 19h3v1h-3ZM13 19h1v1h-1ZM15 19h1v1h-1ZM22 19h1v1h-1ZM24 19h1v1h-1ZM26 19h3v1h-3ZM9 20h3v1h-3ZM13 20h1v1h-1ZM15 20h1v1h-1ZM22 20h1v1h-1ZM24 20h1v1h-1ZM26 20h3v1h-3ZM10 21h2v1h-2ZM13 21h1v1h-1ZM15 21h1v1h-1ZM22 21h1v1h-1ZM24 21h1v1h-1ZM26 21h2v1h-2ZM10 22h2v1h-2ZM13 22h1v1h-1ZM15 22h1v1h-1ZM22 22h1v1h-1ZM24 22h1v1h-1ZM26 22h2v1h-2ZM10 23h2v1h-2ZM13 23h1v1h-1ZM15 23h1v1h-1ZM22 23h1v1h-1ZM24 23h1v1h-1ZM26 23h2v1h-2ZM10 24h4v1h-4ZM15 24h1v1h-1ZM22 24h1v1h-1ZM24 24h4v1h-4ZM10 25h4v1h-4ZM15 25h1v1h-1ZM22 25h1v1h-1ZM24 25h4v1h-4ZM10 26h4v1h-4ZM15 26h1v1h-1ZM22 26h1v1h-1ZM24 26h4v1h-4ZM10 27h4v1h-4ZM24 27h4v1h-4ZM10 28h4v1h-4ZM24 28h4v1h-4ZM10 29h3v1h-3ZM25 29h3v1h-3ZM10 30h3v1h-3ZM25 30h3v1h-3ZM10 31h18v1h-18ZM10 32h18v1h-18Z" fill={QC_COLORS.captured.utilityMark} stroke="none" /><path d="M13 3h12v1h-12ZM13 4h12v1h-12ZM13 5h2v1h-2ZM23 5h2v1h-2ZM13 6h2v1h-2ZM23 6h2v1h-2ZM13 7h2v1h-2ZM23 7h2v1h-2ZM13 8h2v1h-2ZM23 8h1v1h-1ZM14 9h1v1h-1ZM23 9h1v1h-1ZM14 10h1v1h-1ZM23 10h1v1h-1ZM14 11h1v1h-1ZM23 11h1v1h-1ZM14 12h1v1h-1ZM23 12h1v1h-1ZM14 13h1v1h-1ZM23 13h1v1h-1ZM14 14h1v1h-1ZM23 14h1v1h-1ZM14 15h1v1h-1ZM23 15h1v1h-1ZM14 16h1v1h-1ZM23 16h1v1h-1ZM14 17h1v1h-1ZM23 17h1v1h-1ZM14 18h1v1h-1ZM23 18h1v1h-1ZM14 19h1v1h-1ZM23 19h1v1h-1ZM14 20h1v1h-1ZM23 20h1v1h-1ZM14 21h1v1h-1ZM23 21h1v1h-1ZM14 22h1v1h-1ZM23 22h1v1h-1ZM14 23h1v1h-1ZM23 23h1v1h-1ZM14 24h1v1h-1ZM23 24h1v1h-1ZM14 25h1v1h-1ZM23 25h1v1h-1ZM14 26h1v1h-1ZM23 26h1v1h-1ZM14 27h10v1h-10ZM14 28h10v1h-10Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "FX Loop") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M16 8h1v1h-1ZM16 9h3v1h-3ZM16 10h4v1h-4ZM8 11h14v1h-14ZM24 11h6v1h-6ZM7 12h15v1h-15ZM24 12h7v1h-7ZM6 13h5v1h-5ZM16 13h4v1h-4ZM27 13h5v1h-5ZM5 14h3v1h-3ZM16 14h3v1h-3ZM30 14h3v1h-3ZM4 15h3v1h-3ZM16 15h1v1h-1ZM31 15h3v1h-3ZM4 16h3v1h-3ZM31 16h3v1h-3ZM4 17h3v1h-3ZM31 17h3v1h-3ZM4 18h2v1h-2ZM32 18h2v1h-2ZM4 19h2v1h-2ZM32 19h2v1h-2ZM4 20h3v1h-3ZM31 20h3v1h-3ZM4 21h3v1h-3ZM31 21h3v1h-3ZM4 22h3v1h-3ZM21 22h1v1h-1ZM31 22h3v1h-3ZM5 23h3v1h-3ZM19 23h3v1h-3ZM30 23h3v1h-3ZM6 24h5v1h-5ZM18 24h4v1h-4ZM27 24h5v1h-5ZM7 25h7v1h-7ZM16 25h15v1h-15ZM8 26h6v1h-6ZM16 26h14v1h-14ZM18 27h4v1h-4ZM19 28h3v1h-3ZM21 29h1v1h-1Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "Looper") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M7 9h8v1h-8ZM23 9h8v1h-8ZM5 10h12v1h-12ZM21 10h12v1h-12ZM4 11h6v1h-6ZM12 11h6v1h-6ZM20 11h14v1h-14ZM4 12h4v1h-4ZM14 12h4v1h-4ZM20 12h4v1h-4ZM26 12h2v1h-2ZM30 12h4v1h-4ZM3 13h5v1h-5ZM14 13h9v1h-9ZM31 13h4v1h-4ZM3 14h5v1h-5ZM14 14h8v1h-8ZM32 14h3v1h-3ZM3 15h5v1h-5ZM9 15h4v1h-4ZM14 15h8v1h-8ZM25 15h4v1h-4ZM32 15h3v1h-3ZM3 16h2v1h-2ZM9 16h4v1h-4ZM17 16h4v1h-4ZM25 16h4v1h-4ZM33 16h2v1h-2ZM3 17h2v1h-2ZM9 17h4v1h-4ZM17 17h4v1h-4ZM25 17h4v1h-4ZM33 17h2v1h-2ZM3 18h3v1h-3ZM9 18h4v1h-4ZM16 18h8v1h-8ZM25 18h4v1h-4ZM30 18h5v1h-5ZM3 19h3v1h-3ZM16 19h8v1h-8ZM30 19h5v1h-5ZM3 20h4v1h-4ZM15 20h9v1h-9ZM30 20h5v1h-5ZM4 21h4v1h-4ZM10 21h2v1h-2ZM14 21h4v1h-4ZM20 21h4v1h-4ZM30 21h4v1h-4ZM4 22h14v1h-14ZM20 22h6v1h-6ZM28 22h6v1h-6ZM4 23h13v1h-13ZM21 23h13v1h-13ZM5 24h10v1h-10ZM23 24h10v1h-10ZM5 25h3v1h-3ZM30 25h3v1h-3ZM6 26h2v1h-2ZM30 26h2v1h-2ZM7 28h4v1h-4ZM27 28h4v1h-4ZM7 29h4v1h-4ZM13 29h12v1h-12ZM27 29h4v1h-4ZM7 30h4v1h-4ZM13 30h13v1h-13ZM27 30h4v1h-4ZM7 31h4v1h-4ZM12 31h14v1h-14ZM27 31h4v1h-4Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  if (label === "Utility") return <svg viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true"><path d="M8 7h1v1h-1ZM11 7h1v1h-1ZM7 8h1v1h-1ZM12 8h1v1h-1ZM7 9h1v1h-1ZM12 9h1v1h-1ZM21 9h2v1h-2ZM7 10h1v1h-1ZM9 10h2v1h-2ZM12 10h1v1h-1ZM19 10h5v1h-5ZM7 11h1v1h-1ZM9 11h2v1h-2ZM12 11h1v1h-1ZM18 11h6v1h-6ZM7 12h1v1h-1ZM9 12h2v1h-2ZM12 12h1v1h-1ZM17 12h7v1h-7ZM7 13h1v1h-1ZM9 13h2v1h-2ZM12 13h1v1h-1ZM16 13h8v1h-8ZM7 14h1v1h-1ZM9 14h2v1h-2ZM12 14h1v1h-1ZM15 14h4v1h-4ZM20 14h3v1h-3ZM7 15h1v1h-1ZM9 15h2v1h-2ZM12 15h1v1h-1ZM15 15h8v1h-8ZM7 16h1v1h-1ZM9 16h2v1h-2ZM12 16h1v1h-1ZM14 16h4v1h-4ZM19 16h3v1h-3ZM7 17h1v1h-1ZM9 17h2v1h-2ZM12 17h1v1h-1ZM14 17h3v1h-3ZM19 17h3v1h-3ZM27 17h5v1h-5ZM9 18h2v1h-2ZM14 18h2v1h-2ZM18 18h3v1h-3ZM24 18h8v1h-8ZM9 19h2v1h-2ZM14 19h1v1h-1ZM18 19h14v1h-14ZM10 20h1v1h-1ZM17 20h15v1h-15ZM17 21h7v1h-7ZM26 21h5v1h-5ZM6 22h1v1h-1ZM13 22h1v1h-1ZM16 22h5v1h-5ZM24 22h5v1h-5ZM6 23h1v1h-1ZM13 23h1v1h-1ZM16 23h3v1h-3ZM23 23h5v1h-5ZM6 24h1v1h-1ZM8 24h1v1h-1ZM11 24h1v1h-1ZM13 24h1v1h-1ZM15 24h4v1h-4ZM22 24h4v1h-4ZM6 25h1v1h-1ZM8 25h1v1h-1ZM11 25h1v1h-1ZM13 25h1v1h-1ZM15 25h3v1h-3ZM20 25h5v1h-5ZM6 26h1v1h-1ZM8 26h1v1h-1ZM11 26h1v1h-1ZM13 26h5v1h-5ZM19 26h5v1h-5ZM6 27h1v1h-1ZM8 27h1v1h-1ZM11 27h1v1h-1ZM13 27h9v1h-9ZM6 28h1v1h-1ZM13 28h13v1h-13ZM6 29h1v1h-1ZM14 29h5v1h-5ZM21 29h9v1h-9ZM6 30h1v1h-1ZM14 30h4v1h-4ZM22 30h11v1h-11ZM6 31h1v1h-1ZM14 31h2v1h-2ZM26 31h7v1h-7ZM6 32h1v1h-1ZM14 32h19v1h-19ZM6 33h1v1h-1ZM13 33h20v1h-20ZM7 34h2v1h-2ZM12 34h21v1h-21Z" fill={QC_COLORS.captured.utilityMark} stroke="none" /><path d="M9 7h2v1h-2ZM8 8h4v1h-4ZM8 9h4v1h-4ZM8 10h1v1h-1ZM11 10h1v1h-1ZM8 11h1v1h-1ZM11 11h1v1h-1ZM8 12h1v1h-1ZM11 12h1v1h-1ZM8 13h1v1h-1ZM11 13h1v1h-1ZM8 14h1v1h-1ZM11 14h1v1h-1ZM8 15h1v1h-1ZM11 15h1v1h-1ZM8 16h1v1h-1ZM11 16h1v1h-1ZM8 17h1v1h-1ZM11 17h1v1h-1ZM7 18h2v1h-2ZM11 18h2v1h-2ZM7 19h2v1h-2ZM11 19h2v1h-2ZM7 20h2v1h-2ZM11 20h2v1h-2ZM7 21h2v1h-2ZM11 21h2v1h-2ZM7 22h2v1h-2ZM11 22h2v1h-2ZM7 23h2v1h-2ZM11 23h2v1h-2ZM7 24h1v1h-1ZM12 24h1v1h-1ZM7 25h1v1h-1ZM12 25h1v1h-1ZM7 26h1v1h-1ZM12 26h1v1h-1ZM7 27h1v1h-1ZM12 27h1v1h-1ZM7 28h6v1h-6ZM7 29h7v1h-7ZM7 30h7v1h-7ZM7 31h7v1h-7ZM7 32h7v1h-7ZM7 33h6v1h-6ZM9 34h3v1h-3Z" fill={QC_COLORS.captured.primaryText} stroke="none" /></svg>;
  return <span>{fallback}</span>;
}

function DevicePresetGlyph() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor"><path d="m6 10 10-6 10 6-10 6Z" /><path d="m6 15 3-1.8 7 4.2 7-4.2 3 1.8-10 6Z" /><path d="m6 20 3-1.8 7 4.2 7-4.2 3 1.8-10 6Z" /></g></svg>;
}

function PluginLockIcon() {
  return <svg viewBox="0 0 20 24" aria-hidden="true"><path d="M4 10V7a6 6 0 0 1 12 0v3" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="2" y="10" width="16" height="13" rx="1" fill="currentColor" /></svg>;
}

function RouteSymbol({ label }: { label: string }) {
  if (label.startsWith("USB")) return <span className="route-symbol"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 24V5m0 0-4 4m4-4 4 4M14 14H8m0 0-3-3m3 3-3 3m9 4h6m0 0v-4m0 4 3-3" /></svg></span>;
  if (label.startsWith("Return")) return <span className="route-symbol route-fx">FX</span>;
  if (label === "Not In Use") return <span className="route-symbol route-unused">＋</span>;
  if (label.startsWith("Input")) return <span className="route-symbol route-stereo-input"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M2 9h22m0 0-5-5m5 5-5 5M2 19h22m0 0-5-5m5 5-5 5" /></svg></span>;
  if (label.startsWith("Row")) return <span className="route-symbol"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M2 8h22l-4-4m4 4-4 4M26 20H4l4-4m-4 4 4 4" /></svg></span>;
  return <span className="route-symbol"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M2 14h22m0 0-5-5m5 5-5 5" /></svg></span>;
}

const CORPUS_DEVICE_CATEGORIES = [
  ["Plugins", "♜", QC_COLORS.browserCategory.plugin], ["Amp", "▭", QC_COLORS.browserCategory.amp], ["Neural Capture", "◉", QC_COLORS.browserCategory.capture],
  ["Cab", "⊙", QC_COLORS.browserCategory.cab], ["Overdrive", "∿", QC_COLORS.browserCategory.overdrive], ["Delay", "〰", QC_COLORS.browserCategory.delay],
  ["Reverb", "◇", QC_COLORS.browserCategory.reverb], ["Compressor", "↕", QC_COLORS.browserCategory.compressor], ["Pitch", "≋", QC_COLORS.browserCategory.pitch],
  ["Modulation", "≈", QC_COLORS.browserCategory.modulation], ["Morph", "⌁", QC_COLORS.browserCategory.morph], ["Synth", "∿", QC_COLORS.browserCategory.synth],
  ["Filter", "⌁", QC_COLORS.browserCategory.filter], ["Equalizer", "≡", QC_COLORS.browserCategory.equalizer], ["IR Loader", "▥", QC_COLORS.browserCategory.irLoader],
  ["Wah", "▱", QC_COLORS.browserCategory.wah], ["FX Loop", "∞", QC_COLORS.browserCategory.fxLoop], ["Looper", "◉", QC_COLORS.browserCategory.looper], ["Utility", "⌁", QC_COLORS.browserCategory.utility]
] as const;
const CORPUS_OVERDRIVE_MODELS = ["Exotic Z Boost", "81 Creations Drive", "Brit Blues", "Brit Governor", "Chief BD2", "Chief DS1", "Chief MT", "Chief OD1", "Chief SD1", "Exotic", "Facial Fuzz", "Freeman BOD"];

function CorOsOfficialGrid({ snapshot, children, browserChrome = false }: { snapshot: PresetSnapshot; children?: ReactNode; browserChrome?: boolean }) {
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
    return <text x={x} y={y - (lines.length - 1) * 8.5} fill="#e6e6e6" stroke="none" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontWeight="400" fontSize="14.5">{lines.map((line, index) => <tspan key={`${line}-${index}`} x={x} dy={index ? 17 : 0}>{line}</tspan>)}</text>;
  };
  return <div className="qc-screen coros-vector-screen" aria-label="CorOS Grid">
    <svg className="coros-vector-canvas" viewBox="0 0 800 480" preserveAspectRatio="none" role="img" aria-label={`${snapshot.presetLocation} ${snapshot.presetName}, ${snapshot.mode} mode`}>
      <rect width="800" height="480" fill="#020202" />
      <text x="14" y="76" fill="#f4f4f4" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="64"><tspan letterSpacing="-2">{snapshot.presetLocation.slice(0, -1)}</tspan><tspan fill={browserChrome ? "#d63b3e" : "#2df36a"} letterSpacing="-2">{snapshot.presetLocation.slice(-1)}</tspan><tspan dx={16} dy={browserChrome ? -11 : 0} fill="#f4f4f4" fontSize={browserChrome ? 40 : 64} letterSpacing={browserChrome ? 0 : -2} textLength={browserChrome ? undefined : 313} lengthAdjust={browserChrome ? undefined : "spacingAndGlyphs"}>{snapshot.presetName}</tspan></text>
      <QcScreenHeaderGlyph kind="undo" />
      <QcScreenHeaderGlyph kind="export" />
      <g className="grid-scene-badge"><rect x="656" y="12" width="25" height="25" rx="3" fill="#f2cf32" /><text x="668.5" y="33" textAnchor="middle" fill="#141414" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="22">A</text></g>
      <QcScreenHeaderGlyph kind="menu" />
      <g transform="translate(657 55)"><ModeGlyph mode={snapshot.mode} /></g><text x="693" y="78" fill="#f0f0f0" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="21.5">{snapshot.mode}</text>
      <g fill="#171719" stroke="#050505" strokeWidth="1.5" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" textAnchor="middle">
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

function CorOsCorpusDeviceBrowser({ snapshot, view }: { snapshot: PresetSnapshot; view: "corpus-device-browser-root" | "corpus-device-browser-models" | "corpus-device-browser-models-clean" }) {
  const models = view !== "corpus-device-browser-root";
  return <CorOsOfficialGrid snapshot={snapshot} browserChrome>
    <svg className="coros-device-empty-slot" viewBox="0 0 70 70" aria-hidden="true"><rect width="70" height="70" rx="14" fill="#050505" /><path d="M25 35h20M35 25v20" fill="none" stroke="#dedede" strokeWidth="1.7" strokeLinecap="round" /></svg>
    <button className="coros-device-dismiss" aria-label="Close device browser" />
    <section className="coros-device-browser" aria-label="Virtual Device browser">
      <nav>{CORPUS_DEVICE_CATEGORIES.map(([label, glyph, color]) => <button key={label} data-category={label} className={models && label === "Overdrive" ? "is-active" : ""} style={{ "--device-color": color } as CSSProperties}><i><DeviceCategoryGlyph label={label} fallback={glyph} /></i><span>{label === "Equalizer" ? "EQ" : label}</span>{label === "Delay" && <b>New</b>}</button>)}</nav>
      {models && <div className="coros-device-models"><header><button className="is-active">GUITAR</button><button>BASS</button></header>{CORPUS_OVERDRIVE_MODELS.map((model, index) => <button key={model}><span>{index === 0 ? <b className="device-model-pin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 2 8 8-4 1-4 4v4l-2 2-3-6-6-3 2-2h4l4-4Z" /></svg></b> : null}{model}</span><i><DevicePresetGlyph /></i></button>)}</div>}
    </section>
    {models && view !== "corpus-device-browser-models-clean" && <aside className="coros-device-preset-tip"><button aria-label="Dismiss Virtual Device Presets tip">×</button><strong>VIRTUAL DEVICE PRESETS</strong><span>Tap ▱ next to each virtual device to access its Factory and User Presets.</span></aside>}
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
  if (view === "corpus-device-browser-root" || view === "corpus-device-browser-models" || view === "corpus-device-browser-models-clean") return <CorOsCorpusDeviceBrowser snapshot={snapshot} view={view} />;
  if (view.startsWith("fixture-")) return <CorOsRemainingFixture view={view as RemainingFixtureView} />;
  if (view.startsWith("recovery-") || view.startsWith("overlay-")) return <CorOsSystemFixture view={view as SystemFixtureView} />;
  if (view === "tuner-live-enabled") return <CorOsTuner liveTuner onClose={onClose} />;
  if ((view as string) === "gig-official-hybrid-manual") return <CorOsOfficialGig mode="hybrid" manualHybrid />;
  if ((view as string) === "settings-account-official") return <CorOsOfficialSettings view="settings-account" manualAccount />;
  if ((view as string) === "capture-progress-official") return <CorOsOfficialCapture view="capture-progress" manualProgress />;
  if ((view as string) === "expression-bypass-official") return <ExpressionChooser trim={false} manualAmp />;
  if ((view as string) === "looper-editor-official") return <CorOsLooperEditor manualReference />;
  if (view.startsWith("gig-official-")) return <CorOsOfficialGig mode={view.replace("gig-official-", "") as OfficialGigMode} />;
  if (view === "device-presets-official") return <CorOsDevicePresetScreen view="official-factory" />;
  if (view === "gig" || view === "gig-live-tuner") return <CorOsGigView snapshot={snapshot} presetList={gigPresetList} liveTuner={view === "gig-live-tuner"} onClose={onClose} />;
  if (view === "tuner") return <CorOsTuner onClose={onClose} />;
  if (view === "tempo") return <CorOsTempo bpm={snapshot.tempo} onClose={onClose} />;
  if (view === "midi-out") return <CorOsMidiOut onClose={onClose} />;
  if (view === "cpu-monitor") return <CorOsCpuMonitor onClose={onClose} />;
  if (view === "global-eq") return <CorOsGlobalEq onClose={onClose} />;
  if (view.startsWith("io-")) return <CorOsIoSettings initialView={view.slice(3) as IoView} onClose={onClose} />;
  if (view === "power-overlay") return <CorOsPowerOverlay onClose={onClose} />;
  if (view === "device-browser-amp-official" || view === "plugin-devices-official") return <CorOsOfficialDeviceBrowser plugins={view === "plugin-devices-official"} />;
  if (view === "device-preset-actions-official") return <CorOsDevicePresetScreen view="official-actions" />;
  if (view === "modes-official") return <CorOsOfficialModes onClose={onClose} />;
  if (view === "splitter-placement" || view === "splitter-editor" || view === "mixer-editor" || view === "empty-slot") return <CorOsRoutingScreen view={view} snapshot={snapshot} />;
  if (view === "device-browser-neural-capture") return <CorOsCaptureLibrary view={view} />;
  if (view === "device-search" || view === "device-search-entry" || view === "device-search-suggestions" || view === "device-search-results" || view === "device-favorites" || view === "device-recents") return <CorOsCaptureLibrary view={view} />;
  if (view === "plugin-folders" || view === "plugin-list" || view === "plugin-list-reference" || view === "plugin-models" || view === "plugin-locked" || view === "plugin-refresh") return <CorOsDeviceBrowserFixture view={view} />;
  if (view === "looper-editor") return <CorOsLooperEditor />;
  if (view === "device-presets" || view === "device-presets-user" || view === "device-preset-actions" || view === "device-preset-save") return <CorOsDevicePresetScreen save={view === "device-preset-save"} view={view === "device-presets-user" ? "user" : view === "device-preset-actions" ? "actions" : "factory"} />;
  if (view === "expression-parameter" || view === "expression-bypass") return <ExpressionChooser trim={view === "expression-parameter"} />;
  if (view === "stomp-assignment" || view === "scene-assignment") return <CorOsAssignmentScreen view={view} />;
  if (view === "block-context") return <CorOsBlockContext />;
  if (view === "directory-new-folder") return <CorOsDirectoryNameScreen />;
  if (view === "directory-filter") return <CorOsOfficialDirectory view="directory-captures" filter />;
  if (view === "directory-captures-official") return <CorOsOfficialDirectory view="directory-captures" manualReference />;
  if (view === "directory-irs-official") return <CorOsOfficialDirectory view="directory-irs" manualReference />;
  if (view.startsWith("directory-")) return (["directory-presets", "directory-captures", "directory-irs", "directory-plugins", "directory-favorites", "directory-search-results", "directory-nested", "directory-cloud-upload"] as string[]).includes(view) ? <CorOsOfficialDirectory view={view as OfficialDirectoryView} /> : <CorOsDirectoryFixture view={view as DirectoryFixtureView} />;
  if (view.startsWith("capture-")) return <CorOsCaptureFixture view={view as CaptureFixtureView} />;
  if (view.startsWith("settings-")) return <CorOsSettingsFixture view={view as SettingsFixtureView} />;
  if (view === "modes") return <CorOsModesConfiguration onClose={onClose} />;
  if (view === "save-as") return <CorOsSaveAs onClose={onClose} />;
  if (view === "edit-details") return <CorOsPresetNameEditor snapshot={snapshot} onClose={onClose} />;
  return null;
}
