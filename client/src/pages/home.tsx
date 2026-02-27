import { useState, useMemo, useCallback } from "react";
import { Droplets, Download, Copy, Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import NetworkCanvas from "@/components/network-canvas";
import {
  type SwmmConfig, type ModelType, type TerrainType, type DetailLevel, type LandUseType,
  type GeneratedModel,
  compute, getSections, estimateSize, generateModel, fmt, pct,
  RATIOS, FLOW_UNITS, OFFSET, SHAPES, PIPE_INCHES, PIPE_WEIGHTS,
  ALL_SECTIONS, TERRAIN_LABELS, MODEL_TYPE_LABELS,
  OFFSET_COLORS, OFFSET_LABELS, SHAPE_COLORS,
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
  const [config, setConfig] = useState<SwmmConfig>({
    N: 1000, type: "sanitary", units: "US", terrain: "moderate",
    detail: "moderate", landUse: "mixed", outfallElev: 0,
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedModel | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      try {
        const model = generateModel(config);
        setResult(model);
        toast({ title: "Model generated", description: `${fmt(model.stats.totalElements)} elements, ${model.stats.fileSize}` });
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

  const s = result?.stats;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(56,189,248,0.04) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(129,140,248,0.04) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 50% 50%, rgba(52,211,153,0.02) 0%, transparent 50%)"
      }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <header className="flex flex-col sm:flex-row sm:items-end gap-5 pb-6 mb-8 border-b-2" style={{ borderImage: "linear-gradient(90deg, #38bdf8, #818cf8, #34d399, transparent) 1" }}>
          <div className="w-16 h-16 rounded-2xl grid place-items-center flex-shrink-0" style={{
            background: "linear-gradient(135deg, #38bdf8, #818cf8, #34d399)",
            boxShadow: "0 6px 28px rgba(56,189,248,0.35), 0 0 60px rgba(129,140,248,0.15)"
          }}>
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <div>
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
            <p className="text-sm text-foreground mt-1.5">Force-directed network synthesis with Barnes-Hut quadtree &mdash; every parameter from 338 real models</p>
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-3.5 py-1 rounded-full text-xs font-mono border" style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(129,140,248,0.12))",
              borderColor: "rgba(56,189,248,0.3)", color: "#93c5fd"
            }}>
              <span className="w-1.5 h-1.5 rounded-full bg-chart-3 animate-pulse" />
              3,009,909 elements | 1,268,875 cross-sections | 22 pipe shapes
            </div>
          </div>
        </header>

        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 gap-1 mb-8">
            <TabsTrigger value="generator" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-6 py-2.5 text-sm font-semibold" data-testid="tab-generator">Generator</TabsTrigger>
            <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-6 py-2.5 text-sm font-semibold" data-testid="tab-docs">App Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-7 items-start">
              <Card className="lg:sticky lg:top-6 z-50 border-border bg-card">
                <div className="px-5 py-3.5 border-b border-border text-xs font-semibold uppercase tracking-widest text-muted-foreground">Configuration</div>
                <div className="p-5 space-y-5">
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
                    <ToggleGroup
                      testId="units"
                      value={config.units}
                      onChange={(v) => update({ units: v as "US" | "SI" })}
                      options={[{ label: "US Customary", value: "US" }, { label: "SI Metric", value: "SI" }]}
                    />
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
                      <span>Outfall Elevation</span>
                      <span className="font-mono text-sm text-primary" data-testid="text-outfall-elev">{config.outfallElev.toFixed(1)} {unitLabel}</span>
                    </div>
                    <Slider
                      min={0} max={500} step={0.5} value={[config.outfallElev]}
                      onValueChange={([v]) => update({ outfallElev: v })}
                      data-testid="slider-outfall-elev"
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full text-base font-bold py-6"
                    style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8)" }}
                    data-testid="button-generate"
                  >
                    {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate INP File"}
                  </Button>

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
                        <p className="text-[11px] text-muted-foreground font-mono" data-testid="text-file-stats">{result.stats.fileSize} | {fmt(result.stats.lineCount)} lines | {fmt(result.stats.totalElements)} total elements</p>
                      </div>
                    )}
                  </div>

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
                      ["Units", flowUnit], ["Routing", "DYNWAVE"], ["Infiltration", "HORTON"],
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="docs">
            <div className="max-w-[880px] mx-auto">
              <Accordion type="multiple" defaultValue={["overview"]}>
                <AccordionItem value="overview" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Overview</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <p>The <strong>SWMM5 INP MAKER</strong> creates realistic synthetic EPA SWMM5 <code className="font-mono text-xs bg-muted px-1.5 rounded text-chart-3">.inp</code> files of any size using a physics-based force-directed network synthesis engine. Every parameter, probability, and distribution is derived from statistical analysis of <strong>338 real-world models</strong> containing <strong>3,009,909 elements</strong> and <strong>1,268,875 cross-sections</strong>.</p>
                    <p className="mt-3">Instead of random placement, the generator uses a <strong>Barnes-Hut quadtree</strong> particle simulation where nodes settle along terrain flow paths via gravitational pull, inter-particle repulsion, and outfall attraction &mdash; producing naturally dendritic drainage networks.</p>
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
                      <p>DEM elevations map to the user's terrain range. Pipe diameters scale with upstream accumulation count. The 338-model rules engine assigns offsets, shapes, roughness, DWF, pump curves, and controls.</p>
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

                <AccordionItem value="offsets" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Offset Algorithm (1.2M conduits)</span>
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
                    <span className="font-serif text-xl text-card-foreground">Statistical Foundation</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead><tr className="bg-muted">
                          <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Dataset</th>
                          <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Models</th>
                          <th className="text-left p-2 border border-border font-semibold text-primary uppercase tracking-wider text-[10px]">Elements</th>
                        </tr></thead>
                        <tbody>
                          {[["Uploaded","11","54,883"],["Semi_Real","76","104,704"],["Large (>5MB)","79","1,717,005"],["Mid (1-5MB)","172","1,133,317"],["Total","338","3,009,909"]].map(([d,m,e]) => (
                            <tr key={d} className="hover:bg-primary/5">
                              <td className={`p-2 border border-border ${d==="Total"?"font-bold":""}`}>{d}</td>
                              <td className="p-2 border border-border font-mono">{m}</td>
                              <td className="p-2 border border-border font-mono">{e}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-muted-foreground">Routing: DYNWAVE 89% | Units: CFS 44%, CMS 18%, MGD 17% | Infiltration: HORTON 61% | Offsets: DEPTH 90%</p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="credits" className="border-border bg-card rounded-lg mb-4 border">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg [&[data-state=open]]:rounded-b-none">
                    <span className="font-serif text-xl text-card-foreground">Credits</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 text-sm leading-relaxed text-foreground">
                    <p><strong>Author:</strong> Robert Dickinson &mdash; <a href="https://swmm5.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMM5.org</a> &mdash; February 2026</p>
                    <p className="mt-2"><strong>Data:</strong> <a href="https://github.com/SWMMEnablement/1729-SWMM5-Models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMMEnablement/1729-SWMM5-Models</a></p>
                    <p className="mt-2"><strong>Algorithms:</strong> Barnes-Hut (Barnes &amp; Hut, 1986) &middot; fBm terrain (Perlin) &middot; Steepest-descent dendritic construction</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>

        <footer className="mt-12 py-5 border-t border-border text-center text-xs text-muted-foreground">
          SWMM5 INP MAKER &middot; Robert Dickinson &middot; <a href="https://swmm5.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMM5.org</a> &middot; February 2026
          <br />
          Rules from <a href="https://github.com/SWMMEnablement/1729-SWMM5-Models" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SWMMEnablement/1729-SWMM5-Models</a> &mdash; 338 models / 3,009,909 elements
        </footer>
      </div>
    </div>
  );
}
