import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Upload, FileText, Table2, BarChart3, Search, X, ChevronDown, ChevronRight, Hash, Type, ArrowUpDown, Download, Shield, Network, TrendingDown, Shuffle, RotateCw, Move, FlipHorizontal, MountainSnow, Ruler, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  type ParsedInpFile, type ParsedSection, type SectionStats,
  parseInpFile, computeSectionStats, getNumericColumns, formatFileSize,
} from "@/lib/inp-parser";
import { validateInp, type ValidationResult } from "@/lib/inp-validator";
import { transformInp, DEFAULT_TRANSFORM, type TransformConfig, type TransformResult } from "@/lib/inp-transformer";
import ValidationPanelComponent from "@/components/validation-panel";
import { useTheme } from "@/components/theme-provider";

const SECTION_ICONS: Record<string, string> = {
  TITLE: "📄", OPTIONS: "⚙️", RAINGAGES: "🌧️",
  SUBCATCHMENTS: "🏘️", SUBAREAS: "📐", INFILTRATION: "💧",
  JUNCTIONS: "🔵", OUTFALLS: "🔴", STORAGE: "🟠", DIVIDERS: "🔶",
  CONDUITS: "🟢", PUMPS: "⚡", ORIFICES: "🕳️", WEIRS: "🔷", OUTLETS: "🔹",
  XSECTIONS: "📏", LOSSES: "📉", TRANSECTS: "📊",
  COORDINATES: "📍", VERTICES: "📌", POLYGONS: "🔺", SYMBOLS: "🎯",
  CURVES: "📈", TIMESERIES: "⏱️", PATTERNS: "🔄",
  POLLUTANTS: "☣️", LANDUSES: "🌿", COVERAGES: "🗺️",
  CONTROLS: "🎛️", REPORT: "📋", TAGS: "🏷️", MAP: "🗺️",
  DWF: "🚰", INFLOWS: "➡️", RDII: "🌊",
};

const SECTION_CATEGORIES: Record<string, string[]> = {
  "Hydrology": ["RAINGAGES", "SUBCATCHMENTS", "SUBAREAS", "INFILTRATION", "AQUIFERS", "GROUNDWATER", "SNOWPACKS", "LID_CONTROLS", "LID_USAGE"],
  "Hydraulics": ["JUNCTIONS", "OUTFALLS", "STORAGE", "DIVIDERS", "CONDUITS", "PUMPS", "ORIFICES", "WEIRS", "OUTLETS", "XSECTIONS", "LOSSES", "TRANSECTS"],
  "Quality": ["POLLUTANTS", "LANDUSES", "COVERAGES", "LOADINGS", "BUILDUP", "WASHOFF", "TREATMENT"],
  "Loading": ["INFLOWS", "DWF", "RDII", "HYDROGRAPHS", "CURVES", "TIMESERIES", "PATTERNS"],
  "Geometry": ["COORDINATES", "VERTICES", "POLYGONS", "SYMBOLS", "LABELS"],
  "Settings": ["TITLE", "OPTIONS", "EVAPORATION", "TEMPERATURE", "ADJUSTMENTS", "REPORT", "MAP", "BACKDROP", "TAGS", "CONTROLS", "PROFILES"],
};

function categorizeSection(name: string): string {
  for (const [cat, secs] of Object.entries(SECTION_CATEGORIES)) {
    if (secs.includes(name)) return cat;
  }
  return "Other";
}

interface HistogramData {
  bins: { x0: number; x1: number; count: number }[];
  column: string;
  max: number;
}

function buildHistogram(section: ParsedSection, colIdx: number, nBins = 30): HistogramData | null {
  const values: number[] = [];
  for (const row of section.rows) {
    if (colIdx < row.length) {
      const v = parseFloat(row[colIdx]);
      if (!isNaN(v) && isFinite(v)) values.push(v);
    }
  }
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return null;
  const binWidth = (max - min) / nBins;
  const bins: { x0: number; x1: number; count: number }[] = [];
  for (let i = 0; i < nBins; i++) {
    bins.push({ x0: min + i * binWidth, x1: min + (i + 1) * binWidth, count: 0 });
  }
  let maxCount = 0;
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= nBins) idx = nBins - 1;
    bins[idx].count++;
    if (bins[idx].count > maxCount) maxCount = bins[idx].count;
  }
  return { bins, column: section.headers[colIdx], max: maxCount };
}

