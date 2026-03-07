export interface TransformConfig {
  renameElements: boolean;
  prefix: string;
  distortCoordinates: boolean;
  rotation: number;
  scale: number;
  translateX: number;
  translateY: number;
  mirror: 'none' | 'x' | 'y' | 'both';
  distortElevations: boolean;
  elevationOffset: number;
  elevationScale: number;
  jitterCoords: number;
  jitterElevation: number;
  distortDimensions: boolean;
  dimensionScale: number;
  scrambleSeed: number;
}

export const DEFAULT_TRANSFORM: TransformConfig = {
  renameElements: true,
  prefix: 'N',
  distortCoordinates: true,
  rotation: 0,
  scale: 1.0,
  translateX: 0,
  translateY: 0,
  mirror: 'none',
  distortElevations: false,
  elevationOffset: 0,
  elevationScale: 1.0,
  jitterCoords: 0,
  jitterElevation: 0,
  distortDimensions: false,
  dimensionScale: 1.0,
  scrambleSeed: 42,
};

const NODE_SECTIONS = new Set([
  'JUNCTIONS', 'OUTFALLS', 'STORAGE', 'DIVIDERS',
]);

const LINK_SECTIONS = new Set([
  'CONDUITS', 'PUMPS', 'ORIFICES', 'WEIRS', 'OUTLETS',
]);

const NODE_REF_SECTIONS: Record<string, number[]> = {
  JUNCTIONS: [0],
  OUTFALLS: [0],
  STORAGE: [0],
  DIVIDERS: [0, 2],
  CONDUITS: [0, 1, 2],
  PUMPS: [0, 1, 2],
  ORIFICES: [0, 1, 2],
  WEIRS: [0, 1, 2],
  OUTLETS: [0, 1, 2],
  XSECTIONS: [0],
  LOSSES: [0],
  DWF: [0],
  INFLOWS: [0],
  RDII: [0],
  TREATMENT: [0],
  COORDINATES: [0],
  GROUNDWATER: [0, 2],
  GWF: [0],
  INLET_USAGE: [0, 2],
  TAGS: [1],
  PROFILES: [],
};

const SUBCATCH_REF_SECTIONS: Record<string, number[]> = {
  SUBCATCHMENTS: [0, 2],
  SUBAREAS: [0],
  INFILTRATION: [0],
  GROUNDWATER: [0],
  GWF: [0],
  LID_USAGE: [0],
  COVERAGES: [0],
  LOADINGS: [0],
  POLYGONS: [0],
  TAGS: [1],
};

const COORD_SECTIONS: Record<string, [number, number]> = {
  COORDINATES: [1, 2],
  VERTICES: [1, 2],
  POLYGONS: [1, 2],
  SYMBOLS: [1, 2],
  LABELS: [0, 1],
};

