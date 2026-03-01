import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Upload, FileText, Table2, BarChart3, Search, X, ChevronDown, ChevronRight, Hash, Type, ArrowUpDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type ParsedInpFile, type ParsedSection, type SectionStats,
  parseInpFile, computeSectionStats, getNumericColumns, formatFileSize,
} from "@/lib/inp-parser";

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
  const [viewMode, setViewMode] = useState<"table" | "stats" | "chart">("table");
  const [chartCol, setChartCol] = useState<number>(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadText = useCallback((text: string, name: string) => {
    const result = parseInpFile(text, name);
    setParsed(result);
    setSelectedSection(result.sections.length > 0 ? result.sections[0].name : "");
    setPage(0);
    setSortCol(null);
    setSearchTerm("");
    setExpandedCats(new Set(Object.keys(SECTION_CATEGORIES)));
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