function MiniHistogram({ data }: { data: HistogramData }) {
  const isDark = document.documentElement.classList.contains("dark");
  const barColor = isDark ? "#38bdf8" : "#0284c7";
  const W = 100;
  const H = 40;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10">
      {data.bins.map((b, i) => {
        const bw = W / data.bins.length;
        const bh = data.max > 0 ? (b.count / data.max) * (H - 2) : 0;
        return (
          <rect
            key={i}
            x={i * bw}
            y={H - bh}
            width={Math.max(bw - 0.5, 0.5)}
            height={bh}
            fill={barColor}
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

function FullHistogram({ section, colIdx }: { section: ParsedSection; colIdx: number }) {
  const data = useMemo(() => buildHistogram(section, colIdx, 40), [section, colIdx]);
  if (!data) return <div className="text-sm text-muted-foreground p-4">Not enough numeric data for histogram.</div>;

  const isDark = document.documentElement.classList.contains("dark");
  const W = 600, H = 260, ml = 55, mr = 20, mt = 20, mb = 40;
  const plotW = W - ml - mr, plotH = H - mt - mb;
  const barColor = isDark ? "#38bdf8" : "#0284c7";
  const gridColor = isDark ? "rgba(148,163,184,0.12)" : "rgba(30,41,59,0.1)";
  const textColor = isDark ? "#94a3b8" : "#475569";

  const nTicks = 5;
  const yTicks = Array.from({ length: nTicks + 1 }, (_, i) => Math.round((data.max / nTicks) * i));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[600px]">
        {yTicks.map((t, i) => {
          const y = mt + plotH - (data.max > 0 ? (t / data.max) * plotH : 0);
          return (
            <g key={i}>
              <line x1={ml} y1={y} x2={ml + plotW} y2={y} stroke={gridColor} strokeWidth={0.5} />
              <text x={ml - 6} y={y + 3} fill={textColor} fontSize={9} textAnchor="end" fontFamily="monospace">{t}</text>
            </g>
          );
        })}
        {data.bins.map((b, i) => {
          const bw = plotW / data.bins.length;
          const bh = data.max > 0 ? (b.count / data.max) * plotH : 0;
          return (
            <rect
              key={i}
              x={ml + i * bw}
              y={mt + plotH - bh}
              width={Math.max(bw - 1, 1)}
              height={bh}
              fill={barColor}
              opacity={0.75}
              rx={1}
            >
              <title>{`${b.x0.toPrecision(4)} – ${b.x1.toPrecision(4)}: ${b.count}`}</title>
            </rect>
          );
        })}
        <line x1={ml} y1={mt} x2={ml} y2={mt + plotH} stroke={textColor} strokeWidth={0.5} />
        <line x1={ml} y1={mt + plotH} x2={ml + plotW} y2={mt + plotH} stroke={textColor} strokeWidth={0.5} />
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const val = data.bins[0].x0 + frac * (data.bins[data.bins.length - 1].x1 - data.bins[0].x0);
          return (
            <text key={i} x={ml + frac * plotW} y={mt + plotH + 14} fill={textColor} fontSize={9} textAnchor="middle" fontFamily="monospace">
              {val.toPrecision(4)}
            </text>
          );
        })}
        <text x={ml + plotW / 2} y={H - 4} fill={textColor} fontSize={10} textAnchor="middle">{data.column}</text>
        <text x={14} y={mt + plotH / 2} fill={textColor} fontSize={10} textAnchor="middle" transform={`rotate(-90, 14, ${mt + plotH / 2})`}>Count</text>
      </svg>
    </div>
  );
}

function StatsTable({ stats, section }: { stats: SectionStats[]; section: ParsedSection }) {
  if (stats.length === 0) return <div className="text-sm text-muted-foreground p-3">No numeric columns found.</div>;
  const fmt = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toFixed(1);
    if (Math.abs(v) >= 1) return v.toFixed(3);
    return v.toPrecision(4);
  };
  const colHistograms = useMemo(() => {
    const map: Record<string, HistogramData> = {};
    for (let ci = 0; ci < section.headers.length; ci++) {
      const h = buildHistogram(section, ci, 20);
      if (h) map[section.headers[ci]] = h;
    }
    return map;
  }, [section]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono" data-testid="table-stats">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 text-muted-foreground font-semibold">Column</th>
            <th className="text-right p-2 text-muted-foreground font-semibold">Count</th>
            <th className="text-right p-2 text-muted-foreground font-semibold">Min</th>
            <th className="text-right p-2 text-muted-foreground font-semibold">Max</th>
            <th className="text-right p-2 text-muted-foreground font-semibold">Mean</th>
            <th className="text-right p-2 text-muted-foreground font-semibold">Median</th>
            <th className="text-right p-2 text-muted-foreground font-semibold">Std Dev</th>
            <th className="p-2 text-muted-foreground font-semibold w-28">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="p-2 text-foreground font-semibold">{s.column}</td>
              <td className="text-right p-2 text-muted-foreground">{s.count}</td>
              <td className="text-right p-2 text-muted-foreground">{fmt(s.min)}</td>
              <td className="text-right p-2 text-muted-foreground">{fmt(s.max)}</td>
              <td className="text-right p-2 text-primary">{fmt(s.mean)}</td>
              <td className="text-right p-2 text-muted-foreground">{fmt(s.median)}</td>
              <td className="text-right p-2 text-muted-foreground">{fmt(s.stdDev)}</td>
              <td className="p-2 w-28">
                {colHistograms[s.column] ? <MiniHistogram data={colHistograms[s.column]} /> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface InpNetNode {
  name: string;
  type: 'junction' | 'outfall' | 'storage';
  x: number;
  y: number;
  elev: number;
  maxDepth: number;
}

interface InpNetLink {
  name: string;
  from: string;
  to: string;
  isPump?: boolean;
}

interface InpProfileNode {
  name: string;
  station: number;
  invertElev: number;
  crownElev: number;
  maxDepth: number;
  type: 'junction' | 'outfall' | 'storage';
}

interface InpProfileConduit {
  name: string;
  fromStation: number;
  toStation: number;
  fromInvert: number;
  toInvert: number;
  diameter: number;
  fromCrown: number;
  toCrown: number;
}

interface InpProfile {
  outfallName: string;
  nodes: InpProfileNode[];
  conduits: InpProfileConduit[];
}

function extractNetworkData(parsed: ParsedInpFile) {
  const nodes: Record<string, InpNetNode> = {};
  const links: InpNetLink[] = [];
  const coords: Record<string, { x: number; y: number }> = {};

  const coordSec = parsed.sections.find(s => s.name === "COORDINATES");
  if (coordSec) {
    for (const row of coordSec.rows) {
      if (row.length >= 3) {
        const x = parseFloat(row[1]);
        const y = parseFloat(row[2]);
        if (!isNaN(x) && !isNaN(y)) coords[row[0]] = { x, y };
      }
    }
  }

  const juncSec = parsed.sections.find(s => s.name === "JUNCTIONS");
  if (juncSec) {
    for (const row of juncSec.rows) {
      if (row.length >= 2) {
        const elev = parseFloat(row[1]) || 0;
        const maxD = parseFloat(row[2]) || 4;
        const c = coords[row[0]];
        nodes[row[0]] = { name: row[0], type: 'junction', x: c?.x ?? 0, y: c?.y ?? 0, elev, maxDepth: maxD };
      }
    }
  }

  const outSec = parsed.sections.find(s => s.name === "OUTFALLS");
  if (outSec) {
    for (const row of outSec.rows) {
      if (row.length >= 2) {
        const elev = parseFloat(row[1]) || 0;
        const c = coords[row[0]];
        nodes[row[0]] = { name: row[0], type: 'outfall', x: c?.x ?? 0, y: c?.y ?? 0, elev, maxDepth: 0 };
      }
    }
  }

  const stoSec = parsed.sections.find(s => s.name === "STORAGE");
  if (stoSec) {
    for (const row of stoSec.rows) {
      if (row.length >= 2) {
        const elev = parseFloat(row[1]) || 0;
        const maxD = parseFloat(row[2]) || 6;
        const c = coords[row[0]];
        nodes[row[0]] = { name: row[0], type: 'storage', x: c?.x ?? 0, y: c?.y ?? 0, elev, maxDepth: maxD };
      }
    }
  }

  const condSec = parsed.sections.find(s => s.name === "CONDUITS");
  if (condSec) {
    for (const row of condSec.rows) {
      if (row.length >= 3) {
        links.push({ name: row[0], from: row[1], to: row[2] });
      }
    }
  }

  const pumpSec = parsed.sections.find(s => s.name === "PUMPS");
  if (pumpSec) {
    for (const row of pumpSec.rows) {
      if (row.length >= 3) {
        links.push({ name: row[0], from: row[1], to: row[2], isPump: true });
      }
    }
  }

  const xsecMap: Record<string, number> = {};
  const xsSec = parsed.sections.find(s => s.name === "XSECTIONS");
  if (xsSec) {
    for (const row of xsSec.rows) {
      if (row.length >= 3) {
        xsecMap[row[0]] = parseFloat(row[2]) || 1;
      }
    }
  }

  const hasCoords = Object.keys(coords).length > 0;

  return { nodes, links, xsecMap, hasCoords };
}

function buildProfilesFromParsed(parsed: ParsedInpFile): InpProfile[] {
  const { nodes, links, xsecMap } = extractNetworkData(parsed);

  const adjDown: Record<string, { link: string; to: string }[]> = {};
  const adjUp: Record<string, { link: string; from: string }[]> = {};
  const condLengths: Record<string, number> = {};
  const condOffsets: Record<string, { inOff: number; outOff: number }> = {};

  const condSec = parsed.sections.find(s => s.name === "CONDUITS");
  if (condSec) {
    for (const row of condSec.rows) {
      if (row.length >= 4) {
        const len = parseFloat(row[3]) || 100;
        condLengths[row[0]] = len;
        const inOff = parseFloat(row[5]) || 0;
        const outOff = parseFloat(row[6]) || 0;
        condOffsets[row[0]] = { inOff, outOff };
        if (!adjDown[row[1]]) adjDown[row[1]] = [];
        adjDown[row[1]].push({ link: row[0], to: row[2] });
        if (!adjUp[row[2]]) adjUp[row[2]] = [];
        adjUp[row[2]].push({ link: row[0], from: row[1] });
      }
    }
  }

  const outfalls = Object.values(nodes).filter(n => n.type === 'outfall');
  if (outfalls.length === 0) return [];

  const profiles: InpProfile[] = [];

  for (const outfall of outfalls) {
    let current = outfall.name;
    const visited = new Set<string>();
    const path: { node: string; link: string }[] = [];

    visited.add(current);
    while (true) {
      const ups = adjUp[current];
      if (!ups || ups.length === 0) break;
      let best: { link: string; from: string } | null = null;
      let bestElev = -Infinity;
      for (const u of ups) {
        if (visited.has(u.from)) continue;
        const n = nodes[u.from];
        if (n && n.elev > bestElev) { bestElev = n.elev; best = u; }
      }
      if (!best) break;
      path.push({ node: best.from, link: best.link });
      visited.add(best.from);
      current = best.from;
    }

    if (path.length === 0) continue;

    const profileNodes: InpProfileNode[] = [];
    const profileConduits: InpProfileConduit[] = [];
    let station = 0;

    const outNode = nodes[outfall.name];
    profileNodes.push({
      name: outfall.name,
      station: 0,
      invertElev: outNode.elev,
      crownElev: outNode.elev + (outNode.maxDepth || 4),
      maxDepth: outNode.maxDepth || 4,
      type: 'outfall',
    });

    for (const step of path) {
      const linkLen = condLengths[step.link] || 100;
      const diam = xsecMap[step.link] || 1;
      const n = nodes[step.node];
      if (!n) continue;

      const prevStation = station;
      station += linkLen;

      const prevNode = profileNodes[profileNodes.length - 1];
      const off = condOffsets[step.link] || { inOff: 0, outOff: 0 };

      profileConduits.push({
        name: step.link,
        fromStation: prevStation,
        toStation: station,
        fromInvert: prevNode.invertElev + off.outOff,
        toInvert: n.elev + off.inOff,
        diameter: diam,
        fromCrown: prevNode.invertElev + off.outOff + diam,
        toCrown: n.elev + off.inOff + diam,
      });

      profileNodes.push({
        name: n.name,
        station,
        invertElev: n.elev,
        crownElev: n.elev + n.maxDepth,
        maxDepth: n.maxDepth,
        type: n.type,
      });
    }

    profiles.push({ outfallName: outfall.name, nodes: profileNodes, conduits: profileConduits });
  }

  profiles.sort((a, b) => b.nodes.length - a.nodes.length);
  return profiles;
}

function ViewerNetworkCanvas({ parsed }: { parsed: ParsedInpFile }) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ ox: 0, oy: 0, scale: 1, dragging: false, lx: 0, ly: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const netInfo = useMemo(() => extractNetworkData(parsed), [parsed]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const { nodes, links, hasCoords } = netInfo;
    const view = viewRef.current;

    ctx.clearRect(0, 0, W, H);
    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#080c14" : "#f5f7fa";
    ctx.fillRect(0, 0, W, H);
    ctx.save();

    const nodeArr = Object.values(nodes);
    if (nodeArr.length === 0 || !hasCoords) {
      ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
      ctx.font = "14px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(hasCoords ? "No nodes found" : "No [COORDINATES] section in this file", W / 2, H / 2);
      ctx.restore();
      return;
    }

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const n of nodeArr) {
      if (n.x < xMin) xMin = n.x; if (n.x > xMax) xMax = n.x;
      if (n.y < yMin) yMin = n.y; if (n.y > yMax) yMax = n.y;
    }
    const pad = 40;
    const dataW = (xMax - xMin) || 1;
    const dataH = (yMax - yMin) || 1;
    const fitScale = Math.min((W - pad * 2) / dataW, (H - pad * 2) / dataH);
    const totalScale = fitScale * view.scale;
    const cx = W / 2 + view.ox, cy = H / 2 + view.oy;
    const dataCx = (xMin + xMax) / 2, dataCy = (yMin + yMax) / 2;

    ctx.translate(cx, cy);
    ctx.scale(totalScale, -totalScale);
    ctx.translate(-dataCx, -dataCy);

    for (const l of links) {
      const a = nodes[l.from], b = nodes[l.to];
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = l.isPump ? "#818cf8" : "#34d399";
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = (l.isPump ? 2 : 1.2) / totalScale;
      if (l.isPump) { ctx.setLineDash([6 / totalScale, 4 / totalScale]); }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    for (const n of nodeArr) {
      const r = Math.max(2, 4 / totalScale);
      ctx.beginPath();
      if (n.type === "outfall") {
        ctx.moveTo(n.x, n.y - r * 1.5);
        ctx.lineTo(n.x - r * 1.3, n.y + r);
        ctx.lineTo(n.x + r * 1.3, n.y + r);
        ctx.closePath();
        ctx.fillStyle = "#ef4444";
      } else if (n.type === "storage") {
        ctx.rect(n.x - r, n.y - r, r * 2, r * 2);
        ctx.fillStyle = "#fb923c";
      } else {
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
      }
      ctx.fill();
    }

    if (nodeArr.length < 5000) {
      ctx.save();
      ctx.scale(1, -1);
      const labelSize = Math.max(8, 11 / totalScale);
      ctx.font = `600 ${labelSize}px 'JetBrains Mono', monospace`;
      for (const n of nodeArr) {
        if (n.type === "outfall" || n.type === "storage") {
          ctx.fillStyle = n.type === "outfall" ? "#ef4444" : "#fb923c";
          ctx.fillText(n.name, n.x + 6 / totalScale, -n.y - 4 / totalScale);
        }
      }
      ctx.restore();
    }

    ctx.restore();
  }, [netInfo, theme]);

  useEffect(() => {
    viewRef.current = { ox: 0, oy: 0, scale: 1, dragging: false, lx: 0, ly: 0 };
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => {
      viewRef.current.dragging = true;
      viewRef.current.lx = e.clientX;
      viewRef.current.ly = e.clientY;
      canvas.style.cursor = "grabbing";
    };
    const onMouseMove = (e: MouseEvent) => {
      const view = viewRef.current;
      if (view.dragging) {
        view.ox += e.clientX - view.lx;
        view.oy += e.clientY - view.ly;
        view.lx = e.clientX;
        view.ly = e.clientY;
        draw();
      }

      if (!netInfo.hasCoords || view.dragging) {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const nodeArr = Object.values(netInfo.nodes);
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      for (const n of nodeArr) {
        if (n.x < xMin) xMin = n.x; if (n.x > xMax) xMax = n.x;
        if (n.y < yMin) yMin = n.y; if (n.y > yMax) yMax = n.y;
      }
      const pad = 40, W = canvas.width, H = canvas.height;
      const dataW = (xMax - xMin) || 1, dataH = (yMax - yMin) || 1;
      const fitScale = Math.min((W - pad * 2) / dataW, (H - pad * 2) / dataH);
      const totalScale = fitScale * viewRef.current.scale;
      const cxc = W / 2 + viewRef.current.ox, cyc = H / 2 + viewRef.current.oy;
      const dataCx = (xMin + xMax) / 2, dataCy = (yMin + yMax) / 2;
      const dx = (mx - cxc) / totalScale + dataCx;
      const dy = -((my - cyc) / totalScale) + dataCy;

      let best: InpNetNode | null = null, bestDist = Infinity;
      const hitR = 15 / totalScale;
      for (const n of nodeArr) {
        const d = Math.hypot(n.x - dx, n.y - dy);
        if (d < hitR && d < bestDist) { best = n; bestDist = d; }
      }
      const tip = tooltipRef.current;
      if (tip && best) {
        tip.innerHTML = `<strong style="color:${best.type === 'outfall' ? '#ef4444' : best.type === 'storage' ? '#fb923c' : '#38bdf8'}">${best.name}</strong> (${best.type})<br/>Elev: ${best.elev.toFixed(2)}`;
        tip.style.display = "block";
        tip.style.left = (e.clientX - rect.left + 12) + "px";
        tip.style.top = (e.clientY - rect.top - 10) + "px";
      } else if (tip) {
        tip.style.display = "none";
      }
    };
    const onMouseUp = () => { viewRef.current.dragging = false; canvas.style.cursor = "grab"; };
    const onMouseLeave = () => { viewRef.current.dragging = false; canvas.style.cursor = "grab"; if (tooltipRef.current) tooltipRef.current.style.display = "none"; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      viewRef.current.scale *= e.deltaY < 0 ? 1.12 : 0.89;
      viewRef.current.scale = Math.max(0.1, Math.min(20, viewRef.current.scale));
      draw();
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [netInfo, draw]);

  const nodeCount = Object.keys(netInfo.nodes).length;
  const juncCount = Object.values(netInfo.nodes).filter(n => n.type === 'junction').length;
  const outCount = Object.values(netInfo.nodes).filter(n => n.type === 'outfall').length;

  return (
    <div data-testid="viewer-network">
      <div className="flex gap-2.5 mb-3 flex-wrap text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#38bdf8" }} /> Junction</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} /> Outfall</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#fb923c" }} /> Storage</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#818cf8" }} /> Pump link</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] rounded-sm" style={{ background: "#34d399" }} /> Conduit</span>
      </div>
      <div className="relative rounded-lg border border-border bg-[#f5f7fa] dark:bg-[#080c14]">
        <canvas ref={canvasRef} width={900} height={500} className="w-full block cursor-grab" data-testid="canvas-viewer-network" />
        <div ref={tooltipRef} className="hidden absolute pointer-events-none rounded-md border border-border/50 px-2.5 py-1.5 font-mono text-[11px] text-foreground z-10 bg-white/95 dark:bg-[#0a0e17]/95 backdrop-blur-lg" />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-[11px] text-muted-foreground font-mono" data-testid="text-viewer-network-stats">
          {juncCount} junctions | {outCount} outfalls | {netInfo.links.length} links | {nodeCount} total nodes
        </span>
        <div className="flex gap-1.5">
          <button onClick={() => { viewRef.current.scale *= 1.2; viewRef.current.scale = Math.min(20, viewRef.current.scale); draw(); }}
            className="w-7 h-7 rounded-md border border-border bg-card text-foreground text-sm grid place-items-center transition-colors hover:border-primary hover:text-primary"
            data-testid="button-viewer-zoom-in">+</button>
          <button onClick={() => { viewRef.current.scale *= 0.8; viewRef.current.scale = Math.max(0.1, viewRef.current.scale); draw(); }}
            className="w-7 h-7 rounded-md border border-border bg-card text-foreground text-sm grid place-items-center transition-colors hover:border-primary hover:text-primary"
            data-testid="button-viewer-zoom-out">-</button>
          <button onClick={() => { viewRef.current = { ox: 0, oy: 0, scale: 1, dragging: false, lx: 0, ly: 0 }; draw(); }}
            className="w-7 h-7 rounded-md border border-border bg-card text-foreground text-sm grid place-items-center transition-colors hover:border-primary hover:text-primary"
            data-testid="button-viewer-zoom-reset">&#8634;</button>
        </div>
      </div>
    </div>
  );
}

function ViewerProfileCanvas({ parsed }: { parsed: ParsedInpFile }) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const profiles = useMemo(() => buildProfilesFromParsed(parsed), [parsed]);
  const profile = profiles[selectedIdx] || profiles[0];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !profile || profile.nodes.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#0a0e1a" : "#f5f7fa";
    ctx.fillRect(0, 0, W, H);

    const { nodes, conduits } = profile;
    const maxStation = nodes[nodes.length - 1].station;
    let minElev = Infinity, maxElev = -Infinity;
    for (const n of nodes) {
      if (n.invertElev < minElev) minElev = n.invertElev;
      if (n.crownElev > maxElev) maxElev = n.crownElev;
    }
    for (const c of conduits) {
      if (c.fromInvert < minElev) minElev = c.fromInvert;
      if (c.toInvert < minElev) minElev = c.toInvert;
      if (c.fromCrown > maxElev) maxElev = c.fromCrown;
      if (c.toCrown > maxElev) maxElev = c.toCrown;
    }
    const elevPad = (maxElev - minElev) * 0.15 || 1;
    minElev -= elevPad; maxElev += elevPad;

    const ml = 70, mr = 30, mt = 30, mb = 50;
    const plotW = W - ml - mr, plotH = H - mt - mb;
    const xScale = (s: number) => ml + (s / maxStation) * plotW;
    const yScale = (e: number) => mt + plotH - ((e - minElev) / (maxElev - minElev)) * plotH;

    ctx.strokeStyle = isDark ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.15)";
    ctx.lineWidth = 0.5;
    const nGridY = 8;
    const elevStep = (maxElev - minElev) / nGridY;
    ctx.fillStyle = isDark ? "rgba(148,163,184,0.5)" : "rgba(30,41,59,0.6)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let i = 0; i <= nGridY; i++) {
      const elev = minElev + i * elevStep;
      const y = yScale(elev);
      ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(W - mr, y); ctx.stroke();
      ctx.fillText(elev.toFixed(1), ml - 8, y);
    }
    const nGridX = Math.min(10, nodes.length);
    const stationStep = maxStation / nGridX;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let i = 0; i <= nGridX; i++) {
      const s = i * stationStep;
      const x = xScale(s);
      ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + plotH); ctx.stroke();
      ctx.fillText(s.toFixed(0), x, mt + plotH + 6);
    }

    ctx.fillStyle = isDark ? "rgba(148,163,184,0.7)" : "rgba(30,41,59,0.7)";
    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Station", ml + plotW / 2, H - 8);
    ctx.save();
    ctx.translate(14, mt + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Elevation", 0, 0);
    ctx.restore();

    ctx.strokeStyle = isDark ? "rgba(56,189,248,0.2)" : "rgba(56,189,248,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ml, mt, plotW, plotH);

    for (const c of conduits) {
      const x1 = xScale(c.fromStation), x2 = xScale(c.toStation);
      ctx.fillStyle = "rgba(52,211,153,0.08)";
      ctx.beginPath();
      ctx.moveTo(x1, yScale(c.fromCrown));
      ctx.lineTo(x2, yScale(c.toCrown));
      ctx.lineTo(x2, yScale(c.toInvert));
      ctx.lineTo(x1, yScale(c.fromInvert));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, yScale(c.fromCrown)); ctx.lineTo(x2, yScale(c.toCrown)); ctx.stroke();
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1, yScale(c.fromInvert)); ctx.lineTo(x2, yScale(c.toInvert)); ctx.stroke();
      if (x2 - x1 > 40) {
        ctx.fillStyle = "rgba(148,163,184,0.5)";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(`${c.diameter.toFixed(2)}`, (x1 + x2) / 2, (yScale(c.fromInvert) + yScale(c.toInvert)) / 2 - 3);
      }
    }

    for (const n of nodes) {
      const x = xScale(n.station);
      const yInv = yScale(n.invertElev), yCrown = yScale(n.crownElev);
      ctx.strokeStyle = "rgba(148,163,184,0.15)"; ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, yCrown); ctx.lineTo(x, yInv); ctx.stroke();
      ctx.setLineDash([]);
      if (n.type === "outfall") {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.moveTo(x - 6, yInv); ctx.lineTo(x + 6, yInv); ctx.lineTo(x, yInv + 8); ctx.closePath(); ctx.fill();
      } else if (n.type === "storage") {
        ctx.fillStyle = "#fb923c"; ctx.fillRect(x - 4, yInv - 4, 8, 8);
      } else {
        ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(x, yInv, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#818cf8"; ctx.beginPath(); ctx.arc(x, yCrown, 2, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = "#38bdf8"; ctx.font = "bold 11px 'DM Sans', sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(`Profile: ${profile.outfallName} → upstream (${nodes.length} nodes, ${conduits.length} conduits)`, ml + 8, mt + 6);

    const legendY = mt + 22;
    const items = [
      { color: "#38bdf8", label: "Invert", shape: "line" as const },
      { color: "#34d399", label: "Crown", shape: "line" as const },
      { color: "#ef4444", label: "Outfall", shape: "tri" as const },
      { color: "#38bdf8", label: "Junction", shape: "circle" as const },
    ];
    let lx = ml + 8;
    ctx.font = "9px 'DM Sans', sans-serif";
    for (const item of items) {
      if (item.shape === "line") {
        ctx.strokeStyle = item.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx, legendY + 5); ctx.lineTo(lx + 14, legendY + 5); ctx.stroke();
      } else if (item.shape === "circle") {
        ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(lx + 7, legendY + 5, 3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = item.color; ctx.beginPath(); ctx.moveTo(lx + 2, legendY + 2); ctx.lineTo(lx + 12, legendY + 2); ctx.lineTo(lx + 7, legendY + 9); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(item.label, lx + 18, legendY + 5);
      lx += ctx.measureText(item.label).width + 30;
    }
  }, [profile, theme]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { const h = () => draw(); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip || !profile || profile.nodes.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const { nodes } = profile;
    const maxStation = nodes[nodes.length - 1].station;
    const W = rect.width;
    const ml = 70, mr = 30, plotW = W - ml - mr;
    const xScale = (s: number) => ml + (s / maxStation) * plotW;
    let closest: InpProfileNode | null = null, closestDist = Infinity;
    for (const n of nodes) {
      const d = Math.abs(mx - xScale(n.station));
      if (d < closestDist && d < 30) { closestDist = d; closest = n; }
    }
    if (closest) {
      tooltip.style.display = "block";
      tooltip.style.left = `${Math.min(mx + 12, W - 160)}px`;
      tooltip.style.top = `${Math.max(e.clientY - rect.top - 60, 5)}px`;
      tooltip.innerHTML = `<div style="font-weight:600;color:#38bdf8;margin-bottom:3px">${closest.name} (${closest.type})</div><div>Invert: <span style="color:#38bdf8">${closest.invertElev.toFixed(3)}</span></div><div>Crown: <span style="color:#34d399">${closest.crownElev.toFixed(3)}</span></div><div>Depth: <span style="color:#818cf8">${closest.maxDepth.toFixed(2)}</span></div><div>Station: <span style="color:#fb923c">${closest.station.toFixed(1)}</span></div>`;
    } else {
      tooltip.style.display = "none";
    }
  }, [profile]);

  if (profiles.length === 0) return <div className="text-sm text-muted-foreground p-4">No outfall-to-upstream path found. Requires [JUNCTIONS], [OUTFALLS], [CONDUITS], and elevation data.</div>;

  return (
    <div data-testid="viewer-profile">
      {profiles.length > 1 && (
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs font-semibold text-muted-foreground">Outfall Profile</label>
          <Select value={String(selectedIdx)} onValueChange={(v) => setSelectedIdx(parseInt(v))}>
            <SelectTrigger className="w-[260px]" data-testid="select-viewer-profile">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p, i) => (
                <SelectItem key={i} value={String(i)}>{p.outfallName} ({p.nodes.length} nodes)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="relative rounded-lg overflow-hidden border border-border bg-[#f5f7fa] dark:bg-[#0a0e1a]">
        <canvas ref={canvasRef} className="w-full" style={{ height: 340 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { if (tooltipRef.current) tooltipRef.current.style.display = "none"; }}
          data-testid="canvas-viewer-profile" />
        <div ref={tooltipRef} className="absolute pointer-events-none hidden rounded-lg border px-3 py-2 text-[11px] leading-snug font-mono z-20 text-[#334155] dark:text-[#94a3b8] bg-white/95 dark:bg-[#0a0e1a]/95 border-[rgba(56,189,248,0.3)] backdrop-blur-lg" />
      </div>
    </div>
  );
}

const PAGE_SIZE = 50;

interface InpViewerProps {
  initialInp?: { text: string; name: string } | null;
  onConsumeInitial?: () => void;
}

export default function InpViewer({ initialInp, onConsumeInitial }: InpViewerProps) {
  const [parsed, setParsed] = useState<ParsedInpFile | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "stats" | "chart" | "network" | "profile">("table");
  const [chartCol, setChartCol] = useState<number>(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [viewerValidation, setViewerValidation] = useState<ValidationResult | null>(null);
  const [rawInpText, setRawInpText] = useState<string>("");
  const [showTransform, setShowTransform] = useState(false);
  const [transformCfg, setTransformCfg] = useState<TransformConfig>({ ...DEFAULT_TRANSFORM });
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadText = useCallback((text: string, name: string) => {
    const result = parseInpFile(text, name);
    setParsed(result);
    setSelectedSection(result.sections.length > 0 ? result.sections[0].name : "");
    setPage(0);
    setSortCol(null);
    setSearchTerm("");
    setExpandedCats(new Set(Object.keys(SECTION_CATEGORIES)));
    setRawInpText(text);
    const v = validateInp(text, true);
    setViewerValidation(v);
  }, []);

  useEffect(() => {
    if (initialInp) {
      loadText(initialInp.text, initialInp.name);
      onConsumeInitial?.();
    }
  }, [initialInp, loadText, onConsumeInitial]);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(inp|txt)$/i)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      loadText(text, file.name);
    };
    reader.readAsText(file);
  }, [loadText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const section = useMemo(() => {
    if (!parsed) return null;
    return parsed.sections.find(s => s.name === selectedSection) || null;
  }, [parsed, selectedSection]);

  const filteredRows = useMemo(() => {
    if (!section) return [];
    let rows = section.rows;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      rows = rows.filter(r => r.some(c => c.toLowerCase().includes(lower)));
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const va = sortCol < a.length ? a[sortCol] : "";
        const vb = sortCol < b.length ? b[sortCol] : "";
        const na = parseFloat(va);
        const nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return rows;
  }, [section, searchTerm, sortCol, sortAsc]);

  const stats = useMemo(() => section ? computeSectionStats(section) : [], [section]);
  const numericCols = useMemo(() => section ? getNumericColumns(section) : [], [section]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const groupedSections = useMemo(() => {
    if (!parsed) return {};
    const groups: Record<string, ParsedSection[]> = {};
    for (const s of parsed.sections) {
      const cat = categorizeSection(s.name);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [parsed]);

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  if (!parsed) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-serif font-bold text-foreground mb-2">INP File Viewer</h2>
          <p className="text-sm text-muted-foreground mb-6">Upload an EPA SWMM5 .inp file to explore its sections, data, and statistics</p>
        </div>
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/40 hover:bg-muted/20"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="drop-zone"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground mb-1">Drop .inp file here or click to browse</p>
          <p className="text-sm text-muted-foreground">Supports .inp and .txt files up to 200MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".inp,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            data-testid="input-file"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: Table2, title: "Data Tables", desc: "Browse all parsed sections with sortable columns, search, and pagination" },
            { icon: BarChart3, title: "Statistics", desc: "Descriptive stats for every numeric column — min, max, mean, median, std dev" },
            { icon: Search, title: "Histograms", desc: "Visual distribution plots for any numeric column in any section" },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="p-4 border-border">
              <Icon className="w-6 h-6 text-primary mb-2" />
              <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground" data-testid="text-filename">{parsed.filename}</span>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(parsed.sizeBytes)} &middot; {parsed.lineCount.toLocaleString()} lines &middot; {parsed.sections.length} sections &middot; {parsed.sections.reduce((a, s) => a + s.rows.length, 0).toLocaleString()} rows
          </span>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setParsed(null); setSelectedSection(""); }}
            data-testid="button-close-file"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (rawInpText) {
                const v = validateInp(rawInpText, true);
                setViewerValidation(v);
              }
            }}
            data-testid="button-validate-viewer"
          >
            <Shield className="w-3.5 h-3.5 mr-1" /> Re-validate
          </Button>
          <Button
            variant={showTransform ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTransform(!showTransform)}
            data-testid="button-transform"
          >
            <Shuffle className="w-3.5 h-3.5 mr-1" /> Transform
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-open-another"
          >
            <Upload className="w-3.5 h-3.5 mr-1" /> Open Another
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".inp,.txt"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      </div>

      {viewerValidation && (
        <ValidationPanelComponent result={viewerValidation} />
      )}

      {showTransform && (
        <Card className="border-border bg-card p-4 space-y-4" data-testid="panel-transform">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">INP Transformer</h3>
            <span className="text-xs text-muted-foreground ml-1">Rename elements and distort geometry to anonymize a model</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Shuffle className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Rename Elements</span>
                <Switch
                  checked={transformCfg.renameElements}
                  onCheckedChange={(v) => setTransformCfg(c => ({ ...c, renameElements: v }))}
                  data-testid="switch-rename"
                />
              </div>
              {transformCfg.renameElements && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Name Prefix</Label>
                    <Input
                      value={transformCfg.prefix}
                      onChange={(e) => setTransformCfg(c => ({ ...c, prefix: e.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 8) }))}
                      className="h-7 text-xs font-mono mt-0.5"
                      placeholder="N"
                      data-testid="input-prefix"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Jitter Seed (reproducible noise)</Label>
                    <Input
                      type="number"
                      value={transformCfg.scrambleSeed}
                      onChange={(e) => setTransformCfg(c => ({ ...c, scrambleSeed: parseInt(e.target.value) || 1 }))}
                      className="h-7 text-xs font-mono mt-0.5"
                      data-testid="input-seed"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Move className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Distort Coordinates</span>
                <Switch
                  checked={transformCfg.distortCoordinates}
                  onCheckedChange={(v) => setTransformCfg(c => ({ ...c, distortCoordinates: v }))}
                  data-testid="switch-distort-coords"
                />
              </div>
              {transformCfg.distortCoordinates && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Rotation ({transformCfg.rotation}deg)</Label>
                    <Slider
                      value={[transformCfg.rotation]}
                      onValueChange={([v]) => setTransformCfg(c => ({ ...c, rotation: v }))}
                      min={0} max={360} step={5}
                      className="mt-1"
                      data-testid="slider-rotation"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Scale ({transformCfg.scale.toFixed(2)}x)</Label>
                    <Slider
                      value={[transformCfg.scale]}
                      onValueChange={([v]) => setTransformCfg(c => ({ ...c, scale: v }))}
                      min={0.1} max={5.0} step={0.1}
                      className="mt-1"
                      data-testid="slider-scale"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Translate X</Label>
                      <Input
                        type="number"
                        value={transformCfg.translateX}
                        onChange={(e) => setTransformCfg(c => ({ ...c, translateX: parseFloat(e.target.value) || 0 }))}
                        className="h-7 text-xs font-mono mt-0.5"
                        data-testid="input-translate-x"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Translate Y</Label>
                      <Input
                        type="number"
                        value={transformCfg.translateY}
                        onChange={(e) => setTransformCfg(c => ({ ...c, translateY: parseFloat(e.target.value) || 0 }))}
                        className="h-7 text-xs font-mono mt-0.5"
                        data-testid="input-translate-y"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Mirror</Label>
                    <Select value={transformCfg.mirror} onValueChange={(v) => setTransformCfg(c => ({ ...c, mirror: v as TransformConfig['mirror'] }))}>
                      <SelectTrigger className="h-7 text-xs mt-0.5" data-testid="select-mirror">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="x">Flip X</SelectItem>
                        <SelectItem value="y">Flip Y</SelectItem>
                        <SelectItem value="both">Flip Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Coordinate Jitter ({transformCfg.jitterCoords})</Label>
                    <Slider
                      value={[transformCfg.jitterCoords]}
                      onValueChange={([v]) => setTransformCfg(c => ({ ...c, jitterCoords: v }))}
                      min={0} max={100} step={1}
                      className="mt-1"
                      data-testid="slider-jitter-coords"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <MountainSnow className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Distort Elevations</span>
                <Switch
                  checked={transformCfg.distortElevations}
                  onCheckedChange={(v) => setTransformCfg(c => ({ ...c, distortElevations: v }))}
                  data-testid="switch-distort-elevations"
                />
              </div>
              {transformCfg.distortElevations && (
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Offset ({transformCfg.elevationOffset} ft)</Label>
                    <Slider
                      value={[transformCfg.elevationOffset]}
                      onValueChange={([v]) => setTransformCfg(c => ({ ...c, elevationOffset: v }))}
                      min={-500} max={500} step={10}
                      className="mt-1"
                      data-testid="slider-elev-offset"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Scale Factor ({transformCfg.elevationScale.toFixed(2)}x)</Label>
                    <Slider
                      value={[transformCfg.elevationScale]}
                      onValueChange={([v]) => setTransformCfg(c => ({ ...c, elevationScale: v }))}
                      min={0.5} max={2.0} step={0.05}
                      className="mt-1"
                      data-testid="slider-elev-scale"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Elevation Jitter ({transformCfg.jitterElevation} ft)</Label>
                    <Slider
                      value={[transformCfg.jitterElevation]}
                      onValueChange={([v]) => setTransformCfg(c => ({ ...c, jitterElevation: v }))}
                      min={0} max={10} step={0.5}
                      className="mt-1"
                      data-testid="slider-jitter-elev"
                    />
                  </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Ruler className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Distort Dimensions</span>
                <Switch
                  checked={transformCfg.distortDimensions}
                  onCheckedChange={(v) => setTransformCfg(c => ({ ...c, distortDimensions: v }))}
                  data-testid="switch-distort-dimensions"
                />
              </div>
              {transformCfg.distortDimensions && (
                <div>
                  <Label className="text-[10px] text-muted-foreground">Dimension Scale ({transformCfg.dimensionScale.toFixed(2)}x)</Label>
                  <Slider
                    value={[transformCfg.dimensionScale]}
                    onValueChange={([v]) => setTransformCfg(c => ({ ...c, dimensionScale: v }))}
                    min={0.5} max={3.0} step={0.1}
                    className="mt-1"
                    data-testid="slider-dim-scale"
                  />
                </div>
              )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button
              size="sm"
              onClick={() => {
                if (!rawInpText) return;
                const result = transformInp(rawInpText, transformCfg);
                setTransformResult(result);
              }}
              data-testid="button-apply-transform"
            >
              <Shuffle className="w-3.5 h-3.5 mr-1" /> Apply Transform
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransformCfg({ ...DEFAULT_TRANSFORM })}
              data-testid="button-reset-transform"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            {transformResult && (
              <>
                <span className="text-xs text-muted-foreground">
                  Renamed: {transformResult.stats.nodesRenamed} nodes, {transformResult.stats.linksRenamed} links, {transformResult.stats.subcatchRenamed} subcatchments
                  {transformResult.stats.coordsTransformed > 0 && ` | ${transformResult.stats.coordsTransformed} coords transformed`}
                  {transformResult.stats.elevationsTransformed > 0 && ` | ${transformResult.stats.elevationsTransformed} elevations transformed`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadText(transformResult.inp, `transformed_${parsed?.filename || 'model.inp'}`);
                    setTransformResult(null);
                    setShowTransform(false);
                  }}
                  data-testid="button-load-transformed"
                >
                  Load into Viewer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([transformResult.inp], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `transformed_${parsed?.filename || 'model.inp'}`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="button-download-transformed"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = Object.entries(transformResult.nameMap).map(([o, n]) => `${o},${n}`).join('\n');
                    const blob = new Blob([`Original,Transformed\n${csv}`], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'name_mapping.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  data-testid="button-download-namemap"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Name Map (CSV)
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={viewMode === "network" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode(viewMode === "network" ? "table" : "network")}
          className="text-xs"
          data-testid="button-view-network"
        >
          <Network className="w-3.5 h-3.5 mr-1" /> Network Map
        </Button>
        <Button
          variant={viewMode === "profile" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode(viewMode === "profile" ? "table" : "profile")}
          className="text-xs"
          data-testid="button-view-profile"
        >
          <TrendingDown className="w-3.5 h-3.5 mr-1" /> Profile / HGL
        </Button>
      </div>

      {viewMode === "network" && (
        <Card className="border-border bg-card p-4">
          <ViewerNetworkCanvas parsed={parsed} />
        </Card>
      )}

      {viewMode === "profile" && (
        <Card className="border-border bg-card p-4">
          <ViewerProfileCanvas parsed={parsed} />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
        <Card className="border-border bg-card overflow-hidden lg:sticky lg:top-6">
          <div className="px-4 py-2.5 border-b border-border text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Sections
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {Object.entries(groupedSections).map(([cat, secs]) => (
              <div key={cat}>
                <button
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/30 transition-colors"
                  onClick={() => toggleCat(cat)}
                >
                  {expandedCats.has(cat) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {cat}
                  <span className="ml-auto text-[10px] font-mono opacity-60">{secs.length}</span>
                </button>
                {expandedCats.has(cat) && secs.map(s => (
                  <button
                    key={s.name}
                    className={`w-full text-left px-4 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                      selectedSection === s.name
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-foreground hover:bg-muted/20 border-l-2 border-transparent"
                    }`}
                    onClick={() => { setSelectedSection(s.name); setPage(0); setSortCol(null); setSearchTerm(""); setViewMode("table"); }}
                    data-testid={`button-section-${s.name}`}
                  >
                    <span className="text-[11px]">{SECTION_ICONS[s.name] || "📋"}</span>
                    {s.name}
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground">{s.rows.length}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-3">
          {section && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2" data-testid="text-section-name">
                  <span>{SECTION_ICONS[section.name] || "📋"}</span>
                  [{section.name}]
                  <span className="text-xs font-mono text-muted-foreground">({section.rows.length} rows × {section.headers.length} cols)</span>
                </h3>
                <div className="flex gap-1.5 ml-auto">
                  {(["table", "stats", "chart"] as const).map(m => (
                    <Button
                      key={m}
                      variant={viewMode === m ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setViewMode(m);
                        if (m === "chart" && numericCols.length > 0) setChartCol(numericCols[0].index);
                      }}
                      className="text-xs capitalize"
                      data-testid={`button-view-${m}`}
                    >
                      {m === "table" && <Table2 className="w-3.5 h-3.5 mr-1" />}
                      {m === "stats" && <Hash className="w-3.5 h-3.5 mr-1" />}
                      {m === "chart" && <BarChart3 className="w-3.5 h-3.5 mr-1" />}
                      {m}
                    </Button>
                  ))}
                </div>
              </div>

              {viewMode === "table" && (
                <Card className="border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search rows..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                      className="h-7 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-0"
                      data-testid="input-search"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm("")} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto whitespace-nowrap">
                      {filteredRows.length} rows
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" data-testid="table-data">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="p-2 text-center text-muted-foreground font-mono w-10">#</th>
                          {section.headers.map((h, i) => (
                            <th
                              key={i}
                              className="p-2 text-left text-muted-foreground font-semibold cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap"
                              onClick={() => { if (sortCol === i) setSortAsc(!sortAsc); else { setSortCol(i); setSortAsc(true); } }}
                            >
                              <span className="flex items-center gap-1">
                                {h}
                                {sortCol === i && <ArrowUpDown className="w-3 h-3 text-primary" />}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, ri) => (
                          <tr key={ri} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="p-2 text-center text-muted-foreground font-mono text-[10px]">{page * PAGE_SIZE + ri + 1}</td>
                            {section.headers.map((_, ci) => (
                              <td key={ci} className="p-2 text-foreground font-mono whitespace-nowrap">
                                {ci < row.length ? row[ci] : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
                      <span>Page {page + 1} of {totalPages}</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)} className="h-6 text-[10px] px-2" data-testid="button-page-first">First</Button>
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-6 text-[10px] px-2" data-testid="button-page-prev">Prev</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-6 text-[10px] px-2" data-testid="button-page-next">Next</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className="h-6 text-[10px] px-2" data-testid="button-page-last">Last</Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {viewMode === "stats" && (
                <Card className="border-border bg-card p-4">
                  <StatsTable stats={stats} section={section} />
                </Card>
              )}

              {viewMode === "chart" && (
                <Card className="border-border bg-card p-4 space-y-4">
                  {numericCols.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No numeric columns available for charts.</div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground">Column:</span>
                        <Select value={String(chartCol)} onValueChange={(v) => setChartCol(Number(v))}>
                          <SelectTrigger className="h-8 text-xs w-48" data-testid="select-chart-column">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {numericCols.map(c => (
                              <SelectItem key={c.index} value={String(c.index)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FullHistogram section={section} colIdx={chartCol} />
                    </>
                  )}
                </Card>
              )}

              {section.comments.length > 0 && (
                <Card className="border-border bg-card p-3">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest mb-2">Section Comments</div>
                  <div className="text-xs text-muted-foreground font-mono space-y-0.5 max-h-24 overflow-y-auto">
                    {section.comments.map((c, i) => <div key={i}>;; {c}</div>)}
                  </div>
                </Card>
              )}
            </>
          )}

          {!section && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Select a section from the sidebar to explore its data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
