import type { ParsedInpFile } from "./inp-parser";

export interface ModelDNA {
  nodeCount: number;
  linkCount: number;
  subcatchmentCount: number;
  outfallCount: number;
  storageCount: number;
  pumpCount: number;
  weirCount: number;
  orificeCount: number;
  sectionCount: number;
  medianDiameter: number;
  medianRoughness: number;
  avgSlope: number;
  avgLength: number;
  avgDepth: number;
  avgArea: number;
  shapeDistribution: Record<string, number>;
  featureFlags: {
    hasSubcatchments: boolean;
    hasDWF: boolean;
    hasRDII: boolean;
    hasPumps: boolean;
    hasStorage: boolean;
    hasWeirs: boolean;
    hasOrifices: boolean;
    hasInflows: boolean;
    hasPollutants: boolean;
    hasLID: boolean;
    hasControls: boolean;
    hasTransects: boolean;
    hasSnowpacks: boolean;
    hasAquifers: boolean;
    hasGroundwater: boolean;
    hasCurves: boolean;
    hasTimeseries: boolean;
    hasPatterns: boolean;
  };
  vector: number[];
}

export interface DNAPercentile {
  label: string;
  value: number;
  percentile: number;
  unit: string;
}

const REAL_WORLD_STATS = {
  nodeCount:       { p5: 8, p25: 45, p50: 180, p75: 620, p95: 3200 },
  linkCount:       { p5: 7, p25: 42, p50: 170, p75: 600, p95: 3100 },
  subcatchmentCount: { p5: 0, p25: 0, p50: 25, p75: 180, p95: 1200 },
  outfallCount:    { p5: 1, p25: 1, p50: 2, p75: 5, p95: 18 },
  storageCount:    { p5: 0, p25: 0, p50: 2, p75: 8, p95: 40 },
  pumpCount:       { p5: 0, p25: 0, p50: 0, p75: 3, p95: 15 },
  sectionCount:    { p5: 8, p25: 14, p50: 20, p75: 28, p95: 38 },
  medianDiameter:  { p5: 0.3, p25: 0.6, p50: 1.0, p75: 1.5, p95: 3.0 },
  medianRoughness: { p5: 0.010, p25: 0.012, p50: 0.013, p75: 0.015, p95: 0.024 },
  avgSlope:        { p5: 0.001, p25: 0.005, p50: 0.012, p75: 0.025, p95: 0.06 },
  avgLength:       { p5: 50, p25: 150, p50: 300, p75: 600, p95: 1500 },
  avgDepth:        { p5: 2, p25: 4, p50: 6, p75: 10, p95: 20 },
};