const ELEVATION_SECTIONS: Record<string, number[]> = {
  JUNCTIONS: [1],
  OUTFALLS: [1],
  STORAGE: [1],
  DIVIDERS: [1],
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface TransformResult {
  inp: string;
  nameMap: Record<string, string>;
  stats: {
    nodesRenamed: number;
    linksRenamed: number;
    subcatchRenamed: number;
    coordsTransformed: number;
    elevationsTransformed: number;
  };
}

export function transformInp(inp: string, config: TransformConfig): TransformResult {
  const rng = seededRandom(config.scrambleSeed);
  const lines = inp.split(/\r?\n/);
  const nameMap: Record<string, string> = {};
  const stats = { nodesRenamed: 0, linksRenamed: 0, subcatchRenamed: 0, coordsTransformed: 0, elevationsTransformed: 0 };

  let currentSection = '';
  const sectionLines: { section: string; line: string; idx: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const m = trimmed.match(/^\[([A-Za-z_]+)\]$/);
    if (m) {
      currentSection = m[1];
      sectionLines.push({ section: '', line: lines[i], idx: i });
    } else {
      sectionLines.push({ section: currentSection, line: lines[i], idx: i });
    }
  }

  if (config.renameElements) {
    const nodeNames = new Set<string>();
    const linkNames = new Set<string>();
    const subcatchNames = new Set<string>();
    const gageName = new Set<string>();
    const curveNames = new Set<string>();
    const patternNames = new Set<string>();
    const tsNames = new Set<string>();
    const transectNames = new Set<string>();
    const lidNames = new Set<string>();
    const pollutantNames = new Set<string>();
    const landuseNames = new Set<string>();
    const uhNames = new Set<string>();
    const snowpackNames = new Set<string>();
    const streetNames = new Set<string>();
    const inletNames = new Set<string>();
    const aquiferNames = new Set<string>();

    for (const sl of sectionLines) {
      const t = sl.line.trim();
      if (!t || t.startsWith(';') || t.startsWith('[')) continue;
      const parts = t.split(/\s+/);
      if (parts.length < 1) continue;

      if (NODE_SECTIONS.has(sl.section)) nodeNames.add(parts[0]);
      if (LINK_SECTIONS.has(sl.section)) linkNames.add(parts[0]);
      if (sl.section === 'SUBCATCHMENTS') subcatchNames.add(parts[0]);
      if (sl.section === 'RAINGAGES') gageName.add(parts[0]);
      if (sl.section === 'CURVES') curveNames.add(parts[0]);
      if (sl.section === 'PATTERNS') patternNames.add(parts[0]);
      if (sl.section === 'TIMESERIES') tsNames.add(parts[0]);
      if (sl.section === 'TRANSECTS' && parts[0] === 'X1' && parts.length > 1) transectNames.add(parts[1]);
      if (sl.section === 'LID_CONTROLS') lidNames.add(parts[0]);
      if (sl.section === 'POLLUTANTS') pollutantNames.add(parts[0]);
      if (sl.section === 'LANDUSES') landuseNames.add(parts[0]);
      if (sl.section === 'HYDROGRAPHS') uhNames.add(parts[0]);
      if (sl.section === 'SNOWPACKS') snowpackNames.add(parts[0]);
      if (sl.section === 'STREETS') streetNames.add(parts[0]);
      if (sl.section === 'INLETS') inletNames.add(parts[0]);
      if (sl.section === 'AQUIFERS') aquiferNames.add(parts[0]);
    }

    const pfx = config.prefix || 'N';
    let ni = 1, li = 1, si = 1;
    for (const n of nodeNames) { nameMap[n] = `${pfx}J${ni++}`; stats.nodesRenamed++; }
    for (const n of linkNames) { nameMap[n] = `${pfx}L${li++}`; stats.linksRenamed++; }
    for (const n of subcatchNames) { nameMap[n] = `${pfx}S${si++}`; stats.subcatchRenamed++; }

    let gi = 1;
    for (const n of gageName) nameMap[n] = `${pfx}RG${gi++}`;
    let ci = 1;
    for (const n of curveNames) nameMap[n] = `${pfx}CRV${ci++}`;
    let pi = 1;
    for (const n of patternNames) nameMap[n] = `${pfx}PAT${pi++}`;
    let ti = 1;
    for (const n of tsNames) nameMap[n] = `${pfx}TS${ti++}`;
    let tri = 1;
    for (const n of transectNames) nameMap[n] = `${pfx}TR${tri++}`;
    let ldi = 1;
    for (const n of lidNames) nameMap[n] = `${pfx}LID${ldi++}`;
    let pli = 1;
    for (const n of pollutantNames) nameMap[n] = `${pfx}POL${pli++}`;
    let lui = 1;
    for (const n of landuseNames) nameMap[n] = `${pfx}LU${lui++}`;
    let uhi = 1;
    for (const n of uhNames) nameMap[n] = `${pfx}UH${uhi++}`;
    let spi = 1;
    for (const n of snowpackNames) nameMap[n] = `${pfx}SP${spi++}`;
    let sti = 1;
    for (const n of streetNames) nameMap[n] = `${pfx}STR${sti++}`;
    let ini = 1;
    for (const n of inletNames) nameMap[n] = `${pfx}INL${ini++}`;
    let aqi = 1;
    for (const n of aquiferNames) nameMap[n] = `${pfx}AQ${aqi++}`;
  }

  const cosR = Math.cos(config.rotation * Math.PI / 180);
  const sinR = Math.sin(config.rotation * Math.PI / 180);
  const mirX = config.mirror === 'x' || config.mirror === 'both' ? -1 : 1;
  const mirY = config.mirror === 'y' || config.mirror === 'both' ? -1 : 1;

  function transformCoord(x: number, y: number): [number, number] {
    let tx = x, ty = y;
    tx *= mirX;
    ty *= mirY;
    const rx = tx * cosR - ty * sinR;
    const ry = tx * sinR + ty * cosR;
    tx = rx * config.scale + config.translateX;
    ty = ry * config.scale + config.translateY;
    if (config.jitterCoords > 0) {
      tx += (rng() - 0.5) * 2 * config.jitterCoords;
      ty += (rng() - 0.5) * 2 * config.jitterCoords;
    }
    return [tx, ty];
  }

  function transformElev(e: number): number {
    let te = e * config.elevationScale + config.elevationOffset;
    if (config.jitterElevation > 0) {
      te += (rng() - 0.5) * 2 * config.jitterElevation;
    }
    return te;
  }

  function replaceName(token: string): string {
    return nameMap[token] || token;
  }

  const output: string[] = [];
  for (const sl of sectionLines) {
    const t = sl.line.trim();
    if (!t || t.startsWith(';') || t.startsWith('[')) {
      if (t.startsWith('[') && config.renameElements) {
        output.push(sl.line);
      } else if (t.startsWith(';;') && config.renameElements) {
        output.push(sl.line);
      } else {
        output.push(sl.line);
      }
      continue;
    }

    const sec = sl.section;

    if (sec === 'TITLE') {
      output.push(sl.line);
      continue;
    }

    if (sec === 'OPTIONS' || sec === 'REPORT' || sec === 'FILES') {
      output.push(sl.line);
      continue;
    }

    if (sec === 'CONTROLS') {
      let line = sl.line;
      if (config.renameElements) {
        for (const [old, nw] of Object.entries(nameMap)) {
          const re = new RegExp(`\\b${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
          line = line.replace(re, nw);
        }
      }
      output.push(line);
      continue;
    }

    if (sec === 'MAP' || sec === 'BACKDROP') {
      const parts = t.split(/\s+/);
      if (config.distortCoordinates && parts[0] === 'DIMENSIONS' && parts.length >= 5) {
        const x1 = parseFloat(parts[1]), y1 = parseFloat(parts[2]);
        const x2 = parseFloat(parts[3]), y2 = parseFloat(parts[4]);
        if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
          const [tx1, ty1] = transformCoord(x1, y1);
          const [tx2, ty2] = transformCoord(x2, y2);
          const minX = Math.min(tx1, tx2), minY = Math.min(ty1, ty2);
          const maxX = Math.max(tx1, tx2), maxY = Math.max(ty1, ty2);
          output.push(`DIMENSIONS  ${minX.toFixed(1)}  ${minY.toFixed(1)}  ${maxX.toFixed(1)}  ${maxY.toFixed(1)}`);
          stats.coordsTransformed += 2;
          continue;
        }
      }
      output.push(sl.line);
      continue;
    }

    if (sec === 'PROFILES') {
      const parts = t.split(/\s+/);
      if (config.renameElements && parts.length >= 2) {
        const newParts = parts.map(p => {
          const cleaned = p.replace(/^"|"$/g, '');
          const mapped = replaceName(cleaned);
          return mapped !== cleaned ? mapped : p;
        });
        output.push(newParts.join('  '));
      } else {
        output.push(sl.line);
      }
      continue;
    }

    if (sec === 'TRANSECTS') {
      const parts = t.split(/\s+/);
      if (parts[0] === 'NC' || parts[0] === 'GR') {
        output.push(sl.line);
      } else if (parts[0] === 'X1' && config.renameElements && parts.length > 1) {
        parts[1] = replaceName(parts[1]);
        output.push(parts.join('  '));
      } else {
        output.push(sl.line);
      }
      continue;
    }

    const parts = t.split(/\s+/);
    const newParts = [...parts];

    if (config.renameElements) {
      if (NODE_SECTIONS.has(sec)) {
        newParts[0] = replaceName(parts[0]);
        if (sec === 'DIVIDERS' && parts.length > 2) newParts[2] = replaceName(parts[2]);
      } else if (LINK_SECTIONS.has(sec)) {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 1) newParts[1] = replaceName(parts[1]);
        if (parts.length > 2) newParts[2] = replaceName(parts[2]);
        if (sec === 'PUMPS' && parts.length > 3) newParts[3] = replaceName(parts[3]);
      } else if (sec === 'SUBCATCHMENTS') {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 1) newParts[1] = replaceName(parts[1]);
        if (parts.length > 2) newParts[2] = replaceName(parts[2]);
        if (parts.length > 8) newParts[8] = replaceName(parts[8]);
      } else if (sec === 'XSECTIONS' || sec === 'LOSSES') {
        newParts[0] = replaceName(parts[0]);
        if (sec === 'XSECTIONS' && parts.length > 2 && parts[1] === 'IRREGULAR') {
          newParts[2] = replaceName(parts[2]);
        }
      } else if (sec === 'DWF' || sec === 'INFLOWS' || sec === 'RDII' || sec === 'TREATMENT') {
        newParts[0] = replaceName(parts[0]);
        if (sec === 'INFLOWS' && parts.length > 2) newParts[2] = replaceName(parts[2]);
        if (sec === 'RDII' && parts.length > 1) newParts[1] = replaceName(parts[1]);
        if (sec === 'DWF' && parts.length > 3) {
          for (let pi = 3; pi < parts.length; pi++) {
            const cleaned = parts[pi].replace(/^"|"$/g, '');
            const mapped = replaceName(cleaned);
            if (mapped !== cleaned) newParts[pi] = `"${mapped}"`;
          }
        }
        if (sec === 'TREATMENT' && parts.length > 1) newParts[1] = replaceName(parts[1]);
      } else if (sec === 'COORDINATES' || sec === 'VERTICES') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'POLYGONS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'SYMBOLS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'SUBAREAS' || sec === 'INFILTRATION') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'GROUNDWATER') {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 1) newParts[1] = replaceName(parts[1]);
        if (parts.length > 2) newParts[2] = replaceName(parts[2]);
      } else if (sec === 'GWF') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'AQUIFERS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'COVERAGES' || sec === 'LOADINGS') {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 1) newParts[1] = replaceName(parts[1]);
      } else if (sec === 'BUILDUP' || sec === 'WASHOFF') {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 1) newParts[1] = replaceName(parts[1]);
      } else if (sec === 'LID_USAGE') {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 1) newParts[1] = replaceName(parts[1]);
      } else if (sec === 'LID_CONTROLS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'INLET_USAGE') {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 1) newParts[1] = replaceName(parts[1]);
        if (parts.length > 2) newParts[2] = replaceName(parts[2]);
      } else if (sec === 'RAINGAGES') {
        newParts[0] = replaceName(parts[0]);
        const tsIdx = parts.indexOf('TIMESERIES');
        if (tsIdx >= 0 && parts.length > tsIdx + 1) newParts[tsIdx + 1] = replaceName(parts[tsIdx + 1]);
      } else if (sec === 'CURVES') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'TIMESERIES') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'PATTERNS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'HYDROGRAPHS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'POLLUTANTS') {
        newParts[0] = replaceName(parts[0]);
        if (parts.length > 7 && parts[7] !== '*') newParts[7] = replaceName(parts[7]);
      } else if (sec === 'LANDUSES') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'SNOWPACKS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'STREETS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'INLETS') {
        newParts[0] = replaceName(parts[0]);
      } else if (sec === 'TAGS') {
        if (parts.length >= 3) {
          newParts[1] = replaceName(parts[1]);
        }
      }
    }

    if (config.distortCoordinates && COORD_SECTIONS[sec]) {
      const [xi, yi] = COORD_SECTIONS[sec];
      if (xi < parts.length && yi < parts.length) {
        const x = parseFloat(parts[xi]), y = parseFloat(parts[yi]);
        if (!isNaN(x) && !isNaN(y)) {
          const [tx, ty] = transformCoord(x, y);
          newParts[xi] = tx.toFixed(3);
          newParts[yi] = ty.toFixed(3);
          stats.coordsTransformed++;
        }
      }
    }

    if (config.distortElevations && ELEVATION_SECTIONS[sec]) {
      for (const ei of ELEVATION_SECTIONS[sec]) {
        if (ei < parts.length) {
          const e = parseFloat(parts[ei]);
          if (!isNaN(e)) {
            newParts[ei] = transformElev(e).toFixed(3);
            stats.elevationsTransformed++;
          }
        }
      }
    }

    if (config.distortDimensions && sec === 'XSECTIONS') {
      for (let di = 2; di <= 5; di++) {
        if (di < parts.length) {
          const v = parseFloat(parts[di]);
          if (!isNaN(v) && v > 0) {
            newParts[di] = (v * config.dimensionScale).toFixed(3);
          }
        }
      }
    }

    if (config.distortDimensions && sec === 'CONDUITS') {
      if (parts.length > 3) {
        const len = parseFloat(parts[3]);
        if (!isNaN(len) && len > 0) {
          newParts[3] = (len * config.dimensionScale).toFixed(2);
        }
      }
    }

    if (config.distortElevations && sec === 'CONDUITS') {
      if (parts.length > 5) {
        const inOff = parseFloat(parts[5]);
        if (!isNaN(inOff) && inOff > 0) newParts[5] = (inOff * config.elevationScale).toFixed(3);
      }
      if (parts.length > 6) {
        const outOff = parseFloat(parts[6]);
        if (!isNaN(outOff) && outOff > 0) newParts[6] = (outOff * config.elevationScale).toFixed(3);
      }
    }

    const padded = newParts.map((p, i) => {
      if (i === 0) return p.padEnd(17);
      if (i < newParts.length - 1) return p.padEnd(12);
      return p;
    });
    output.push(padded.join('').trimEnd());
  }

  return {
    inp: output.join('\n'),
    nameMap,
    stats,
  };
}
