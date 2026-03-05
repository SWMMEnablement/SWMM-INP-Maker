export interface ParsedSection {
  name: string;
  headers: string[];
  rows: string[][];
  comments: string[];
}

export interface ParsedInpFile {
  filename: string;
  sections: ParsedSection[];
  rawText: string;
  lineCount: number;
  sizeBytes: number;
}

const SECTION_COLUMNS: Record<string, string[]> = {
  TITLE: ["Title"],
  OPTIONS: ["Option", "Value"],
  FILES: ["Type", "Value"],
  RAINGAGES: ["Name", "Format", "Interval", "SCF", "Source"],
  EVAPORATION: ["Type", "Parameters"],
  TEMPERATURE: ["Type", "Parameters"],
  SUBCATCHMENTS: ["Name", "RainGage", "Outlet", "Area", "PctImperv", "Width", "Slope", "CurbLength", "SnowPack"],
  SUBAREAS: ["Subcatchment", "N-Imperv", "N-Perv", "S-Imperv", "S-Perv", "PctZero", "RouteTo", "PctRouted"],
  INFILTRATION: ["Subcatchment", "Param1", "Param2", "Param3", "Param4", "Method"],
  AQUIFERS: ["Name", "Por", "WP", "FC", "Ksat", "Kslope", "Tslope", "ETu", "ETs", "Seep", "Ebot", "Egw", "Umc", "ETpat"],
  GROUNDWATER: ["Subcatchment", "Aquifer", "Node", "Esurf", "A1", "B1", "A2", "B2", "A3", "Dsw", "Egwt", "Ebot", "Wgr", "Umc"],
  GWF: ["Subcatchment", "Type", "Expression"],
  SNOWPACKS: ["Name", "Type", "Param1", "Param2", "Param3", "Param4", "Param5", "Param6", "Param7"],
  JUNCTIONS: ["Name", "Elevation", "MaxDepth", "InitDepth", "SurDepth", "Aponded"],
  OUTFALLS: ["Name", "Elevation", "Type", "StageData", "Gated", "RouteTo"],
  DIVIDERS: ["Name", "Elevation", "DivLink", "DivType", "DivCurve", "Qmin", "Height", "Cd", "Flap", "MaxDepth", "InitDepth", "SurDepth", "Aponded"],
  STORAGE: ["Name", "Elevation", "MaxDepth", "InitDepth", "Shape", "CurveName", "SurDepth", "Fevap", "Psi", "Ksat", "IMD"],
  CONDUITS: ["Name", "FromNode", "ToNode", "Length", "Roughness", "InOffset", "OutOffset", "InitFlow", "MaxFlow"],
  PUMPS: ["Name", "FromNode", "ToNode", "PumpCurve", "Status", "Startup", "Shutoff"],
  ORIFICES: ["Name", "FromNode", "ToNode", "Type", "Offset", "Cd", "Flap", "Orate"],
  WEIRS: ["Name", "FromNode", "ToNode", "Type", "CrestHt", "Cd", "Flap", "EC", "Cd2", "Surcharge", "RoadWidth", "RoadSurf"],
  OUTLETS: ["Name", "FromNode", "ToNode", "Offset", "Type", "CurveName"],
  XSECTIONS: ["Link", "Shape", "Geom1", "Geom2", "Geom3", "Geom4", "Barrels", "Culvert"],
  TRANSECTS: ["Type", "Name", "Param1", "Param2", "Param3", "Param4", "Param5", "Param6", "Param7", "Param8"],
  STREETS: ["Name", "Tcrown", "Hcurb", "Sx", "nRoad", "a", "W", "Sides", "Tback", "Sback", "nBack"],
  INLETS: ["Name", "Type", "Param1", "Param2", "Param3", "Param4", "Param5"],
  INLET_USAGE: ["Conduit", "Inlet", "Node", "Number", "PctClog", "Qmax", "aLocal", "wLocal", "Placement"],
  LOSSES: ["Link", "Kentry", "Kexit", "Kavg", "Flap", "Seepage"],
  CONTROLS: ["Rule"],
  POLLUTANTS: ["Name", "Units", "Crain", "Cgw", "Crdii", "Kdecay", "SnowOnly", "CoPollutant", "CoFrac", "Cdwf", "Cinit"],
  LANDUSES: ["Name", "SweepInterval", "Availability", "LastSweep"],
  COVERAGES: ["Subcatchment", "LandUse", "Percent"],
  LOADINGS: ["Subcatchment", "Pollutant", "InitLoad"],
  BUILDUP: ["LandUse", "Pollutant", "FuncType", "C1", "C2", "C3", "PerUnit"],
  WASHOFF: ["LandUse", "Pollutant", "FuncType", "C1", "C2", "SweepRmvl", "BmpRmvl"],
  TREATMENT: ["Node", "Pollutant", "Function"],
  INFLOWS: ["Node", "Constituent", "TimeSeries", "Type", "Mfactor", "Sfactor", "Baseline", "Pattern"],
  DWF: ["Node", "Constituent", "Baseline", "Pat1", "Pat2", "Pat3", "Pat4"],
  RDII: ["Node", "UHGroup", "SewerArea"],
  HYDROGRAPHS: ["Name", "Month", "Response", "R", "T", "K", "IA_max", "IA_rec", "IA_init"],
  CURVES: ["Name", "Type", "X-Value", "Y-Value"],
  TIMESERIES: ["Name", "Date", "Time", "Value"],
  PATTERNS: ["Name", "Type", "Multipliers"],
  COORDINATES: ["Node", "X-Coord", "Y-Coord"],
  VERTICES: ["Link", "X-Coord", "Y-Coord"],
  POLYGONS: ["Subcatchment", "X-Coord", "Y-Coord"],
  SYMBOLS: ["Gage", "X-Coord", "Y-Coord"],
  LABELS: ["X-Coord", "Y-Coord", "Label"],
  BACKDROP: ["Parameter", "Value"],
  MAP: ["Parameter", "Value"],
  TAGS: ["ObjectType", "Name", "Tag"],
  REPORT: ["Option", "Value"],
  PROFILES: ["Name", "Links"],
  LID_CONTROLS: ["Name", "Type", "Param1", "Param2", "Param3", "Param4", "Param5", "Param6", "Param7"],
  LID_USAGE: ["Subcatchment", "LIDProcess", "Number", "Area", "Width", "InitSat", "FromImperv", "ToPerv", "RptFile", "DrainTo", "FromPerv"],
  ADJUSTMENTS: ["Parameter", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const FREE_TEXT_SECTIONS = new Set(["TITLE", "CONTROLS", "REPORT", "MAP", "BACKDROP"]);

function stripInlineComment(line: string): string {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuote = !inQuote;
    if (!inQuote && line[i] === ';') return line.slice(0, i).trim();
  }
  return line.trim();
}

export function parseInpFile(text: string, filename: string): ParsedInpFile {
  const lines = text.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let currentSection: string | null = null;
  let currentRows: string[][] = [];
  let currentComments: string[] = [];
  let inferredHeaders: string[] | null = null;

  const flushSection = () => {
    if (currentSection) {
      let headers: string[];
      if (SECTION_COLUMNS[currentSection]) {
        headers = SECTION_COLUMNS[currentSection];
      } else if (inferredHeaders && inferredHeaders.length > 0) {
        headers = inferredHeaders;
      } else {
        headers = inferHeaders(currentRows);
      }
      sections.push({
        name: currentSection,
        headers,
        rows: currentRows,
        comments: currentComments,
      });
    }
    currentRows = [];
    currentComments = [];
    inferredHeaders = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sectionMatch = trimmed.match(/^\[([A-Z_]+)\]$/);
    if (sectionMatch) {
      flushSection();
      currentSection = sectionMatch[1];
      continue;
    }

    if (!currentSection) continue;

    if (trimmed.startsWith(";;")) {
      const commentContent = trimmed.slice(2).trim();
      currentComments.push(commentContent);
      if (!inferredHeaders && commentContent.length > 0 && currentRows.length === 0) {
        const cols = commentContent.split(/\s+/).filter(c => c.length > 0);
        if (cols.length >= 2) inferredHeaders = cols;
      }
      continue;
    }
    if (trimmed.startsWith(";")) {
      currentComments.push(trimmed.slice(1).trim());
      continue;
    }

    if (FREE_TEXT_SECTIONS.has(currentSection!)) {
      currentRows.push([stripInlineComment(trimmed)]);
    } else {
      const cleaned = stripInlineComment(trimmed);
      if (!cleaned) continue;
      const parts = cleaned.split(/\s+/);
      if (parts.length > 0) {
        currentRows.push(parts);
      }
    }
  }
  flushSection();

  return {
    filename,
    sections,
    rawText: text,
    lineCount: lines.length,
    sizeBytes: new Blob([text]).size,
  };
}

function inferHeaders(rows: string[][]): string[] {
  if (rows.length === 0) return ["Col1"];
  const maxCols = Math.max(...rows.map(r => r.length));
  return Array.from({ length: maxCols }, (_, i) => `Col${i + 1}`);
}

export interface SectionStats {
  column: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

export function computeSectionStats(section: ParsedSection): SectionStats[] {
  const stats: SectionStats[] = [];
  const { headers, rows } = section;
  for (let col = 0; col < headers.length; col++) {
    const values: number[] = [];
    for (const row of rows) {
      if (col < row.length) {
        const v = parseFloat(row[col]);
        if (!isNaN(v) && isFinite(v)) values.push(v);
      }
    }
    if (values.length < 2) continue;
    values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
    stats.push({
      column: headers[col],
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      mean,
      median,
      stdDev: Math.sqrt(variance),
    });
  }
  return stats;
}

export function getNumericColumns(section: ParsedSection): { index: number; name: string }[] {
  const result: { index: number; name: string }[] = [];
  for (let col = 0; col < section.headers.length; col++) {
    let numericCount = 0;
    for (const row of section.rows) {
      if (col < row.length) {
        const v = parseFloat(row[col]);
        if (!isNaN(v) && isFinite(v)) numericCount++;
      }
    }
    if (numericCount > section.rows.length * 0.5) {
      result.push({ index: col, name: section.headers[col] });
    }
  }
  return result;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}