function computePercentile(value: number, stats: { p5: number; p25: number; p50: number; p75: number; p95: number }): number {
  if (value <= stats.p5) return 5 * (value / stats.p5);
  if (value <= stats.p25) return 5 + 20 * ((value - stats.p5) / (stats.p25 - stats.p5));
  if (value <= stats.p50) return 25 + 25 * ((value - stats.p25) / (stats.p50 - stats.p25));
  if (value <= stats.p75) return 50 + 25 * ((value - stats.p50) / (stats.p75 - stats.p50));
  if (value <= stats.p95) return 75 + 20 * ((value - stats.p75) / (stats.p95 - stats.p75));
  return Math.min(100, 95 + 5 * ((value - stats.p95) / (stats.p95 * 0.5 || 1)));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function computeModelDNA(parsed: ParsedInpFile): ModelDNA {
  const getSection = (name: string) => parsed.sections.find(s => s.name === name);
  const rowCount = (name: string) => getSection(name)?.rows.length ?? 0;

  const junctionCount = rowCount("JUNCTIONS");
  const outfallCount = rowCount("OUTFALLS");
  const storageCount = rowCount("STORAGE");
  const nodeCount = junctionCount + outfallCount + storageCount;

  const conduitCount = rowCount("CONDUITS");
  const pumpCount = rowCount("PUMPS");
  const orificeCount = rowCount("ORIFICES");
  const weirCount = rowCount("WEIRS");
  const linkCount = conduitCount + pumpCount + orificeCount + weirCount;

  const subcatchmentCount = rowCount("SUBCATCHMENTS");
  const sectionCount = parsed.sections.length;

  const xsSec = getSection("XSECTIONS");
  const diameters: number[] = [];
  const shapeDistribution: Record<string, number> = {};
  if (xsSec) {
    for (const row of xsSec.rows) {
      if (row.length >= 3) {
        const shape = row[1];
        shapeDistribution[shape] = (shapeDistribution[shape] || 0) + 1;
        const geom1 = parseFloat(row[2]);
        if (!isNaN(geom1) && geom1 > 0) diameters.push(geom1);
      }
    }
  }

  const condSec = getSection("CONDUITS");
  const roughnesses: number[] = [];
  const lengths: number[] = [];
  const slopes: number[] = [];
  const juncSec = getSection("JUNCTIONS");
  const outSec = getSection("OUTFALLS");
  const stoSec = getSection("STORAGE");
  const elevMap: Record<string, number> = {};

  if (juncSec) {
    for (const row of juncSec.rows) {
      if (row.length >= 2) {
        const e = parseFloat(row[1]);
        if (!isNaN(e)) elevMap[row[0]] = e;
      }
    }
  }
  if (outSec) {
    for (const row of outSec.rows) {
      if (row.length >= 2) {
        const e = parseFloat(row[1]);
        if (!isNaN(e)) elevMap[row[0]] = e;
      }
    }
  }
  if (stoSec) {
    for (const row of stoSec.rows) {
      if (row.length >= 2) {
        const e = parseFloat(row[1]);
        if (!isNaN(e)) elevMap[row[0]] = e;
      }
    }
  }

  if (condSec) {
    for (const row of condSec.rows) {
      if (row.length >= 5) {
        const len = parseFloat(row[3]);
        const rough = parseFloat(row[4]);
        if (!isNaN(len) && len > 0) lengths.push(len);
        if (!isNaN(rough) && rough > 0) roughnesses.push(rough);

        const fromElev = elevMap[row[1]];
        const toElev = elevMap[row[2]];
        if (fromElev !== undefined && toElev !== undefined && len > 0) {
          const slope = Math.abs(fromElev - toElev) / len;
          if (isFinite(slope)) slopes.push(slope);
        }
      }
    }
  }

  const depths: number[] = [];
  if (juncSec) {
    for (const row of juncSec.rows) {
      if (row.length >= 3) {
        const d = parseFloat(row[2]);
        if (!isNaN(d) && d > 0) depths.push(d);
      }
    }
  }

  const areas: number[] = [];
  const subcSec = getSection("SUBCATCHMENTS");
  if (subcSec) {
    for (const row of subcSec.rows) {
      if (row.length >= 4) {
        const a = parseFloat(row[3]);
        if (!isNaN(a) && a > 0) areas.push(a);
      }
    }
  }

  const featureFlags = {
    hasSubcatchments: subcatchmentCount > 0,
    hasDWF: rowCount("DWF") > 0,
    hasRDII: rowCount("RDII") > 0,
    hasPumps: pumpCount > 0,
    hasStorage: storageCount > 0,
    hasWeirs: weirCount > 0,
    hasOrifices: orificeCount > 0,
    hasInflows: rowCount("INFLOWS") > 0,
    hasPollutants: rowCount("POLLUTANTS") > 0,
    hasLID: rowCount("LID_CONTROLS") > 0 || rowCount("LID_USAGE") > 0,
    hasControls: rowCount("CONTROLS") > 0,
    hasTransects: rowCount("TRANSECTS") > 0,
    hasSnowpacks: rowCount("SNOWPACKS") > 0,
    hasAquifers: rowCount("AQUIFERS") > 0,
    hasGroundwater: rowCount("GROUNDWATER") > 0,
    hasCurves: rowCount("CURVES") > 0,
    hasTimeseries: rowCount("TIMESERIES") > 0,
    hasPatterns: rowCount("PATTERNS") > 0,
  };

  const medianDiam = median(diameters);
  const medianRough = median(roughnesses);
  const avgSl = mean(slopes);
  const avgLen = mean(lengths);
  const avgDep = mean(depths);
  const avgAr = mean(areas);

  const totalShapes = Object.values(shapeDistribution).reduce((a, b) => a + b, 0) || 1;
  const shapeFracs: number[] = [];
  const shapeKeys = ["CIRCULAR", "RECT_CLOSED", "RECT_OPEN", "TRAPEZOIDAL", "IRREGULAR", "EGG", "HORSESHOE", "FORCE_MAIN", "ARCH", "FILLED_CIRCULAR"];
  for (const k of shapeKeys) {
    shapeFracs.push((shapeDistribution[k] || 0) / totalShapes);
  }

  const flagVec = Object.values(featureFlags).map(f => f ? 1 : 0);

  const vector = [
    Math.log1p(nodeCount),
    Math.log1p(linkCount),
    Math.log1p(subcatchmentCount),
    Math.log1p(outfallCount),
    Math.log1p(storageCount),
    Math.log1p(pumpCount),
    Math.log1p(sectionCount),
    medianDiam,
    medianRough * 100,
    avgSl * 100,
    Math.log1p(avgLen),
    avgDep,
    ...shapeFracs,
    ...flagVec,
  ];

  return {
    nodeCount,
    linkCount,
    subcatchmentCount,
    outfallCount,
    storageCount,
    pumpCount,
    weirCount,
    orificeCount,
    sectionCount,
    medianDiameter: medianDiam,
    medianRoughness: medianRough,
    avgSlope: avgSl,
    avgLength: avgLen,
    avgDepth: avgDep,
    avgArea: avgAr,
    shapeDistribution,
    featureFlags,
    vector,
  };
}

export function computePercentiles(dna: ModelDNA): DNAPercentile[] {
  return [
    { label: "Nodes", value: dna.nodeCount, percentile: computePercentile(dna.nodeCount, REAL_WORLD_STATS.nodeCount), unit: "" },
    { label: "Links", value: dna.linkCount, percentile: computePercentile(dna.linkCount, REAL_WORLD_STATS.linkCount), unit: "" },
    { label: "Subcatchments", value: dna.subcatchmentCount, percentile: computePercentile(dna.subcatchmentCount, REAL_WORLD_STATS.subcatchmentCount), unit: "" },
    { label: "Outfalls", value: dna.outfallCount, percentile: computePercentile(dna.outfallCount, REAL_WORLD_STATS.outfallCount), unit: "" },
    { label: "Storage Units", value: dna.storageCount, percentile: computePercentile(dna.storageCount, REAL_WORLD_STATS.storageCount), unit: "" },
    { label: "Pumps", value: dna.pumpCount, percentile: computePercentile(dna.pumpCount, REAL_WORLD_STATS.pumpCount), unit: "" },
    { label: "Sections", value: dna.sectionCount, percentile: computePercentile(dna.sectionCount, REAL_WORLD_STATS.sectionCount), unit: "" },
    { label: "Median Diameter", value: dna.medianDiameter, percentile: computePercentile(dna.medianDiameter, REAL_WORLD_STATS.medianDiameter), unit: "ft" },
    { label: "Median Roughness", value: dna.medianRoughness, percentile: computePercentile(dna.medianRoughness, REAL_WORLD_STATS.medianRoughness), unit: "" },
    { label: "Avg Slope", value: dna.avgSlope, percentile: computePercentile(dna.avgSlope, REAL_WORLD_STATS.avgSlope), unit: "ft/ft" },
    { label: "Avg Length", value: dna.avgLength, percentile: computePercentile(dna.avgLength, REAL_WORLD_STATS.avgLength), unit: "ft" },
    { label: "Avg Depth", value: dna.avgDepth, percentile: computePercentile(dna.avgDepth, REAL_WORLD_STATS.avgDepth), unit: "ft" },
  ];
}

export function cosineSimilarity(a: ModelDNA, b: ModelDNA): number {
  const va = a.vector;
  const vb = b.vector;
  const len = Math.min(va.length, vb.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i++) {
    dot += va[i] * vb[i];
    magA += va[i] * va[i];
    magB += vb[i] * vb[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function dnaToHash(dna: ModelDNA): string {
  const parts = [
    dna.nodeCount.toString(36),
    dna.linkCount.toString(36),
    dna.subcatchmentCount.toString(36),
    dna.sectionCount.toString(36),
    Math.round(dna.medianDiameter * 100).toString(36),
    Math.round(dna.medianRoughness * 10000).toString(36),
    Math.round(dna.avgSlope * 10000).toString(36),
  ];
  return parts.join("-").toUpperCase();
}
