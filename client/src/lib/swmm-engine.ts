import { generateHortonStrahler, generateLSystem, generateSpaceColonization, generateMST, generateD8FlowAccumulation, generateVoronoiDelaunay, generateInterceptorLateral, generatePerlinD8, generateGeneticAlgorithm, generateGridManhattan, generateSteinerTree, generateLoopAndBranch, generateZoneHierarchical, generateDLA, generateRadialSpokeRing } from './generators';
import { RAIN_CANVAS_CATALOG, rainCanvasToSwmmTimeseries, mapLegacyDistribution, getPatternName } from './rain-canvas';
export { RAIN_CANVAS_CATALOG } from './rain-canvas';

export type ModelType = 'sanitary' | 'stormwater' | 'combined' | 'transport_only' | 'rdii_calibration' | 'pump_intensive' | 'wos_intensive';
export type TerrainType = 'flat' | 'moderate' | 'hilly' | 'mountainous';
export type DetailLevel = 'basic' | 'moderate' | 'detailed';
export type LandUseType = 'mixed' | 'residential' | 'commercial' | 'industrial';
export type DiscretizationMethod = 'none' | 'fixed_interval' | 'dx_d_ratio';
export type InfiltrationMethod = 'HORTON' | 'GREEN_AMPT' | 'CURVE_NUMBER';
export type RainfallDistribution = string;
export type GenerationMethod = 'force_directed' | 'horton_strahler' | 'l_system' | 'space_colonization' | 'mst' | 'd8_flow' | 'voronoi_delaunay' | 'interceptor_lateral' | 'perlin_d8' | 'genetic_algorithm' | 'grid_manhattan' | 'steiner_tree' | 'loop_and_branch' | 'zone_hierarchical' | 'dla' | 'radial_spoke_ring';
export type LSystemVariant = 'dendritic' | 'grid' | 'radial';

export interface ReswmmConfig {
  enabled: boolean;
  method: DiscretizationMethod;
  fixedMinLength: number;
  fixedMaxLength: number;
  dxDRatio: number;
  mnsa: number;
}

export const DEFAULT_RESWMM: ReswmmConfig = {
  enabled: false,
  method: 'fixed_interval',
  fixedMinLength: 50,
  fixedMaxLength: 200,
  dxDRatio: 5,
  mnsa: 12.566,
};

export const DWF_PATTERN_OPTIONS = ['Diurnal', 'Monthly', 'Weekend', 'Seasonal'] as const;

export const RAINFALL_DIST_LABELS: Record<string, string> = Object.fromEntries(
  RAIN_CANVAS_CATALOG.flatMap(c => c.patterns.map(p => [p.id, p.name]))
);

export const INFILTRATION_LABELS: Record<InfiltrationMethod, string> = {
  HORTON: 'Horton',
  GREEN_AMPT: 'Green-Ampt',
  CURVE_NUMBER: 'Curve Number',
};

export const GENERATION_METHOD_LABELS: Record<GenerationMethod, string> = {
  force_directed: 'Force-Directed (Barnes-Hut)',
  horton_strahler: 'Horton-Strahler Branching',
  l_system: 'L-System Grammar',
  space_colonization: 'Space Colonization',
  mst: 'Minimum Spanning Tree',
  d8_flow: 'D8 Flow Accumulation',
  voronoi_delaunay: 'Voronoi / Delaunay',
  interceptor_lateral: 'Interceptor + Lateral',
  perlin_d8: 'Perlin Noise + D8',
  genetic_algorithm: 'Genetic Algorithm',
  grid_manhattan: 'Grid / Manhattan',
  steiner_tree: 'Steiner Tree',
  loop_and_branch: 'Loop-and-Branch',
  zone_hierarchical: 'Zone-Based Hierarchical',
  dla: 'Diffusion-Limited Aggregation',
  radial_spoke_ring: 'Radial Spoke-and-Ring',
};

export const L_SYSTEM_VARIANT_LABELS: Record<LSystemVariant, string> = {
  dendritic: 'Dendritic',
  grid: 'Grid',
  radial: 'Radial',
};

export const DEFAULT_HYDROLOGY = {
  numOutfalls: null as number | null,
  numSubcatchments: null as number | null,
  dwfNodePct: 65,
  dwfPatterns: ['Diurnal', 'Monthly'] as string[],
  inflowTsPct: 0,
  rainfallDepth: 2.0,
  rainfallDuration: 6.0,
  rainfallDist: 'scs-type-ii' as RainfallDistribution,
  infiltrationMethod: 'HORTON' as InfiltrationMethod,
  generationMethod: 'force_directed' as GenerationMethod,
  lSystemVariant: 'dendritic' as LSystemVariant,
  enableAquifers: false,
  enableGroundwater: false,
  enableLID: false,
  enableWQ: false,
  enableSnowmelt: false,
  enableDividers: false,
  enableStreetInlets: false,
  enableCurvedLinks: false,
};

export interface SwmmConfig {
  N: number;
  type: ModelType;
  units: 'US' | 'SI';
  terrain: TerrainType;
  detail: DetailLevel;
  landUse: LandUseType;
  outfallElev: number;
  reswmm: ReswmmConfig;
  numOutfalls: number | null;
  numSubcatchments: number | null;
  dwfNodePct: number;
  dwfPatterns: string[];
  inflowTsPct: number;
  rainfallDepth: number;
  rainfallDuration: number;
  rainfallDist: RainfallDistribution;
  infiltrationMethod: InfiltrationMethod;
  generationMethod: GenerationMethod;
  lSystemVariant: LSystemVariant;
  enableAquifers: boolean;
  enableGroundwater: boolean;
  enableLID: boolean;
  enableWQ: boolean;
  enableSnowmelt: boolean;
  enableDividers: boolean;
  enableStreetInlets: boolean;
  enableCurvedLinks: boolean;
}

export interface ComputedElements {
  junctions: number;
  conduits: number;
  subcatchments: number;
  outfalls: number;
  storage: number;
  pumps: number;
  orifices: number;
  weirs: number;
  raingages: number;
  total: number;
}

export interface NetNode {
  name: string;
  type: 'junction' | 'outfall' | 'storage';
  x: number;
  y: number;
  r: number;
  color: string;
  elev?: number;
  maxD?: number;
}

export interface NetLink {
  name: string;
  from: string;
  to: string;
  color: string;
  alpha: number;
  width: number;
  hasOffset?: boolean;
  isPump?: boolean;
  vertices?: { x: number; y: number }[];
}

export interface NetPolygon {
  name: string;
  vertices: { x: number; y: number }[];
  color: string;
  outlet: string;
}

export interface NetData {
  nodes: Record<string, NetNode>;
  links: NetLink[];
  polygons: NetPolygon[];
  domain: number;
}

export interface GenerationStats {
  junctions: number;
  conduits: number;
  outfalls: number;
  storage: number;
  pumps: number;
  subcatchments: number;
  orifices: number;
  weirs: number;
  elevMin: number;
  elevMax: number;
  elevMean: number;
  depthMin: number;
  depthMax: number;
  depthMean: number;
  diamMin: number;
  diamMax: number;
  diamMean: number;
  lenMin: number;
  lenMax: number;
  lenMean: number;
  slopeMin: number;
  slopeMax: number;
  slopeMean: number;
  bothZero: number;
  bothZeroPct: number;
  outletOffset: number;
  inletOffset: number;
  shapeDistribution: string;
  unitLabel: string;
  diamLabel: string;
  fileName: string;
  fileSize: string;
  lineCount: number;
  totalElements: number;
  reswmmEnabled: boolean;
  reswmmMethod: string;
  reswmmOrigConduits: number;
  reswmmNewConduits: number;
  reswmmNewJunctions: number;
  reswmmSplitLinks: number;
  reswmmMNSA: number;
}

export interface ProfileNode {
  name: string;
  station: number;
  invertElev: number;
  crownElev: number;
  maxDepth: number;
  type: 'junction' | 'outfall' | 'storage';
}

export interface ProfileConduit {
  name: string;
  fromStation: number;
  toStation: number;
  fromInvert: number;
  toInvert: number;
  diameter: number;
  shape: string;
  fromCrown: number;
  toCrown: number;
}

export interface ProfileData {
  outfallName: string;
  nodes: ProfileNode[];
  conduits: ProfileConduit[];
  unitLabel: string;
}

export interface GeneratedModel {
  inpText: string;
  stats: GenerationStats;
  netData: NetData;
  profiles: ProfileData[];
}

export const RATIOS: Record<string, Record<string, number>> = {
  stormwater:       { conduit:1.05, subcatch:0.8,  outfall:0.003, storage:0.01,  pump:0.005, orifice:0.01,  weir:0.002 },
  sanitary:         { conduit:1.03, subcatch:0.0,  outfall:0.002, storage:0.02,  pump:0.01,  orifice:0.005, weir:0.001 },
  combined:         { conduit:1.08, subcatch:1.0,  outfall:0.005, storage:0.03,  pump:0.01,  orifice:0.02,  weir:0.005 },
  transport_only:   { conduit:1.02, subcatch:0.0,  outfall:0.002, storage:0.005, pump:0.003, orifice:0.002, weir:0.0   },
  rdii_calibration: { conduit:1.0,  subcatch:0.7,  outfall:0.05,  storage:0.01,  pump:0.005, orifice:0.005, weir:0.001 },
  pump_intensive:   { conduit:1.15, subcatch:0.3,  outfall:0.005, storage:0.08,  pump:0.04,  orifice:0.03,  weir:0.005 },
  wos_intensive:    { conduit:1.10, subcatch:0.5,  outfall:0.008, storage:0.12,  pump:0.01,  orifice:0.08,  weir:0.06  },
};

export const FLOW_UNITS: Record<string, Record<string, string>> = {
  US: { stormwater:"CFS", sanitary:"MGD", combined:"CFS", transport_only:"MGD", rdii_calibration:"MGD", pump_intensive:"GPM", wos_intensive:"CFS" },
  SI: { stormwater:"CMS", sanitary:"LPS", combined:"CMS", transport_only:"LPS", rdii_calibration:"LPS", pump_intensive:"LPS", wos_intensive:"CMS" },
};

export const OFFSET: Record<string, Record<string, number>> = {
  basic:    { both_zero:0.90, outlet_only:0.07, inlet_only:0.01, both_nz:0.02 },
  moderate: { both_zero:0.65, outlet_only:0.25, inlet_only:0.03, both_nz:0.07 },
  detailed: { both_zero:0.35, outlet_only:0.45, inlet_only:0.05, both_nz:0.15 },
};

export const SHAPES: Record<string, [string, number][]> = {
  stormwater:     [["CIRCULAR",70],["IRREGULAR",15],["TRAPEZOIDAL",5],["RECT_OPEN",5],["RECT_CLOSED",3],["ARCH",2]],
  sanitary:       [["CIRCULAR",85],["EGG",5],["FORCE_MAIN",5],["FILLED_CIRCULAR",3],["RECT_CLOSED",2]],
  combined:       [["CIRCULAR",75],["EGG",8],["RECT_CLOSED",5],["HORSESHOE",3],["IRREGULAR",3],["FORCE_MAIN",3],["FILLED_CIRCULAR",3]],
  transport_only: [["CIRCULAR",88],["FORCE_MAIN",5],["EGG",4],["FILLED_CIRCULAR",3]],
  rdii_calibration:[["CIRCULAR",90],["FORCE_MAIN",4],["EGG",3],["FILLED_CIRCULAR",3]],
  pump_intensive: [["CIRCULAR",60],["FORCE_MAIN",30],["RECT_CLOSED",5],["FILLED_CIRCULAR",5]],
  wos_intensive:  [["CIRCULAR",55],["RECT_CLOSED",15],["RECT_OPEN",10],["TRAPEZOIDAL",8],["IRREGULAR",5],["ARCH",4],["EGG",3]],
};

export const PIPE_INCHES = [6,8,10,12,15,18,21,24,30,36,42,48,54,60,72,84,96,120,144];
export const PIPE_WEIGHTS = [3,8,6,12,10,10,8,14,10,8,4,3,2,1,0.5,0.3,0.1,0.05,0.02];

export const ALL_SECTIONS = [
  "[TITLE]","[OPTIONS]","[FILES]","[EVAPORATION]","[TEMPERATURE]","[ADJUSTMENTS]",
  "[RAINGAGES]","[SUBCATCHMENTS]","[SUBAREAS]","[INFILTRATION]","[AQUIFERS]","[GROUNDWATER]","[GWF]","[SNOWPACKS]",
  "[JUNCTIONS]","[OUTFALLS]","[DIVIDERS]","[STORAGE]",
  "[CONDUITS]","[PUMPS]","[ORIFICES]","[WEIRS]","[OUTLETS]","[XSECTIONS]","[TRANSECTS]","[STREETS]","[INLETS]","[INLET_USAGE]","[LOSSES]",
  "[CONTROLS]","[INFLOWS]","[DWF]","[PATTERNS]","[RDII]","[HYDROGRAPHS]","[LOADINGS]",
  "[POLLUTANTS]","[LANDUSES]","[COVERAGES]","[BUILDUP]","[WASHOFF]","[TREATMENT]",
  "[CURVES]","[TIMESERIES]",
  "[LID_CONTROLS]","[LID_USAGE]",
  "[COORDINATES]","[VERTICES]","[Polygons]","[SYMBOLS]","[LABELS]","[BACKDROP]","[MAP]",
  "[TAGS]","[PROFILES]","[REPORT]"
];

export const TERRAIN_LABELS: Record<string, string> = { flat:"0.1-0.5%", moderate:"0.2-1.5%", hilly:"0.5-3.0%", mountainous:"1-8%" };

export const MODEL_TYPE_LABELS: Record<string, string> = {
  sanitary: "Sanitary Sewer",
  stormwater: "Stormwater",
  combined: "Combined Sewer",
  transport_only: "Transport Only",
  rdii_calibration: "RDII Calibration",
  pump_intensive: "Pump Intensive",
  wos_intensive: "Weir/Orifice/Storage Intensive",
};

export const OFFSET_COLORS: Record<string, string> = {
  both_zero: "#374151",
  outlet_only: "#38bdf8",
  inlet_only: "#fb923c",
  both_nz: "#818cf8",
};

export const OFFSET_LABELS: Record<string, string> = {
  both_zero: "Both Zero",
  outlet_only: "Outlet Only (Crown Match)",
  inlet_only: "Inlet Only (Drop)",
  both_nz: "Both Nonzero",
};

export const SHAPE_COLORS = ["#38bdf8","#818cf8","#34d399","#fb923c","#f472b6","#ef4444","#facc15"];

export interface ExamplePreset {
  name: string;
  description: string;
  rationale?: string;
  config: SwmmConfig;
  tags: string[];
}

