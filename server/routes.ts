import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
        });
      }

      const result = parseReport(report);
      result.elapsed = wallMs / 1000;

      res.json({ ...result, wallTimeMs: wallMs });
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

  return httpServer;
}
