import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  generateModel,
  EXAMPLE_PRESETS,
  DEFAULT_RESWMM,
  DEFAULT_HYDROLOGY,
  ALL_SECTIONS,
  getSections,
  compute,
  RATIOS,
  GENERATION_METHOD_LABELS,
  L_SYSTEM_VARIANT_LABELS,
  INFILTRATION_LABELS,
  type SwmmConfig,
  type GeneratedModel,
} from "../client/src/lib/swmm-engine";
import { RAIN_CANVAS_CATALOG } from "../client/src/lib/rain-canvas";
import { validateInp } from "../client/src/lib/inp-validator";
import { transformInp, DEFAULT_TRANSFORM, type TransformConfig } from "../client/src/lib/inp-transformer";

const SWMM_BIN = join(process.cwd(), "swmm5");
const SIM_TIMEOUT_MS = 60_000;

function patchInpForQuickSim(inp: string): string {
  const lines = inp.split('\n');
  const out: string[] = [];
  let inOptions = false;
  let patched = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (inOptions && !patched) {
        out.push('END_DATE             01/01/2025');
        out.push('END_TIME             00:01:00');
        patched = true;
      }
      inOptions = trimmed.toUpperCase() === '[OPTIONS]';
      out.push(line);
      continue;
    }
    if (inOptions) {
      const key = trimmed.split(/\s+/)[0]?.toUpperCase();
      if (key === 'START_DATE') {
        out.push('START_DATE           01/01/2025');
        continue;
      }
      if (key === 'START_TIME') {
        out.push('START_TIME           00:00:00');
        continue;
      }
      if (key === 'END_DATE') {
        out.push('END_DATE             01/01/2025');
        continue;
      }
      if (key === 'END_TIME') {
        out.push('END_TIME             00:01:00');
        patched = true;
        continue;
      }
      if (key === 'REPORT_START_DATE') {
        out.push('REPORT_START_DATE    01/01/2025');
        continue;
      }
      if (key === 'REPORT_START_TIME') {
        out.push('REPORT_START_TIME    00:00:00');
        continue;
      }
      if (key === 'REPORT_STEP') {
        out.push('REPORT_STEP          00:01:00');
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

interface SimResult {
  success: boolean;
  continuityError: number | null;
  routingError: number | null;
  warnings: number;
  errors: string[];
  elapsed: number;
  version: string;
  summary: string;
}

function parseReport(report: string): SimResult {
  const res: SimResult = {
    success: false,
    continuityError: null,
    routingError: null,
    warnings: 0,
    errors: [],
    elapsed: 0,
    version: '5.2.4',
    summary: '',
  };

  const contMatch = report.match(/Runoff Quantity Continuity.*?(-?[\d.]+)\s*%/s);
  if (contMatch) res.continuityError = parseFloat(contMatch[1]);

  const routeMatch = report.match(/Flow Routing Continuity.*?(-?[\d.]+)\s*%/s);
  if (routeMatch) res.routingError = parseFloat(routeMatch[1]);

  const warnMatch = report.match(/WARNING\s+(\d+)/gi);
  res.warnings = warnMatch ? warnMatch.length : 0;

  const errorMatches = report.match(/^.*ERROR\s+\d+.*$/gmi);
  if (errorMatches) {
    res.errors = errorMatches.map(e => e.trim()).filter(e => e.length > 0);
  }

  const timeMatch = report.match(/Total Elapsed Time\s*[.:]\s*([\d:.]+)/i);
  if (timeMatch) res.elapsed = parseFloat(timeMatch[1]) || 0;

  res.success = res.errors.length === 0;

  const parts: string[] = [];
  if (res.success) {
    parts.push('Simulation completed successfully');
    if (res.continuityError !== null) parts.push(`runoff continuity error ${Math.abs(res.continuityError).toFixed(2)}%`);
    if (res.routingError !== null) parts.push(`routing continuity error ${Math.abs(res.routingError).toFixed(2)}%`);
    if (res.warnings > 0) parts.push(`${res.warnings} warning${res.warnings > 1 ? 's' : ''}`);
  } else {
    parts.push(`Simulation failed: ${res.errors[0] || 'unknown error'}`);
  }
  res.summary = parts.join(', ');

  return res;
}

function safeNum(val: any, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function clampNum(val: any, min: number, max: number, fallback: number): number {
  const n = safeNum(val, fallback);
  return Math.max(min, Math.min(max, n));
}

const activeGenerations = { count: 0 };
const MAX_CONCURRENT_GENERATIONS = 5;

function buildConfig(body: any): SwmmConfig {
  const defaults = {
    N: 200,
    type: 'sanitary' as const,
    units: 'US' as const,
    terrain: 'flat' as const,
    detail: 'basic' as const,
    landUse: 'residential' as const,
    outfallElev: 0,
    reswmm: { ...DEFAULT_RESWMM },
    ...DEFAULT_HYDROLOGY,
  };

  const validTypes = ['sanitary', 'stormwater', 'combined', 'transport_only', 'rdii_calibration', 'pump_intensive', 'wos_intensive'];
  const validUnits = ['US', 'SI'];
  const validTerrain = ['flat', 'moderate', 'hilly', 'mountainous'];
  const validDetail = ['basic', 'moderate', 'detailed'];
  const validLandUse = ['mixed', 'residential', 'commercial', 'industrial'];
  const validGenMethods = Object.keys(GENERATION_METHOD_LABELS);
  const validLSystemVariants = Object.keys(L_SYSTEM_VARIANT_LABELS);
  const validInfiltration = Object.keys(INFILTRATION_LABELS);

  const config: SwmmConfig = { ...defaults };

  if (body.N != null) config.N = Math.round(clampNum(body.N, 10, 10000, 200));
  if (body.type && validTypes.includes(body.type)) config.type = body.type;
  if (body.units && validUnits.includes(body.units)) config.units = body.units;
  if (body.terrain && validTerrain.includes(body.terrain)) config.terrain = body.terrain;
  if (body.detail && validDetail.includes(body.detail)) config.detail = body.detail;
  if (body.landUse && validLandUse.includes(body.landUse)) config.landUse = body.landUse;
  if (body.outfallElev != null) config.outfallElev = safeNum(body.outfallElev, 0);
  if (body.generationMethod && validGenMethods.includes(body.generationMethod)) config.generationMethod = body.generationMethod as any;
  if (body.lSystemVariant && validLSystemVariants.includes(body.lSystemVariant)) config.lSystemVariant = body.lSystemVariant as any;
  if (body.infiltrationMethod && validInfiltration.includes(body.infiltrationMethod)) config.infiltrationMethod = body.infiltrationMethod as any;

  if (body.numOutfalls != null) config.numOutfalls = Math.round(clampNum(body.numOutfalls, 1, 100, 1));
  if (body.numSubcatchments != null) config.numSubcatchments = Math.round(clampNum(body.numSubcatchments, 0, 10000, 0));
  if (body.dwfNodePct != null) config.dwfNodePct = clampNum(body.dwfNodePct, 0, 100, 65);
  if (Array.isArray(body.dwfPatterns)) config.dwfPatterns = body.dwfPatterns.filter((p: string) => ['Diurnal', 'Monthly', 'Weekend', 'Seasonal'].includes(p));
  if (body.inflowTsPct != null) config.inflowTsPct = clampNum(body.inflowTsPct, 0, 100, 0);
  if (body.rainfallDepth != null) config.rainfallDepth = clampNum(body.rainfallDepth, 0.1, 200, 2.0);
  if (body.rainfallDuration != null) config.rainfallDuration = clampNum(body.rainfallDuration, 0.5, 72, 6.0);
  if (body.rainfallDist != null) config.rainfallDist = String(body.rainfallDist);

  if (body.enableAquifers != null) config.enableAquifers = Boolean(body.enableAquifers);
  if (body.enableGroundwater != null) config.enableGroundwater = Boolean(body.enableGroundwater);
  if (body.enableLID != null) config.enableLID = Boolean(body.enableLID);
  if (body.enableWQ != null) config.enableWQ = Boolean(body.enableWQ);
  if (body.enableSnowmelt != null) config.enableSnowmelt = Boolean(body.enableSnowmelt);
  if (body.enableDividers != null) config.enableDividers = Boolean(body.enableDividers);
  if (body.enableStreetInlets != null) config.enableStreetInlets = Boolean(body.enableStreetInlets);
  if (body.enableCurvedLinks != null) config.enableCurvedLinks = Boolean(body.enableCurvedLinks);

  if (body.reswmm && typeof body.reswmm === 'object') {
    const r = body.reswmm;
    if (r.enabled != null) config.reswmm.enabled = Boolean(r.enabled);
    if (r.method && ['none', 'fixed_interval', 'dx_d_ratio'].includes(r.method)) config.reswmm.method = r.method;
    if (r.fixedMinLength != null) config.reswmm.fixedMinLength = clampNum(r.fixedMinLength, 10, 500, 50);
    if (r.fixedMaxLength != null) config.reswmm.fixedMaxLength = clampNum(r.fixedMaxLength, 50, 1000, 200);
    if (r.dxDRatio != null) config.reswmm.dxDRatio = clampNum(r.dxDRatio, 1, 20, 5);
    if (r.mnsa != null) config.reswmm.mnsa = clampNum(r.mnsa, 0.1, 100, 12.566);
  }

  return config;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/docs", (_req, res) => {
    res.sendFile(join(process.cwd(), "server", "api-docs.html"));
  });

  app.get("/api/info", (_req, res) => {
    res.json({
      name: "SWMM5 INP MAKER API",
      version: "1.0.0",
      swmmEngine: "5.2.4",
      description: "REST API for generating EPA SWMM5 .inp files, running simulations, and validating models",
      endpoints: {
        "POST /api/generate": "Generate a SWMM5 .inp file from configuration parameters",
        "POST /api/generate-and-simulate": "Generate an INP file and immediately run SWMM5 simulation",
        "POST /api/simulate": "Run SWMM5 simulation on provided INP content",
        "POST /api/validate": "Validate an INP file with static analysis and auto-repair",
        "POST /api/transform": "Transform/anonymize an INP file (rename elements, distort geometry)",
        "GET /api/presets": "List all example presets with their configurations",
        "GET /api/presets/:name": "Get a specific preset by name and optionally generate its INP",
        "GET /api/rainfall-patterns": "List all 276 available rainfall distributions",
        "GET /api/sections": "List all 56 SWMM5 INP sections",
        "GET /api/config-schema": "Get the full configuration schema with allowed values and defaults",
        "GET /api/info": "This endpoint — API metadata",
        "GET /api/docs": "Interactive API documentation page",
      },
      limits: {
        maxNodes: 10000,
        maxInpSize: "10MB",
        simulationTimeout: "60s",
      },
    });
  });

  app.get("/api/config-schema", (_req, res) => {
    res.json({
      N: { type: "integer", default: 200, min: 10, max: 10000, description: "Number of junction nodes in the network" },
      type: { type: "string", default: "sanitary", options: ["sanitary", "stormwater", "combined", "transport_only", "rdii_calibration", "pump_intensive", "wos_intensive"], description: "Network type — controls element ratios, pipe sizing, and section inclusion" },
      units: { type: "string", default: "US", options: ["US", "SI"], description: "Unit system (US customary or SI metric)" },
      terrain: { type: "string", default: "flat", options: ["flat", "moderate", "hilly", "mountainous"], description: "Terrain type — affects elevation generation and pipe slopes" },
      detail: { type: "string", default: "basic", options: ["basic", "moderate", "detailed"], description: "Offset detail level — controls pipe offset patterns" },
      landUse: { type: "string", default: "residential", options: ["mixed", "residential", "commercial", "industrial"], description: "Land use type — affects imperviousness, roughness, and WQ parameters" },
      outfallElev: { type: "number", default: 0, description: "Outfall invert elevation (ft or m)" },
      generationMethod: { type: "string", default: "force_directed", options: Object.entries(GENERATION_METHOD_LABELS).map(([k, v]) => ({ value: k, label: v })), description: "Network topology generation algorithm" },
      lSystemVariant: { type: "string", default: "dendritic", options: Object.entries(L_SYSTEM_VARIANT_LABELS).map(([k, v]) => ({ value: k, label: v })), description: "L-System variant (only used when generationMethod is 'l_system')" },
      infiltrationMethod: { type: "string", default: "HORTON", options: Object.entries(INFILTRATION_LABELS).map(([k, v]) => ({ value: k, label: v })), description: "Infiltration method for subcatchments" },
      numOutfalls: { type: "integer|null", default: null, min: 1, max: 100, description: "Override automatic outfall count (null = auto based on type ratios)" },
      numSubcatchments: { type: "integer|null", default: null, min: 0, max: 10000, description: "Override automatic subcatchment count (null = auto based on type ratios)" },
      dwfNodePct: { type: "number", default: 65, min: 0, max: 100, description: "Percentage of junctions receiving dry weather flow (0-100)" },
      dwfPatterns: { type: "string[]", default: ["Diurnal", "Monthly"], options: ["Diurnal", "Monthly", "Weekend", "Seasonal"], description: "DWF time pattern types to apply" },
      inflowTsPct: { type: "number", default: 0, min: 0, max: 100, description: "Percentage of junctions with external inflow time series" },
      rainfallDepth: { type: "number", default: 2.0, min: 0.1, max: 200, description: "Total rainfall depth (inches for US, mm for SI)" },
      rainfallDuration: { type: "number", default: 6.0, min: 0.5, max: 72, description: "Rainfall duration in hours" },
      rainfallDist: { type: "string", default: "scs-type-ii", description: "Rainfall distribution pattern ID (see GET /api/rainfall-patterns for full list)" },
      enableAquifers: { type: "boolean", default: false, description: "Generate [AQUIFERS] section with soil properties" },
      enableGroundwater: { type: "boolean", default: false, description: "Generate [GROUNDWATER] and [GWF] sections (requires enableAquifers)" },
      enableLID: { type: "boolean", default: false, description: "Generate [LID_CONTROLS] and [LID_USAGE] sections for green infrastructure" },
      enableWQ: { type: "boolean", default: false, description: "Generate water quality sections: [POLLUTANTS], [LANDUSES], [COVERAGES], [BUILDUP], [WASHOFF], [TREATMENT], [LOADINGS]" },
      enableSnowmelt: { type: "boolean", default: false, description: "Generate [TEMPERATURE], [ADJUSTMENTS], [SNOWPACKS] sections for cold-climate models" },
      enableDividers: { type: "boolean", default: false, description: "Convert some junctions to flow-splitting [DIVIDERS]" },
      enableStreetInlets: { type: "boolean", default: false, description: "Generate [STREETS], [INLETS], [INLET_USAGE] sections" },
      enableCurvedLinks: { type: "boolean", default: false, description: "Add [VERTICES] bend points to conduits for visual realism" },
      reswmm: {
        type: "object",
        description: "ReSWMM conduit discretization configuration",
        properties: {
          enabled: { type: "boolean", default: false, description: "Enable conduit discretization" },
          method: { type: "string", default: "fixed_interval", options: ["none", "fixed_interval", "dx_d_ratio"], description: "Discretization method" },
          fixedMinLength: { type: "number", default: 50, min: 10, max: 500, description: "Minimum segment length (fixed_interval method)" },
          fixedMaxLength: { type: "number", default: 200, min: 50, max: 1000, description: "Maximum segment length (fixed_interval method)" },
          dxDRatio: { type: "number", default: 5, min: 1, max: 20, description: "Segment length / diameter ratio (dx_d_ratio method)" },
          mnsa: { type: "number", default: 12.566, min: 0.1, max: 100, description: "Minimum Nodal Surface Area for intermediate junctions (ft² or m²)" },
        },
      },
    });
  });

  app.post("/api/generate", (req, res) => {
    if (activeGenerations.count >= MAX_CONCURRENT_GENERATIONS) {
      return res.status(429).json({ error: "Too many concurrent generation requests. Please try again shortly." });
    }
    activeGenerations.count++;
    try {
      const config = buildConfig(req.body || {});
      const startMs = Date.now();
      const result: GeneratedModel = generateModel(config);
      const elapsedMs = Date.now() - startMs;

      const format = req.query.format || req.body?.format || 'json';
      if (format === 'inp') {
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${result.stats.fileName}"`);
        return res.send(result.inpText);
      }

      res.json({
        success: true,
        inp: result.inpText,
        stats: result.stats,
        config,
        generationTimeMs: elapsedMs,
        sections: Array.from(getSections(compute(config), config)),
        sectionCount: Array.from(getSections(compute(config), config)).length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Generation failed' });
    } finally {
      activeGenerations.count--;
    }
  });

  app.post("/api/generate-and-simulate", async (req, res) => {
    if (activeGenerations.count >= MAX_CONCURRENT_GENERATIONS) {
      return res.status(429).json({ error: "Too many concurrent generation requests. Please try again shortly." });
    }
    activeGenerations.count++;
    try {
      const config = buildConfig(req.body || {});
      const genStart = Date.now();
      const result: GeneratedModel = generateModel(config);
      const genMs = Date.now() - genStart;

      let dir: string | null = null;
      try {
        dir = await mkdtemp(join(tmpdir(), 'swmm-'));
        const inpPath = join(dir, 'model.inp');
        const rptPath = join(dir, 'model.rpt');
        const outPath = join(dir, 'model.out');

        const patchedInp = patchInpForQuickSim(result.inpText);
        await writeFile(inpPath, patchedInp);

        const simStart = Date.now();
        let stderrData = '';
        await new Promise<void>((resolve, reject) => {
          const proc = execFile(SWMM_BIN, [inpPath, rptPath, outPath], {
            timeout: SIM_TIMEOUT_MS,
            maxBuffer: 5 * 1024 * 1024,
          }, (error) => {
            if (error && (error as any).killed) {
              reject(new Error('Simulation timed out (60s limit)'));
            } else {
              resolve();
            }
          });
          if (proc.stderr) proc.stderr.on('data', (d: any) => { stderrData += d.toString(); });
        });
        const simMs = Date.now() - simStart;

        let report = '';
        try {
          report = await readFile(rptPath, 'utf-8');
        } catch {
          return res.json({
            success: false,
            inp: result.inpText,
            stats: result.stats,
            config,
            generationTimeMs: genMs,
            simulation: {
              success: false,
              errors: [stderrData.trim() || 'no report file generated'],
              wallTimeMs: simMs,
              report: stderrData.trim() || '',
            },
          });
        }

        const simResult = parseReport(report);
        res.json({
          success: simResult.success,
          inp: result.inpText,
          stats: result.stats,
          config,
          generationTimeMs: genMs,
          simulation: { ...simResult, wallTimeMs: simMs, report },
        });
      } finally {
        if (dir) {
          try {
            await unlink(join(dir, 'model.inp')).catch(() => {});
            await unlink(join(dir, 'model.rpt')).catch(() => {});
            await unlink(join(dir, 'model.out')).catch(() => {});
            const { rmdir } = await import('fs/promises');
            await rmdir(dir).catch(() => {});
          } catch {}
        }
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Generation/simulation failed' });
    } finally {
      activeGenerations.count--;
    }
  });

  app.post("/api/simulate", async (req, res) => {
    const { inp } = req.body as { inp?: string };
    if (!inp || typeof inp !== 'string' || inp.length < 100) {
      return res.status(400).json({ error: "Invalid INP content" });
    }

    if (inp.length > 10_000_000) {
      return res.status(400).json({ error: "INP file too large (max 10MB)" });
    }

    let dir: string | null = null;
    try {
      dir = await mkdtemp(join(tmpdir(), 'swmm-'));
      const inpPath = join(dir, 'model.inp');
      const rptPath = join(dir, 'model.rpt');
      const outPath = join(dir, 'model.out');

      const patchedInp = patchInpForQuickSim(inp);
      await writeFile(inpPath, patchedInp);

      const startMs = Date.now();

      let stderrData = '';
      await new Promise<void>((resolve, reject) => {
        const proc = execFile(SWMM_BIN, [inpPath, rptPath, outPath], {
          timeout: SIM_TIMEOUT_MS,
          maxBuffer: 5 * 1024 * 1024,
        }, (error) => {
          if (error && (error as any).killed) {
            reject(new Error('Simulation timed out (60s limit)'));
          } else {
            resolve();
          }
        });
        if (proc.stderr) proc.stderr.on('data', (d: any) => { stderrData += d.toString(); });
      });

      const wallMs = Date.now() - startMs;

      let report = '';
      try {
        report = await readFile(rptPath, 'utf-8');
      } catch {
        await writeFile('/tmp/swmm_debug_inp.txt', patchedInp).catch(() => {});
        const errDetail = stderrData.trim() || 'no report file generated';
        return res.json({
          success: false,
          continuityError: null,
          routingError: null,
          warnings: 0,
          errors: [errDetail],
          elapsed: wallMs / 1000,
          version: '5.2.4',
          summary: `Simulation failed: ${errDetail}`,
          wallTimeMs: wallMs,
          report: stderrData.trim() ? `SWMM5 stderr output:\n${stderrData.trim()}` : '',
        });
      }

      const result = parseReport(report);
      result.elapsed = wallMs / 1000;

      res.json({ ...result, wallTimeMs: wallMs, report });
    } catch (err: any) {
      res.json({
        success: false,
        continuityError: null,
        routingError: null,
        warnings: 0,
        errors: [err.message || 'Unknown error'],
        elapsed: 0,
        version: '5.2.4',
        summary: `Simulation failed: ${err.message || 'unknown error'}`,
        wallTimeMs: 0,
        report: '',
      });
    } finally {
      if (dir) {
        try {
          await unlink(join(dir, 'model.inp')).catch(() => {});
          await unlink(join(dir, 'model.rpt')).catch(() => {});
          await unlink(join(dir, 'model.out')).catch(() => {});
          const { rmdir } = await import('fs/promises');
          await rmdir(dir).catch(() => {});
        } catch {}
      }
    }
  });

  app.post("/api/validate", (req, res) => {
    const { inp, autoFix } = req.body as { inp?: string; autoFix?: boolean };
    if (!inp || typeof inp !== 'string' || inp.length < 50) {
      return res.status(400).json({ error: "Invalid INP content" });
    }
    if (inp.length > 10_000_000) {
      return res.status(400).json({ error: "INP file too large (max 10MB)" });
    }

    try {
      const result = validateInp(inp, autoFix !== false);
      res.json({
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        fixes: result.fixes,
        stages: result.stages,
        fixedInp: result.fixedInp,
        totalTime: result.totalTime,
        nodeCount: result.nodeCount,
        linkCount: result.linkCount,
        subcatchCount: result.subcatchCount,
        engineNote: result.engineNote,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Validation failed' });
    }
  });

  app.post("/api/transform", (req, res) => {
    const { inp, config } = req.body as { inp?: string; config?: Partial<TransformConfig> };
    if (!inp || typeof inp !== 'string' || inp.length < 50) {
      return res.status(400).json({ error: "Invalid INP content" });
    }
    if (inp.length > 10_000_000) {
      return res.status(400).json({ error: "INP file too large (max 10MB)" });
    }
    try {
      const cfg: TransformConfig = { ...DEFAULT_TRANSFORM, ...config };
      const result = transformInp(inp, cfg);
      if (req.query.format === 'inp') {
        res.set('Content-Type', 'text/plain');
        return res.send(result.inp);
      }
      res.json({
        inp: result.inp,
        nameMap: result.nameMap,
        stats: result.stats,
        config: cfg,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Transform failed' });
    }
  });

  app.get("/api/presets", (_req, res) => {
    res.json({
      count: EXAMPLE_PRESETS.length,
      presets: EXAMPLE_PRESETS.map(p => ({
        name: p.name,
        description: p.description,
        rationale: p.rationale,
        tags: p.tags,
        config: p.config,
      })),
    });
  });

  app.get("/api/presets/:name", (req, res) => {
    const name = decodeURIComponent(req.params.name).toLowerCase();
    const preset = EXAMPLE_PRESETS.find(p => p.name.toLowerCase() === name);
    if (!preset) {
      return res.status(404).json({
        error: `Preset not found: ${req.params.name}`,
        available: EXAMPLE_PRESETS.map(p => p.name),
      });
    }

    const generate = req.query.generate === 'true';
    if (generate) {
      try {
        const startMs = Date.now();
        const result = generateModel(preset.config);
        const elapsedMs = Date.now() - startMs;

        const format = req.query.format;
        if (format === 'inp') {
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Content-Disposition', `attachment; filename="${result.stats.fileName}"`);
          return res.send(result.inpText);
        }

        return res.json({
          preset: { name: preset.name, description: preset.description, tags: preset.tags },
          config: preset.config,
          inp: result.inpText,
          stats: result.stats,
          generationTimeMs: elapsedMs,
        });
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Generation failed' });
      }
    }

    res.json({
      name: preset.name,
      description: preset.description,
      rationale: preset.rationale,
      tags: preset.tags,
      config: preset.config,
    });
  });

  app.get("/api/rainfall-patterns", (_req, res) => {
    const patterns = RAIN_CANVAS_CATALOG.map(category => ({
      category: category.label,
      patterns: category.patterns.map(p => ({
        id: p.id,
        name: p.name,
        region: p.region,
        peakPosition: p.peak,
      })),
    }));

    const totalCount = patterns.reduce((sum, cat) => sum + cat.patterns.length, 0);

    res.json({
      totalCount,
      categories: patterns,
    });
  });

  app.get("/api/sections", (_req, res) => {
    res.json({
      totalCount: ALL_SECTIONS.length,
      sections: ALL_SECTIONS,
      groups: {
        always: ["[TITLE]", "[OPTIONS]", "[FILES]", "[EVAPORATION]", "[JUNCTIONS]", "[OUTFALLS]", "[CONDUITS]", "[XSECTIONS]", "[LOSSES]", "[COORDINATES]", "[MAP]", "[REPORT]", "[TAGS]", "[LABELS]", "[BACKDROP]", "[PROFILES]"],
        subcatchments: ["[RAINGAGES]", "[SUBCATCHMENTS]", "[SUBAREAS]", "[INFILTRATION]", "[Polygons]", "[SYMBOLS]"],
        hydrology: ["[AQUIFERS]", "[GROUNDWATER]", "[GWF]", "[SNOWPACKS]", "[TEMPERATURE]", "[ADJUSTMENTS]"],
        hydraulics: ["[STORAGE]", "[PUMPS]", "[ORIFICES]", "[WEIRS]", "[OUTLETS]", "[DIVIDERS]", "[TRANSECTS]", "[STREETS]", "[INLETS]", "[INLET_USAGE]", "[CURVES]", "[CONTROLS]"],
        waterQuality: ["[POLLUTANTS]", "[LANDUSES]", "[COVERAGES]", "[BUILDUP]", "[WASHOFF]", "[TREATMENT]", "[LOADINGS]"],
        timeSeries: ["[DWF]", "[PATTERNS]", "[INFLOWS]", "[TIMESERIES]", "[RDII]", "[HYDROGRAPHS]"],
        lid: ["[LID_CONTROLS]", "[LID_USAGE]"],
        map: ["[COORDINATES]", "[VERTICES]", "[Polygons]", "[SYMBOLS]", "[LABELS]", "[BACKDROP]", "[MAP]"],
      },
    });
  });

  return httpServer;
}