export const EXAMPLE_PRESETS: ExamplePreset[] = [
  {
    name: "Small Residential Sanitary",
    description: "Typical small-town sanitary sewer — 200 junctions, flat terrain, basic detail",
    rationale: "Flat terrain and basic detail keep slopes gentle and offsets simple, matching typical small-town gravity sewers with minimal hydraulic complexity.",
    config: { N: 200, type: "sanitary", units: "US", terrain: "flat", detail: "basic", landUse: "residential", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Quick", "Sanitary"],
  },
  {
    name: "Medium Stormwater Network",
    description: "Urban stormwater collection system — 500 junctions, moderate terrain, mixed land use",
    rationale: "Moderate terrain and mixed land use produce varied imperviousness and realistic runoff patterns typical of suburban stormwater systems.",
    config: { N: 500, type: "stormwater", units: "US", terrain: "moderate", detail: "moderate", landUse: "mixed", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Stormwater", "Medium"],
  },
  {
    name: "Large Combined Sewer (SI)",
    description: "Full combined sewer system — 2,000 junctions, hilly terrain, detailed offsets, SI units",
    rationale: "Hilly terrain with detailed offsets exercises crown-matching logic and steep-slope handling critical for combined sewer overflow analysis.",
    config: { N: 2000, type: "combined", units: "SI", terrain: "hilly", detail: "detailed", landUse: "mixed", outfallElev: 10, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Large", "Combined", "SI"],
  },
  {
    name: "Pump Station Intensive",
    description: "Flat pump-heavy system — 800 junctions, many pumps and storage units, industrial land use",
    rationale: "Flat terrain forces reliance on pump stations to move flow, generating many force mains and wet wells typical of coastal industrial districts.",
    config: { N: 800, type: "pump_intensive", units: "US", terrain: "flat", detail: "detailed", landUse: "industrial", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Pumps", "Industrial"],
  },
  {
    name: "Mountain Stormwater (SI)",
    description: "Steep mountainous stormwater — 300 junctions, high slopes, SI metric units",
    rationale: "Mountainous terrain generates steep conduit slopes and large elevation drops, testing SWMM's ability to handle supercritical flow and high-velocity conditions.",
    config: { N: 300, type: "stormwater", units: "SI", terrain: "mountainous", detail: "moderate", landUse: "mixed", outfallElev: 150, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Mountain", "SI"],
  },
  {
    name: "RDII Calibration Model",
    description: "RDII calibration setup — 400 junctions, moderate terrain, with subcatchments and hydrographs",
    rationale: "Moderate size with subcatchments enables RDII unit hydrograph calibration against flow monitors without excessive computation time.",
    config: { N: 400, type: "rdii_calibration", units: "US", terrain: "moderate", detail: "moderate", landUse: "residential", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["RDII", "Calibration"],
  },
  {
    name: "Commercial Combined (Detailed)",
    description: "Dense commercial combined sewer — 1,000 junctions, detailed offsets, commercial land use",
    config: { N: 1000, type: "combined", units: "US", terrain: "moderate", detail: "detailed", landUse: "commercial", outfallElev: 3, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Commercial", "Detailed"],
  },
  {
    name: "Weir/Orifice/Storage Intensive",
    description: "CSO/SSO control model — 600 junctions, many weirs, orifices, and storage units",
    rationale: "High weir/orifice/storage ratios model CSO regulators and detention basins used for overflow control in combined systems.",
    config: { N: 600, type: "wos_intensive", units: "US", terrain: "moderate", detail: "detailed", landUse: "mixed", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["WOS", "CSO"],
  },
  {
    name: "Transport Only (Large)",
    description: "Pipe-only transport model — 1,500 junctions, no subcatchments, no DWF, flat terrain",
    config: { N: 1500, type: "transport_only", units: "US", terrain: "flat", detail: "basic", landUse: "mixed", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Transport", "Large"],
  },
  {
    name: "Mega Stormwater (5,000 Junctions)",
    description: "Large-scale stormwater network — 5,000 junctions, hilly terrain, full subcatchments",
    config: { N: 5000, type: "stormwater", units: "US", terrain: "hilly", detail: "moderate", landUse: "mixed", outfallElev: 20, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Mega", "5K"],
  },
  {
    name: "Small SI Sanitary (Metric)",
    description: "Small metric sanitary model — 100 junctions, moderate terrain, SI units",
    config: { N: 100, type: "sanitary", units: "SI", terrain: "moderate", detail: "basic", landUse: "residential", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Small", "SI", "Quick"],
  },
  {
    name: "Industrial Pump Network",
    description: "Industrial pump-heavy network — 1,200 junctions, flat terrain, many force mains",
    rationale: "Large flat industrial layout maximizes pump stations and force mains, useful for testing pressure-pipe routing and Hazen-Williams head loss calculations.",
    config: { N: 1200, type: "pump_intensive", units: "US", terrain: "flat", detail: "detailed", landUse: "industrial", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Industrial", "Pumps", "Large"],
  },
  {
    name: "ReSWMM Fixed Interval (Sanitary)",
    description: "Sanitary sewer with ReSWMM fixed-interval discretization — 500 junctions, 50–200 ft segments",
    rationale: "Fixed-interval discretization splits long conduits into 50-200 ft segments, improving numerical accuracy for dynamic wave routing in sanitary sewers.",
    config: { N: 500, type: "sanitary", units: "US", terrain: "moderate", detail: "moderate", landUse: "residential", outfallElev: 0, reswmm: { enabled: true, method: "fixed_interval", fixedMinLength: 50, fixedMaxLength: 200, dxDRatio: 5, mnsa: 12.566 }, ...DEFAULT_HYDROLOGY },
    tags: ["ReSWMM", "Sanitary"],
  },
  {
    name: "ReSWMM Δx/D Ratio (Stormwater)",
    description: "Stormwater with ReSWMM Δx/D ratio discretization — 400 junctions, ratio = 5, hilly terrain",
    config: { N: 400, type: "stormwater", units: "US", terrain: "hilly", detail: "moderate", landUse: "mixed", outfallElev: 10, reswmm: { enabled: true, method: "dx_d_ratio", fixedMinLength: 50, fixedMaxLength: 200, dxDRatio: 5, mnsa: 12.566 }, ...DEFAULT_HYDROLOGY },
    tags: ["ReSWMM", "Stormwater"],
  },
  {
    name: "Tiny Test Model",
    description: "Minimal model for quick validation — 50 junctions, flat terrain, basic detail",
    rationale: "Minimal junction count generates in under a second, ideal for verifying SWMM5 import compatibility before scaling up.",
    config: { N: 50, type: "sanitary", units: "US", terrain: "flat", detail: "basic", landUse: "residential", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Tiny", "Quick"],
  },
  {
    name: "Flat Commercial Stormwater",
    description: "Commercial stormwater in flat coastal area — 750 junctions, low outfall elevation",
    config: { N: 750, type: "stormwater", units: "US", terrain: "flat", detail: "moderate", landUse: "commercial", outfallElev: 1, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Flat", "Commercial"],
  },
  {
    name: "Dense Urban Combined (SI)",
    description: "Dense urban combined sewer — 3,000 junctions, moderate terrain, detailed offsets, SI units",
    config: { N: 3000, type: "combined", units: "SI", terrain: "moderate", detail: "detailed", landUse: "commercial", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Dense", "Combined", "SI"],
  },
  {
    name: "Suburban Residential (Large)",
    description: "Sprawling suburban sanitary — 2,500 junctions, moderate terrain, residential land use",
    config: { N: 2500, type: "sanitary", units: "US", terrain: "moderate", detail: "moderate", landUse: "residential", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Suburban", "Large"],
  },
  {
    name: "Hilly Industrial Combined",
    description: "Industrial combined sewer on hilly terrain — 900 junctions, detailed offsets",
    config: { N: 900, type: "combined", units: "US", terrain: "hilly", detail: "detailed", landUse: "industrial", outfallElev: 25, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Hilly", "Industrial"],
  },
  {
    name: "CSO Control with ReSWMM",
    description: "CSO/SSO control model with ReSWMM discretization — 700 junctions, many weirs and storage",
    config: { N: 700, type: "wos_intensive", units: "US", terrain: "moderate", detail: "detailed", landUse: "mixed", outfallElev: 0, reswmm: { enabled: true, method: "fixed_interval", fixedMinLength: 30, fixedMaxLength: 150, dxDRatio: 5, mnsa: 15.0 }, ...DEFAULT_HYDROLOGY },
    tags: ["ReSWMM", "CSO", "WOS"],
  },
  {
    name: "Mountain Village (SI, Small)",
    description: "Small alpine village sanitary — 150 junctions, mountainous terrain, SI units",
    config: { N: 150, type: "sanitary", units: "SI", terrain: "mountainous", detail: "basic", landUse: "residential", outfallElev: 200, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Mountain", "SI", "Small"],
  },
  {
    name: "Transport + ReSWMM (SI, Large)",
    description: "Large pipe-only transport with ReSWMM Δx/D — 2,000 junctions, moderate terrain, SI",
    config: { N: 2000, type: "transport_only", units: "SI", terrain: "moderate", detail: "moderate", landUse: "mixed", outfallElev: 0, reswmm: { enabled: true, method: "dx_d_ratio", fixedMinLength: 15, fixedMaxLength: 60, dxDRatio: 4, mnsa: 12.566 }, ...DEFAULT_HYDROLOGY },
    tags: ["ReSWMM", "Transport", "SI"],
  },
  {
    name: "RDII Hilly Residential",
    description: "RDII calibration on hilly terrain — 600 junctions, residential, US units",
    config: { N: 600, type: "rdii_calibration", units: "US", terrain: "hilly", detail: "moderate", landUse: "residential", outfallElev: 15, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["RDII", "Hilly"],
  },
  {
    name: "Ultra-Large Stormwater (10K)",
    description: "Massive city-scale stormwater — 10,000 junctions, moderate terrain, mixed land use",
    rationale: "Tests generator performance and SWMM solver limits at city scale; basic detail keeps file size manageable while still producing a realistic 10,000-node network.",
    config: { N: 10000, type: "stormwater", units: "US", terrain: "moderate", detail: "basic", landUse: "mixed", outfallElev: 10, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Mega", "10K"],
  },
  {
    name: "Flat Pump Station Chain",
    description: "Ultra-flat pump-heavy model — 500 junctions, industrial, pumps lift flow to outfall",
    config: { N: 500, type: "pump_intensive", units: "US", terrain: "flat", detail: "moderate", landUse: "industrial", outfallElev: -2, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Pumps", "Flat"],
  },
  {
    name: "Horton-Strahler Branching (Medium)",
    description: "Recursive branching network using Horton-Strahler ordering — 400 junctions, hilly terrain",
    config: { N: 400, type: "stormwater", units: "US", terrain: "hilly", detail: "moderate", landUse: "mixed", outfallElev: 10, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, generationMethod: 'horton_strahler' as GenerationMethod },
    tags: ["Horton-Strahler", "Branching"],
  },
  {
    name: "L-System Dendritic (Small)",
    description: "L-System grammar-based dendritic network — 200 junctions, moderate terrain",
    config: { N: 200, type: "sanitary", units: "US", terrain: "moderate", detail: "basic", landUse: "residential", outfallElev: 0, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, generationMethod: 'l_system' as GenerationMethod, lSystemVariant: 'dendritic' as LSystemVariant },
    tags: ["L-System", "Dendritic"],
  },
  {
    name: "L-System Grid Pattern",
    description: "L-System grammar with grid variant — 300 junctions, flat terrain, commercial",
    config: { N: 300, type: "combined", units: "US", terrain: "flat", detail: "moderate", landUse: "commercial", outfallElev: 2, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, generationMethod: 'l_system' as GenerationMethod, lSystemVariant: 'grid' as LSystemVariant },
    tags: ["L-System", "Grid"],
  },
  {
    name: "Space Colonization (Large)",
    description: "Organic branching via space colonization — 800 junctions, moderate terrain, mixed land use",
    config: { N: 800, type: "stormwater", units: "US", terrain: "moderate", detail: "moderate", landUse: "mixed", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, generationMethod: 'space_colonization' as GenerationMethod },
    tags: ["Space Colonization", "Organic"],
  },
  {
    name: "Minimum Spanning Tree (MST)",
    description: "MST-based network with Poisson disk sampling — 500 junctions, hilly terrain, SI units",
    config: { N: 500, type: "combined", units: "SI", terrain: "hilly", detail: "moderate", landUse: "mixed", outfallElev: 15, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, generationMethod: 'mst' as GenerationMethod },
    tags: ["MST", "SI"],
  },
  {
    name: "Mixed Use Moderate (Template)",
    description: "Balanced baseline model — 1,000 junctions, moderate everything, good starting point",
    rationale: "Balanced settings across all parameters provide a neutral starting point you can tune toward any specific project scenario.",
    config: { N: 1000, type: "combined", units: "US", terrain: "moderate", detail: "moderate", landUse: "mixed", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Template", "Balanced"],
  },
  {
    name: "ReSWMM Fine Mesh (Combined)",
    description: "Combined sewer with fine ReSWMM discretization — 300 junctions, 20–80 ft segments, high MNSA",
    config: { N: 300, type: "combined", units: "US", terrain: "moderate", detail: "detailed", landUse: "mixed", outfallElev: 3, reswmm: { enabled: true, method: "fixed_interval", fixedMinLength: 20, fixedMaxLength: 80, dxDRatio: 3, mnsa: 20.0 }, ...DEFAULT_HYDROLOGY },
    tags: ["ReSWMM", "Fine", "Combined"],
  },
  {
    name: "Mountainous Combined (Large)",
    description: "Large combined sewer on steep mountainous terrain — 1,800 junctions, detailed offsets",
    config: { N: 1800, type: "combined", units: "US", terrain: "mountainous", detail: "detailed", landUse: "mixed", outfallElev: 50, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY },
    tags: ["Mountain", "Large", "Combined"],
  },
  {
    name: "Green Infrastructure (LID)",
    description: "Stormwater with LID controls — 400 junctions, bio-retention, permeable pavement, rain gardens, green roofs",
    rationale: "Enables all 5 LID control types (bio-retention, permeable pavement, rain garden, green roof, infiltration trench) assigned to ~30% of subcatchments for green infrastructure analysis.",
    config: { N: 400, type: "stormwater", units: "US", terrain: "moderate", detail: "moderate", landUse: "residential", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, enableLID: true },
    tags: ["LID", "Green", "Stormwater"],
  },
  {
    name: "Water Quality Modeling",
    description: "Combined sewer with full water quality — 500 junctions, TSS/BOD/COD/TN/TP, buildup/washoff, treatment",
    rationale: "Generates 5 pollutants with power-law buildup, EMC washoff, and treatment functions at storage nodes for water quality compliance modeling.",
    config: { N: 500, type: "combined", units: "US", terrain: "moderate", detail: "detailed", landUse: "mixed", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, enableWQ: true },
    tags: ["WQ", "Pollutants", "Combined"],
  },
  {
    name: "Complete Model (LID + WQ)",
    description: "Full-featured model — 600 junctions, LID controls + water quality + aquifers + groundwater",
    rationale: "Combines all optional sections (LID, WQ, aquifers, groundwater) into a single comprehensive model for testing the full SWMM5 feature set.",
    config: { N: 600, type: "stormwater", units: "US", terrain: "moderate", detail: "detailed", landUse: "mixed", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, enableLID: true, enableWQ: true, enableAquifers: true, enableGroundwater: true },
    tags: ["Complete", "LID", "WQ"],
  },
  {
    name: "Cold Climate Snowmelt (SI)",
    description: "Northern climate combined sewer — 500 junctions, snowpacks, temperature data, adjustments",
    rationale: "Enables snowmelt modeling with temperature timeseries, snowpacks on subcatchments, and monthly climate adjustments for freeze/thaw cycle analysis.",
    config: { N: 500, type: "combined", units: "SI", terrain: "moderate", detail: "moderate", landUse: "mixed", outfallElev: 10, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, enableSnowmelt: true },
    tags: ["Snowmelt", "Cold Climate", "SI"],
  },
  {
    name: "Full Coverage (All Sections)",
    description: "Maximum section coverage — 400 junctions, all optional sections enabled, curved links, dividers, street inlets",
    rationale: "Enables every optional SWMM5 section for maximum INP coverage testing: LID, WQ, aquifers, groundwater, snowmelt, dividers, street inlets, and curved link vertices.",
    config: { N: 400, type: "combined", units: "US", terrain: "moderate", detail: "detailed", landUse: "mixed", outfallElev: 5, reswmm: { ...DEFAULT_RESWMM }, ...DEFAULT_HYDROLOGY, enableLID: true, enableWQ: true, enableAquifers: true, enableGroundwater: true, enableSnowmelt: true, enableDividers: true, enableStreetInlets: true, enableCurvedLinks: true },
    tags: ["Full Coverage", "All Sections"],
  },
];

export const SWMM5_REAL_STATS = {
  totalModels: 1729,
  totalElements: 15394727,
  totalXsections: 6489951,
  pipeShapes: 22,
  elementBreakdown: [
    { element: "Junctions", count: 5834601, pct: 37.9 },
    { element: "Conduits", count: 6065533, pct: 39.4 },
    { element: "Subcatchments", count: 2501420, pct: 16.3 },
    { element: "Outfalls", count: 44695, pct: 0.3 },
    { element: "Storage Units", count: 65729, pct: 0.4 },
    { element: "Pumps", count: 31868, pct: 0.2 },
    { element: "Orifices", count: 50488, pct: 0.3 },
    { element: "Weirs", count: 23067, pct: 0.1 },
    { element: "Other (RDII, DWF, etc.)", count: 777326, pct: 5.0 },
  ],
  routing: [
    { method: "DYNWAVE", pct: 89 },
    { method: "KINWAVE", pct: 7 },
    { method: "STEADY", pct: 4 },
  ],
  flowUnits: [
    { unit: "CFS", pct: 44 },
    { unit: "CMS", pct: 18 },
    { unit: "MGD", pct: 17 },
    { unit: "LPS", pct: 12 },
    { unit: "GPM", pct: 9 },
  ],
  infiltration: [
    { method: "HORTON", pct: 61 },
    { method: "GREEN_AMPT", pct: 24 },
    { method: "CURVE_NUMBER", pct: 15 },
  ],
  offsets: [
    { mode: "DEPTH", pct: 90 },
    { mode: "ELEVATION", pct: 10 },
  ],
  crossSections: [
    { shape: "CIRCULAR", pct: 76.2, count: 4945343 },
    { shape: "RECT_CLOSED", pct: 5.8, count: 376417 },
    { shape: "IRREGULAR", pct: 4.1, count: 266088 },
    { shape: "FORCE_MAIN", pct: 3.2, count: 207678 },
    { shape: "EGG", pct: 2.4, count: 155759 },
    { shape: "TRAPEZOIDAL", pct: 1.9, count: 123309 },
    { shape: "RECT_OPEN", pct: 1.7, count: 110329 },
    { shape: "FILLED_CIRCULAR", pct: 1.3, count: 84369 },
    { shape: "HORSESHOE", pct: 0.8, count: 51920 },
    { shape: "ARCH", pct: 0.7, count: 45430 },
    { shape: "Others (12 shapes)", pct: 1.9, count: 123309 },
  ],
  modelSizeDistribution: [
    { range: "< 100 elements", count: 214, pct: 12.4 },
    { range: "100 – 500", count: 348, pct: 20.1 },
    { range: "500 – 1,000", count: 277, pct: 16.0 },
    { range: "1,000 – 5,000", count: 399, pct: 23.1 },
    { range: "5,000 – 10,000", count: 209, pct: 12.1 },
    { range: "10,000 – 50,000", count: 194, pct: 11.2 },
    { range: "> 50,000", count: 88, pct: 5.1 },
  ],
  roughnessValues: [
    { value: "0.013", pct: 52, desc: "Concrete/PVC" },
    { value: "0.011", pct: 14, desc: "Smooth PVC" },
    { value: "0.012", pct: 12, desc: "Concrete" },
    { value: "0.014", pct: 8, desc: "Vitrified clay" },
    { value: "0.015", pct: 6, desc: "Corrugated PE" },
    { value: "0.016+", pct: 4, desc: "Rough/aged pipe" },
    { value: "130 (H-W)", pct: 4, desc: "Force main (Hazen-Williams)" },
  ],
  pipeStats: {
    us: { minDiam: "4 in", maxDiam: "168 in", medianDiam: "12 in", meanLength: "274 ft", medianLength: "208 ft" },
    si: { minDiam: "100 mm", maxDiam: "4,200 mm", medianDiam: "300 mm", meanLength: "83 m", medianLength: "63 m" },
  },
  depthStats: {
    us: { min: "1.5 ft", max: "42.0 ft", median: "6.5 ft", mean: "8.4 ft" },
    si: { min: "0.5 m", max: "12.8 m", median: "2.0 m", mean: "2.6 m" },
  },
};

export function fmt(n: number): string { return n.toLocaleString(); }
export function pct(v: number): string { return (v*100).toFixed(1)+"%"; }

export function compute(config: SwmmConfig): ComputedElements {
  const r = RATIOS[config.type];
  const N = config.N;
  const elems: ComputedElements = {
    junctions: N,
    conduits: Math.max(N, Math.round(N * r.conduit)),
    subcatchments: config.numSubcatchments != null ? config.numSubcatchments : Math.round(N * r.subcatch),
    outfalls: config.numOutfalls != null ? Math.max(1, config.numOutfalls) : Math.max(1, Math.round(N * r.outfall)),
    storage: Math.max(0, Math.round(N * r.storage)),
    pumps: Math.round(N * r.pump),
    orifices: Math.round(N * r.orifice),
    weirs: Math.round(N * r.weir),
    raingages: 0,
    total: 0,
  };
  if (elems.pumps > 0) elems.storage = Math.max(elems.storage, Math.max(1, Math.floor(elems.pumps/3)));
  if (elems.orifices > 0 || elems.weirs > 0) elems.storage = Math.max(elems.storage, 1);
  elems.raingages = elems.subcatchments > 0 ? Math.max(1, Math.round(elems.subcatchments/500)) : 0;
  elems.total = elems.junctions + elems.conduits + elems.subcatchments + elems.outfalls + elems.storage + elems.pumps + elems.orifices + elems.weirs;
  return elems;
}

export function getSections(elems: ComputedElements, config: SwmmConfig): Set<string> {
  const on = new Set(["[TITLE]","[OPTIONS]","[FILES]","[JUNCTIONS]","[OUTFALLS]","[CONDUITS]","[XSECTIONS]","[COORDINATES]","[MAP]","[REPORT]","[LOSSES]","[EVAPORATION]","[TAGS]","[LABELS]","[BACKDROP]","[PROFILES]"]);
  if (config.enableCurvedLinks) on.add("[VERTICES]");
  if (config.enableSnowmelt) ["[TEMPERATURE]","[ADJUSTMENTS]","[SNOWPACKS]"].forEach(s => on.add(s));
  if (config.enableDividers) on.add("[DIVIDERS]");
  if (config.enableStreetInlets && elems.subcatchments > 0) ["[STREETS]","[INLETS]","[INLET_USAGE]"].forEach(s => on.add(s));
  if (elems.storage > 0) on.add("[OUTLETS]");
  if (config.enableGroundwater && elems.subcatchments > 0) on.add("[GWF]");
  if (config.enableWQ && elems.subcatchments > 0) ["[LANDUSES]","[COVERAGES]","[LOADINGS]"].forEach(s => on.add(s));
  if (elems.raingages > 0) on.add("[SYMBOLS]");
  if (elems.subcatchments > 0) ["[RAINGAGES]","[SUBCATCHMENTS]","[SUBAREAS]","[INFILTRATION]","[TIMESERIES]","[Polygons]"].forEach(s => on.add(s));
  const hasDWF = config.dwfNodePct > 0 && (config.type==="sanitary"||config.type==="combined"||config.type==="wos_intensive");
  if (hasDWF) ["[DWF]","[PATTERNS]"].forEach(s => on.add(s));
  if (config.inflowTsPct > 0) { on.add("[INFLOWS]"); on.add("[TIMESERIES]"); }
  if (config.type==="rdii_calibration") ["[RDII]","[HYDROGRAPHS]"].forEach(s => on.add(s));
  if (elems.pumps > 0 || elems.storage > 0) ["[STORAGE]","[PUMPS]","[CURVES]","[CONTROLS]"].forEach(s => on.add(s));
  if (elems.orifices > 0) on.add("[ORIFICES]");
  if (elems.weirs > 0) on.add("[WEIRS]");
  if (config.enableLID && elems.subcatchments > 0) ["[LID_CONTROLS]","[LID_USAGE]"].forEach(s => on.add(s));
  if (config.enableWQ && elems.subcatchments > 0) ["[POLLUTANTS]","[BUILDUP]","[WASHOFF]","[TREATMENT]"].forEach(s => on.add(s));
  return on;
}

export function estimateSize(e: ComputedElements): string {
  const bytes = e.junctions*100 + e.conduits*120 + e.subcatchments*200 + e.storage*80 + e.pumps*150 + 2000;
  if (bytes < 1024) return bytes+"B";
  if (bytes < 1048576) return (bytes/1024).toFixed(0)+" KB";
  return (bytes/1048576).toFixed(1)+" MB";
}

function hashNoise(x: number, y: number, s: number): number {
  const n = Math.sin(x*12.9898 + y*78.233 + s*37.719) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, octaves: number, seed: number): number {
  let v=0, a=1, f=1, t=0;
  for (let i=0; i<octaves; i++) {
    v += hashNoise(x*f, y*f, seed+i*7.3)*a;
    t += a; a *= 0.5; f *= 2.0;
  }
  return v/t;
}

class TerrainDEM {
  w: number; h: number; seed: number;
  outfalls: {x: number; y: number}[];
  amp: number; ns: number; slopeStr: number;

  constructor(domainW: number, domainH: number, terrainType: string, outfallPositions: {x:number;y:number}[], seed: number) {
    this.w = domainW; this.h = domainH;
    this.seed = seed || Math.random()*999;
    this.outfalls = outfallPositions;
    const cfg: Record<string, {amp:number;noiseScale:number;slopeStr:number}> = {
      flat:        { amp: 0.06, noiseScale: 0.003, slopeStr: 0.8 },
      moderate:    { amp: 0.15, noiseScale: 0.005, slopeStr: 0.6 },
      hilly:       { amp: 0.30, noiseScale: 0.008, slopeStr: 0.4 },
      mountainous: { amp: 0.50, noiseScale: 0.012, slopeStr: 0.3 },
    };
    const c = cfg[terrainType] || cfg.moderate;
    this.amp = c.amp;
    this.ns = c.noiseScale;
    this.slopeStr = c.slopeStr;
  }

  elevationAt(x: number, y: number): number {
    let minDist = Infinity;
    for (const o of this.outfalls) {
      const d = Math.sqrt((x-o.x)**2 + (y-o.y)**2);
      if (d < minDist) minDist = d;
    }
    const maxDist = Math.sqrt(this.w**2 + this.h**2);
    const slope = (minDist / maxDist) * this.slopeStr;
    const noise = fbm(x*this.ns, y*this.ns, 5, this.seed) * this.amp;
    const valley = fbm(x*this.ns*0.4, y*this.ns*0.4, 3, this.seed+50) * this.amp * 0.5;
    return slope + noise - valley * 0.3;
  }

  gradientAt(x: number, y: number): [number, number] {
    const eps = Math.max(1, this.w * 0.001);
    const gx = (this.elevationAt(x+eps, y) - this.elevationAt(x-eps, y)) / (2*eps);
    const gy = (this.elevationAt(x, y+eps) - this.elevationAt(x, y-eps)) / (2*eps);
    return [-gx, -gy];
  }
}

class QTNode {
  cx: number; cy: number; hw: number; hh: number;
  mass: number; comX: number; comY: number;
  particle: {x:number;y:number} | null;
  children: QTNode[] | null;

  constructor(cx: number, cy: number, halfW: number, halfH: number) {
    this.cx = cx; this.cy = cy;
    this.hw = halfW; this.hh = halfH;
    this.mass = 0; this.comX = 0; this.comY = 0;
    this.particle = null;
    this.children = null;
  }

  contains(x: number, y: number): boolean {
    return x >= this.cx-this.hw && x < this.cx+this.hw &&
           y >= this.cy-this.hh && y < this.cy+this.hh;
  }

  subdivide(): void {
    const qw = this.hw/2, qh = this.hh/2;
    this.children = [
      new QTNode(this.cx-qw, this.cy+qh, qw, qh),
      new QTNode(this.cx+qw, this.cy+qh, qw, qh),
      new QTNode(this.cx-qw, this.cy-qh, qw, qh),
      new QTNode(this.cx+qw, this.cy-qh, qw, qh),
    ];
  }

  insert(p: {x:number;y:number}): boolean {
    if (!this.contains(p.x, p.y)) return false;
    if (this.mass === 0 && !this.children) {
      this.particle = p;
      this.mass = 1;
      this.comX = p.x; this.comY = p.y;
      return true;
    }
    if (!this.children) {
      this.subdivide();
      if (this.particle) {
        const old = this.particle;
        this.particle = null;
        for (const c of this.children!) if (c.insert(old)) break;
      }
    }
    for (const c of this.children!) if (c.insert(p)) break;
    const nm = this.mass + 1;
    this.comX = (this.comX * this.mass + p.x) / nm;
    this.comY = (this.comY * this.mass + p.y) / nm;
    this.mass = nm;
    return true;
  }

  calcRepulsion(p: {x:number;y:number}, theta: number, strength: number): [number, number] {
    if (this.mass === 0) return [0, 0];
    const dx = this.comX - p.x, dy = this.comY - p.y;
    const dist = Math.sqrt(dx*dx + dy*dy) + 0.01;
    const size = this.hw * 2;
    if (!this.children || (size / dist) < theta) {
      const f = -strength * this.mass / (dist * dist);
      return [dx/dist * f, dy/dist * f];
    }
    let fx = 0, fy = 0;
    for (const c of this.children) {
      const [cfx, cfy] = c.calcRepulsion(p, theta, strength);
      fx += cfx; fy += cfy;
    }
    return [fx, fy];
  }
}

function buildQuadtree(particles: {x:number;y:number}[], domain: number): QTNode {
  const cx = domain/2, cy = domain/2, half = domain/2 + 10;
  const root = new QTNode(cx, cy, half, half);
  for (const p of particles) root.insert(p);
  return root;
}

interface Particle { x: number; y: number; vx: number; vy: number; fixed: boolean; }

function runParticleSimulation(
  N: number, dem: TerrainDEM, domain: number,
  outfallPositions: {x:number;y:number}[], terrainType: string
): { junctionParticles: Particle[]; outfallParticles: Particle[]; allParticles: Particle[] } {
  const cfgs: Record<string, {grav:number;repel:number;attract:number;momentum:number;iters:number}> = {
    flat:        { grav: 5.0, repel: 800,  attract: 0.08, momentum: 0.4, iters: 80 },
    moderate:    { grav: 8.0, repel: 600,  attract: 0.06, momentum: 0.35, iters: 100 },
    hilly:       { grav: 12.0, repel: 500,  attract: 0.04, momentum: 0.3, iters: 120 },
    mountainous: { grav: 18.0, repel: 400,  attract: 0.03, momentum: 0.25, iters: 140 },
  };
  const cfg = cfgs[terrainType] || cfgs.moderate;

  let maxIter = cfg.iters;
  if (N > 2000) maxIter = Math.max(40, Math.floor(maxIter * 0.5));
  if (N > 10000) maxIter = Math.max(25, Math.floor(maxIter * 0.3));

  const dt = 0.8;
  const theta = 0.7;

  const particles: Particle[] = [];
  for (let i = 0; i < N; i++) {
    particles.push({
      x: domain*0.08 + Math.random()*domain*0.84,
      y: domain*0.08 + Math.random()*domain*0.84,
      vx: 0, vy: 0, fixed: false
    });
  }

  const outfallParticles: Particle[] = [];
  for (const o of outfallPositions) {
    outfallParticles.push({ x: o.x, y: o.y, vx: 0, vy: 0, fixed: true });
  }

  const allParticles = [...particles, ...outfallParticles];
  const repelStr = cfg.repel * (domain / Math.sqrt(N));

  for (let iter = 0; iter < maxIter; iter++) {
    const cooling = 1.0 - (iter / maxIter) * 0.7;
    const qt = buildQuadtree(allParticles, domain);

    for (const p of particles) {
      if (p.fixed) continue;
      let fx = 0, fy = 0;

      const [rx, ry] = qt.calcRepulsion(p, theta, repelStr * cooling);
      fx += rx; fy += ry;

      const [gx, gy] = dem.gradientAt(p.x, p.y);
      fx += gx * cfg.grav * domain * cooling;
      fy += gy * cfg.grav * domain * cooling;

      let bestD = Infinity, bestOx = 0, bestOy = 0;
      for (const o of outfallPositions) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < bestD) { bestD = d; bestOx = o.x; bestOy = o.y; }
      }
      const adx = bestOx - p.x, ady = bestOy - p.y;
      const ad = Math.sqrt(adx*adx + ady*ady) + 1;
      fx += (adx/ad) * cfg.attract * ad * 0.01 * cooling;
      fy += (ady/ad) * cfg.attract * ad * 0.01 * cooling;

      p.vx = p.vx * cfg.momentum + fx * dt;
      p.vy = p.vy * cfg.momentum + fy * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.x = Math.max(domain*0.02, Math.min(domain*0.98, p.x));
      p.y = Math.max(domain*0.02, Math.min(domain*0.98, p.y));
    }
  }

  return { junctionParticles: particles, outfallParticles, allParticles };
}

interface GraphNode { x: number; y: number; name: string; type: string; idx: number; elev: number; }
interface GraphEdge { from: GraphNode; to: GraphNode; length: number; }

function buildDendriticGraph(
  particles: Particle[], outfallParticles: Particle[], dem: TerrainDEM, domain: number
): { allNodes: GraphNode[]; edges: GraphEdge[]; accumUpstream: Record<string, number> } {
  const allNodes: GraphNode[] = [
    ...particles.map((p,i) => ({ ...p, name:`J${i+1}`, type:'junction', idx:i, elev: dem.elevationAt(p.x, p.y) })),
    ...outfallParticles.map((p,i) => ({ ...p, name:`OUT${i+1}`, type:'outfall', idx:particles.length+i, elev: dem.elevationAt(p.x, p.y) }))
  ];

  const gridSize = Math.max(10, Math.ceil(Math.sqrt(allNodes.length / 4)));
  const cellW = domain / gridSize;
  const grid = new Map<string, GraphNode[]>();
  for (const n of allNodes) {
    const gx = Math.floor(n.x / cellW), gy = Math.floor(n.y / cellW);
    const key = `${gx},${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(n);
  }

  function getNeighbors(node: GraphNode, k: number) {
    const gx = Math.floor(node.x / cellW), gy = Math.floor(node.y / cellW);
    const candidates: GraphNode[] = [];
    const searchR = Math.max(2, Math.ceil(k / 3));
    for (let dx = -searchR; dx <= searchR; dx++) {
      for (let dy = -searchR; dy <= searchR; dy++) {
        const key = `${gx+dx},${gy+dy}`;
        if (grid.has(key)) candidates.push(...grid.get(key)!);
      }
    }
    return candidates
      .filter(c => c !== node)
      .map(c => ({ node: c, dist: Math.hypot(c.x-node.x, c.y-node.y) }))
      .sort((a,b) => a.dist - b.dist)
      .slice(0, k);
  }

  const edges: GraphEdge[] = [];

  for (const node of allNodes) {
    if (node.type === 'outfall') continue;
    const neighbors = getNeighbors(node, Math.min(12, Math.max(6, Math.floor(allNodes.length * 0.02))));

    let bestScore = -Infinity, bestNeighbor: GraphNode | null = null;
    for (const { node: nb, dist } of neighbors) {
      if (nb.elev >= node.elev && nb.type !== 'outfall') continue;
      const drop = node.elev - nb.elev;
      const score = drop / (dist + 1);
      if (score > bestScore || (bestScore <= 0 && nb.type === 'outfall')) {
        bestScore = score;
        bestNeighbor = nb;
      }
    }

    if (!bestNeighbor) {
      const allLower = allNodes.filter(n => n !== node && (n.elev < node.elev || n.type === 'outfall'));
      if (allLower.length > 0) {
        allLower.sort((a,b) => Math.hypot(a.x-node.x, a.y-node.y) - Math.hypot(b.x-node.x, b.y-node.y));
        bestNeighbor = allLower[0];
      } else {
        bestNeighbor = allNodes.find(n => n.type === 'outfall') || allNodes.find(n => n !== node) || null;
      }
    }

    if (bestNeighbor) {
      const length = Math.hypot(bestNeighbor.x - node.x, bestNeighbor.y - node.y);
      edges.push({ from: node, to: bestNeighbor, length });
    }
  }

  const accumUpstream: Record<string, number> = {};
  function countUp(name: string): number {
    if (accumUpstream[name] !== undefined) return accumUpstream[name];
    let count = 0;
    for (const e of edges) {
      if (e.to.name === name) count += 1 + countUp(e.from.name);
    }
    accumUpstream[name] = count;
    return count;
  }
  for (const n of allNodes) countUp(n.name);

  return { allNodes, edges, accumUpstream };
}

function generateRainfallProfile(dist: RainfallDistribution, totalDepth: number, duration: number): [number, number][] {
  const patternId = mapLegacyDistribution(dist);
  const timestep = Math.max(5, Math.round(duration * 60 / 40));
  return rainCanvasToSwmmTimeseries(patternId, totalDepth, duration, timestep);
}

interface VoronoiCell {
  site: { x: number; y: number; name: string };
  vertices: { x: number; y: number }[];
}

function computeVoronoiCells(
  sites: { x: number; y: number; name: string }[],
  clipMinX: number, clipMinY: number, clipMaxX: number, clipMaxY: number
): VoronoiCell[] {
  if (sites.length === 0) return [];

  const cells: VoronoiCell[] = [];
  const nAngles = 36;

  for (const site of sites) {
    const angles: { angle: number; dist: number; x: number; y: number }[] = [];

    for (let a = 0; a < nAngles; a++) {
      const angle = (2 * Math.PI * a) / nAngles;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let minDist = Infinity;

      const clipDists: number[] = [];
      if (dx > 0) clipDists.push((clipMaxX - site.x) / dx);
      if (dx < 0) clipDists.push((clipMinX - site.x) / dx);
      if (dy > 0) clipDists.push((clipMaxY - site.y) / dy);
      if (dy < 0) clipDists.push((clipMinY - site.y) / dy);
      for (const cd of clipDists) {
        if (cd > 0 && cd < minDist) minDist = cd;
      }

      for (const other of sites) {
        if (other === site) continue;
        const mx = (site.x + other.x) / 2;
        const my = (site.y + other.y) / 2;
        const nx = other.x - site.x;
        const ny = other.y - site.y;
        const denom = dx * nx + dy * ny;
        if (denom <= 0) continue;
        const t = ((mx - site.x) * nx + (my - site.y) * ny) / denom;
        if (t > 0 && t < minDist) minDist = t;
      }

      if (minDist === Infinity) minDist = Math.max(clipMaxX - clipMinX, clipMaxY - clipMinY);
      const vx = site.x + dx * minDist;
      const vy = site.y + dy * minDist;
      angles.push({ angle, dist: minDist, x: vx, y: vy });
    }

    const vertices = angles.map(a => ({
      x: Math.max(clipMinX, Math.min(clipMaxX, a.x)),
      y: Math.max(clipMinY, Math.min(clipMaxY, a.y))
    }));

    cells.push({ site, vertices });
  }

  return cells;
}

export function generateModel(config: SwmmConfig): GeneratedModel {
  const N = config.N;
  const r = RATIOS[config.type];
  const flowUnit = FLOW_UNITS[config.units][config.type];
  const isSI = config.units === "SI";
  const off = OFFSET[config.detail];
  const shapes = SHAPES[config.type];

  const nConduits = Math.max(N, Math.round(N * r.conduit));
  const nSubcatch = config.numSubcatchments != null ? config.numSubcatchments : Math.round(N * r.subcatch);
  const nOutfalls = config.numOutfalls != null ? Math.max(1, config.numOutfalls) : Math.max(1, Math.round(N * r.outfall));
  let nStorage = Math.max(0, Math.round(N * r.storage));
  const nPumps = Math.round(N * r.pump);
  const nOrifices = Math.round(N * r.orifice);
  const nWeirs = Math.round(N * r.weir);
  if (nPumps > 0) nStorage = Math.max(nStorage, Math.max(1, Math.floor(nPumps/3)));
  if (nOrifices > 0 || nWeirs > 0) nStorage = Math.max(nStorage, 1);

  const terrainCfg: Record<string, [number,number]> = { flat:[0,30], moderate:[0,150], hilly:[0,500], mountainous:[0,2000] };
  let [eLo, eHi] = terrainCfg[config.terrain];
  if (isSI) { eLo /= 3.281; eHi /= 3.281; }

  const PIPES = isSI ? [0.15,0.20,0.225,0.25,0.30,0.375,0.45,0.525,0.60,0.75,0.90,1.05,1.20,1.35,1.50,1.80,2.10,2.40,3.00,3.60]
                      : [0.5,0.667,0.75,0.833,1.0,1.25,1.5,1.75,2.0,2.5,3.0,3.5,4.0,4.5,5.0,6.0,7.0,8.0,10.0,12.0];

  const rand = (a: number, b: number) => a + Math.random()*(b-a);
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random()*arr.length)];
  const tri = (a: number, b: number, c: number) => { const u=Math.random(),F=(c-a)/(b-a); return u<F? a+Math.sqrt(u*(b-a)*(c-a)) : b-Math.sqrt((1-u)*(b-a)*(b-c)); };

  function pickShape(): string {
    let r2 = Math.random()*100, cum=0;
    for (const [s,p] of shapes) { cum+=p; if (r2<cum) return s; }
    return shapes[0][0];
  }

  const avgLen = isSI ? 75 : 250;
  const domain = Math.sqrt(Math.max(N, 10)) * avgLen;

  const outfallPositions: {x:number;y:number}[] = [];
  for (let i = 0; i < nOutfalls; i++) {
    outfallPositions.push({
      x: domain * (0.3 + 0.4 * i / Math.max(1, nOutfalls - 1)),
      y: domain * 0.05 + rand(0, domain * 0.03)
    });
  }

  const dem = new TerrainDEM(domain, domain, config.terrain, outfallPositions, Math.random()*999);
  const elevFn = (x: number, y: number) => dem.elevationAt(x, y);

  let graph: { allNodes: { x: number; y: number; name: string; type: string; idx: number; elev: number; }[]; edges: { from: { x: number; y: number; name: string; type: string; idx: number; elev: number; }; to: { x: number; y: number; name: string; type: string; idx: number; elev: number; }; length: number; }[]; accumUpstream: Record<string, number> };

  switch (config.generationMethod) {
    case 'horton_strahler':
      graph = generateHortonStrahler(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'l_system':
      graph = generateLSystem(N, nOutfalls, domain, outfallPositions, elevFn, config.lSystemVariant);
      break;
    case 'space_colonization':
      graph = generateSpaceColonization(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'mst':
      graph = generateMST(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'd8_flow':
      graph = generateD8FlowAccumulation(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'voronoi_delaunay':
      graph = generateVoronoiDelaunay(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'interceptor_lateral':
      graph = generateInterceptorLateral(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'perlin_d8':
      graph = generatePerlinD8(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'genetic_algorithm':
      graph = generateGeneticAlgorithm(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'grid_manhattan':
      graph = generateGridManhattan(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'steiner_tree':
      graph = generateSteinerTree(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'loop_and_branch':
      graph = generateLoopAndBranch(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'zone_hierarchical':
      graph = generateZoneHierarchical(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'dla':
      graph = generateDLA(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'radial_spoke_ring':
      graph = generateRadialSpokeRing(N, nOutfalls, domain, outfallPositions, elevFn);
      break;
    case 'force_directed':
    default: {
      const simResult = runParticleSimulation(N, dem, domain, outfallPositions, config.terrain);
      graph = buildDendriticGraph(simResult.junctionParticles, simResult.outfallParticles, dem, domain);
      break;
    }
  }

  const connectedOutfalls = new Set<string>();
  for (const e of graph.edges) {
    if (e.to.type === 'outfall') connectedOutfalls.add(e.to.name);
    if (e.from.type === 'outfall') connectedOutfalls.add(e.from.name);
  }
  const junctionNodes = graph.allNodes.filter(n => n.type === 'junction');
  for (const outNode of graph.allNodes) {
    if (outNode.type !== 'outfall') continue;
    if (connectedOutfalls.has(outNode.name)) continue;
    if (junctionNodes.length === 0) continue;
    let closest = junctionNodes[0], closestDist = Infinity;
    for (const j of junctionNodes) {
      const d = Math.hypot(j.x - outNode.x, j.y - outNode.y);
      if (d < closestDist) { closestDist = d; closest = j; }
    }
    graph.edges.push({ from: closest, to: outNode, length: Math.max(1, closestDist) });
    connectedOutfalls.add(outNode.name);
    const countUp2 = (name: string): number => {
      let c = 0;
      for (const e2 of graph.edges) { if (e2.to.name === name) c += 1 + countUp2(e2.from.name); }
      return c;
    };
    graph.accumUpstream[outNode.name] = countUp2(outNode.name);
  }

  const outfallNodes = graph.allNodes.filter(n => n.type === 'outfall');
  for (const outNode of outfallNodes) {
    const inletEdges = graph.edges.filter(e => e.to.name === outNode.name);
    if (inletEdges.length <= 1) continue;
    const collectorName = `JC_${outNode.name}`;
    const collector: GraphNode = {
      name: collectorName, x: outNode.x, y: outNode.y + 0.5,
      elev: outNode.elev + 0.5, type: 'junction', idx: graph.allNodes.length
    };
    graph.allNodes.push(collector);
    for (const ie of inletEdges) {
      ie.to = collector;
    }
    graph.edges.push({ from: collector, to: outNode, length: 1 });
    graph.accumUpstream[collectorName] = inletEdges.length;
  }

  const elevRange = eHi - eLo;
  let demMin = Infinity, demMax = -Infinity;
  for (const n of graph.allNodes) {
    if (n.elev < demMin) demMin = n.elev;
    if (n.elev > demMax) demMax = n.elev;
  }
  const demRange = (demMax - demMin) || 1;

  interface JunctionData { name: string; elev: number; maxD: number; ponded: number; x: number; y: number; }
  interface OutfallData { name: string; elev: number; x: number; y: number; }
  interface StorageData { name: string; elev: number; maxD: number; area: number; x: number; y: number; }
  interface ConduitData { name: string; from: string; to: string; len: number; rough: number; inOff: number; outOff: number; diam: number; shape: string; }
  interface PumpData { name: string; from: string; to: string; curve: string; startup: number; shutoff: number; maxD: number; }

  const junctions: JunctionData[] = [];
  for (const n of graph.allNodes) {
    if (n.type === 'outfall') continue;
    const normElev = (n.elev - demMin) / demRange;
    const realElev = config.outfallElev + eLo + normElev * elevRange;
    const nUp = graph.accumUpstream[n.name] || 0;
    const upFrac = Math.min(1, nUp / Math.max(1, N * 0.3));
    let maxD = 3 + upFrac * 27;
    if (isSI) maxD /= 3.281;
    const ponded = Math.random() < 0.73 ? Math.round(rand(100, 5000) / (isSI ? 10.764 : 1)) : 0;
    junctions.push({ name: n.name, elev: +realElev.toFixed(3), maxD: +maxD.toFixed(2), ponded, x: n.x, y: n.y });
  }
  junctions.sort((a, b) => a.elev - b.elev);

  const outfalls: OutfallData[] = [];
  for (const n of graph.allNodes) {
    if (n.type !== 'outfall') continue;
    const normElev = (n.elev - demMin) / demRange;
    outfalls.push({ name: n.name, elev: +(config.outfallElev + normElev * elevRange * 0.05).toFixed(3), x: n.x, y: n.y });
  }

  const storages: StorageData[] = [];
  if (nStorage > 0) {
    const sortedByUp = [...junctions].sort((a,b) => (graph.accumUpstream[b.name]||0) - (graph.accumUpstream[a.name]||0));
    const stride = Math.max(1, Math.floor(sortedByUp.length / nStorage));
    for (let i = 0; i < nStorage && i * stride < sortedByUp.length; i++) {
      const src = sortedByUp[Math.min(i * stride + Math.floor(stride/3), sortedByUp.length-1)];
      const maxD = +(rand(10, 35) / (isSI ? 3.281 : 1)).toFixed(2);
      const area = Math.round(rand(200, 2000) / (isSI ? 10.764 : 1));
      storages.push({ name: `SU${i+1}`, elev: src.elev, maxD, area, x: src.x, y: src.y });
    }
  }

  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  w("[TITLE]");
  w(`;;Generated SWMM5 Model - ${fmt(N)} junctions, ${config.type}`);
  w(`;;Created ${new Date().toISOString().slice(0,16)} by SWMM5 INP MAKER`);
  w(`;;Based on 1,729 real-world models / 15,394,727 elements`);
  if (config.reswmm.enabled) {
    w(`;;ReSWMM Discretization: ${config.reswmm.method === 'fixed_interval' ? `Fixed Interval (${config.reswmm.fixedMinLength}-${config.reswmm.fixedMaxLength})` : `Dx/D=${config.reswmm.dxDRatio}`}, MNSA=${config.reswmm.mnsa}`);
  }
  w("");
  w("[OPTIONS]");
  w(`FLOW_UNITS           ${flowUnit}`);
  w(`INFILTRATION         ${config.infiltrationMethod}`);
  w(`FLOW_ROUTING         DYNWAVE`);
  w(`LINK_OFFSETS         DEPTH`);
  w(`FORCE_MAIN_EQUATION  H-W`);
  w(`ALLOW_PONDING        YES`);
  w(`MIN_SLOPE            0.001`);
  const simHours = Math.max(24, Math.ceil(config.rainfallDuration * 3));
  const endDays = Math.floor(simHours / 24);
  const endHH = simHours % 24;
  const endDate = endDays === 0 ? "01/01/2025" : endDays === 1 ? "01/02/2025" : `01/${String(1 + endDays).padStart(2,'0')}/2025`;
  w(`START_DATE           01/01/2025`);
  w(`START_TIME           00:00:00`);
  w(`END_DATE             ${endDate}`);
  w(`END_TIME             ${String(endHH).padStart(2,'0')}:00:00`);
  w(`REPORT_START_DATE    01/01/2025`);
  w(`REPORT_START_TIME    00:00:00`);
  const step = N>5000?"00:00:15":"00:00:30";
  w(`WET_STEP             ${step}`);
  w(`DRY_STEP             01:00:00`);
  w(`ROUTING_STEP         ${step}`);
  w(`REPORT_STEP          00:05:00`);
  w("");

  w("[FILES]");
  w(";;No external interface files");
  w("");

  w("[EVAPORATION]");
  w(";;Type       Parameters");
  w("CONSTANT     0.0");
  w("DRY_ONLY     NO");
  w("");

  if (config.enableSnowmelt) {
    w("[TEMPERATURE]");
    w("WINDSPEED    MONTHLY  8.0  8.0  9.0  10.0  10.0  9.0  8.0  8.0  9.0  10.0  9.0  8.0");
    w("SNOWMELT     34  0.5  0.6  0.0  50.0  0.0");
    w("ADC  IMPERVIOUS  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0  1.0");
    w("ADC  PERVIOUS    0.1  0.2  0.3  0.5  0.7  0.8  0.9  1.0  1.0  1.0");
    w("");

    w("[ADJUSTMENTS]");
    w(";;Parameter    Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec");
    w("TEMPERATURE    0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0");
    w("EVAPORATION    0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0   0.0");
    w("RAINFALL       1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0");
    w("CONDUCTIVITY   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0   1.0");
    w("");
  }

  const nGages = nSubcatch > 0 ? Math.max(1, Math.round(nSubcatch/500)) : 0;
  if (nGages > 0) {
    w("[RAINGAGES]");
    w(";;Name           Format  Interval  SCF  Source");
    for (let i=0; i<nGages; i++) w(`RG${i+1}              INTENSITY  0:05      1.0  TIMESERIES  TS_Rain`);
    w("");
  }

  const conduits: ConduitData[] = [];
  const nodeLookup: Record<string, {elev: number; maxD?: number; x: number; y: number}> = {};
  for (const j of junctions) nodeLookup[j.name] = j;
  for (const o of outfalls) nodeLookup[o.name] = { ...o, maxD: undefined };
  for (const s of storages) nodeLookup[s.name] = s;

  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i];
    const fromNode = nodeLookup[edge.from.name];
    const toNode = nodeLookup[edge.to.name];
    if (!fromNode || !toNode) continue;

    const length = +Math.max(1, edge.length).toFixed(2);
    let rough = Math.random() < 0.80 ? 0.013 : Math.random() < 0.5 ? pick([0.011, 0.012]) : pick([0.014, 0.015, 0.016]);
    const shape = pickShape();
    if (shape === "FORCE_MAIN") rough = 130;

    const nUp = graph.accumUpstream[edge.from.name] || 0;
    const upFrac = Math.min(1, nUp / Math.max(1, N * 0.2));
    const sizeIdx = Math.floor(upFrac * (PIPES.length - 1));
    const diam = PIPES[Math.min(sizeIdx, PIPES.length - 1)];

    let inOff = 0, outOff = 0;
    const rr = Math.random();
    if (rr < off.both_zero) { /* both zero */ }
    else if (rr < off.both_zero + off.outlet_only) {
      outOff = Math.random() < 0.67 ? +(diam * rand(0.1, 0.8)).toFixed(3) : +(diam * tri(0.05, 1.5, 0.2)).toFixed(3);
    } else if (rr < off.both_zero + off.outlet_only + off.inlet_only) {
      inOff = +(diam * tri(0.1, 3.0, 0.6)).toFixed(3);
    } else {
      inOff = +(diam * tri(0.1, 2.0, 0.5)).toFixed(3);
      outOff = +(diam * tri(0.05, 1.0, 0.2)).toFixed(3);
    }
    const fromD = fromNode.maxD || 10;
    if (inOff > fromD * 0.8 - diam) inOff = +Math.max(0, fromD * 0.5 - diam).toFixed(3);
    if (outOff > fromD * 0.8 - diam) outOff = +Math.max(0, fromD * 0.5 - diam).toFixed(3);
    inOff = Math.max(0, inOff); outOff = Math.max(0, outOff);

    conduits.push({ name: `C${i+1}`, from: edge.from.name, to: edge.to.name, len: length, rough, inOff, outOff, diam, shape });
  }

  const extraNeeded = nConduits - conduits.length;
  for (let x = 0; x < Math.max(0, extraNeeded); x++) {
    if (junctions.length < 3) break;
    const i1 = Math.floor(rand(junctions.length * 0.3, junctions.length - 1));
    const j1 = junctions[i1];
    const lowers = junctions.slice(0, i1).filter(j => j.elev < j1.elev);
    if (!lowers.length) continue;
    lowers.sort((a, b) => Math.hypot(a.x-j1.x, a.y-j1.y) - Math.hypot(b.x-j1.x, b.y-j1.y));
    conduits.push({ name: `C${conduits.length+1}`, from: j1.name, to: lowers[0].name, len: +Math.max(1, Math.hypot(lowers[0].x-j1.x, lowers[0].y-j1.y)).toFixed(2), rough: 0.013, inOff: 0, outOff: 0, diam: pick(PIPES.slice(0, 10)), shape: "CIRCULAR" });
  }

  const reswmmOrigConduits = conduits.length;
  let reswmmNewJunctions = 0;
  let reswmmSplitLinks = 0;
  if (config.reswmm.enabled && config.reswmm.method !== 'none') {
    const rCfg = config.reswmm;
    const discretized: ConduitData[] = [];
    for (const c of conduits) {
      let targetLen: number;
      if (rCfg.method === 'fixed_interval') {
        targetLen = Math.min(rCfg.fixedMaxLength, Math.max(rCfg.fixedMinLength, c.len));
      } else {
        targetLen = Math.max(1, c.diam * rCfg.dxDRatio);
      }
      const nSeg = Math.max(1, Math.ceil(c.len / targetLen));
      if (nSeg <= 1) {
        discretized.push(c);
        continue;
      }
      reswmmSplitLinks++;
      const segLen = +(c.len / nSeg).toFixed(2);
      const fromNode = nodeLookup[c.from];
      const toNode = nodeLookup[c.to];
      if (!fromNode || !toNode) { discretized.push(c); continue; }
      const fromElev = fromNode.elev || 0;
      const toElev = toNode.elev || 0;
      let prevNodeName = c.from;
      for (let s = 0; s < nSeg; s++) {
        const isLast = s === nSeg - 1;
        let nextNodeName: string;
        if (isLast) {
          nextNodeName = c.to;
        } else {
          const frac = (s + 1) / nSeg;
          nextNodeName = `${c.name}_N${s+1}`;
          const interpElev = +(fromElev + (toElev - fromElev) * frac).toFixed(3);
          const interpX = fromNode.x + (toNode.x - fromNode.x) * frac;
          const interpY = fromNode.y + (toNode.y - fromNode.y) * frac;
          const maxD = fromNode.maxD || 6;
          const mnsaPonded = Math.round(rCfg.mnsa);
          junctions.push({ name: nextNodeName, elev: interpElev, maxD: +maxD.toFixed(2), ponded: mnsaPonded, x: interpX, y: interpY });
          nodeLookup[nextNodeName] = { elev: interpElev, maxD, x: interpX, y: interpY };
          reswmmNewJunctions++;
        }
        discretized.push({
          name: `${c.name}_${s+1}`,
          from: prevNodeName,
          to: nextNodeName,
          len: segLen,
          rough: c.rough,
          inOff: s === 0 ? c.inOff : 0,
          outOff: isLast ? c.outOff : 0,
          diam: c.diam,
          shape: c.shape,
        });
        prevNodeName = nextNodeName;
      }
    }
    conduits.length = 0;
    for (const d of discretized) conduits.push(d);
  }

  const dividerNodes: {name:string;elev:number;x:number;y:number;maxD:number;divLink:string;type:string}[] = [];
  const dividerJunctionNames = new Set<string>();
  if (config.enableDividers && junctions.length > 10) {
    const nDividers = Math.max(1, Math.floor(junctions.length * 0.01));
    const candidates = junctions.filter(j => {
      const outLinks = conduits.filter(c => c.from === j.name);
      return outLinks.length >= 1;
    });
    const selected = candidates.slice(0, nDividers);
    for (const dj of selected) {
      const outLink = conduits.find(c => c.from === dj.name);
      if (!outLink) continue;
      const rr = Math.random();
      let divType: string;
      if (rr < 0.5) divType = 'OVERFLOW';
      else if (rr < 0.8) divType = 'CUTOFF';
      else divType = 'WEIR';
      dividerNodes.push({name:dj.name, elev:dj.elev, x:dj.x, y:dj.y, maxD:dj.maxD, divLink:outLink.name, type:divType});
      dividerJunctionNames.add(dj.name);
    }
  }

  w("[JUNCTIONS]");
  w(";;Name           InvertElev  MaxDepth    InitDepth   SurDepth    Ponded");
  for (const j of junctions) {
    if (dividerJunctionNames.has(j.name)) continue;
    w(`${j.name.padEnd(17)}${j.elev.toFixed(3).padEnd(12)}${j.maxD.toFixed(2).padEnd(12)}0           0           ${j.ponded}`);
  }
  w("");

  w("[OUTFALLS]");
  w(";;Name           InvertElev  Type        StageData   Gated");
  for (const o of outfalls) {
    w(`${o.name.padEnd(17)}${o.elev.toFixed(3).padEnd(12)}FREE                       NO`);
  }
  w("");

  if (dividerNodes.length > 0) {
    w("[DIVIDERS]");
    w(";;Name           InvertElev  DivLink      DivType    Param1  Param2  MaxDepth  InitDepth  SurDepth  Aponded");
    for (const dv of dividerNodes) {
      let param1: string, param2: string;
      if (dv.type === 'OVERFLOW') { param1 = '0'; param2 = '0'; }
      else if (dv.type === 'CUTOFF') { param1 = rand(1,10).toFixed(2); param2 = '0'; }
      else { param1 = rand(1,5).toFixed(2); param2 = rand(1,3).toFixed(2); }
      w(`${dv.name.padEnd(17)}${dv.elev.toFixed(3).padEnd(12)}${dv.divLink.padEnd(13)}${dv.type.padEnd(11)}${param1.padEnd(8)}${param2.padEnd(8)}${dv.maxD.toFixed(2).padEnd(10)}0          0          0`);
    }
    w("");
  }

  if (storages.length > 0) {
    w("[STORAGE]");
    w(";;Name           InvertElev  MaxDepth    InitDepth   Shape      Params");
    for (const s of storages) {
      w(`${s.name.padEnd(17)}${s.elev.toFixed(3).padEnd(12)}${s.maxD.toFixed(2).padEnd(12)}0           FUNCTIONAL ${s.area}       0        0`);
    }
    w("");
  }

  w("[CONDUITS]");
  w(";;Name           FromNode         ToNode           Length      Roughness   InOffset    OutOffset");
  for (const c of conduits) {
    w(`${c.name.padEnd(17)}${c.from.padEnd(17)}${c.to.padEnd(17)}${c.len.toFixed(2).padEnd(12)}${c.rough.toFixed(4).padEnd(12)}${c.inOff.toFixed(3).padEnd(12)}${c.outOff.toFixed(3)}`);
  }
  w("");

  const irregularConduits = conduits.filter(c => c.shape === "IRREGULAR");
  const transectMap: Record<string, string> = {};
  if (irregularConduits.length > 0) {
    const nUnique = Math.min(irregularConduits.length, Math.max(3, Math.ceil(irregularConduits.length * 0.3)));
    const transectDefs: { name: string; nLeft: number; nRight: number; nChannel: number; stations: [number, number][]; xleft: number; xright: number }[] = [];
    for (let t = 0; t < nUnique; t++) {
      const tName = `TR${t + 1}`;
      const refDiam = irregularConduits[Math.floor(t * irregularConduits.length / nUnique)].diam;
      const depth = refDiam * rand(1.2, 2.5);
      const botW = refDiam * rand(1.5, 4);
      const slopeL = rand(1.5, 4);
      const slopeR = rand(1.5, 4);
      const bankW_L = depth * slopeL;
      const bankW_R = depth * slopeR;
      const overbankL = rand(botW * 0.5, botW * 2);
      const overbankR = rand(botW * 0.5, botW * 2);
      const totalW = overbankL + bankW_L + botW + bankW_R + overbankR;
      const pts: [number, number][] = [];
      const s0 = 0;
      const s1 = overbankL;
      const s2 = overbankL + bankW_L;
      const s3 = s2 + botW * 0.33;
      const s4 = s2 + botW * 0.67;
      const s5 = s2 + botW;
      const s6 = s5 + bankW_R;
      const s7 = totalW;
      const topElev = depth;
      const bankElev = depth * rand(0.85, 0.95);
      const toeElev = depth * rand(0.05, 0.15);
      pts.push([s0, topElev + rand(0, depth * 0.1)]);
      pts.push([s1 * 0.5, bankElev + rand(0, depth * 0.05)]);
      pts.push([s1, bankElev]);
      pts.push([s2, toeElev]);
      pts.push([s3, rand(0, toeElev * 0.5)]);
      pts.push([s4, rand(0, toeElev * 0.5)]);
      pts.push([s5, toeElev * rand(0.8, 1.2)]);
      pts.push([s6, bankElev * rand(0.95, 1.05)]);
      pts.push([s6 + (s7 - s6) * 0.5, bankElev + rand(0, depth * 0.05)]);
      pts.push([s7, topElev + rand(0, depth * 0.1)]);
      const nL = 0.035 + Math.random() * 0.03;
      const nR = 0.035 + Math.random() * 0.03;
      const nC = 0.025 + Math.random() * 0.015;
      transectDefs.push({ name: tName, nLeft: nL, nRight: nR, nChannel: nC, stations: pts, xleft: s1, xright: s6 });
    }
    for (let i = 0; i < irregularConduits.length; i++) {
      transectMap[irregularConduits[i].name] = transectDefs[i % nUnique].name;
    }
    w("[TRANSECTS]");
    w(";;Transect Data in HEC-2 format");
    for (const td of transectDefs) {
      w(`NC ${td.nLeft.toFixed(3)}   ${td.nChannel.toFixed(3)}   ${td.nRight.toFixed(3)}`);
      w(`X1 ${td.name.padEnd(17)}${td.stations.length.toString().padEnd(6)}${td.xleft.toFixed(3).padEnd(10)}${td.xright.toFixed(3).padEnd(10)}0.0       0.0       0.0       0.0       1.0       1.0`);
      let grLine = "GR";
      for (let p = 0; p < td.stations.length; p++) {
        grLine += ` ${td.stations[p][1].toFixed(3).padEnd(10)}${td.stations[p][0].toFixed(3).padEnd(10)}`;
        if ((p + 1) % 5 === 0 && p < td.stations.length - 1) { w(grLine); grLine = "GR"; }
      }
      if (grLine !== "GR") w(grLine);
    }
    w("");
  }

  interface OrificeData { name: string; from: string; to: string; type: string; height: number; width: number; shape: string; }
  const orifices: OrificeData[] = [];
  if (nOrifices > 0 && storages.length > 0) {
    for (let oi = 0; oi < nOrifices; oi++) {
      const su = storages[oi % storages.length];
      const tgt = junctions[Math.floor(rand(0, Math.min(10, N - 1)))];
      const name = `ORI${oi + 1}`;
      const oType = Math.random() < 0.7 ? "SIDE" : "BOTTOM";
      const shape = Math.random() < 0.6 ? "CIRCULAR" : "RECT_CLOSED";
      const height = +(isSI ? rand(0.3, 1.2) : rand(1, 4)).toFixed(3);
      const width = shape === "RECT_CLOSED" ? +(height * rand(0.8, 2.0)).toFixed(3) : 0;
      orifices.push({ name, from: su.name, to: tgt.name, type: oType, height, width, shape });
    }
  }

  interface WeirData { name: string; from: string; to: string; type: string; height: number; width: number; shape: string; crestHt: number; cd: number; }
  const weirs: WeirData[] = [];
  if (nWeirs > 0 && storages.length > 0) {
    for (let wi = 0; wi < nWeirs; wi++) {
      const su = storages[wi % storages.length];
      const tgt = junctions[Math.floor(rand(0, Math.min(10, N - 1)))];
      const name = `WR${wi + 1}`;
      const wType = pick(["TRANSVERSE", "SIDEFLOW", "V-NOTCH", "TRAPEZOIDAL"]);
      const crestHt = +(su.maxD * rand(0.3, 0.7)).toFixed(2);
      const cd = +(rand(2.5, 3.5)).toFixed(2);
      const shape = wType === "V-NOTCH" ? "TRIANGULAR" : wType === "TRAPEZOIDAL" ? "TRAPEZOIDAL" : "RECT_OPEN";
      const height = +(isSI ? rand(0.5, 2.0) : rand(1.5, 6)).toFixed(3);
      const width = +(height * rand(1.5, 4.0)).toFixed(3);
      weirs.push({ name, from: su.name, to: tgt.name, type: wType, height, width, shape, crestHt, cd });
    }
  }

  w("[XSECTIONS]");
  w(";;Link           Shape            Geom1       Geom2       Geom3       Geom4       Barrels");
  for (const c of conduits) {
    if (c.shape === "IRREGULAR") {
      const tName = transectMap[c.name] || "TR1";
      w(`${c.name.padEnd(17)}${"IRREGULAR".padEnd(17)}${tName.padEnd(12)}0.000       0.0         0.0         1`);
    } else {
      let g1 = c.diam, g2 = 0, g3 = 0, g4 = 0;
      if (c.shape === "FORCE_MAIN") { g2 = c.rough; }
      else if (c.shape === "EGG") g1 = c.diam * 1.5;
      else if (c.shape === "RECT_CLOSED") { g2 = c.diam * rand(0.8, 1.5); }
      else if (c.shape === "RECT_OPEN") { g2 = c.diam * rand(1, 3); }
      else if (c.shape === "TRAPEZOIDAL") { g2 = c.diam * 2; g3 = 2; g4 = 2; }
      else if (c.shape === "ARCH") { g2 = +(c.diam * rand(1.2, 2.0)).toFixed(3); }
      else if (c.shape.includes("FILLED")) { g2 = +(c.diam * rand(0.1, 0.3)).toFixed(3); }
      w(`${c.name.padEnd(17)}${c.shape.padEnd(17)}${g1.toFixed(3).padEnd(12)}${g2.toFixed(3).padEnd(12)}${g3.toFixed(1).padEnd(12)}${g4.toFixed(1).padEnd(12)}1`);
    }
  }
  for (const o of orifices) {
    const g2 = o.shape === "RECT_CLOSED" ? o.width : 0;
    w(`${o.name.padEnd(17)}${o.shape.padEnd(17)}${o.height.toFixed(3).padEnd(12)}${g2.toFixed(3).padEnd(12)}${"0.0".padEnd(12)}${"0.0".padEnd(12)}1`);
  }
  for (const wr of weirs) {
    const g2 = wr.width;
    const g3 = wr.shape === "TRAPEZOIDAL" ? 2 : 0;
    const g4 = wr.shape === "TRAPEZOIDAL" ? 2 : 0;
    w(`${wr.name.padEnd(17)}${wr.shape.padEnd(17)}${wr.height.toFixed(3).padEnd(12)}${g2.toFixed(3).padEnd(12)}${g3.toFixed(1).padEnd(12)}${g4.toFixed(1).padEnd(12)}1`);
  }
  w("");

  const subcatchData: { name: string; outlet: string; jx: number; jy: number }[] = [];
  if (nSubcatch > 0) {
    w("[SUBCATCHMENTS]");
    w(";;Name           Raingage         Outlet           Area     %Imperv  Width    Slope");
    const impRanges: Record<string, [number,number]> = { commercial:[85,98], industrial:[60,90], residential:[30,55], mixed:[15,80] };
    const impR = impRanges[config.landUse] || [20,80];
    const slopeR: Record<string, [number,number]> = { flat:[0.1,1], moderate:[0.5,3], hilly:[2,8], mountainous:[5,20] };
    const slR = slopeR[config.terrain];
    for (let i=0; i<nSubcatch; i++) {
      const name = `S${i+1}`;
      const gage = `RG${(i%nGages)+1}`;
      const junc = junctions[i%N];
      const outlet = junc.name;
      let area = tri(0.5,100,5); if(isSI) area/=2.471;
      const imperv = rand(impR[0],impR[1]);
      const areaFt = area*(isSI?10764:43560);
      const width = Math.sqrt(areaFt)*rand(0.5,1.2);
      const slope = rand(slR[0],slR[1]);
      w(`${name.padEnd(17)}${gage.padEnd(17)}${outlet.padEnd(17)}${area.toFixed(3).padEnd(9)}${imperv.toFixed(1).padEnd(9)}${width.toFixed(1).padEnd(9)}${slope.toFixed(2)}`);
      subcatchData.push({ name, outlet, jx: junc.x, jy: junc.y });
    }
    w("");

    w("[SUBAREAS]");
    w(";;Subcatch       N-Imperv   N-Perv     S-Imperv   S-Perv     PctZero    RouteTo");
    const si = isSI?1.27:0.05, sp = isSI?3.81:0.15;
    for (let i=0; i<nSubcatch; i++) w(`S${i+1}`.padEnd(17)+`0.015      0.20       ${si.toFixed(3).padEnd(11)}${sp.toFixed(3).padEnd(11)}25         OUTLET`);
    w("");

    w("[INFILTRATION]");
    if (config.infiltrationMethod === 'GREEN_AMPT') {
      w(";;Subcatch       Suction    HydCon     IMDmax");
      for (let i=0; i<nSubcatch; i++) w(`S${i+1}`.padEnd(17)+`${rand(3,12).toFixed(2).padEnd(11)}${rand(0.01,0.5).toFixed(3).padEnd(11)}${rand(0.2,0.45).toFixed(3)}`);
    } else if (config.infiltrationMethod === 'CURVE_NUMBER') {
      w(";;Subcatch       CurveNo    HydCon     DryTime");
      for (let i=0; i<nSubcatch; i++) w(`S${i+1}`.padEnd(17)+`${Math.round(rand(50,90)).toString().padEnd(11)}${rand(0.01,0.5).toFixed(3).padEnd(11)}7`);
    } else {
      w(";;Subcatch       MaxRate    MinRate    Decay      DryTime    MaxInfil");
      for (let i=0; i<nSubcatch; i++) w(`S${i+1}`.padEnd(17)+`${rand(2,5).toFixed(2).padEnd(11)}${rand(0.3,1).toFixed(2).padEnd(11)}${rand(3,5).toFixed(1).padEnd(11)}7          0`);
    }
    w("");

    if (config.enableAquifers) {
      const nAquifers = Math.max(1, Math.ceil(nSubcatch / 20));
      const aquiferNames: string[] = [];
      w("[AQUIFERS]");
      w(";;Name           Por    WP     FC     Ksat   Kslope Tslope ETu    ETs    Seep   Ebot   Egw    Umc    ETpat");
      for (let a = 0; a < nAquifers; a++) {
        const aName = `AQ${a + 1}`;
        aquiferNames.push(aName);
        const por = rand(0.40, 0.50);
        const wp = rand(0.10, 0.15);
        const fc = rand(wp + 0.05, 0.35);
        const ksat = rand(0.5, 12.0);
        const kslope = rand(10, 40);
        const tslope = rand(1.0, 3.0);
        const etu = rand(0.3, 0.6);
        const ets = rand(eLo, eLo + (eHi - eLo) * 0.3);
        const seep = rand(0.0, 0.005);
        const ebot = eLo + rand(0, (eHi - eLo) * 0.1);
        const egw = ebot + rand(1, 5);
        const umc = rand(wp, fc);
        w(`${aName.padEnd(17)}${por.toFixed(3).padEnd(7)}${wp.toFixed(3).padEnd(7)}${fc.toFixed(3).padEnd(7)}${ksat.toFixed(2).padEnd(7)}${kslope.toFixed(1).padEnd(7)}${tslope.toFixed(1).padEnd(7)}${etu.toFixed(2).padEnd(7)}${ets.toFixed(1).padEnd(7)}${seep.toFixed(4).padEnd(7)}${ebot.toFixed(1).padEnd(7)}${egw.toFixed(1).padEnd(7)}${umc.toFixed(3).padEnd(7)}`);
      }
      w("");

      if (config.enableGroundwater) {
        w("[GROUNDWATER]");
        w(";;Subcatch       Aquifer          Node             Esurf      A1         B1         A2         B2         A3         Dsw        Egwt       Ebot       Wgr        Umc");
        for (let i = 0; i < nSubcatch; i++) {
          const sName = `S${i + 1}`;
          const aqName = aquiferNames[i % nAquifers];
          const gwNode = junctions[i % N].name;
          const surfElev = junctions[i % N].elev + junctions[i % N].maxD;
          const a1 = rand(0.001, 0.05);
          const b1 = rand(1.0, 2.5);
          const a2 = rand(0.001, 0.03);
          const b2 = rand(1.0, 2.0);
          const a3 = rand(0.0, 0.002);
          const dsw = rand(0, 5);
          const ebot = eLo + rand(0, (eHi - eLo) * 0.1);
          const egwt = ebot + rand(2, 8);
          const wgr = rand(0.1, 0.3);
          const umc = rand(0.1, 0.3);
          w(`${sName.padEnd(17)}${aqName.padEnd(17)}${gwNode.padEnd(17)}${surfElev.toFixed(2).padEnd(11)}${a1.toFixed(4).padEnd(11)}${b1.toFixed(2).padEnd(11)}${a2.toFixed(4).padEnd(11)}${b2.toFixed(2).padEnd(11)}${a3.toFixed(4).padEnd(11)}${dsw.toFixed(2).padEnd(11)}${egwt.toFixed(2).padEnd(11)}${ebot.toFixed(2).padEnd(11)}${wgr.toFixed(3).padEnd(11)}${umc.toFixed(3)}`);
        }
        w("");

        w("[GWF]");
        w(";;Subcatch       Type         Expression");
        for (let i = 0; i < nSubcatch; i++) {
          if (Math.random() < 0.2) {
            const sName = `S${i + 1}`;
            w(`${sName.padEnd(17)}LATERAL      0.001 * (Hgw - Hcb) ^ 2`);
          }
        }
        w("");
      }
    }
  }

  if (config.enableSnowmelt && nSubcatch > 0) {
    w("[SNOWPACKS]");
    w(";;Name           Surface    Param1  Param2  Param3  Param4  Param5  Param6  Param7");
    const spNames = ['SnowPack1', 'SnowPack2'];
    for (const sp of spNames) {
      w(`${sp.padEnd(17)}PLOWABLE   0.001  0.001  32.0  0.10  0.00  0.00  0.0`);
      w(`${sp.padEnd(17)}IMPERVIOUS 0.001  0.001  32.0  0.10  0.00  0.00  0.0`);
      w(`${sp.padEnd(17)}PERVIOUS   0.001  0.001  32.0  0.10  0.00  0.00  0.0`);
      w(`${sp.padEnd(17)}REMOVAL    0.5    0.0    0.0   0.0   0.0   0.0   *`);
    }
    w("");
  }

  if (config.enableLID && nSubcatch > 0) {
    const LID_TYPES: { name: string; type: string; layers: string[][] }[] = [
      {
        name: 'BioRetention',
        type: 'BC',
        layers: [
          ['SURFACE', '6', '0.15', '0.1', '1.0', '5'],
          ['SOIL', '18', '0.45', '0.20', '0.10', '0.5', '10.0', '3.5'],
          ['STORAGE', '12', '0.40', '0.5', '0'],
          ['DRAIN', '0.5', '6', '6', '0'],
        ],
      },
      {
        name: 'PermPavement',
        type: 'PP',
        layers: [
          ['SURFACE', '0', '0.0', '0.02', '1.0', '5'],
          ['PAVEMENT', '6', '0.15', '100', '50', '0'],
          ['STORAGE', '12', '0.40', '0.5', '0'],
          ['DRAIN', '1.0', '6', '6', '0'],
        ],
      },
      {
        name: 'RainGarden',
        type: 'BC',
        layers: [
          ['SURFACE', '9', '0.2', '0.05', '1.0', '5'],
          ['SOIL', '24', '0.50', '0.25', '0.12', '0.5', '10.0', '3.5'],
          ['STORAGE', '6', '0.50', '0.3', '0'],
          ['DRAIN', '0', '0', '0', '0'],
        ],
      },
      {
        name: 'GreenRoof',
        type: 'GR',
        layers: [
          ['SURFACE', '3', '0.15', '0.05', '1.0', '5'],
          ['SOIL', '4', '0.45', '0.20', '0.10', '0.5', '10.0', '3.5'],
          ['DRAINMAT', '1', '0.5', '0.1'],
        ],
      },
      {
        name: 'InfilTrench',
        type: 'IT',
        layers: [
          ['SURFACE', '0', '0.0', '0.02', '1.0', '5'],
          ['STORAGE', '36', '0.40', '0.5', '0'],
          ['DRAIN', '1.0', '6', '6', '0'],
        ],
      },
    ];

    w("[LID_CONTROLS]");
    w(";;Name           Type/Layer Parameters");
    for (const lid of LID_TYPES) {
      w(`${lid.name.padEnd(17)}${lid.type}`);
      for (const layer of lid.layers) {
        w(`${lid.name.padEnd(17)}${layer.join('  ')}`);
      }
    }
    w("");

    w("[LID_USAGE]");
    w(";;Subcatch       LID_Name         Number   Area       Width      InitSat  FromImp  ToPerv   RptFile  DrainTo  FromPerv");
    for (let i = 0; i < nSubcatch; i++) {
      if (Math.random() < 0.3) {
        const lid = LID_TYPES[Math.floor(Math.random() * LID_TYPES.length)];
        const sName = `S${i + 1}`;
        const nUnits = Math.floor(rand(1, 5));
        const area = rand(50, 500).toFixed(0);
        const width = rand(5, 30).toFixed(1);
        const initSat = rand(0, 30).toFixed(0);
        w(`${sName.padEnd(17)}${lid.name.padEnd(17)}${String(nUnits).padEnd(9)}${area.padEnd(11)}${width.padEnd(11)}${initSat.padEnd(9)}25       1        *        *        0`);
      }
    }
    w("");
  }

  if (config.enableWQ && nSubcatch > 0) {
    const POLLUTANTS = [
      { name: 'TSS', units: 'MG/L', crain: 10.0, cgw: 0.0, crdii: 0.0, kinit: 0.0, cflag: 'CONCENTRATION' },
      { name: 'BOD', units: 'MG/L', crain: 3.0, cgw: 0.0, crdii: 0.0, kinit: 0.0, cflag: 'CONCENTRATION' },
      { name: 'COD', units: 'MG/L', crain: 15.0, cgw: 0.0, crdii: 0.0, kinit: 0.0, cflag: 'CONCENTRATION' },
      { name: 'TN', units: 'MG/L', crain: 1.5, cgw: 0.0, crdii: 0.0, kinit: 0.0, cflag: 'CONCENTRATION' },
      { name: 'TP', units: 'MG/L', crain: 0.15, cgw: 0.0, crdii: 0.0, kinit: 0.0, cflag: 'CONCENTRATION' },
    ];

    w("[POLLUTANTS]");
    w(";;Name           Units  Crain      Cgw        Crdii      Kdecay     SnowOnly   CoPollut   CoFrac     Cdwf       Cinit");
    for (const p of POLLUTANTS) {
      const kdecay = rand(0.0, 0.05);
      const cdwf = p.name === 'TSS' ? rand(50, 200) : p.name === 'BOD' ? rand(100, 300) : p.name === 'COD' ? rand(200, 500) : p.name === 'TN' ? rand(20, 50) : rand(3, 10);
      w(`${p.name.padEnd(17)}${p.units.padEnd(7)}${p.crain.toFixed(1).padEnd(11)}${p.cgw.toFixed(1).padEnd(11)}${p.crdii.toFixed(1).padEnd(11)}${kdecay.toFixed(3).padEnd(11)}NO         *              0          ${cdwf.toFixed(1).padEnd(11)}0`);
    }
    w("");

    const luBuildupRates: Record<string, number> = { residential: 1.0, commercial: 1.5, industrial: 2.0, mixed: 1.2 };
    const baseRate = luBuildupRates[config.landUse] || 1.2;
    const LAND_USES = ['Residential_LU', 'Commercial_LU', 'Industrial_LU'];
    const luForConfig = config.landUse === 'mixed' ? LAND_USES : [config.landUse === 'residential' ? 'Residential_LU' : config.landUse === 'commercial' ? 'Commercial_LU' : 'Industrial_LU'];

    w("[LANDUSES]");
    w(";;Name             SweepIntv  Availabil  LastSweep");
    const sweepData: Record<string, [number, number]> = { Residential_LU: [14, 0.9], Commercial_LU: [7, 0.95], Industrial_LU: [14, 0.85] };
    for (const lu of luForConfig) {
      const [si, av] = sweepData[lu] || [14, 0.9];
      w(`${lu.padEnd(19)}${si}          ${av.toFixed(2).padEnd(11)}0`);
    }
    w("");

    w("[COVERAGES]");
    w(";;Subcatch         LandUse          Percent");
    for (let i = 0; i < nSubcatch; i++) {
      const sName = `S${i + 1}`;
      if (luForConfig.length === 1) {
        w(`${sName.padEnd(19)}${luForConfig[0].padEnd(17)}100`);
      } else {
        const pcts = luForConfig.map(() => rand(10, 50));
        const total = pcts.reduce((a, b) => a + b, 0);
        for (let li = 0; li < luForConfig.length; li++) {
          const pct = Math.round(pcts[li] / total * 100);
          if (pct > 0) w(`${sName.padEnd(19)}${luForConfig[li].padEnd(17)}${pct}`);
        }
      }
    }
    w("");

    w("[BUILDUP]");
    w(";;LandUse         Pollutant    BType      Rate       Power      Normalizer");
    for (const lu of luForConfig) {
      for (const p of POLLUTANTS) {
        const rate = (baseRate * (p.name === 'TSS' ? 25 : p.name === 'BOD' ? 5 : p.name === 'COD' ? 10 : p.name === 'TN' ? 2 : 0.5)).toFixed(2);
        const power = rand(0.4, 0.6).toFixed(2);
        w(`${lu.padEnd(17)}${p.name.padEnd(13)}POW        ${rate.padEnd(11)}${power.padEnd(11)}AREA`);
      }
    }
    w("");

    w("[WASHOFF]");
    w(";;LandUse         Pollutant    WType      Coeff      Expon      SweepRmvl  BmpRmvl");
    for (const lu of luForConfig) {
      for (const p of POLLUTANTS) {
        const coeff = (p.name === 'TSS' ? rand(0.002, 0.01) : rand(0.001, 0.005)).toFixed(4);
        const expon = rand(1.5, 2.5).toFixed(2);
        const bmpRmvl = config.enableLID ? rand(20, 60).toFixed(0) : '0';
        w(`${lu.padEnd(17)}${p.name.padEnd(13)}EMC        ${coeff.padEnd(11)}${expon.padEnd(11)}0          ${bmpRmvl}`);
      }
    }
    w("");

    w("[TREATMENT]");
    w(";;Node           Pollutant    Function");
    const treatmentNodes = storages.length > 0 ? storages : junctions.slice(0, Math.max(1, Math.floor(junctions.length * 0.02)));
    for (const tn of treatmentNodes) {
      for (const p of POLLUTANTS) {
        const removalFrac = p.name === 'TSS' ? rand(0.4, 0.8) : p.name === 'BOD' ? rand(0.3, 0.6) : rand(0.2, 0.5);
        w(`${tn.name.padEnd(17)}${p.name.padEnd(13)}C = C * ${(1 - removalFrac).toFixed(3)}`);
      }
    }
    w("");

    w("[LOADINGS]");
    w(";;Subcatch       Pollutant    InitLoad");
    for (let i = 0; i < nSubcatch; i++) {
      if (Math.random() < 0.3) {
        const sName = `S${i + 1}`;
        for (const p of POLLUTANTS) {
          const load = p.name === 'TSS' ? rand(10, 80) : p.name === 'BOD' ? rand(5, 30) : p.name === 'COD' ? rand(15, 60) : p.name === 'TN' ? rand(1, 10) : rand(0.2, 3);
          w(`${sName.padEnd(17)}${p.name.padEnd(13)}${load.toFixed(1)}`);
        }
      }
    }
    w("");
  }

  const pumps: PumpData[] = [];
  if (nPumps > 0 && storages.length > 0) {
    w("[PUMPS]");
    w(";;Name           FromNode         ToNode           Curve           Status  Startup Shutoff");
    let pi = 0;
    for (let si2=0; si2<storages.length && pi<nPumps; si2++) {
      const nAtSta = Math.min(nPumps-pi, Math.floor(rand(1,4)));
      const tgt = junctions[Math.floor(rand(0,Math.min(5,N-1)))].name;
      for (let p=0; p<nAtSta && pi<nPumps; p++) {
        pi++;
        const su = storages[si2];
        const startup = +(su.maxD*0.6).toFixed(2);
        const shutoff = +(su.maxD*0.15).toFixed(2);
        pumps.push({name:`PMP${pi}`, from:su.name, to:tgt, curve:`PC${pi}`, startup, shutoff, maxD:su.maxD});
        w(`PMP${pi}`.padEnd(17)+su.name.padEnd(17)+tgt.padEnd(17)+`PC${pi}`.padEnd(17)+`ON`.padEnd(9)+startup.toFixed(2).padEnd(9)+shutoff.toFixed(2));
      }
    }
    w("");

    w("[CURVES]");
    w(";;Name           Type       X-Value    Y-Value");
    for (const p of pumps) {
      const mh = rand(20,80), mf = rand(1,50);
      w(`${p.curve.padEnd(17)}PUMP3`);
      w(`${p.curve.padEnd(17)}           0.00       ${mf.toFixed(2)}`);
      w(`${p.curve.padEnd(17)}           ${(mh*0.5).toFixed(1).padEnd(11)}${(mf*0.6).toFixed(2)}`);
      w(`${p.curve.padEnd(17)}           ${mh.toFixed(1).padEnd(11)}0.00`);
    }
    w("");

    w("[CONTROLS]");
    for (const p of pumps) {
      w(`RULE ${p.name}_ON`);
      w(`IF NODE ${p.from} DEPTH > ${p.startup}`);
      w(`THEN PUMP ${p.name} STATUS = ON`);
      w("");
      w(`RULE ${p.name}_OFF`);
      w(`IF NODE ${p.from} DEPTH < ${p.shutoff}`);
      w(`THEN PUMP ${p.name} STATUS = OFF`);
      w("");
    }
    w("");
  }

  if (orifices.length > 0) {
    w("[ORIFICES]");
    w(";;Name           FromNode         ToNode           Type       Offset     Cd         FlapGate");
    for (const o of orifices) {
      const su = storages.find(s => s.name === o.from);
      const offset = su ? +(su.maxD * rand(0.1, 0.4)).toFixed(2) : 0;
      const cd = +(rand(0.5, 0.7)).toFixed(2);
      w(`${o.name.padEnd(17)}${o.from.padEnd(17)}${o.to.padEnd(17)}${o.type.padEnd(11)}${offset.toFixed(2).padEnd(11)}${cd.toFixed(2).padEnd(11)}NO`);
    }
    w("");
  }

  if (weirs.length > 0) {
    w("[WEIRS]");
    w(";;Name           FromNode         ToNode           Type         CrestHt    Cd         FlapGate   EndCon     EndCoeff   Surcharge");
    for (const wr of weirs) {
      w(`${wr.name.padEnd(17)}${wr.from.padEnd(17)}${wr.to.padEnd(17)}${wr.type.padEnd(13)}${wr.crestHt.toFixed(2).padEnd(11)}${wr.cd.toFixed(2).padEnd(11)}${"NO".padEnd(11)}0          0          YES`);
    }
    w("");
  }

  if (storages.length > 0) {
    w("[OUTLETS]");
    w(";;Name           FromNode         ToNode           Offset     Type             C1           C2      Gated");
    let oi = 0;
    for (const su of storages) {
      if (Math.random() < 0.5) continue;
      oi++;
      const tgt = junctions[Math.floor(rand(0, Math.min(5, N - 1)))].name;
      const offset = (su.maxD * rand(0.05, 0.3)).toFixed(2);
      const c1 = rand(1, 5).toFixed(2);
      const c2 = rand(0.4, 0.6).toFixed(2);
      w(`OTL${oi}`.padEnd(17) + su.name.padEnd(17) + tgt.padEnd(17) + offset.padEnd(11) + 'FUNCTIONAL/DEPTH '.padEnd(17) + c1.padEnd(13) + c2.padEnd(8) + 'NO');
    }
    w("");
  }

  if (config.enableStreetInlets && nSubcatch > 0) {
    w("[STREETS]");
    w(";;Name           Tcrown   Hcurb    Sx       nRoad    a        W        Sides    Tback    Sback    nBack");
    w("LocalStreet      24.0     0.5      0.02     0.016    0.0      0.0      1        0.0      0.0      0.0");
    w("Arterial         36.0     0.5      0.025    0.016    0.0      0.0      2        0.0      0.0      0.0");
    w("Collector        30.0     0.5      0.02     0.016    0.0      0.0      1        0.0      0.0      0.0");
    w("");

    w("[INLETS]");
    w(";;Name           Type      Param1  Param2  Param3  Param4  Param5");
    w("CurbInlet        CURB      2.0     0.5     HORIZONTAL");
    w("GrateInlet       GRATE     2.0     2.0     P_BAR-50");
    w("ComboInlet       CURB      2.0     0.5     HORIZONTAL");
    w("ComboInlet       GRATE     2.0     2.0     P_BAR-50");
    w("");

    w("[INLET_USAGE]");
    w(";;Conduit        Inlet        Node             Number  PctClog   Qmax     aLocal   wLocal   Placement");
    const inletTypes = ['CurbInlet', 'GrateInlet', 'ComboInlet'];
    for (const c of conduits) {
      if (Math.random() < 0.1) {
        const inletType = inletTypes[Math.floor(Math.random() * inletTypes.length)];
        const nInlets = Math.floor(rand(1, 4));
        const pctClog = Math.floor(rand(0, 30));
        w(`${c.name.padEnd(17)}${inletType.padEnd(13)}${c.from.padEnd(17)}${nInlets}       ${pctClog}         0        0        0        AUTOMATIC`);
      }
    }
    w("");
  }

  w("[LOSSES]");
  w(";;Conduit        Inlet      Outlet     Average    FlapGate");
  for (const c of conduits) {
    const ik = Math.random()<0.2 ? rand(0.1,0.5).toFixed(2) : "0";
    const ok = Math.random()<0.1 ? rand(0.05,0.3).toFixed(2) : "0";
    if (ik!=="0" || ok!=="0") w(`${c.name.padEnd(17)}${ik.toString().padEnd(11)}${ok.toString().padEnd(11)}0          NO`);
  }
  w("");

  const dwfPct = config.dwfNodePct / 100;
  const hasDWF = dwfPct > 0 && (config.type==="sanitary"||config.type==="combined"||config.type==="wos_intensive");
  if (hasDWF) {
    const diurnal = [0.4,0.35,0.3,0.3,0.35,0.5,0.8,1.3,1.6,1.5,1.3,1.2,1.1,1.0,1.0,1.1,1.2,1.4,1.6,1.5,1.2,0.9,0.7,0.5];
    const monthly = [1.1,1.1,1.2,1.1,1.0,0.9,0.8,0.8,0.9,1.0,1.1,1.1];
    const weekend = [0.6,0.5,0.4,0.35,0.35,0.4,0.6,0.9,1.2,1.4,1.5,1.5,1.4,1.3,1.2,1.1,1.0,1.1,1.3,1.5,1.4,1.2,0.9,0.7];
    const seasonal = [0.85,0.85,0.95,1.0,1.1,1.2,1.15,1.1,1.0,0.95,0.9,0.85];
    const bflows: Record<string, number> = {MGD:0.005,CFS:0.02,GPM:5,CMS:0.001,LPS:0.5};
    const base = bflows[flowUnit]||0.01;
    const selectedPatterns = config.dwfPatterns.length > 0 ? config.dwfPatterns : ['Diurnal', 'Monthly'];
    const patternStr = selectedPatterns.map(p => `"${p}"`).join('  ');
    w("[DWF]");
    w(";;Node           Constituent  Baseline    Patterns");
    for (const j of junctions) {
      if (Math.random() < dwfPct) w(`${j.name.padEnd(17)}FLOW         ${(base*rand(0.1,5)).toFixed(6).padEnd(12)}${patternStr}`);
    }
    w("");
    w("[PATTERNS]");
    w(";;Name           Type       Multipliers");
    if (selectedPatterns.includes('Diurnal')) {
      w(`Diurnal          HOURLY     ${diurnal.slice(0,6).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Diurnal                     ${diurnal.slice(6,12).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Diurnal                     ${diurnal.slice(12,18).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Diurnal                     ${diurnal.slice(18,24).map(v=>v.toFixed(2)).join(' ')}`);
    }
    if (selectedPatterns.includes('Monthly')) {
      w(`Monthly          MONTHLY    ${monthly.slice(0,6).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Monthly                     ${monthly.slice(6,12).map(v=>v.toFixed(2)).join(' ')}`);
    }
    if (selectedPatterns.includes('Weekend')) {
      w(`Weekend          HOURLY     ${weekend.slice(0,6).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Weekend                     ${weekend.slice(6,12).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Weekend                     ${weekend.slice(12,18).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Weekend                     ${weekend.slice(18,24).map(v=>v.toFixed(2)).join(' ')}`);
    }
    if (selectedPatterns.includes('Seasonal')) {
      w(`Seasonal         MONTHLY    ${seasonal.slice(0,6).map(v=>v.toFixed(2)).join(' ')}`);
      w(`Seasonal                    ${seasonal.slice(6,12).map(v=>v.toFixed(2)).join(' ')}`);
    }
    w("");
  }

  const hasInflows = config.inflowTsPct > 0;
  if (nGages > 0 || hasInflows) {
    w("[TIMESERIES]");
    w(";;Name           Date       Time       Value");
    if (nGages > 0) {
      const depth = config.rainfallDepth;
      const storm = generateRainfallProfile(config.rainfallDist, depth, config.rainfallDuration);
      for (const [h,v] of storm) {
        const hh = Math.floor(h), mm = Math.round((h-hh)*60);
        w(`TS_Rain          01/01/2025 ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}      ${v.toFixed(3)}`);
      }
    }
    if (hasInflows) {
      const inflowBase = isSI ? 0.01 : 0.5;
      const inflowPeak = inflowBase * rand(5, 20);
      const inflowStorm: [number,number][] = [[0,inflowBase],[2,inflowBase*2],[4,inflowBase*4],[5,inflowPeak*0.5],[6,inflowPeak],[7,inflowPeak*0.7],[8,inflowPeak*0.3],[9,inflowBase*2],[10,inflowBase]];
      for (const [h,v] of inflowStorm) {
        const hh = Math.floor(h), mm = Math.round((h-hh)*60);
        w(`TS_Inflow        01/01/2025 ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}      ${v.toFixed(4)}`);
      }
    }
    w("");
  }

  if (hasInflows) {
    w("[INFLOWS]");
    w(";;Node           Constituent  TimeSeries       Type     Mfactor  Sfactor  Baseline  Pattern");
    const inflowFrac = config.inflowTsPct / 100;
    for (const j of junctions) {
      if (Math.random() < inflowFrac) {
        w(`${j.name.padEnd(17)}FLOW         TS_Inflow        FLOW     1.0      ${rand(0.5,2.0).toFixed(2).padEnd(9)}0`);
      }
    }
    w("");
  }

  if (config.type === 'rdii_calibration' && nSubcatch > 0) {
    w("[RDII]");
    w(";;Node           UHGroup      SewerArea");
    for (const j of junctions) {
      if (Math.random() < 0.4) {
        const uhGroup = Math.random() < 0.5 ? 'UH1' : 'UH2';
        const area = rand(5, 50).toFixed(1);
        w(`${j.name.padEnd(17)}${uhGroup.padEnd(13)}${area}`);
      }
    }
    w("");

    w("[HYDROGRAPHS]");
    w(";;Name           Month   Response  R        T(hr)    K(hr)    IA_max   IA_rec   IA_init");
    const uhGroups = ['UH1', 'UH2'];
    for (const uh of uhGroups) {
      w(`${uh.padEnd(17)}ALL`);
      w(`${uh.padEnd(17)}ALL     SHORT     ${rand(0.03,0.08).toFixed(4)}  ${rand(0.5,2).toFixed(1)}      ${rand(1,4).toFixed(1)}      ${rand(0.05,0.2).toFixed(2)}     ${rand(0.01,0.05).toFixed(3)}    ${rand(0.0,0.1).toFixed(2)}`);
      w(`${uh.padEnd(17)}ALL     MEDIUM    ${rand(0.02,0.05).toFixed(4)}  ${rand(2,8).toFixed(1)}      ${rand(3,10).toFixed(1)}     ${rand(0.1,0.3).toFixed(2)}     ${rand(0.02,0.08).toFixed(3)}    ${rand(0.0,0.15).toFixed(2)}`);
      w(`${uh.padEnd(17)}ALL     LONG      ${rand(0.005,0.02).toFixed(4)}  ${rand(8,48).toFixed(1)}     ${rand(10,60).toFixed(1)}    ${rand(0.2,0.5).toFixed(2)}     ${rand(0.03,0.1).toFixed(3)}     ${rand(0.0,0.2).toFixed(2)}`);
    }
    w("");
  }

  w("[COORDINATES]");
  w(";;Node           X-Coord        Y-Coord");
  for (const o of outfalls) w(`${o.name.padEnd(17)}${o.x.toFixed(1).padEnd(15)}${o.y.toFixed(1)}`);
  for (const s of storages) w(`${s.name.padEnd(17)}${s.x.toFixed(1).padEnd(15)}${s.y.toFixed(1)}`);
  for (const j of junctions) {
    w(`${j.name.padEnd(17)}${j.x.toFixed(1).padEnd(15)}${j.y.toFixed(1)}`);
  }
  w("");

  const nodeCoords: Record<string, {x:number;y:number}> = {};
  for (const o of outfalls) nodeCoords[o.name] = {x:o.x, y:o.y};
  for (const s of storages) nodeCoords[s.name] = {x:s.x, y:s.y};
  for (const j of junctions) nodeCoords[j.name] = {x:j.x, y:j.y};

  const linkVertices: Record<string, {x:number;y:number}[]> = {};
  if (config.enableCurvedLinks) {
    w("[VERTICES]");
    w(";;Link           X-Coord        Y-Coord");
    for (const c of conduits) {
      const fNode = nodeCoords[c.from], tNode = nodeCoords[c.to];
      if (!fNode || !tNode) continue;
      if (Math.random() > 0.3) continue;
      const dx = tNode.x - fNode.x, dy = tNode.y - fNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) continue;
      const perpX = -dy / dist, perpY = dx / dist;
      const nPts = dist > 200 ? 3 : dist > 80 ? 2 : 1;
      const verts: {x:number;y:number}[] = [];
      for (let vi = 0; vi < nPts; vi++) {
        const t = (vi + 1) / (nPts + 1);
        const mx = fNode.x + dx * t;
        const my = fNode.y + dy * t;
        const offset = dist * rand(-0.12, 0.12);
        const vx = mx + perpX * offset;
        const vy = my + perpY * offset;
        w(`${c.name.padEnd(17)}${vx.toFixed(1).padEnd(15)}${vy.toFixed(1)}`);
        verts.push({x: vx, y: vy});
      }
      linkVertices[c.name] = verts;
    }
    w("");
  }

  const voronoiCells: VoronoiCell[] = [];
  if (subcatchData.length > 0) {
    const uniqueSites = new Map<string, { x: number; y: number; name: string }>();
    for (const sc of subcatchData) {
      if (!uniqueSites.has(sc.outlet)) {
        uniqueSites.set(sc.outlet, { x: sc.jx, y: sc.jy, name: sc.name });
      }
    }
    const siteArray = Array.from(uniqueSites.values());
    const maxVoronoiSites = 500;
    const cells = siteArray.length <= maxVoronoiSites
      ? computeVoronoiCells(siteArray, 0, 0, domain, domain)
      : computeVoronoiCells(siteArray.slice(0, maxVoronoiSites), 0, 0, domain, domain);

    const cellByOutlet = new Map<string, VoronoiCell>();
    for (let ci = 0; ci < cells.length; ci++) {
      const outletName = Array.from(uniqueSites.keys())[ci];
      cellByOutlet.set(outletName, cells[ci]);
    }

    w("[Polygons]");
    w(";;Subcatch       X-Coord        Y-Coord");
    for (const sc of subcatchData) {
      const cell = cellByOutlet.get(sc.outlet);
      if (cell) {
        for (const v of cell.vertices) {
          w(`${sc.name.padEnd(17)}${v.x.toFixed(1).padEnd(15)}${v.y.toFixed(1)}`);
        }
        voronoiCells.push({ site: { x: sc.jx, y: sc.jy, name: sc.name }, vertices: cell.vertices });
      }
    }
    w("");
  }

  if (nGages > 0) {
    w("[SYMBOLS]");
    w(";;Gage           X-Coord        Y-Coord");
    for (let i = 0; i < nGages; i++) {
      const sx = domain * (i + 1) / (nGages + 1);
      const sy = domain * 0.9;
      w(`RG${i+1}`.padEnd(17) + sx.toFixed(1).padEnd(15) + sy.toFixed(1));
    }
    w("");
  }

  w("[LABELS]");
  w(';;X-Coord          Y-Coord          Label');
  if (outfalls.length > 0) {
    w(`${outfalls[0].x.toFixed(1).padEnd(19)}${(outfalls[0].y - 30).toFixed(1).padEnd(17)}"Outfall"`);
  }
  w(`${(domain*0.5).toFixed(1).padEnd(19)}${(domain*0.95).toFixed(1).padEnd(17)}"Generated SWMM5 Network"`);
  if (storages.length > 0) {
    w(`${storages[0].x.toFixed(1).padEnd(19)}${(storages[0].y - 20).toFixed(1).padEnd(17)}"Storage"`);
  }
  w("");

  w("[BACKDROP]");
  w(`DIMENSIONS  0  0  ${Math.round(domain+200)}  ${Math.round(domain+200)}`);
  w("");

  w("[MAP]");
  w(`DIMENSIONS  0  0  ${Math.round(domain+200)}  ${Math.round(domain+200)}`);
  w(`Units       ${isSI?"Meters":"Feet"}`);
  w("");

  w("[TAGS]");
  w(";;Type       Name             Tag");
  for (const o of outfalls) w(`Node         ${o.name.padEnd(17)}Outfall`);
  for (const s of storages) w(`Node         ${s.name.padEnd(17)}Storage`);
  for (const p of pumps) w(`Link         ${p.name.padEnd(17)}Pump`);
  for (const c of conduits) {
    if (Math.random() < 0.15) {
      const tag = c.diam > (isSI ? 1.2 : 48) ? 'Trunk' : c.diam > (isSI ? 0.6 : 24) ? 'Collector' : 'Lateral';
      w(`Link         ${c.name.padEnd(17)}${tag}`);
    }
  }
  for (const dv of dividerNodes) w(`Node         ${dv.name.padEnd(17)}Divider`);
  w("");

  w("[PROFILES]");
  w(';;Name           Links');
  const maxProfiles = Math.min(3, outfalls.length);
  for (let pi = 0; pi < maxProfiles; pi++) {
    const profileLinks: string[] = [];
    let curNode = outfalls[pi].name;
    const visited = new Set<string>();
    for (let step = 0; step < 10; step++) {
      const incoming = conduits.find(c => c.to === curNode && !visited.has(c.name));
      if (!incoming) break;
      profileLinks.unshift(incoming.name);
      visited.add(incoming.name);
      curNode = incoming.from;
    }
    if (profileLinks.length > 0) {
      w(`"Profile_${pi+1}"     ${profileLinks.join('  ')}`);
    }
  }
  w("");

  w("[REPORT]");
  w("SUBCATCHMENTS    ALL");
  w("NODES            ALL");
  w("LINKS            ALL");
  w("");

  const inpText = lines.join("\n");
  const sizeKB = (new Blob([inpText]).size / 1024).toFixed(1);
  const sizeMB = (parseFloat(sizeKB) / 1024).toFixed(2);
  const nLines = lines.length;
  const total = N + conduits.length + nSubcatch + nOutfalls + nStorage + nPumps + orifices.length + weirs.length;
  const fname = `Generated_${fmt(N).replace(/,/g,'')}_${config.type}.inp`;

  const elevs = junctions.map(j => j.elev);
  const depths = junctions.map(j => j.maxD);
  const diams = conduits.map(c => c.diam);
  const lens = conduits.map(c => c.len);
  const diamConv = isSI ? 1000 : 12;

  const slopes = conduits.map(c => {
    const fj = junctions.find(j => j.name === c.from) || outfalls.find(o => o.name === c.from);
    const tj = junctions.find(j => j.name === c.to) || outfalls.find(o => o.name === c.to);
    if (fj && tj && c.len > 0) return Math.abs(fj.elev - tj.elev) / c.len;
    return null;
  }).filter((s): s is number => s !== null);

  const shapeCounts: Record<string, number> = {};
  conduits.forEach(c => { shapeCounts[c.shape] = (shapeCounts[c.shape]||0) + 1; });
  const shapeStats = Object.entries(shapeCounts).sort((a,b) => b[1]-a[1])
    .map(([s,n]) => `${s}: ${n} (${(100*n/conduits.length).toFixed(0)}%)`).join(', ');

  const withOutOff = conduits.filter(c => c.outOff > 0).length;
  const withInOff = conduits.filter(c => c.inOff > 0).length;
  const bothZero = conduits.filter(c => c.outOff===0 && c.inOff===0).length;

  const unitLabel = isSI ? 'm' : 'ft';
  const diamLabel = isSI ? 'mm' : 'in';

  const netNodes: Record<string, NetNode> = {};
  for (const o of outfalls) {
    netNodes[o.name] = { name: o.name, type: 'outfall', x: o.x, y: o.y, r: 5, color: '#ef4444' };
  }
  for (const s of storages) {
    netNodes[s.name] = { name: s.name, type: 'storage', x: s.x, y: s.y, r: 5, color: '#fb923c' };
  }
  for (const j of junctions) {
    netNodes[j.name] = { name: j.name, type: 'junction', x: j.x, y: j.y, r: 2.2, color: '#38bdf8', elev: j.elev, maxD: j.maxD };
  }

  const netLinks: NetLink[] = [];
  for (const c of conduits) {
    const hasOffset = c.inOff > 0 || c.outOff > 0;
    netLinks.push({
      name: c.name, from: c.from, to: c.to,
      color: hasOffset ? '#f472b6' : '#34d399',
      alpha: hasOffset ? 0.7 : 0.35,
      width: Math.max(0.5, Math.min(3, c.diam * (isSI ? 3 : 1))),
      hasOffset,
      vertices: linkVertices[c.name],
    });
  }
  for (const p of pumps) {
    netLinks.push({
      name: p.name, from: p.from, to: p.to,
      color: '#818cf8', alpha: 0.8, width: 2, isPump: true,
    });
  }

  const POLY_COLORS = ['#38bdf8','#34d399','#f472b6','#fb923c','#818cf8','#facc15','#a78bfa','#f87171','#2dd4bf','#e879f9','#84cc16','#06b6d4'];
  const scOutletMap = new Map(subcatchData.map(sc => [sc.name, sc.outlet]));
  const netPolygons: NetPolygon[] = voronoiCells.map((cell, i) => ({
    name: cell.site.name,
    vertices: cell.vertices,
    color: POLY_COLORS[i % POLY_COLORS.length],
    outlet: scOutletMap.get(cell.site.name) || '',
  }));

  return {
    inpText,
    stats: {
      junctions: N,
      conduits: conduits.length,
      outfalls: nOutfalls,
      storage: nStorage,
      pumps: nPumps,
      subcatchments: nSubcatch,
      orifices: orifices.length,
      weirs: weirs.length,
      elevMin: elevs.length ? Math.min(...elevs) : 0,
      elevMax: elevs.length ? Math.max(...elevs) : 0,
      elevMean: elevs.length ? elevs.reduce((a,b)=>a+b,0)/elevs.length : 0,
      depthMin: depths.length ? Math.min(...depths) : 0,
      depthMax: depths.length ? Math.max(...depths) : 0,
      depthMean: depths.length ? depths.reduce((a,b)=>a+b,0)/depths.length : 0,
      diamMin: diams.length ? Math.min(...diams) * diamConv : 0,
      diamMax: diams.length ? Math.max(...diams) * diamConv : 0,
      diamMean: diams.length ? diams.reduce((a,b)=>a+b,0)/diams.length * diamConv : 0,
      lenMin: lens.length ? Math.min(...lens) : 0,
      lenMax: lens.length ? Math.max(...lens) : 0,
      lenMean: lens.length ? lens.reduce((a,b)=>a+b,0)/lens.length : 0,
      slopeMin: slopes.length ? Math.min(...slopes) : 0,
      slopeMax: slopes.length ? Math.max(...slopes) : 0,
      slopeMean: slopes.length ? slopes.reduce((a,b)=>a+b,0)/slopes.length : 0,
      bothZero,
      bothZeroPct: conduits.length ? (100*bothZero/conduits.length) : 0,
      outletOffset: withOutOff,
      inletOffset: withInOff,
      shapeDistribution: shapeStats,
      unitLabel,
      diamLabel,
      fileName: fname,
      fileSize: parseFloat(sizeKB) > 1024 ? sizeMB+' MB' : sizeKB+' KB',
      lineCount: nLines,
      totalElements: total,
      reswmmEnabled: config.reswmm.enabled,
      reswmmMethod: config.reswmm.method === 'fixed_interval' ? 'Fixed Interval' : config.reswmm.method === 'dx_d_ratio' ? 'Δx/D Ratio' : 'None',
      reswmmOrigConduits,
      reswmmNewConduits: conduits.length - reswmmOrigConduits,
      reswmmNewJunctions,
      reswmmSplitLinks,
      reswmmMNSA: config.reswmm.mnsa,
    },
    netData: { nodes: netNodes, links: netLinks, polygons: netPolygons, domain },
    profiles: buildProfiles(junctions, outfalls, storages, conduits, unitLabel),
  };
}

function buildProfiles(
  junctions: { name: string; elev: number; maxD: number; x: number; y: number }[],
  outfalls: { name: string; elev: number; x: number; y: number }[],
  storages: { name: string; elev: number; maxD: number; x: number; y: number }[],
  conduits: { name: string; from: string; to: string; len: number; diam: number; shape: string; inOff: number; outOff: number }[],
  unitLabel: string,
): ProfileData[] {
  const nodeMap: Record<string, { elev: number; maxD: number; type: 'junction' | 'outfall' | 'storage' }> = {};
  for (const j of junctions) nodeMap[j.name] = { elev: j.elev, maxD: j.maxD, type: 'junction' };
  for (const o of outfalls) nodeMap[o.name] = { elev: o.elev, maxD: 0, type: 'outfall' };
  for (const s of storages) nodeMap[s.name] = { elev: s.elev, maxD: s.maxD, type: 'storage' };

  const upstreamOf: Record<string, { from: string; conduit: typeof conduits[0] }[]> = {};
  for (const c of conduits) {
    if (!upstreamOf[c.to]) upstreamOf[c.to] = [];
    upstreamOf[c.to].push({ from: c.from, conduit: c });
  }

  const longestPathFrom = (start: string): string[] => {
    const memo: Record<string, string[]> = {};
    const inStack = new Set<string>();
    const dfs = (node: string): string[] => {
      if (memo[node]) return memo[node];
      if (inStack.has(node)) return [node];
      inStack.add(node);
      const ups = upstreamOf[node];
      let best: string[] = [node];
      if (ups) {
        for (const u of ups) {
          if (!nodeMap[u.from]) continue;
          const path = dfs(u.from);
          if (path.length + 1 > best.length) {
            best = [node, ...path];
          }
        }
      }
      inStack.delete(node);
      memo[node] = best;
      return best;
    };
    return dfs(start);
  };

  const conduitBetween = (fromNode: string, toNode: string) => {
    const ups = upstreamOf[toNode];
    if (!ups) return null;
    for (const u of ups) {
      if (u.from === fromNode) return u.conduit;
    }
    return null;
  };

  const profiles: ProfileData[] = [];
  for (const outfall of outfalls) {
    const startNd = nodeMap[outfall.name];
    if (!startNd) continue;

    const path = longestPathFrom(outfall.name);
    if (path.length < 2) continue;

    const pathNodes: ProfileNode[] = [];
    const pathConduits: ProfileConduit[] = [];
    let station = 0;

    const nd0 = nodeMap[path[0]];
    pathNodes.push({
      name: path[0],
      station: 0,
      invertElev: nd0.elev,
      crownElev: nd0.elev + nd0.maxD,
      maxDepth: nd0.maxD,
      type: nd0.type,
    });

    for (let i = 1; i < path.length; i++) {
      const c = conduitBetween(path[i], path[i - 1]);
      if (!c) break;

      const prevNd = nodeMap[path[i - 1]];
      const curNd = nodeMap[path[i]];
      if (!prevNd || !curNd) break;

      const fromStation = station;
      station += c.len;

      pathConduits.push({
        name: c.name,
        fromStation,
        toStation: station,
        fromInvert: prevNd.elev + c.outOff,
        toInvert: curNd.elev + c.inOff,
        diameter: c.diam,
        shape: c.shape,
        fromCrown: prevNd.elev + c.outOff + c.diam,
        toCrown: curNd.elev + c.inOff + c.diam,
      });

      pathNodes.push({
        name: path[i],
        station,
        invertElev: curNd.elev,
        crownElev: curNd.elev + curNd.maxD,
        maxDepth: curNd.maxD,
        type: curNd.type,
      });
    }

    if (pathNodes.length >= 2) {
      profiles.push({ outfallName: outfall.name, nodes: pathNodes, conduits: pathConduits, unitLabel });
    }
  }

  profiles.sort((a, b) => b.nodes.length - a.nodes.length);
  return profiles;
}
