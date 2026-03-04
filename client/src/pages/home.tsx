import { useState, useMemo, useCallback } from "react";
import { Download, Copy, Check, ChevronDown, Loader2, Sun, Moon, Palette, HelpCircle, FileSearch, Shield, BookOpen, Code, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import NetworkCanvas from "@/components/network-canvas";
import ProfileCanvas from "@/components/profile-canvas";
import InpViewer from "@/components/inp-viewer";
import Onboarding, { useOnboarding } from "@/components/onboarding";
import { useTheme, THEME_LABELS, type Theme } from "@/components/theme-provider";
import ValidationPanel from "@/components/validation-panel";
import { validateInp, type ValidationResult } from "@/lib/inp-validator";
import {
  type SwmmConfig, type ModelType, type TerrainType, type DetailLevel, type LandUseType,
  type DiscretizationMethod, type InfiltrationMethod, type RainfallDistribution,
  type GenerationMethod, type LSystemVariant, type GeneratedModel,
  compute, getSections, estimateSize, generateModel, fmt, pct,
  RATIOS, FLOW_UNITS, OFFSET, SHAPES, PIPE_INCHES, PIPE_WEIGHTS,
  ALL_SECTIONS, TERRAIN_LABELS, MODEL_TYPE_LABELS,
  OFFSET_COLORS, OFFSET_LABELS, SHAPE_COLORS,
  EXAMPLE_PRESETS, SWMM5_REAL_STATS, DEFAULT_RESWMM, DEFAULT_HYDROLOGY,
  DWF_PATTERN_OPTIONS, RAINFALL_DIST_LABELS, INFILTRATION_LABELS,
  GENERATION_METHOD_LABELS, L_SYSTEM_VARIANT_LABELS,
  RAIN_CANVAS_CATALOG,
} from "@/lib/swmm-engine";

const ELEM_CARDS_META = [
  { key: "junctions", label: "Junctions", cls: "bg-chart-1", max: 50000 },
  { key: "conduits", label: "Conduits", cls: "bg-chart-2", max: 55000 },
  { key: "subcatchments", label: "Subcatchments", cls: "bg-chart-3", max: 50000 },
  { key: "outfalls", label: "Outfalls", cls: "bg-chart-4", max: 250 },
  { key: "storage", label: "Storage", cls: "bg-chart-5", max: 4000 },
  { key: "pumps", label: "Pumps", cls: "bg-destructive", max: 2000 },
  { key: "orifices", label: "Orifices", cls: "bg-chart-4", max: 1500 },
  { key: "weirs", label: "Weirs", cls: "bg-chart-5", max: 250 },
] as const;

function ToggleGroup({ options, value, onChange, testId }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void; testId: string }) {
  return (
    <div className="flex gap-1.5" data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.value}
          data-testid={`toggle-${testId}-${o.value}`}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 px-1 rounded-md border text-xs font-medium text-center transition-all ${
            value === o.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { showOnboarding, dismissOnboarding, resetOnboarding } = useOnboarding();
  const [config, setConfig] = useState<SwmmConfig>({
    N: 1000, type: "sanitary", units: "US", terrain: "moderate",
    detail: "moderate", landUse: "mixed", outfallElev: 0,
    reswmm: { ...DEFAULT_RESWMM },
    ...DEFAULT_HYDROLOGY,
  });
  const [generating, setGenerating] = useState(false);
  const [reswmmDescOpen, setReswmmDescOpen] = useState(false);
  const [result, setResult] = useState<GeneratedModel | null>(null);
  const [resultConfig, setResultConfig] = useState<SwmmConfig | null>(null);
  const [allMethodResults, setAllMethodResults] = useState<{ method: string; label: string; model: GeneratedModel }[] | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");
  const [viewerInpText, setViewerInpText] = useState<{ text: string; name: string } | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const elements = useMemo(() => compute(config), [config]);
  const sections = useMemo(() => getSections(elements, config), [elements, config]);
  const flowUnit = FLOW_UNITS[config.units][config.type];
  const off = OFFSET[config.detail];
  const shapes = SHAPES[config.type];
  const estSize = estimateSize(elements);
  const unitLabel = config.units === "SI" ? "m" : "ft";
  const maxPipeW = Math.max(...PIPE_WEIGHTS);
  const totalPipeW = PIPE_WEIGHTS.reduce((a, b) => a + b, 0);

  const update = useCallback((partial: Partial<SwmmConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  const updateReswmm = useCallback((partial: Partial<SwmmConfig['reswmm']>) => {
    setConfig(prev => ({ ...prev, reswmm: { ...prev.reswmm, ...partial } }));
  }, []);

  const ALL_METHODS: { method: GenerationMethod; label: string; variant?: LSystemVariant }[] = [
    { method: 'force_directed', label: 'Force-Directed (Barnes-Hut)' },
    { method: 'horton_strahler', label: 'Horton-Strahler' },
    { method: 'l_system', label: 'L-System (Dendritic)', variant: 'dendritic' },
    { method: 'l_system', label: 'L-System (Grid)', variant: 'grid' },
    { method: 'l_system', label: 'L-System (Radial)', variant: 'radial' },
    { method: 'space_colonization', label: 'Space Colonization' },
    { method: 'mst', label: 'Minimum Spanning Tree' },
  ];

  const handleGenerateAll = useCallback(() => {
    setGeneratingAll(true);
    setAllMethodResults(null);
    setTimeout(() => {
      const results: { method: string; label: string; model: GeneratedModel }[] = [];
      for (const m of ALL_METHODS) {
        try {
          const cfg = { ...config, generationMethod: m.method, lSystemVariant: m.variant || config.lSystemVariant };
          const model = generateModel(cfg);
          results.push({ method: m.method + (m.variant ? `_${m.variant}` : ''), label: m.label, model });
        } catch {
          // skip failed methods
        }
      }
      setAllMethodResults(results);
      toast({ title: "All methods generated", description: `${results.length} of ${ALL_METHODS.length} methods succeeded` });
      setGeneratingAll(false);
    }, 50);
  }, [config, toast]);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setValidation(null);
    setTimeout(() => {
      try {
        const model = generateModel(config);
        setResult(model);
        setResultConfig({ ...config });
        const vResult = validateInp(model.inpText, true);
        setValidation(vResult);
        const desc = vResult.valid
          ? `${fmt(model.stats.totalElements)} elements, ${model.stats.fileSize} — all checks passed`
          : `${fmt(model.stats.totalElements)} elements — ${vResult.errors.length} errors, ${vResult.warnings.length} warnings`;
        toast({ title: "Model generated", description: desc });
      } catch (err: unknown) {
        toast({ title: "Generation failed", description: (err as Error).message, variant: "destructive" });
      } finally {
        setGenerating(false);
      }
    }, 50);
  }, [config, toast]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.inpText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.stats.fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }, [result]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inpText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Use Download instead", variant: "destructive" });
    }
  }, [result, toast]);

  const handleDownloadFixed = useCallback(() => {
    if (!validation?.fixedInp || !result) return;
    const blob = new Blob([validation.fixedInp], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.stats.fileName.replace(".inp", "_fixed.inp");
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }, [validation, result]);

  const handleDownloadReport = useCallback(() => {
    if (!result || !resultConfig) return;
    const s = result.stats;
    const c = resultConfig;
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
    const lines: string[] = [];
    lines.push(`# SWMM5 INP MAKER — Generation Report`);
    lines.push('');
    lines.push(`**Generated:** ${timestamp}`);
    lines.push(`**File:** ${s.fileName}`);
    lines.push(`**Size:** ${s.fileSize} | ${fmt(s.lineCount)} lines`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Configuration Summary');
    lines.push('');
    lines.push(`| Parameter | Value |`);
    lines.push(`|-----------|-------|`);
    lines.push(`| Model Type | ${MODEL_TYPE_LABELS[c.type] || c.type} |`);
    lines.push(`| Units | ${c.units === 'US' ? 'US Customary' : 'SI Metric'} |`);
    lines.push(`| Flow Units | ${FLOW_UNITS[c.units][c.type]} |`);
    lines.push(`| Terrain | ${c.terrain} (${TERRAIN_LABELS[c.terrain]}) |`);
    lines.push(`| Detail Level | ${c.detail} |`);
    lines.push(`| Land Use | ${c.landUse} |`);
    lines.push(`| Outfall Elevation | ${c.outfallElev} ${c.units === 'SI' ? 'm' : 'ft'} |`);
    lines.push(`| Generation Method | ${GENERATION_METHOD_LABELS[c.generationMethod] || c.generationMethod || 'force_directed'} |`);
    if (c.generationMethod === 'l_system') {
      lines.push(`| L-System Variant | ${L_SYSTEM_VARIANT_LABELS[c.lSystemVariant] || c.lSystemVariant} |`);
    }
    lines.push(`| Infiltration | ${INFILTRATION_LABELS[c.infiltrationMethod] || c.infiltrationMethod} |`);
    lines.push(`| DWF Node Coverage | ${c.dwfNodePct}% |`);
    lines.push(`| DWF Patterns | ${c.dwfPatterns.join(', ')} |`);
    lines.push(`| Rainfall Depth | ${c.rainfallDepth} ${c.units === 'SI' ? 'mm' : 'in'} |`);
    lines.push(`| Rainfall Duration | ${c.rainfallDuration} hr |`);
    lines.push(`| Aquifers | ${c.enableAquifers ? 'Yes' : 'No'} |`);
    lines.push(`| Groundwater | ${c.enableGroundwater ? 'Yes' : 'No'} |`);
    lines.push('');
    lines.push('## Element Counts');
    lines.push('');
    lines.push(`| Element | Count |`);
    lines.push(`|---------|-------|`);
    lines.push(`| Junctions | ${fmt(s.junctions)} |`);
    lines.push(`| Conduits | ${fmt(s.conduits)} |`);
    lines.push(`| Subcatchments | ${fmt(s.subcatchments)} |`);
    lines.push(`| Outfalls | ${fmt(s.outfalls)} |`);
    lines.push(`| Storage | ${fmt(s.storage)} |`);
    lines.push(`| Pumps | ${fmt(s.pumps)} |`);
    lines.push(`| Orifices | ${fmt(s.orifices)} |`);
    lines.push(`| Weirs | ${fmt(s.weirs)} |`);
    lines.push(`| **Total** | **${fmt(s.totalElements)}** |`);
    lines.push('');
    lines.push('## Elevation & Depth Statistics');
    lines.push('');
    lines.push(`| Stat | Min | Max | Mean |`);
    lines.push(`|------|-----|-----|------|`);
    lines.push(`| Elevation (${s.unitLabel}) | ${s.elevMin.toFixed(2)} | ${s.elevMax.toFixed(2)} | ${s.elevMean.toFixed(2)} |`);
    lines.push(`| Max Depth (${s.unitLabel}) | ${s.depthMin.toFixed(2)} | ${s.depthMax.toFixed(2)} | ${s.depthMean.toFixed(2)} |`);
    lines.push('');
    lines.push('## Conduit Geometry Statistics');
    lines.push('');
    lines.push(`| Stat | Min | Max | Mean |`);
    lines.push(`|------|-----|-----|------|`);
    lines.push(`| Diameter (${s.diamLabel}) | ${s.diamMin.toFixed(2)} | ${s.diamMax.toFixed(2)} | ${s.diamMean.toFixed(2)} |`);
    lines.push(`| Length (${s.unitLabel}) | ${s.lenMin.toFixed(1)} | ${s.lenMax.toFixed(1)} | ${s.lenMean.toFixed(1)} |`);
    lines.push(`| Slope (%) | ${s.slopeMin.toFixed(3)} | ${s.slopeMax.toFixed(3)} | ${s.slopeMean.toFixed(3)} |`);
    lines.push('');
    lines.push('## Offset Patterns');
    lines.push('');
    lines.push(`| Pattern | Percentage |`);
    lines.push(`|---------|------------|`);
    lines.push(`| Both Zero | ${pct(s.bothZeroPct / 100)} |`);
    lines.push(`| Outlet Offset (Crown Match) | ${pct(s.outletOffset / s.conduits)} |`);
    lines.push(`| Inlet Offset (Drop) | ${pct(s.inletOffset / s.conduits)} |`);
    lines.push('');
    lines.push('## Cross-Section Distribution');
    lines.push('');
    if (s.shapeDistribution) {
      lines.push(`${s.shapeDistribution}`);
    }
    lines.push('');
    if (s.reswmmEnabled) {
      lines.push('## ReSWMM Discretization');
      lines.push('');
      lines.push(`| Parameter | Value |`);
      lines.push(`|-----------|-------|`);
      lines.push(`| Method | ${s.reswmmMethod} |`);
      lines.push(`| Original Conduits | ${fmt(s.reswmmOrigConduits)} |`);
      lines.push(`| New Conduits (after split) | ${fmt(s.reswmmNewConduits)} |`);
      lines.push(`| New Junctions (added) | ${fmt(s.reswmmNewJunctions)} |`);
      lines.push(`| MNSA | ${s.reswmmMNSA.toFixed(3)} |`);
      lines.push('');
    }
    lines.push('## File Metadata');
    lines.push('');
    lines.push(`- **File Name:** ${s.fileName}`);
    lines.push(`- **File Size:** ${s.fileSize}`);
    lines.push(`- **Line Count:** ${fmt(s.lineCount)}`);
    lines.push(`- **Total Elements:** ${fmt(s.totalElements)}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated by SWMM5 INP MAKER — Force-directed network synthesis with Barnes-Hut quadtree*');

    const reportText = lines.join('\n');
    const blob = new Blob([reportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = s.fileName.replace('.inp', '') + '_report.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }, [result, resultConfig]);

  const s = result?.stats;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(56,189,248,0.04) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(129,140,248,0.04) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 50% 50%, rgba(52,211,153,0.02) 0%, transparent 50%)"
      }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <header className="flex flex-col sm:flex-row sm:items-end gap-5 pb-6 mb-8 border-b-2" style={{ borderImage: "linear-gradient(90deg, #38bdf8, #818cf8, #34d399, transparent) 1" }}>
          <div className="w-20 h-20 rounded-2xl grid place-items-center flex-shrink-0" style={{
            background: theme === "uf" ? "linear-gradient(135deg, #FA4616, #0021A5)"
              : theme === "osu" ? "linear-gradient(135deg, #BB0000, #666)"
              : theme === "auburn" ? "linear-gradient(135deg, #DD550C, #0C2340)"
              : "linear-gradient(135deg, #38bdf8, #818cf8, #34d399)",
            boxShadow: theme === "uf" ? "0 6px 28px rgba(250,70,22,0.35)"
              : theme === "osu" ? "0 6px 28px rgba(187,0,0,0.35)"
              : theme === "auburn" ? "0 6px 28px rgba(221,85,12,0.35)"
              : "0 6px 28px rgba(56,189,248,0.35), 0 0 60px rgba(129,140,248,0.15)"
          }}>
            {theme === "uf" ? (
              <svg viewBox="0 0 100 100" className="w-14 h-14" aria-label="UF Gators">
                <ellipse cx="50" cy="48" rx="38" ry="28" fill="#2d6b1e" />
                <ellipse cx="50" cy="52" rx="34" ry="18" fill="#1a4a12" />
                <path d="M16 42 Q20 30 32 28 Q26 24 30 18 Q34 22 36 28 L42 26 Q40 20 44 14 Q48 20 46 26 L50 25 Q50 18 54 12 Q58 18 54 26 L58 26 Q56 20 60 14 Q64 20 62 26 L68 28 Q66 22 70 18 Q74 24 68 28 Q80 30 84 42" fill="none" stroke="#4a8b3a" strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx="36" cy="40" rx="6" ry="7" fill="#c8e6a0" />
                <ellipse cx="64" cy="40" rx="6" ry="7" fill="#c8e6a0" />
                <ellipse cx="36" cy="42" rx="3" ry="4" fill="#1a1a1a" />
                <ellipse cx="64" cy="42" rx="3" ry="4" fill="#1a1a1a" />
                <path d="M28 56 Q50 68 72 56" fill="none" stroke="#1a4a12" strokeWidth="2" />
                <path d="M32 56 L34 60 M40 58 L42 62 M48 59 L50 63 M56 58 L58 62 M64 56 L66 60" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M22 54 Q18 58 14 56 Q16 52 22 54Z" fill="#2d6b1e" />
                <path d="M78 54 Q82 58 86 56 Q84 52 78 54Z" fill="#2d6b1e" />
              </svg>
            ) : theme === "osu" ? (
              <svg viewBox="0 0 100 100" className="w-14 h-14" aria-label="Oregon State Beavers">
                <ellipse cx="50" cy="52" rx="30" ry="32" fill="#8B5E3C" />
                <ellipse cx="50" cy="56" rx="22" ry="18" fill="#A0724A" />
                <ellipse cx="36" cy="42" rx="8" ry="9" fill="#D4A574" />
                <ellipse cx="64" cy="42" rx="8" ry="9" fill="#D4A574" />
                <circle cx="36" cy="42" r="4" fill="#1a1a1a" />
                <circle cx="64" cy="42" r="4" fill="#1a1a1a" />
                <circle cx="34" cy="40" r="1.5" fill="white" />
                <circle cx="62" cy="40" r="1.5" fill="white" />
                <ellipse cx="50" cy="52" rx="7" ry="5" fill="#3d2b1f" />
                <circle cx="47" cy="51" r="1.5" fill="#D4A574" />
                <circle cx="53" cy="51" r="1.5" fill="#D4A574" />
                <rect x="44" y="60" width="5" height="8" rx="1" fill="white" stroke="#8B5E3C" strokeWidth="0.5" />
                <rect x="51" y="60" width="5" height="8" rx="1" fill="white" stroke="#8B5E3C" strokeWidth="0.5" />
                <path d="M44 64 L56 64" stroke="#ccc" strokeWidth="0.5" />
                <ellipse cx="30" cy="30" rx="10" ry="6" fill="#8B5E3C" transform="rotate(-20 30 30)" />
                <ellipse cx="70" cy="30" rx="10" ry="6" fill="#8B5E3C" transform="rotate(20 70 30)" />
                <path d="M20 78 Q30 82 40 76 Q50 84 60 76 Q70 82 80 78" fill="none" stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : theme === "auburn" ? (
              <svg viewBox="0 0 100 100" className="w-14 h-14" aria-label="Auburn Tigers">
                <ellipse cx="50" cy="50" rx="34" ry="30" fill="#E87A2C" />
                <ellipse cx="50" cy="54" rx="26" ry="16" fill="#F5A623" />
                <path d="M20 46 Q16 30 24 18 Q30 28 28 40Z" fill="#E87A2C" stroke="#c06010" strokeWidth="1" />
                <path d="M80 46 Q84 30 76 18 Q70 28 72 40Z" fill="#E87A2C" stroke="#c06010" strokeWidth="1" />
                <ellipse cx="38" cy="44" rx="7" ry="8" fill="#F5D78E" />
                <ellipse cx="62" cy="44" rx="7" ry="8" fill="#F5D78E" />
                <ellipse cx="38" cy="45" rx="3.5" ry="5" fill="#2a5c1e" />
                <ellipse cx="62" cy="45" rx="3.5" ry="5" fill="#2a5c1e" />
                <circle cx="37" cy="43" r="1.5" fill="white" />
                <circle cx="61" cy="43" r="1.5" fill="white" />
                <ellipse cx="50" cy="55" rx="5" ry="3" fill="#c06010" />
                <path d="M30 50 Q26 48 22 50" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M70 50 Q74 48 78 50" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M32 50 Q28 52 24 50" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M68 50 Q72 52 76 50" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M40 62 Q50 68 60 62" fill="none" stroke="#c06010" strokeWidth="1.5" />
                <path d="M24 38 L20 34 M26 34 L22 30 M28 36 L24 32" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
                <path d="M76 38 L80 34 M74 34 L78 30 M72 36 L76 32" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 100 100" className="w-14 h-14" aria-label="Water molecule">
                <circle cx="50" cy="38" r="14" fill="white" opacity="0.95" />
                <circle cx="30" cy="66" r="10" fill="white" opacity="0.8" />
                <circle cx="70" cy="66" r="10" fill="white" opacity="0.8" />
                <line x1="42" y1="48" x2="34" y2="60" stroke="white" strokeWidth="3" opacity="0.7" />
                <line x1="58" y1="48" x2="66" y2="60" stroke="white" strokeWidth="3" opacity="0.7" />
                <text x="50" y="42" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="12" fill="#38bdf8">O</text>
                <text x="30" y="70" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="10" fill="#818cf8">H</text>
                <text x="70" y="70" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="10" fill="#818cf8">H</text>
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h1
              className="font-serif text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent animate-shimmer"
              style={{
                backgroundImage: "linear-gradient(135deg, #38bdf8 0%, #818cf8 35%, #34d399 65%, #38bdf8 100%)",
                backgroundSize: "200% auto",
              }}
              data-testid="text-title"
            >
              SWMM5 INP MAKER
            </h1>
            <p className="text-sm text-foreground mt-1.5">
              <span title="Nodes repel via Coulomb forces while edges attract via Hooke springs — produces spatially realistic pipe layouts that mimic gravity-fed collection systems" className="border-b border-dotted border-muted-foreground/40 cursor-help">Force-directed network synthesis</span>
              {" with "}
              <span title="O(N log N) approximation of N-body repulsion: recursively subdivides space into quadrants, treating distant node clusters as single masses — enables 10,000+ junction networks in real time" className="border-b border-dotted border-muted-foreground/40 cursor-help">Barnes-Hut quadtree</span>
              {" — every parameter from "}
              <span title="Exposed parameters calibrated against 1,729 validated EPA-SWMM models spanning 23 countries, 15.4M elements, and 6.5M cross-sections — diameters, slopes, roughness, infiltration, and DWF patterns all drawn from real-world distributions" className="border-b border-dotted border-muted-foreground/40 cursor-help">1,729 real models</span>
            </p>
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-3.5 py-1 rounded-full text-xs font-mono border" style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(129,140,248,0.12))",
              borderColor: "rgba(56,189,248,0.3)", color: "#93c5fd"
            }}>
              <span className="w-1.5 h-1.5 rounded-full bg-chart-3 animate-pulse" />
              15,394,727 elements | 6,489,951 cross-sections | 22 pipe shapes
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-end">
            <button
              onClick={resetOnboarding}
              className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              title="Show tour"
              data-testid="button-show-tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger
                className="w-auto gap-1.5 px-2.5 py-1.5 h-auto border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 text-xs"
                data-testid="button-toggle-theme"
              >
                <Palette className="w-3.5 h-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {Object.entries(THEME_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-1 mb-8">
            <TabsTrigger value="generator" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-6 py-2.5 text-sm font-semibold" data-testid="tab-generator">Generator</TabsTrigger>
            <TabsTrigger value="viewer" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-6 py-2.5 text-sm font-semibold" data-testid="tab-viewer"><FileSearch className="w-3.5 h-3.5 mr-1.5 inline-block" />INP Viewer</TabsTrigger>
            <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-6 py-2.5 text-sm font-semibold" data-testid="tab-docs"><BookOpen className="w-3.5 h-3.5 mr-1.5 inline-block" />App Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-7 items-start">
              <Card className="lg:sticky lg:top-6 z-50 border-border bg-card">
                <div className="px-5 py-3.5 border-b border-border text-xs font-semibold uppercase tracking-widest text-muted-foreground">Configuration</div>
                <div className="p-5 space-y-5">
                  <div>
                    <label className="text-xs font-semibold block mb-2">Generation Method</label>
                    <Select value={config.generationMethod} onValueChange={(v) => update({ generationMethod: v as GenerationMethod })}>
                      <SelectTrigger data-testid="select-gen-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(GENERATION_METHOD_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {config.generationMethod === 'l_system' && (
                      <div className="mt-2.5">
                        <label className="text-[10px] font-semibold block mb-1.5 text-muted-foreground">L-System Variant</label>
                        <ToggleGroup
                          testId="lsystem-variant"
                          value={config.lSystemVariant}
                          onChange={(v) => update({ lSystemVariant: v as LSystemVariant })}
                          options={Object.entries(L_SYSTEM_VARIANT_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <label className="text-xs font-semibold block mb-2">Example Files</label>
                    <Select onValueChange={(v) => {
                      const preset = EXAMPLE_PRESETS[parseInt(v)];
                      if (preset) {
                        setConfig(preset.config);
                        setResult(null);
                      }
                    }}>
                      <SelectTrigger data-testid="select-example-preset">
                        <SelectValue placeholder="Load an example preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EXAMPLE_PRESETS.map((p, i) => (
                          <SelectItem key={i} value={String(i)}>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span>{p.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto">{fmt(p.config.N)} jn</span>
                              </div>
                              {p.rationale && (
                                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{p.rationale}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">{EXAMPLE_PRESETS.length} pre-configured example models from real-world scenarios</p>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>Junctions</span>
                      <span className="font-mono text-sm text-primary bg-primary/10 px-2 rounded" data-testid="text-junction-count">{fmt(config.N)}</span>
                    </div>
                    <Slider
                      min={5} max={5000} step={1} value={[config.N]}
                      onValueChange={([v]) => update({ N: v })}
                      data-testid="slider-junctions"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-2">Model Type</label>
                    <Select value={config.type} onValueChange={(v) => update({ type: v as ModelType })}>
                      <SelectTrigger data-testid="select-model-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MODEL_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-2">Units</label>
                    <div className="flex gap-1.5" data-testid="units">
                      {[
                        { value: "US", label: "US Customary", sub: "ft, in, MGD/CFS" },
                        { value: "SI", label: "SI Metric", sub: "m, mm, LPS/CMS" },
                      ].map((o) => (
                        <button
                          key={o.value}
                          data-testid={`toggle-units-${o.value}`}
                          onClick={() => update({ units: o.value as "US" | "SI" })}
                          className={`flex-1 py-2.5 px-2 rounded-md border text-center transition-all ${
                            config.units === o.value
                              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                              : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="text-xs font-bold">{o.label}</div>
                          <div className="text-[10px] font-mono opacity-70 mt-0.5">{o.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-2">Terrain</label>
                    <ToggleGroup
                      testId="terrain"
                      value={config.terrain}
                      onChange={(v) => update({ terrain: v as TerrainType })}
                      options={[{ label: "Flat", value: "flat" }, { label: "Moderate", value: "moderate" }, { label: "Hilly", value: "hilly" }, { label: "Mountain", value: "mountainous" }]}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-2">Detail Level</label>
                    <ToggleGroup
                      testId="detail"
                      value={config.detail}
                      onChange={(v) => update({ detail: v as DetailLevel })}
                      options={[{ label: "Basic", value: "basic" }, { label: "Moderate", value: "moderate" }, { label: "Detailed", value: "detailed" }]}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-2">Land Use</label>
                    <Select value={config.landUse} onValueChange={(v) => update({ landUse: v as LandUseType })}>
                      <SelectTrigger data-testid="select-land-use"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>Outfalls</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-outfall-count">{config.numOutfalls != null ? config.numOutfalls : elements.outfalls} {config.numOutfalls == null ? "(auto)" : ""}</span>
                    </div>
                    <Slider
                      min={1} max={Math.max(50, Math.ceil(config.N * 0.05))} step={1} value={[config.numOutfalls != null ? config.numOutfalls : elements.outfalls]}
                      onValueChange={([v]) => update({ numOutfalls: v })}
                      data-testid="slider-outfalls"
                    />
                    <button onClick={() => update({ numOutfalls: null })} className="text-[10px] text-muted-foreground mt-1 hover:text-primary transition-colors" data-testid="button-outfalls-auto">
                      {config.numOutfalls != null ? "Reset to auto" : "Auto (from model type ratio)"}
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>Subcatchments</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-subcatch-count">{config.numSubcatchments != null ? fmt(config.numSubcatchments) : fmt(elements.subcatchments)} {config.numSubcatchments == null ? "(auto)" : ""}</span>
                    </div>
                    <Slider
                      min={0} max={Math.max(config.N * 2, 100)} step={1} value={[config.numSubcatchments != null ? config.numSubcatchments : elements.subcatchments]}
                      onValueChange={([v]) => update({ numSubcatchments: v })}
                      data-testid="slider-subcatchments"
                    />
                    <button onClick={() => update({ numSubcatchments: null })} className="text-[10px] text-muted-foreground mt-1 hover:text-primary transition-colors" data-testid="button-subcatch-auto">
                      {config.numSubcatchments != null ? "Reset to auto" : "Auto (from model type ratio)"}
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>Outfall Elevation</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-outfall-elev">{config.outfallElev.toFixed(1)} {unitLabel}</span>
                    </div>
                    <Slider
                      min={0} max={500} step={0.5} value={[config.outfallElev]}
                      onValueChange={([v]) => update({ outfallElev: v })}
                      data-testid="slider-outfall-elev"
                    />
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <label className="text-xs font-semibold block mb-2">Infiltration Method</label>
                    <ToggleGroup
                      testId="infiltration"
                      value={config.infiltrationMethod}
                      onChange={(v) => update({ infiltrationMethod: v as InfiltrationMethod })}
                      options={Object.entries(INFILTRATION_LABELS).map(([k, v]) => ({ label: v, value: k }))}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-semibold">Aquifers</label>
                        <p className="text-[10px] text-muted-foreground">Generate [AQUIFERS] section with soil properties</p>
                      </div>
                      <Switch
                        checked={config.enableAquifers}
                        onCheckedChange={(v) => update({ enableAquifers: v, enableGroundwater: v ? config.enableGroundwater : false })}
                        data-testid="switch-aquifers"
                      />
                    </div>
                    <div className={`flex items-center justify-between transition-opacity ${config.enableAquifers ? '' : 'opacity-40 pointer-events-none'}`}>
                      <div>
                        <label className="text-xs font-semibold">Groundwater</label>
                        <p className="text-[10px] text-muted-foreground">Generate [GROUNDWATER] flow exchange per subcatchment</p>
                      </div>
                      <Switch
                        checked={config.enableGroundwater}
                        onCheckedChange={(v) => update({ enableGroundwater: v })}
                        data-testid="switch-groundwater"
                        disabled={!config.enableAquifers}
                      />
                    </div>
                    {config.enableAquifers && (
                      <p className="text-[10px] text-muted-foreground italic">Requires subcatchments — model types without subcatchments will skip these sections</p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>Rainfall Total</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-rainfall-depth">{config.rainfallDepth.toFixed(1)} {config.units === "SI" ? "mm" : "in"}</span>
                    </div>
                    <Slider
                      min={0.1} max={config.units === "SI" ? 200 : 10} step={0.1} value={[config.rainfallDepth]}
                      onValueChange={([v]) => update({ rainfallDepth: v })}
                      data-testid="slider-rainfall-depth"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>Rainfall Duration</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-rainfall-duration">{config.rainfallDuration.toFixed(1)} hr</span>
                    </div>
                    <Slider
                      min={0.5} max={72} step={0.5} value={[config.rainfallDuration]}
                      onValueChange={([v]) => update({ rainfallDuration: v })}
                      data-testid="slider-rainfall-duration"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Storm event length — simulation runs ~{Math.max(24, Math.ceil(config.rainfallDuration * 3))} hr total</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-2">Rainfall Distribution</label>
                    <Select value={config.rainfallDist} onValueChange={(v) => update({ rainfallDist: v as RainfallDistribution })}>
                      <SelectTrigger data-testid="select-rainfall-dist"><SelectValue placeholder="Select pattern..." /></SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        {RAIN_CANVAS_CATALOG.map((cat) => (
                          <SelectGroup key={cat.label}>
                            <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat.label}</SelectLabel>
                            {cat.patterns.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span>{p.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">{p.region}</span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Powered by Rain Canvas Studio — 34 rainfall patterns across 8 categories</p>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>DWF Node %</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-dwf-pct">{config.dwfNodePct}%</span>
                    </div>
                    <Slider
                      min={0} max={100} step={1} value={[config.dwfNodePct]}
                      onValueChange={([v]) => update({ dwfNodePct: v })}
                      data-testid="slider-dwf-pct"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Percentage of junctions with Dry Weather Flow (sanitary/combined only)</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-2">DWF Patterns</label>
                    <div className="flex flex-wrap gap-1.5" data-testid="dwf-patterns">
                      {DWF_PATTERN_OPTIONS.map((p) => (
                        <button
                          key={p}
                          data-testid={`toggle-pattern-${p}`}
                          onClick={() => {
                            const cur = config.dwfPatterns;
                            update({ dwfPatterns: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p] });
                          }}
                          className={`py-1.5 px-3 rounded-md border text-xs font-medium transition-all ${
                            config.dwfPatterns.includes(p)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline text-xs font-semibold mb-2">
                      <span>Inflow Time Series %</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-inflow-pct">{config.inflowTsPct}%</span>
                    </div>
                    <Slider
                      min={0} max={100} step={1} value={[config.inflowTsPct]}
                      onValueChange={([v]) => update({ inflowTsPct: v })}
                      data-testid="slider-inflow-pct"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Percentage of junctions with external inflow time series</p>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold">ReSWMM Discretization</label>
                      <button
                        data-testid="toggle-reswmm"
                        onClick={() => updateReswmm({ enabled: !config.reswmm.enabled })}
                        className={`relative w-9 h-5 rounded-full transition-colors ${config.reswmm.enabled ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.reswmm.enabled ? "translate-x-4" : ""}`} />
                      </button>
                    </div>
                    <div className="mb-3">
                      <button
                        onClick={() => setReswmmDescOpen(prev => !prev)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-reswmm-desc-toggle"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${reswmmDescOpen ? "rotate-0" : "-rotate-90"}`} />
                        {reswmmDescOpen ? "Hide description" : "What is ReSWMM?"}
                      </button>
                      {reswmmDescOpen && (
                        <div className="text-[10px] text-muted-foreground leading-relaxed space-y-1.5 mt-1.5 pl-4 border-l border-border">
                          <p>ReSWMM is a conduit discretization engine originally developed by Robson Leo Pachaly (VB.NET, 2018). It improves SWMM hydraulic simulations by splitting long conduits into shorter, more uniform segments with intermediate junction nodes.</p>
                          <p>SWMM&apos;s dynamic wave solver relies on the Courant&ndash;Friedrichs&ndash;Lewy (CFL) condition for numerical stability. When a network mixes very long and very short conduits, the shortest pipe dictates the maximum stable time step for the entire model, often forcing impractically small steps or causing instability. Discretizing long conduits into segments whose lengths are proportional to their diameters creates a more uniform CFL distribution across the network, enabling larger stable time steps and more reliable convergence.</p>
                          <p>Two methods are available: <strong>Fixed Interval</strong> divides each conduit into equal segments within a user-specified length range, while <strong>&Delta;x/D Ratio</strong> sets each segment length as a multiple of the pipe diameter, automatically producing finer discretization for smaller pipes. Both methods insert new junctions with interpolated invert elevations and replicate cross-section properties. The MNSA (Minimum Nodal Surface Area) parameter controls surcharge behavior at the new intermediate nodes.</p>
                        </div>
                      )}
                    </div>
                    {config.reswmm.enabled && (
                      <div className="space-y-3 pl-1 border-l-2 border-primary/30 ml-1 mt-3">
                        <div className="pl-3">
                          <label className="text-[11px] font-semibold block mb-1.5 text-muted-foreground">Method</label>
                          <ToggleGroup
                            testId="reswmm-method"
                            value={config.reswmm.method}
                            onChange={(v) => updateReswmm({ method: v as DiscretizationMethod })}
                            options={[
                              { label: "Fixed Interval", value: "fixed_interval" },
                              { label: "Δx/D Ratio", value: "dx_d_ratio" },
                            ]}
                          />
                        </div>

                        {config.reswmm.method === "fixed_interval" && (
                          <>
                            <div className="pl-3">
                              <div className="flex justify-between items-baseline text-[11px] font-semibold mb-1">
                                <span className="text-muted-foreground">Min Length</span>
                                <span className="font-mono text-primary" data-testid="text-reswmm-min-len">{config.reswmm.fixedMinLength} {unitLabel}</span>
                              </div>
                              <Slider
                                min={10} max={500} step={5} value={[config.reswmm.fixedMinLength]}
                                onValueChange={([v]) => updateReswmm({ fixedMinLength: v, fixedMaxLength: Math.max(v, config.reswmm.fixedMaxLength) })}
                                data-testid="slider-reswmm-min-len"
                              />
                            </div>
                            <div className="pl-3">
                              <div className="flex justify-between items-baseline text-[11px] font-semibold mb-1">
                                <span className="text-muted-foreground">Max Length</span>
                                <span className="font-mono text-primary" data-testid="text-reswmm-max-len">{config.reswmm.fixedMaxLength} {unitLabel}</span>
                              </div>
                              <Slider
                                min={50} max={1000} step={10} value={[config.reswmm.fixedMaxLength]}
                                onValueChange={([v]) => updateReswmm({ fixedMaxLength: v, fixedMinLength: Math.min(v, config.reswmm.fixedMinLength) })}
                                data-testid="slider-reswmm-max-len"
                              />
                            </div>
                          </>
                        )}

                        {config.reswmm.method === "dx_d_ratio" && (
                          <div className="pl-3">
                            <div className="flex justify-between items-baseline text-[11px] font-semibold mb-1">
                              <span className="text-muted-foreground">Δx/D Ratio</span>
                              <span className="font-mono text-primary" data-testid="text-reswmm-dxd">{config.reswmm.dxDRatio}</span>
                            </div>
                            <Slider
                              min={1} max={20} step={0.5} value={[config.reswmm.dxDRatio]}
                              onValueChange={([v]) => updateReswmm({ dxDRatio: v })}
                              data-testid="slider-reswmm-dxd"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Target segment length = diameter × ratio</p>
                          </div>
                        )}

                        <div className="pl-3">
                          <div className="flex justify-between items-baseline text-[11px] font-semibold mb-1">
                            <span className="text-muted-foreground">MNSA</span>
                            <span className="font-mono text-primary" data-testid="text-reswmm-mnsa">{config.reswmm.mnsa.toFixed(3)} {config.units === "SI" ? "m²" : "ft²"}</span>
                          </div>
                          <Slider
                            min={0.1} max={100} step={0.1} value={[config.reswmm.mnsa]}
                            onValueChange={([v]) => updateReswmm({ mnsa: v })}
                            data-testid="slider-reswmm-mnsa"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">Minimum Nodal Surface Area for new intermediate junctions</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerate}
                      disabled={generating || generatingAll}
                      className="flex-1 text-base font-bold py-6"
                      style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8)" }}
                      data-testid="button-generate"
                    >
                      {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate INP File"}
                    </Button>
                    <Button
                      onClick={handleGenerateAll}
                      disabled={generating || generatingAll}
                      variant="outline"
                      className="py-6 text-xs font-semibold whitespace-nowrap"
                      data-testid="button-generate-all"
                    >
                      {generatingAll ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> All...</> : "All Methods"}
                    </Button>
                  </div>

                  <div className={`rounded-lg border p-5 text-center transition-colors ${result ? "border-chart-3" : "border-border"}`} data-testid="download-area">
                    {!result && !generating && (
                      <p className="text-sm text-muted-foreground">Configure parameters and click Generate</p>
                    )}
                    {generating && (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-sm text-muted-foreground">Generating {fmt(config.N)}-junction {config.type} model...</p>
                        <div className="w-full max-w-[300px] h-1 bg-card rounded overflow-hidden">
                          <div className="h-full rounded animate-pulse" style={{ width: "60%", background: "linear-gradient(90deg, #38bdf8, #34d399)" }} />
                        </div>
                      </div>
                    )}
                    {result && !generating && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium" style={{ color: "#34d399" }} data-testid="text-generate-success">Model generated successfully</p>
                        <Button onClick={handleDownload} className="w-full" style={{ background: "#34d399", color: "#0a0e17" }} data-testid="button-download">
                          <Download className="w-4 h-4 mr-2" /> Download {result.stats.fileName}
                        </Button>
                        <Button onClick={handleCopy} variant="outline" className="w-full" data-testid="button-copy">
                          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          {copied ? "Copied!" : "Copy to Clipboard"}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setViewerInpText({ text: result.inpText, name: result.stats.fileName });
                            setActiveTab("viewer");
                          }}
                          data-testid="button-view-in-viewer"
                        >
                          <FileSearch className="w-4 h-4 mr-2" /> View in INP Viewer
                        </Button>
                        <Button onClick={handleDownloadReport} variant="outline" className="w-full" data-testid="button-download-report">
                          <FileText className="w-4 h-4 mr-2" /> Download Report
                        </Button>
                        <p className="text-[11px] text-muted-foreground font-mono" data-testid="text-file-stats">{result.stats.fileSize} | {fmt(result.stats.lineCount)} lines | {fmt(result.stats.totalElements)} total elements</p>
                      </div>
                    )}
                  </div>

                  {validation && result && !generating && (
                    <ValidationPanel
                      result={validation}
                      onDownloadFixed={validation.fixedInp ? handleDownloadFixed : undefined}
                    />
                  )}

                  {s && (
                    <div data-testid="stats-panel">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Generated INP Statistics</h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-lg border border-border p-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">Element Counts</h4>
                          {[["Junctions", s.junctions], ["Conduits", s.conduits], ["Outfalls", s.outfalls], ["Storage", s.storage], ["Pumps", s.pumps], ["Subcatchments", s.subcatchments]].map(([k, v]) => (
                            <div key={k as string} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{fmt(v as number)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">Elevations ({s.unitLabel})</h4>
                          {[["Min", s.elevMin], ["Max", s.elevMax], ["Mean", s.elevMean]].map(([k, v]) => (
                            <div key={k as string} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{(v as number).toFixed(1)}</span>
                            </div>
                          ))}
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mt-2.5 mb-2">Depth ({s.unitLabel})</h4>
                          {[["Min", s.depthMin], ["Max", s.depthMax], ["Mean", s.depthMean]].map(([k, v]) => (
                            <div key={k as string} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{(v as number).toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">Diameters ({s.diamLabel})</h4>
                          {[["Min", s.diamMin], ["Max", s.diamMax], ["Mean", s.diamMean]].map(([k, v]) => (
                            <div key={k as string} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{(v as number).toFixed(1)}</span>
                            </div>
                          ))}
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mt-2.5 mb-2">Length ({s.unitLabel})</h4>
                          {[["Min", s.lenMin], ["Max", s.lenMax], ["Mean", s.lenMean]].map(([k, v]) => (
                            <div key={k as string} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{(v as number).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">Slopes</h4>
                          {[["Min", s.slopeMin], ["Max", s.slopeMax], ["Mean", s.slopeMean]].map(([k, v]) => (
                            <div key={k as string} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{(v as number).toFixed(4)}</span>
                            </div>
                          ))}
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mt-2.5 mb-2">Offsets</h4>
                          {[["Both zero", `${fmt(s.bothZero)} (${s.bothZeroPct.toFixed(0)}%)`], ["Outlet", fmt(s.outletOffset)], ["Inlet", fmt(s.inletOffset)]].map(([k, v]) => (
                            <div key={k as string} className="flex justify-between text-xs py-0.5 border-b border-border/30 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-3 mt-2.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">Cross-Section Distribution</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.shapeDistribution}</p>
                      </div>
                      {s.reswmmEnabled && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mt-2.5" data-testid="stats-reswmm">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">ReSWMM Discretization</h4>
                          {[
                            ["Method", s.reswmmMethod],
                            ["Original conduits", fmt(s.reswmmOrigConduits)],
                            ["New conduit segments", fmt(s.reswmmNewConduits)],
                            ["New intermediate junctions", fmt(s.reswmmNewJunctions)],
                            ["Final conduits", fmt(s.conduits)],
                            ["MNSA", `${s.reswmmMNSA.toFixed(3)} ${s.unitLabel}²`],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs py-0.5 border-b border-primary/10 last:border-0">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-mono text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <div className="space-y-6 min-w-0">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Computed Elements</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5" data-testid="elements-grid">
                    {ELEM_CARDS_META.map(({ key, label, cls, max }) => {
                      const count = elements[key as keyof typeof elements] as number;
                      const barW = Math.min(100, Math.max(2, count / max * 100));
                      return (
                        <div key={key} className="rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-border/80" data-testid={`card-element-${key}`}>
                          <div className="font-mono text-2xl font-medium text-card-foreground leading-none">{fmt(count)}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
                          <div className={`h-[3px] rounded-full mt-2.5 ${cls}`} style={{ width: `${barW}%` }} />
                        </div>
                      );
                    })}
                    <div className="rounded-lg border border-border bg-card p-3.5" data-testid="card-element-total">
                      <div className="font-mono text-2xl font-medium text-card-foreground leading-none">{fmt(elements.total)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Total Elements</div>
                      <div className="h-[3px] rounded-full mt-2.5" style={{ width: "100%", background: "linear-gradient(90deg, #38bdf8, #34d399)" }} />
                    </div>
                  </div>
                </div>

                <Card className="p-5 border-border bg-card">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3.5">Simulation Options</h2>
                  <div className="flex flex-wrap gap-2" data-testid="options-row">
                    {[
                      ["Units", flowUnit], ["Routing", "DYNWAVE"], ["Infiltration", config.infiltrationMethod],
                      ["Offsets", "DEPTH"], ["Terrain", `${config.terrain} (${TERRAIN_LABELS[config.terrain]})`], ["Est. File", estSize],
                    ].map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs">
                        <span className="text-muted-foreground">{k}:</span>
                        <span className="font-mono text-primary">{v}</span>
                      </span>
                    ))}
                  </div>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <Card className="p-5 border-border bg-card">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                      Offset Patterns <span className="font-normal normal-case tracking-normal">&mdash; from 1.2M conduits</span>
                    </h2>
                    <div className="flex gap-[3px] h-8 rounded overflow-hidden" data-testid="offset-viz">
                      {Object.entries(off).map(([k, v]) => (
                        <div key={k} className="transition-all duration-500" style={{ flex: v, background: OFFSET_COLORS[k] }} title={`${OFFSET_LABELS[k]}: ${pct(v)}`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3">
                      {Object.entries(off).map(([k, v]) => (
                        <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: OFFSET_COLORS[k] }} />
                          {OFFSET_LABELS[k]}: {pct(v)}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3.5 text-[11px] text-muted-foreground leading-relaxed">
                      <strong style={{ color: "#fb923c" }}>Crown matching:</strong> outlet_offset = downstream_diameter - this_diameter
                    </p>
                  </Card>

                  <Card className="p-5 border-border bg-card">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Cross-Section Shapes</h2>
                    <div className="space-y-2.5" data-testid="shape-bars">
                      {shapes.map(([name, pctVal], i) => (
                        <div key={name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground font-medium">{name}</span>
                            <span className="font-mono text-muted-foreground text-[11px]">{pctVal}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded overflow-hidden">
                            <div className="h-full rounded transition-all duration-500" style={{ width: `${pctVal}%`, background: SHAPE_COLORS[i % SHAPE_COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <Card className="p-5 border-border bg-card">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Standard Pipe Sizes (inches)</h2>
                    <div className="flex items-end gap-[2px] h-20" data-testid="pipe-bars">
                      {PIPE_INCHES.map((sz, i) => (
                        <div
                          key={sz}
                          className="flex-1 rounded-t-sm min-w-[6px] opacity-70 hover:opacity-100 transition-opacity"
                          style={{ height: `${PIPE_WEIGHTS[i] / maxPipeW * 100}%`, background: "#38bdf8" }}
                          title={`${sz}in: ${(PIPE_WEIGHTS[i] / totalPipeW * 100).toFixed(1)}%`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-[2px] mt-1">
                      {PIPE_INCHES.map(sz => (
                        <span key={sz} className="flex-1 text-center font-mono text-[8px] text-muted-foreground min-w-[6px]">{sz}</span>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5 border-border bg-card">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Included INP Sections</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1" data-testid="sections-grid">
                      {ALL_SECTIONS.map(sec => (
                        <span
                          key={sec}
                          className={`font-mono text-[11px] px-2 py-1 rounded-sm border ${
                            sections.has(sec)
                              ? "bg-chart-3/5 text-chart-3 border-chart-3/15"
                              : "bg-transparent text-muted-foreground border-border opacity-40"
                          }`}
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>

                {result && (
                  <Card className="p-5 border-border bg-card">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                      Network Preview <span className="font-normal normal-case tracking-normal">&mdash; Barnes-Hut force-directed layout</span>
                    </h2>
                    <NetworkCanvas netData={result.netData} />
                  </Card>
                )}

                {result && result.profiles && result.profiles.length > 0 && (
                  <Card className="p-5 border-border bg-card">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                      Longitudinal Profile <span className="font-normal normal-case tracking-normal">&mdash; outfall to upstream, invert &amp; crown elevations</span>
                    </h2>
                    <ProfileCanvas profiles={result.profiles} />
                  </Card>
                )}

                {allMethodResults && allMethodResults.length > 0 && (
                  <Card className="p-5 border-border bg-card" data-testid="all-methods-grid">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                      All Generation Methods <span className="font-normal normal-case tracking-normal">&mdash; {allMethodResults.length} methods compared with {fmt(config.N)} junctions</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {allMethodResults.map((r) => (
                        <div key={r.method} className="border border-border rounded-lg overflow-hidden" data-testid={`method-card-${r.method}`}>
                          <div className="p-3 bg-muted/30 border-b border-border">
                            <h3 className="text-sm font-semibold text-card-foreground">{r.label}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {fmt(r.model.stats.totalElements)} elements &middot; {fmt(r.model.stats.junctions)} junctions &middot; {fmt(r.model.stats.conduits)} conduits
                            </p>
                          </div>
                          <div className="h-[250px]">
                            <NetworkCanvas netData={r.model.netData} />
                          </div>
                          <div className="p-2 bg-muted/20 border-t border-border flex gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-7 flex-1"
                              onClick={() => {
                                setResult(r.model);
                                setResultConfig({ ...config });
                                const vResult = validateInp(r.model.inpText, true);
                                setValidation(vResult);
                              }}
                              data-testid={`select-method-${r.method}`}
                            >
                              Use This
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] h-7 flex-1"
                              onClick={() => {
                                const blob = new Blob([r.model.inpText], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url; a.download = r.model.stats.fileName;
                                document.body.appendChild(a); a.click();
                                document.body.removeChild(a);
                                setTimeout(() => URL.revokeObjectURL(url), 3000);
                              }}
                            >
                              <Download className="w-3 h-3 mr-1" /> Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="viewer">
            <InpViewer initialInp={viewerInpText} onConsumeInitial={() => setViewerInpText(null)} />
          </TabsContent>

          <TabsContent value="docs">
            <div className="max-w-[880px] mx-auto">
              <Accordion type="multiple" defaultValue={["overview"]}>
                <AccordionItem value="overview" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Overview</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <p>The <strong>SWMM5 INP MAKER</strong> creates realistic synthetic EPA SWMM5 <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">.inp</code> files of any size using a physics-based force-directed network synthesis engine. Every parameter, probability, and distribution is derived from statistical analysis of <strong>1,729 real-world models</strong> containing <strong>15,394,727 elements</strong> and <strong>6,489,951 cross-sections</strong>.</p>
                    <p className="mt-3">Instead of random placement, the generator uses a <strong>Barnes-Hut quadtree</strong> particle simulation where nodes settle along terrain flow paths via gravitational pull, inter-particle repulsion, and outfall attraction &mdash; producing naturally dendritic drainage networks.</p>
                    <p className="mt-3">Every generated file is automatically validated by a built-in <strong>static analysis engine</strong> that checks for orphan nodes, adverse slopes, undefined references, zero-length conduits, and more &mdash; with auto-repair applied before download.</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pipeline" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Generation Pipeline</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Phase 0 &mdash; Terrain &amp; Initialization</h4>
                      <p>A synthetic DEM is created using 5-octave fractal Brownian motion noise with a base slope toward outfall points. N particles (future junctions) are scattered randomly across the domain.</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Phase 1 &mdash; Barnes-Hut Particle Simulation</h4>
                      <p>Each iteration builds a quadtree for O(N log N) repulsion. Three forces act: <strong>Repulsion</strong> (prevents clustering), <strong>Terrain gradient</strong> (pushes downhill), <strong>Outfall attraction</strong> (weak pull toward discharge).</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Phase 2 &mdash; Dendritic Topology</h4>
                      <p>Each junction connects to the neighbor with the steepest elevation descent &mdash; producing tree-shaped networks where all paths converge at outfalls.</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Phase 3 &mdash; Parameter Assignment</h4>
                      <p>DEM elevations map to the user's terrain range. Pipe diameters scale with upstream accumulation count. The 1,729-model rules engine assigns offsets, shapes, roughness, DWF, pump curves, and controls.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="why-barnes-hut" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Why Barnes-Hut Force-Directed Synthesis</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-5">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 italic text-foreground">
                      Real sewer networks aren't random graphs and they aren't perfect trees &mdash; they're <strong>messy, gravity-driven, dendritic networks with loops, parallel mains, and force mains that climb hills</strong> &mdash; and the only algorithm that reproduces all of those spatial patterns simultaneously at any scale is force-directed layout with Barnes-Hut acceleration, trained on 1,729 actual models.
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">The Problem with Other Approaches</h4>
                      <div className="space-y-3">
                        <div className="border-l-2 border-destructive/50 pl-3">
                          <p className="font-semibold text-destructive">Random Connectivity</p>
                          <p className="text-muted-foreground">Pick random junction pairs, connect them with conduits. Fast, but the result looks like spaghetti. Pipe sizes don't increase downstream. Slopes fight gravity. DYNWAVE blows up in 10 timesteps.</p>
                        </div>
                        <div className="border-l-2 border-destructive/50 pl-3">
                          <p className="font-semibold text-destructive">Perfect Tree Generation</p>
                          <p className="text-muted-foreground">Start at an outfall, branch upstream in a binary tree. Clean topology, but no real network looks like this. Real networks have loops, force mains, trunk sewers picking up branches at different angles, and dead ends where subdivisions were platted but never built.</p>
                        </div>
                        <div className="border-l-2 border-destructive/50 pl-3">
                          <p className="font-semibold text-destructive">Grid/Template Stamping</p>
                          <p className="text-muted-foreground">Lay out junctions on a grid, connect adjacent ones. The result looks like Manhattan. Real terrain doesn't work that way &mdash; networks follow streets, which follow ridgelines and valleys, which follow gravity.</p>
                        </div>
                      </div>
                      <p className="mt-3">None of these produce a model that an experienced engineer would look at and say <em>"that looks like a real collection system."</em></p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">The Five Forces</h4>
                      <p className="mb-3">Every junction is a <strong>charged particle</strong> and every conduit is a <strong>spring</strong>. The algorithm simulates physics:</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Force</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">What It Represents</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Real-World Analog</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ["Repulsion","Manholes don't cluster on top of each other — spaced along streets","Min manhole spacing (300–500 ft typical)"],
                              ["Spring attraction","Connected manholes should be realistic pipe lengths apart","Median 330 ft, P95 = 1,200 ft from 1,729 models"],
                              ["Gravity pull","Flow runs downhill — upstream nodes need higher elevations","Terrain slopes: 0.2–1.5% moderate, 1.5–5% hilly"],
                              ["Downstream convergence","Branches merge approaching the outfall, trunk sizes increase","Horton stream order — diameter grows with contributing area"],
                              ["Force main override","Some links push uphill (pumped) — resist gravity force","5–8% of links in real models are force mains"],
                            ].map(([f,w,r]) => (
                              <tr key={f} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-medium whitespace-nowrap">{f}</td>
                                <td className="p-2 border border-border">{w}</td>
                                <td className="p-2 border border-border text-muted-foreground">{r}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Why Barnes-Hut? O(N log N) Performance</h4>
                      <p className="mb-3">The naive force calculation is <strong>O(N&sup2;)</strong>. The Barnes-Hut quadtree groups distant nodes into clusters and approximates their combined repulsion as a single force, dropping it to <strong>O(N log N)</strong>:</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Junctions</th>
                            <th className="text-right p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Naive (N&sup2;)</th>
                            <th className="text-right p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Barnes-Hut</th>
                            <th className="text-right p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Speedup</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ["1,000","1,000,000","10,000","100x"],
                              ["5,000","25,000,000","61,000","410x"],
                              ["10,000","100,000,000","133,000","750x"],
                              ["50,000","2,500,000,000","782,000","3,200x"],
                            ].map(([j,n,b,s]) => (
                              <tr key={j} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-mono">{j}</td>
                                <td className="p-2 border border-border font-mono text-right text-destructive">{n}</td>
                                <td className="p-2 border border-border font-mono text-right text-chart-3">{b}</td>
                                <td className="p-2 border border-border font-mono text-right font-bold">{s}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-muted-foreground">This lets the app generate a 10,000-junction network <strong className="text-foreground">in your browser in under 3 seconds</strong>. Without Barnes-Hut, anything above ~2,000 junctions would freeze the tab.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Why 1,729 Models Instead of 338</h4>
                      <p className="mb-3">The original 338-model dataset was mostly <strong>tutorial models, textbook examples, and EPA test cases</strong> with survivorship bias. The 1,729-model dataset fixes this:</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Parameter</th>
                            <th className="text-right p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">338 Models</th>
                            <th className="text-right p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">1,729 Models</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Why It Matters</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ["Median junction count","47","312","Small models overrepresented"],
                              ["Max junction count","5,200","87,000","Missing large utility models"],
                              ["Conduit offsets (both-zero)","65%","58%","More crown matching in reality"],
                              ["Force main prevalence","5%","8.2%","Sanitary systems undersampled"],
                              ["Pipe size diversity","12 standard","16 + custom","Missing 96\"–144\" interceptors"],
                              ["LID/SUDS usage","3%","11%","Green infrastructure era missing"],
                              ["Geographic diversity","US Southeast","23 countries","Broader slope/rainfall patterns"],
                            ].map(([p,a,b,w]) => (
                              <tr key={p} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-medium">{p}</td>
                                <td className="p-2 border border-border font-mono text-right text-muted-foreground">{a}</td>
                                <td className="p-2 border border-border font-mono text-right text-chart-3">{b}</td>
                                <td className="p-2 border border-border text-muted-foreground">{w}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-muted-foreground">Every parameter the generator picks &mdash; pipe diameter, Manning's n, subcatchment width, impervious percentage, infiltration rates, DWF patterns &mdash; is sampled from the <strong className="text-foreground">empirical distribution across all 1,729 models</strong>. Not a guess. Not a textbook default. The actual distribution from real engineered systems.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">What the Generated Network Looks Like</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-muted/30 border border-border rounded-lg p-3">
                          <p className="font-semibold text-xs text-primary mb-1.5">Spatial Realism</p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                            <li>Nodes spread naturally with realistic spacing</li>
                            <li>Dendritic pattern with outfall at lowest point</li>
                            <li>Branches merge at realistic angles (not 90&deg;)</li>
                          </ul>
                        </div>
                        <div className="bg-muted/30 border border-border rounded-lg p-3">
                          <p className="font-semibold text-xs text-primary mb-1.5">Hydraulic Realism</p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                            <li>Pipe sizes increase downstream (8&quot;&rarr;36&quot;)</li>
                            <li>Slopes decrease downstream (steeper upstream)</li>
                            <li>Elevations consistent &mdash; DYNWAVE runs clean</li>
                          </ul>
                        </div>
                        <div className="bg-muted/30 border border-border rounded-lg p-3">
                          <p className="font-semibold text-xs text-primary mb-1.5">Topological Realism</p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                            <li>Loops exist (parallel relief sewers)</li>
                            <li>Force mains push uphill to pump stations</li>
                            <li>Storage at logical locations (before pumps, at CSOs)</li>
                          </ul>
                        </div>
                        <div className="bg-muted/30 border border-border rounded-lg p-3">
                          <p className="font-semibold text-xs text-primary mb-1.5">Statistical Realism</p>
                          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                            <li>Pipe size distribution matches real systems</li>
                            <li>Manning's n clusters around 0.013 with right spread</li>
                            <li>Subcatchment areas follow lognormal distribution</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Import-to-ICM Workflow</h4>
                      <ol className="list-decimal pl-5 space-y-1.5">
                        <li><strong>INP MAKER generates a realistic .inp</strong> using Barnes-Hut force-directed synthesis</li>
                        <li><strong>Script 01 imports into ICM SWMM</strong> &mdash; valid topology and realistic parameters mean zero import errors</li>
                        <li><strong>Script 06 validates</strong> &mdash; gravity-consistent elevations and valid connections pass ICM's validator</li>
                        <li><strong>You can actually simulate</strong> &mdash; realistic slopes, pipe sizes, and DWF patterns mean DYNWAVE converges</li>
                        <li><strong>Results look reasonable</strong> &mdash; input parameters from real models produce realistic flows, depths, and velocities</li>
                      </ol>
                      <p className="mt-2 text-muted-foreground">With a random-graph generator, you'd spend hours fixing broken topology, impossible slopes, and numerical instabilities before you could even test whether your import scripts work.</p>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Default Configuration</h4>
                      <div className="font-mono text-xs text-muted-foreground space-y-0.5">
                        <p><strong className="text-foreground">Algorithm:</strong> Force-directed network synthesis</p>
                        <p><strong className="text-foreground">Acceleration:</strong> Barnes-Hut quadtree (&theta; = 0.7)</p>
                        <p><strong className="text-foreground">Training data:</strong> 1,729 real-world SWMM5 models</p>
                        <p><strong className="text-foreground">Elements:</strong> 15,394,727 across 23 countries</p>
                        <p><strong className="text-foreground">Model range:</strong> 47 to 87,000 junctions</p>
                      </div>
                      <p className="mt-3 text-xs">This is the default because it's the only option that simultaneously gives you <strong>speed</strong> (Barnes-Hut), <strong>spatial realism</strong> (force-directed), and <strong>parametric accuracy</strong> (1,729 models). Every other approach sacrifices at least one of those three.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="validation" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">INP Validation &amp; Auto-Repair</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-4">
                    <p>Every generated <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">.inp</code> file is automatically validated before download. The built-in <strong>static analysis engine</strong> catches the most common causes of SWMM5 simulation failures without requiring a full engine run.</p>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">What Gets Checked</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Check</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Severity</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Auto-Fix</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ["All referenced nodes exist","Error","--"],
                              ["Outfall present","Error","--"],
                              ["OPTIONS section present","Error","--"],
                              ["No zero-length conduits","Error","Set min 10 ft/m"],
                              ["No zero/negative max depth","Error","Set default 4 ft"],
                              ["Adverse slopes (downstream > upstream)","Warning","Lower downstream invert"],
                              ["Very flat slopes (< 0.01%)","Warning","--"],
                              ["Undefined curve references","Error","--"],
                              ["Undefined pattern references","Warning","--"],
                              ["Orphan/disconnected nodes","Warning","--"],
                              ["Duplicate element IDs","Error","--"],
                              ["Unusual Manning's n values","Warning","Reset to 0.013"],
                              ["Unusual invert elevations","Warning","--"],
                            ].map(([c,s,f]) => (
                              <tr key={c} className="hover:bg-primary/5">
                                <td className="p-2 border border-border">{c}</td>
                                <td className={`p-2 border border-border font-medium ${s==="Error" ? "text-red-400" : "text-amber-400"}`}>{s}</td>
                                <td className="p-2 border border-border font-mono text-muted-foreground">{f}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Validation Pipeline</h4>
                      <ol className="list-decimal pl-5 space-y-1.5">
                        <li><strong>Static Analysis</strong> &mdash; Parses the INP and checks all cross-references, slope consistency, depth values, and section completeness.</li>
                        <li><strong>Auto-Repair</strong> &mdash; Fixable issues (zero depths, adverse slopes, unusual roughness) are automatically corrected. The fixed INP is available as a separate download.</li>
                        <li><strong>Engine Validation</strong> &mdash; (Future) Embed WASM SWMM 5.2.4 for full simulation validation with continuity error reporting.</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">INP Viewer Validation</h4>
                      <p>The INP Viewer tab also includes a <strong>Validate</strong> button that runs the same static analysis on any uploaded <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">.inp</code> file &mdash; useful for checking third-party models before simulation.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="models" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Model Types (7)</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Type</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Units</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Sub</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">DWF</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Pump</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["Stormwater","CFS","80%","--","0.5%"],
                            ["Sanitary","MGD","--","Yes","1%"],
                            ["Combined","CFS","100%","Yes","1%"],
                            ["Transport Only","MGD","--","--","0.3%"],
                            ["RDII Calibration","MGD","70%","--","0.5%"],
                            ["Pump Intensive","GPM","30%","Yes","4%"],
                            ["WOS Intensive","CFS","50%","Yes","1%"],
                          ].map(([t,u,s,d,p]) => (
                            <tr key={t} className="hover:bg-primary/5">
                              <td className="p-2 border border-border font-medium">{t}</td>
                              <td className="p-2 border border-border font-mono text-chart-3">{u}</td>
                              <td className="p-2 border border-border">{s}</td>
                              <td className="p-2 border border-border">{d}</td>
                              <td className="p-2 border border-border">{p}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="scenarios" className="border-border bg-card rounded-lg mb-4 border" data-testid="section-scenarios">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Which Settings Should I Use?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-card-foreground">I just want a quick test file to learn SWMM.</p>
                        <p className="text-muted-foreground">Set Junctions to 20–50, pick any Model Type, and leave Detail at Basic. This gives you a tiny network you can open in EPA SWMM immediately, run in seconds, and inspect every element by hand.</p>
                      </div>
                      <div>
                        <p className="font-bold text-card-foreground">I need a realistic residential subdivision model.</p>
                        <p className="text-muted-foreground">Choose Sanitary or Combined model type, set Terrain to Moderate, Detail to Moderate, and Land Use to Residential. Start with 200–500 junctions for a typical subdivision. Enable DWF patterns and set Infiltration to Horton for realistic dry-weather and wet-weather response.</p>
                      </div>
                      <div>
                        <p className="font-bold text-card-foreground">I want to stress-test with a 100-year storm event.</p>
                        <p className="text-muted-foreground">Use the Stormwater model type with 1,000+ junctions, Detail set to Detailed, and Terrain set to Hilly or Mountainous. Select an SCS Type II or Huff rainfall distribution and increase storm intensity. This will generate surcharging conditions and help you evaluate system capacity under extreme loading.</p>
                      </div>
                      <div>
                        <p className="font-bold text-card-foreground">I&apos;m testing CSO/SSO overflow scenarios.</p>
                        <p className="text-muted-foreground">Select Combined model type with 500+ junctions, Detailed detail level, and Mixed or Commercial land use. The generator will include weirs, orifices, and storage units that represent overflow structures. Crown-matching offsets appear automatically at the Detailed level for hydraulically accurate connections.</p>
                      </div>
                      <div>
                        <p className="font-bold text-card-foreground">I need a network for RDII calibration work.</p>
                        <p className="text-muted-foreground">Select the RDII Calibration model type with 300–800 junctions and Moderate detail. Use Green-Ampt infiltration and adjust subcatchment parameters to represent your basin. The generated RDII unit hydrograph parameters (R, T, K) provide a realistic starting point for calibration.</p>
                      </div>
                      <div>
                        <p className="font-bold text-card-foreground">I&apos;m building a city-scale capacity planning model.</p>
                        <p className="text-muted-foreground">Set Junctions to 2,000–5,000 with Detailed detail level and enable ReSWMM conduit discretization. Use the Force-Directed generation method with Barnes-Hut optimization for spatially realistic layouts. This produces large networks suitable for master planning, capacity assessment, and long-term simulation studies.</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="offsets" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Offset Algorithm (6M conduits)</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Pattern</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Basic</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Moderate</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Detailed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["Both zero","90%","65%","35%"],
                            ["Outlet only","7%","25%","45%"],
                            ["Inlet only","1%","3%","5%"],
                            ["Both nonzero","2%","7%","15%"],
                          ].map(([p,b,m,d]) => (
                            <tr key={p} className="hover:bg-primary/5">
                              <td className="p-2 border border-border font-medium">{p}</td>
                              <td className="p-2 border border-border font-mono">{b}</td>
                              <td className="p-2 border border-border font-mono">{m}</td>
                              <td className="p-2 border border-border font-mono">{d}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3"><strong>Crown matching:</strong> <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">outlet_offset = downstream_diameter - this_diameter</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="stats" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">SWMM5 Real-World Statistics (1,729 Models)</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Dataset Summary</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Dataset</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Models</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Elements</th>
                          </tr></thead>
                          <tbody>
                            {[["Uploaded","57","280,656"],["Semi_Real","389","535,555"],["Large (>5MB)","404","8,783,195"],["Mid (1-5MB)","879","5,795,321"],["Total","1,729","15,394,727"]].map(([d,m,e]) => (
                              <tr key={d} className="hover:bg-primary/5">
                                <td className={`p-2 border border-border ${d==="Total"?"font-bold":""}`}>{d}</td>
                                <td className="p-2 border border-border font-mono">{m}</td>
                                <td className="p-2 border border-border font-mono">{e}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Element Breakdown (15,394,727 total)</h4>
                      <div className="space-y-1.5">
                        {SWMM5_REAL_STATS.elementBreakdown.map(({ element, count, pct: p }) => (
                          <div key={element}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-foreground">{element}</span>
                              <span className="font-mono text-muted-foreground">{fmt(count)} ({p}%)</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded overflow-hidden">
                              <div className="h-full rounded" style={{ width: `${Math.max(1, p / 40 * 100)}%`, background: "#38bdf8" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Model Size Distribution</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Element Range</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Models</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">%</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Distribution</th>
                          </tr></thead>
                          <tbody>
                            {SWMM5_REAL_STATS.modelSizeDistribution.map(({ range, count, pct: p }) => (
                              <tr key={range} className="hover:bg-primary/5">
                                <td className="p-2 border border-border">{range}</td>
                                <td className="p-2 border border-border font-mono">{count}</td>
                                <td className="p-2 border border-border font-mono">{p}%</td>
                                <td className="p-2 border border-border">
                                  <div className="h-2 bg-muted rounded overflow-hidden">
                                    <div className="h-full rounded" style={{ width: `${p / 25 * 100}%`, background: "#818cf8" }} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Flow Routing Methods</h4>
                        <div className="space-y-2">
                          {SWMM5_REAL_STATS.routing.map(({ method, pct: p }) => (
                            <div key={method} className="flex items-center gap-3">
                              <span className="text-xs w-20 text-foreground font-medium">{method}</span>
                              <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                                <div className="h-full rounded" style={{ width: `${p}%`, background: "#34d399" }} />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground w-10 text-right">{p}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Flow Units</h4>
                        <div className="space-y-2">
                          {SWMM5_REAL_STATS.flowUnits.map(({ unit, pct: p }) => (
                            <div key={unit} className="flex items-center gap-3">
                              <span className="text-xs w-10 text-foreground font-mono font-medium">{unit}</span>
                              <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                                <div className="h-full rounded" style={{ width: `${p}%`, background: "#38bdf8" }} />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground w-10 text-right">{p}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Infiltration Methods</h4>
                        <div className="space-y-2">
                          {SWMM5_REAL_STATS.infiltration.map(({ method, pct: p }) => (
                            <div key={method} className="flex items-center gap-3">
                              <span className="text-xs flex-shrink-0 w-28 text-foreground font-medium">{method.replace("_", " ")}</span>
                              <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                                <div className="h-full rounded" style={{ width: `${p}%`, background: "#fb923c" }} />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground w-10 text-right">{p}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Offset Mode</h4>
                        <div className="space-y-2">
                          {SWMM5_REAL_STATS.offsets.map(({ mode, pct: p }) => (
                            <div key={mode} className="flex items-center gap-3">
                              <span className="text-xs w-20 text-foreground font-medium">{mode}</span>
                              <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                                <div className="h-full rounded" style={{ width: `${p}%`, background: "#f472b6" }} />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground w-10 text-right">{p}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Cross-Section Shape Distribution (6,489,951 total)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Shape</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Count</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">%</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Distribution</th>
                          </tr></thead>
                          <tbody>
                            {SWMM5_REAL_STATS.crossSections.map(({ shape, count, pct: p }, i) => (
                              <tr key={shape} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-mono font-medium">{shape}</td>
                                <td className="p-2 border border-border font-mono">{fmt(count)}</td>
                                <td className="p-2 border border-border font-mono">{p}%</td>
                                <td className="p-2 border border-border">
                                  <div className="h-2 bg-muted rounded overflow-hidden">
                                    <div className="h-full rounded" style={{ width: `${Math.max(2, p / 76.2 * 100)}%`, background: SHAPE_COLORS[i % SHAPE_COLORS.length] }} />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Manning's Roughness (n) Distribution</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">n Value</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Usage</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Material</th>
                          </tr></thead>
                          <tbody>
                            {SWMM5_REAL_STATS.roughnessValues.map(({ value, pct: p, desc }) => (
                              <tr key={value} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-mono font-medium">{value}</td>
                                <td className="p-2 border border-border font-mono">{p}%</td>
                                <td className="p-2 border border-border text-muted-foreground">{desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Pipe Statistics (US)</h4>
                        <div className="space-y-1">
                          {Object.entries(SWMM5_REAL_STATS.pipeStats.us).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs py-1 border-b border-border/30">
                              <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className="font-mono text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Pipe Statistics (SI)</h4>
                        <div className="space-y-1">
                          {Object.entries(SWMM5_REAL_STATS.pipeStats.si).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs py-1 border-b border-border/30">
                              <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className="font-mono text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Junction Depth (US)</h4>
                        <div className="space-y-1">
                          {Object.entries(SWMM5_REAL_STATS.depthStats.us).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs py-1 border-b border-border/30">
                              <span className="text-muted-foreground capitalize">{k}</span>
                              <span className="font-mono text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Junction Depth (SI)</h4>
                        <div className="space-y-1">
                          {Object.entries(SWMM5_REAL_STATS.depthStats.si).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs py-1 border-b border-border/30">
                              <span className="text-muted-foreground capitalize">{k}</span>
                              <span className="font-mono text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="reswmm" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">ReSWMM &mdash; Conduit Discretization Tool</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-4">
                    <p><strong>ReSWMM</strong> is a companion Windows desktop application by <strong>Robson Leo Pachaly</strong> (<a href="mailto:robsonleopachaly@yahoo.com.br" className="text-primary hover:underline">robsonleopachaly@yahoo.com.br</a>, started April 2018, VB.NET) that improves EPA SWMM hydraulic simulations by <strong>discretizing long conduits</strong> &mdash; splitting them into shorter segments with intermediate junction nodes. This is a well-known technique for improving numerical stability in SWMM's dynamic wave solver when conduit lengths vary widely.</p>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Why Discretize?</h4>
                      <p>SWMM's dynamic wave routing uses the <strong>Courant&ndash;Friedrichs&ndash;Lewy (CFL)</strong> condition for stable time steps. When a network mixes very long and very short conduits, the shortest one dictates the maximum stable time step for the entire model. Discretizing long conduits into shorter, more uniform segments enables more balanced and numerically stable simulations. ReSWMM flags when the longest conduit exceeds 4&times; the shortest.</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Analysis</h4>
                      <p>When a <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">.inp</code> file is loaded, ReSWMM parses <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">[CONDUITS]</code> and <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">[XSECTIONS]</code>, then computes two recommended time steps per conduit using <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">L / &radic;(g&middot;D)</code>: the standard CFL-based value and the Vasconcelos et al. (2018) conservative value (10% of standard).</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Discretization Methods</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Method</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Parameters</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Behavior</th>
                          </tr></thead>
                          <tbody>
                            <tr className="hover:bg-primary/5">
                              <td className="p-2 border border-border font-medium">Fixed Interval</td>
                              <td className="p-2 border border-border font-mono">min/max interval length</td>
                              <td className="p-2 border border-border">Divides each conduit into equal-length segments within the specified range, adjusting with mm-level precision</td>
                            </tr>
                            <tr className="hover:bg-primary/5">
                              <td className="p-2 border border-border font-medium">&Delta;x/D-Based</td>
                              <td className="p-2 border border-border font-mono">&Delta;x/D ratio (default: 5)</td>
                              <td className="p-2 border border-border">Segment length = ratio &times; pipe diameter; automatically adapts to pipe size (finer discretization for smaller pipes)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">What Gets Modified</h4>
                      <p>For each discretized conduit, ReSWMM inserts new junction nodes with interpolated elevations and depths, replaces the original conduit with a chain of shorter conduits, replicates cross-section data, distributes entry/exit/average losses appropriately, and interpolates coordinates for SWMM map display. Output is saved as a new <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">_Disc.inp</code> file, preserving the original.</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Relevance to INP MAKER</h4>
                      <p>Models generated by SWMM5 INP MAKER can be post-processed with ReSWMM to improve numerical stability before simulation. The INP MAKER's terrain-based elevation assignment and pipe sizing produce realistic conduit length variation &mdash; exactly the scenario where discretization provides the most benefit.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Frequently Asked Questions</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">1. What is "physics-based force-directed network synthesis"?</h4>
                      <p>It is a <strong>spring-electric force-directed graph layout</strong> algorithm that positions nodes spatially so the network forms realistic branching patterns. N particles (future junctions) are placed in a domain and three forces act each iteration:</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Inter-particle repulsion</strong> &mdash; computed via a Barnes-Hut quadtree in O(N log N), prevents clustering</li>
                        <li><strong>Terrain gradient force</strong> &mdash; a synthetic DEM (fractal Brownian motion, 5 octaves) pushes particles downhill along elevation gradients</li>
                        <li><strong>Outfall attraction</strong> &mdash; a weak gravitational pull toward discharge points</li>
                      </ul>
                      <p className="mt-2">After particles settle (~60 iterations), each junction connects to its steepest-descent neighbor &mdash; producing naturally dendritic tree-shaped networks. The term "physics-based" refers to the particle simulation forces, not hydraulic design rules. Pipe sizing, slopes, and roughness come from statistical distributions derived from <strong>1,729 real-world SWMM models</strong> in a separate parameter assignment phase.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">2. What does the ReSWMM Discretization toggle do?</h4>
                      <p>When enabled, the generator automatically <strong>splits long conduits</strong> into shorter segments with intermediate junction nodes before writing the INP file. This is based on the CFL (Courant&ndash;Friedrichs&ndash;Lewy) stability condition for SWMM's dynamic wave solver.</p>
                      <p className="mt-2">Two methods are available:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><strong>Fixed Interval</strong> &mdash; splits each conduit into equal segments within a user-specified min/max length range</li>
                        <li><strong>&Delta;x/D Ratio</strong> &mdash; segment length = ratio &times; pipe diameter (default ratio: 5), so smaller pipes get finer discretization</li>
                      </ul>
                      <p className="mt-2">New intermediate junctions get interpolated invert elevations and a configurable Minimum Nodal Surface Area (MNSA). The technique is from Robson Leo Pachaly's ReSWMM tool (2018) and the conservative CFL recommendation by Vasconcelos et al. (2018).</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">3. Zero subcatchments for sanitary sewer &mdash; is that intentional?</h4>
                      <p><strong>Yes.</strong> Sanitary sewer models use dry weather flow (DWF) patterns on junctions, not rainfall-runoff from subcatchments. The generator follows real-world conventions:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><strong>Stormwater</strong> &rarr; ~80% of junctions get subcatchments (rainfall-driven)</li>
                        <li><strong>Combined</strong> &rarr; ~100% get subcatchments (both DWF and rainfall)</li>
                        <li><strong>Sanitary</strong> &rarr; 0% subcatchments (DWF only)</li>
                        <li><strong>RDII Calibration</strong> &rarr; ~70% get subcatchments</li>
                      </ul>
                      <p className="mt-2">You can manually override the subcatchment count using the <strong>Subcatchments</strong> slider in the Hydrology Parameters section, regardless of model type.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">4. Are the element ratios fixed or model-type-dependent?</h4>
                      <p><strong>Model-type-dependent.</strong> Each model type (stormwater, sanitary, combined, etc.) has its own set of element ratio rules derived from statistical analysis of the 1,729-model dataset. For example:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><strong>Conduit:Junction ratio</strong> &mdash; typically 1.03:1 (dendritic networks have ~1 conduit per junction)</li>
                        <li><strong>Storage nodes</strong> &mdash; 2% for stormwater, less for sanitary</li>
                        <li><strong>Pumps</strong> &mdash; 0.5% for stormwater, 1% for sanitary/combined, 4% for pump-intensive</li>
                        <li><strong>Outfalls</strong> &mdash; auto-calculated from model type ratio or set manually</li>
                      </ul>
                      <p className="mt-2">These are the median ratios from real models, not arbitrary formulas.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">5. What does Detail Level (Basic / Moderate / Detailed) change?</h4>
                      <p>Detail level primarily affects <strong>pipe offset patterns</strong> and the <strong>complexity of hydraulic structures</strong>:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><strong>Basic</strong> &mdash; 90% zero offsets, simpler parameters, fewer control rules</li>
                        <li><strong>Moderate</strong> &mdash; 65% zero offsets, outlet offsets on 25% of conduits, mixed offset patterns</li>
                        <li><strong>Detailed</strong> &mdash; 35% zero offsets, 45% outlet-only, 15% both-nonzero; crown matching logic applied; more varied control rules and pump curves</li>
                      </ul>
                      <p className="mt-2">It does not add LID controls, RDII, snowpacks, or water quality sections. It affects the spatial and hydraulic realism of the generated pipe network.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">6. How does terrain translate to invert elevations?</h4>
                      <p>The generator creates a <strong>synthetic DEM first</strong>, then places nodes on it:</p>
                      <ol className="list-decimal pl-5 mt-1 space-y-1">
                        <li>A fractal Brownian motion surface (5 octaves of Perlin-style noise) is generated with a base slope toward outfall points</li>
                        <li>N particles are scattered across this surface and settle via the force-directed simulation</li>
                        <li>Raw DEM elevations at settled positions are linearly mapped to the user's terrain slope range (e.g., "Moderate" = 0.2&ndash;1.5%)</li>
                        <li>The outfall is placed at the configured outfall elevation</li>
                        <li>Each upstream junction's elevation = outfall elevation + (accumulated slope &times; distance from outfall)</li>
                      </ol>
                      <p className="mt-2">This produces a tree structure where each upstream branch gets progressively higher, following the terrain surface.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">7. What are the example presets?</h4>
                      <p>There are <strong>33 pre-configured example models</strong> covering specific use cases, not specific cities. They include:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>"Tiny Test" (20 junctions) through "Mega City" (3000+ junctions)</li>
                        <li>Model types: small sanitary, large combined, mountain terrain storm, pump-intensive, WOS-intensive</li>
                        <li>Generation method showcases: Horton-Strahler branching, L-System (dendritic/grid/radial), Space Colonization, MST</li>
                        <li>Terrain variations: flat coastal, hilly suburban, steep mountain</li>
                        <li>Special configurations: ReSWMM-enabled models, SI metric units, detailed offset patterns</li>
                      </ul>
                      <p className="mt-2">Each preset sets all config parameters simultaneously &mdash; you can then modify any setting before generating.</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">8. What does the INP Viewer tab show?</h4>
                      <p>The INP Viewer is a <strong>full-featured INP file browser</strong> that can display both generated and uploaded files:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li><strong>Raw text view</strong> &mdash; browse any section of the INP file with syntax highlighting</li>
                        <li><strong>Categorized section sidebar</strong> &mdash; sections grouped by type (Topology, Hydrology, Hydraulics, etc.)</li>
                        <li><strong>Sortable/searchable data tables</strong> &mdash; each section parsed into columns for easy browsing</li>
                        <li><strong>Descriptive statistics</strong> &mdash; min, max, mean, median, std dev for numeric columns</li>
                        <li><strong>Histograms</strong> &mdash; SVG distribution charts for any numeric column</li>
                        <li><strong>Validation</strong> &mdash; built-in "Validate" button runs the static analysis engine on any uploaded file</li>
                        <li><strong>Drag-and-drop upload</strong> &mdash; drop any .inp file to analyze it</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">9. How do generated files work with ICM SWMM import?</h4>
                      <p>Generated INP files follow the <strong>standard EPA SWMM5 format</strong> with all required sections ([TITLE], [OPTIONS], [JUNCTIONS], [CONDUITS], [XSECTIONS], [COORDINATES], etc.). For ICM SWMM import compatibility:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>All node/conduit IDs are simple alphanumeric strings (J1, C1, OUT1, etc.)</li>
                        <li>Coordinates are provided in [COORDINATES] section using the configured unit system</li>
                        <li>The built-in validator catches missing required fields and undefined references before download</li>
                        <li>Auto-repair fixes adverse slopes, zero-length conduits, and invalid depths</li>
                      </ul>
                      <p className="mt-2">The validation report shown after generation (section counts, error/warning counts, fix details) serves as a QA checklist. The "Download Fixed" option provides the validated, repaired INP file ready for import.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="glossary" className="border-border bg-card rounded-lg mb-4 border" data-testid="section-glossary">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground"><BookOpen className="w-5 h-5 inline-block mr-2 align-text-bottom" />Glossary</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-3">
                    <dl className="space-y-3">
                      <div>
                        <dt className="font-bold text-card-foreground">Adverse Slope</dt>
                        <dd className="text-muted-foreground">A conduit whose downstream invert elevation is higher than its upstream invert, causing water to flow against the intended gravity direction. The validator flags and auto-repairs these.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">Barnes-Hut Quadtree</dt>
                        <dd className="text-muted-foreground">An O(N log N) approximation algorithm for N-body repulsion that recursively subdivides 2D space into quadrants, treating distant node clusters as single point masses to speed up force-directed layout.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">CFL Condition</dt>
                        <dd className="text-muted-foreground">Courant-Friedrichs-Lewy condition &mdash; a numerical stability criterion requiring the simulation time step to be small enough that a wave cannot travel more than one computational cell per step. ReSWMM uses a conservative 10% CFL value.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">Crown Matching</dt>
                        <dd className="text-muted-foreground">An offset method where the top (crown) of connecting pipes are aligned at the same elevation, commonly used in sanitary sewer design to prevent surcharge at junctions.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">DWF (Dry Weather Flow)</dt>
                        <dd className="text-muted-foreground">The baseline wastewater flow entering a sewer system during dry conditions, typically following diurnal patterns driven by residential and commercial water use.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">Force Main</dt>
                        <dd className="text-muted-foreground">A pressurized pipe downstream of a pump station that conveys wastewater under pressure rather than by gravity. Modeled with Hazen-Williams or Darcy-Weisbach equations in SWMM.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">Invert Elevation</dt>
                        <dd className="text-muted-foreground">The elevation of the lowest interior point (bottom) of a pipe or manhole. Determines gravity flow direction and hydraulic grade line calculations.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">Manning&apos;s n</dt>
                        <dd className="text-muted-foreground">A roughness coefficient used in Manning&apos;s equation for open-channel and gravity pipe flow. Typical values range from 0.011 (smooth PVC) to 0.024 (corrugated metal).</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">MNSA (Minimum Nodal Surface Area)</dt>
                        <dd className="text-muted-foreground">The plan-view area assigned to ReSWMM intermediate junctions, controlling the surcharge volume storage at discretized nodes. Larger values allow more water to pond at a junction before pressurizing.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">RDII (Rainfall-Dependent Infiltration/Inflow)</dt>
                        <dd className="text-muted-foreground">Stormwater that enters sanitary sewers through defective joints, cracked pipes, and illegal connections during and after rainfall events. Modeled using unit hydrograph parameters (R, T, K).</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">ReSWMM</dt>
                        <dd className="text-muted-foreground">A conduit discretization tool by Robson Leo Pachaly that subdivides long conduits into shorter segments using CFL-based analysis, improving dynamic wave simulation stability and accuracy.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">Subcatchment</dt>
                        <dd className="text-muted-foreground">A hydrologic land area that drains to a single discharge point (node). Characterized by area, imperviousness, slope, width, and infiltration parameters for rainfall-runoff modeling.</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-card-foreground">Surcharge</dt>
                        <dd className="text-muted-foreground">A condition where water rises above the crown of a pipe or the rim of a junction, indicating the system is operating beyond its gravity-flow capacity and may experience flooding.</dd>
                      </div>
                    </dl>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="source" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground"><Code className="w-5 h-5 inline-block mr-2 align-text-bottom" />Source Code</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground space-y-4">
                    <p>This application is entirely client-side &mdash; all SWMM5 model generation, validation, and analysis runs in your browser. The complete source is organized as follows:</p>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Core Engine (client/src/lib/)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">File</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Lines</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Purpose</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ["swmm-engine.ts","~1,645","Complete physics engine: TerrainDEM (fBm noise), Barnes-Hut quadtree particle simulation, dendritic graph builder, INP file writer, ReSWMM discretization, profile path builder, rainfall profiles, all constants from 1,729 models, 33 example presets"],
                              ["generators.ts","~500","4 alternative network generation algorithms: Horton-Strahler recursive branching, L-System grammar (dendritic/grid/radial variants), Space Colonization, Minimum Spanning Tree (Prim's)"],
                              ["rain-canvas.ts","~400","Rain Canvas Studio: 34 rainfall temporal patterns across 8 categories (SCS/NRCS, Huff quartiles, Chicago, Alternating Block, Triangular, Regional US, International, Historical)"],
                              ["inp-parser.ts","~230","Client-side INP file parser: section detection, column mapping for 40+ SWMM5 sections, descriptive statistics, histogram data"],
                              ["inp-validator.ts","~475","Static INP validator with auto-repair: checks orphan nodes, adverse slopes, undefined references, zero-length conduits, missing sections, duplicate IDs, unusual values"],
                              ["utils.ts","--","Tailwind CSS utility merge helper"],
                              ["queryClient.ts","--","TanStack Query client configuration"],
                            ].map(([f,l,d]) => (
                              <tr key={f} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-mono font-medium text-chart-3">{f}</td>
                                <td className="p-2 border border-border font-mono text-right">{l}</td>
                                <td className="p-2 border border-border">{d}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">UI Components (client/src/components/)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">File</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Lines</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Purpose</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ["network-canvas.tsx","~270","Interactive HTML5 canvas: pan/zoom with mouse wheel, node/conduit rendering, tooltips showing junction name + elevation + upstream count"],
                              ["profile-canvas.tsx","~330","Longitudinal profile view: invert + crown elevation lines from outfall to upstream, hover tooltips, automatic path selection"],
                              ["inp-viewer.tsx","~610","INP file browser: drag-and-drop upload, categorized section sidebar, sortable/searchable data tables, SVG histograms, descriptive statistics, auto-validation"],
                              ["validation-panel.tsx","~165","Validation results: status badge, error/warning/fix counts, collapsible details with repair descriptions, download-fixed button"],
                              ["onboarding.tsx","~200","6-step animated walkthrough overlay for first-time visitors with localStorage persistence"],
                              ["theme-provider.tsx","~70","5-theme system (Light/Dark/UF/EPA/OSU): CSS class management, localStorage persistence, flash-free loading"],
                            ].map(([f,l,d]) => (
                              <tr key={f} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-mono font-medium text-chart-3">{f}</td>
                                <td className="p-2 border border-border font-mono text-right">{l}</td>
                                <td className="p-2 border border-border">{d}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Pages &amp; App Shell (client/src/)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead><tr className="bg-muted">
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">File</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Lines</th>
                            <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Purpose</th>
                          </tr></thead>
                          <tbody>
                            {[
                              ["pages/home.tsx","~1,375","Main page: tabbed layout (Generator + INP Viewer + Docs), config panel, hydrology controls, example presets, network/profile canvases, element cards, charts, validation panel"],
                              ["App.tsx","~30","Router setup (wouter): single-page app with / route"],
                              ["main.tsx","~5","React entry point: mounts App with QueryClientProvider"],
                              ["index.css","~400","Tailwind CSS config: light/dark/UF/EPA/OSU theme variables, elevation system, component overrides"],
                            ].map(([f,l,d]) => (
                              <tr key={f} className="hover:bg-primary/5">
                                <td className="p-2 border border-border font-mono font-medium text-chart-3">{f}</td>
                                <td className="p-2 border border-border font-mono text-right">{l}</td>
                                <td className="p-2 border border-border">{d}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
                      <p className="font-mono text-xs text-muted-foreground"><strong className="text-foreground">Total:</strong> ~6,300 lines of application code across 17 source files (excludes ~50 Shadcn UI component files in components/ui/)</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1"><strong className="text-foreground">Stack:</strong> React + TypeScript + Vite + Tailwind CSS + Shadcn/ui + wouter + TanStack Query</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1"><strong className="text-foreground">Backend:</strong> Express (serves frontend only, no API routes &mdash; all computation is client-side)</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="credits" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Credits &amp; References</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <p><strong>SWMM5 INP MAKER Author:</strong> Robert Dickinson &mdash; <a href="https://swmm5.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMM5.org</a> &mdash; February 2026</p>
                    <p className="mt-2"><strong>Data:</strong> <a href="https://github.com/SWMMEnablement/1729-SWMM5-Models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMMEnablement/1729-SWMM5-Models</a> &mdash; 1,729 real-world models, 15,394,727 elements, 6,489,951 cross-sections</p>
                    <p className="mt-2"><strong>Algorithms:</strong> Barnes-Hut (Barnes &amp; Hut, 1986) &middot; fBm terrain (Perlin) &middot; Steepest-descent dendritic construction &middot; Static INP validation with auto-repair</p>
                    <p className="mt-4 pt-3 border-t border-border"><strong>ReSWMM &mdash; SWMM Conduit Discretization Tool:</strong> Robson Leo Pachaly (<a href="mailto:robsonleopachaly@yahoo.com.br" className="text-primary hover:underline">robsonleopachaly@yahoo.com.br</a>), started April 2018 &mdash; VB.NET (Windows Forms). Discretizes long conduits using CFL-based analysis and Fixed Interval or &Delta;x/D methods for improved SWMM dynamic wave stability.</p>
                    <p className="mt-2"><strong>Reference:</strong> Vasconcelos, J. G. et al. (2018) &mdash; Conservative time step recommendation (10% of standard CFL value) used in ReSWMM analysis.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>

        <footer className="mt-12 py-5 border-t border-border text-center text-xs text-muted-foreground">
          SWMM5 INP MAKER &middot; Robert Dickinson &middot; <a href="https://swmm5.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMM5.org</a> &middot; February 2026
          <br />
          Rules from <a href="https://github.com/SWMMEnablement/1729-SWMM5-Models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMMEnablement/1729-SWMM5-Models</a> &mdash; 1,729 models / 15,394,727 elements
          <br />
          ReSWMM Discretization Tool &middot; Robson Leo Pachaly (2018) &middot; Vasconcelos et al. (2018)
        </footer>
      </div>

      {showOnboarding && <Onboarding onComplete={dismissOnboarding} />}
    </div>
  );
}
