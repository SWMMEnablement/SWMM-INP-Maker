export interface RainPattern {
  id: string;
  name: string;
  region: string;
  peak: number;
}

export interface RainPatternCategory {
  label: string;
  patterns: RainPattern[];
}

export interface RainResult {
  pattern: string;
  name: string;
  depth_total: number;
  depth_unit: string;
  duration_hours: number;
  timestep_minutes: number;
  num_steps: number;
  times: string[];
  cumulative_fractions: number[];
  incremental_depths: number[];
  intensities: number[];
  peak_intensity: number;
  peak_step: number;
  total_check: number;
}

export const RAIN_CANVAS_CATALOG: RainPatternCategory[] = [
  {
    label: 'SCS / NRCS',
    patterns: [
      { id: 'scs-type-i', name: 'SCS Type I', region: 'Pacific Northwest', peak: 0.50 },
      { id: 'scs-type-ia', name: 'SCS Type IA', region: 'Pacific Coast', peak: 0.50 },
      { id: 'scs-type-ii', name: 'SCS Type II', region: 'Eastern US', peak: 0.50 },
      { id: 'scs-type-iii', name: 'SCS Type III', region: 'Gulf Coast/Atlantic', peak: 0.50 },
    ],
  },
  {
    label: 'Huff Quartiles',
    patterns: [
      { id: 'huff-q1', name: 'Huff 1st Quartile', region: 'Illinois/Midwest', peak: 0.125 },
      { id: 'huff-q2', name: 'Huff 2nd Quartile', region: 'Illinois/Midwest', peak: 0.375 },
      { id: 'huff-q3', name: 'Huff 3rd Quartile', region: 'Illinois/Midwest', peak: 0.625 },
      { id: 'huff-q4', name: 'Huff 4th Quartile', region: 'Illinois/Midwest', peak: 0.875 },
    ],
  },
  {
    label: 'Chicago',
    patterns: [
      { id: 'chicago-0.3', name: 'Chicago (r=0.3)', region: 'General', peak: 0.30 },
      { id: 'chicago-0.375', name: 'Chicago (r=0.375)', region: 'General', peak: 0.375 },
      { id: 'chicago-0.4', name: 'Chicago (r=0.4)', region: 'General', peak: 0.40 },
      { id: 'chicago-0.5', name: 'Chicago (r=0.5)', region: 'General', peak: 0.50 },
    ],
  },
  {
    label: 'Alternating Block',
    patterns: [
      { id: 'alt-block', name: 'Alternating Block', region: 'General', peak: 0.50 },
      { id: 'alt-block-front', name: 'Alt Block (Front-loaded)', region: 'General', peak: 0.25 },
      { id: 'alt-block-back', name: 'Alt Block (Back-loaded)', region: 'General', peak: 0.75 },
    ],
  },
  {
    label: 'Uniform / Triangular',
    patterns: [
      { id: 'uniform', name: 'Uniform (Constant)', region: 'General', peak: 0.50 },
      { id: 'triangular-front', name: 'Triangular (Front)', region: 'General', peak: 0.167 },
      { id: 'triangular-center', name: 'Triangular (Center)', region: 'General', peak: 0.50 },
      { id: 'triangular-back', name: 'Triangular (Back)', region: 'General', peak: 0.833 },
    ],
  },
  {
    label: 'Regional US',
    patterns: [
      { id: 'florida-fdot', name: 'Florida FDOT', region: 'Florida', peak: 0.33 },
      { id: 'texas-txdot', name: 'Texas TxDOT', region: 'Texas', peak: 0.50 },
      { id: 'georgia-dot', name: 'Georgia DOT', region: 'Georgia', peak: 0.40 },
      { id: 'nyc-dep', name: 'NYC DEP', region: 'New York City', peak: 0.50 },
      { id: 'charlotte-meck', name: 'Charlotte-Mecklenburg', region: 'North Carolina', peak: 0.50 },
    ],
  },
  {
    label: 'International',
    patterns: [
      { id: 'euler-type-ii', name: 'Euler Type II', region: 'Germany/Europe', peak: 0.33 },
      { id: 'yen-chow', name: 'Yen & Chow', region: 'Taiwan/Asia', peak: 0.40 },
      { id: 'pilgrim-cordery', name: 'Pilgrim & Cordery', region: 'Australia', peak: 0.30 },
      { id: 'singapore-pub', name: 'Singapore PUB', region: 'Singapore', peak: 0.40 },
      { id: 'uk-fsr', name: 'UK FSR', region: 'United Kingdom', peak: 0.42 },
      { id: 'japan-slsc', name: 'Japan SLSC', region: 'Japan', peak: 0.40 },
    ],
  },
  {
    label: 'Historical / Extreme',
    patterns: [
      { id: 'hurricane-harvey', name: 'Hurricane Harvey Profile', region: 'Houston TX', peak: 0.60 },
      { id: 'hurricane-florence', name: 'Hurricane Florence Profile', region: 'Carolinas', peak: 0.55 },
      { id: 'pds-depth-area', name: 'PDS Depth-Area', region: 'General', peak: 0.50 },
    ],
  },
];

export type RainCanvasPatternId = string;

export const ALL_PATTERN_IDS: string[] = RAIN_CANVAS_CATALOG.flatMap(c => c.patterns.map(p => p.id));

export function getPatternName(patternId: string): string {
  for (const cat of RAIN_CANVAS_CATALOG) {
    const found = cat.patterns.find(p => p.id === patternId);
    if (found) return found.name;
  }
  return patternId;
}

function scsDistribution(t: number, type: string): number {
  const tables: Record<string, [number, number][]> = {
    'I': [
      [0, 0], [0.083, 0.035], [0.167, 0.076], [0.25, 0.125],
      [0.333, 0.194], [0.417, 0.310], [0.5, 0.515],
      [0.583, 0.624], [0.667, 0.714], [0.75, 0.790],
      [0.833, 0.866], [0.917, 0.936], [1.0, 1.0],
    ],
    'IA': [
      [0, 0], [0.083, 0.050], [0.167, 0.116], [0.25, 0.206],
      [0.333, 0.303], [0.417, 0.515], [0.5, 0.583],
      [0.583, 0.640], [0.667, 0.696], [0.75, 0.753],
      [0.833, 0.826], [0.917, 0.910], [1.0, 1.0],
    ],
    'II': [
      [0, 0], [0.083, 0.011], [0.167, 0.022], [0.25, 0.035],
      [0.333, 0.048], [0.417, 0.072], [0.5, 0.663],
      [0.583, 0.735], [0.667, 0.772], [0.75, 0.820],
      [0.833, 0.868], [0.917, 0.928], [1.0, 1.0],
    ],
    'III': [
      [0, 0], [0.083, 0.010], [0.167, 0.020], [0.25, 0.032],
      [0.333, 0.048], [0.417, 0.072], [0.5, 0.702],
      [0.583, 0.751], [0.667, 0.785], [0.75, 0.830],
      [0.833, 0.876], [0.917, 0.932], [1.0, 1.0],
    ],
  };

  const table = tables[type] || tables['II'];
  for (let i = 1; i < table.length; i++) {
    if (t <= table[i][0]) {
      const t0 = table[i - 1][0], t1 = table[i][0];
      const v0 = table[i - 1][1], v1 = table[i][1];
      return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
    }
  }
  return 1.0;
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const n = 100;
  const dx = x / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * dx;
    sum += Math.pow(t, a - 1) * Math.pow(1 - t, b - 1) * dx;
  }
  const dx2 = 1.0 / n;
  let fullSum = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * dx2;
    fullSum += Math.pow(t, a - 1) * Math.pow(1 - t, b - 1) * dx2;
  }
  return sum / fullSum;
}

function huffDistribution(t: number, quartile: number): number {
  const params: Record<number, { a: number; b: number }> = {
    1: { a: 1.5, b: 6.0 },
    2: { a: 3.0, b: 4.0 },
    3: { a: 4.0, b: 3.0 },
    4: { a: 6.0, b: 1.5 },
  };
  const { a, b } = params[quartile] || params[2];
  return incompleteBeta(t, a, b);
}

function chicagoDistribution(numSteps: number, r: number): number[] {
  const peakStep = Math.floor(r * numSteps);
  const increments = new Array(numSteps).fill(0);
  const a = 1.0, b = 0.1, c = 0.75;

  for (let i = peakStep; i >= 0; i--) {
    const tb = (peakStep - i + 0.5) / numSteps;
    increments[i] = a * Math.pow(tb + b, -c) / numSteps;
  }
  for (let i = peakStep + 1; i < numSteps; i++) {
    const tb = (i - peakStep + 0.5) / numSteps;
    increments[i] = a * Math.pow(tb + b, -c) / numSteps;
  }

  const total = increments.reduce((s: number, v: number) => s + v, 0);
  const normalized = increments.map((v: number) => v / total);
  const cumulative: number[] = [];
  let sum = 0;
  for (const v of normalized) {
    sum += v;
    cumulative.push(sum);
  }
  return cumulative;
}

function alternatingBlockDistribution(numSteps: number, peakPosition: number): number[] {
  const peakStep = Math.floor(peakPosition * numSteps);
  const increments = new Array(numSteps).fill(0);
  const ranked = Array.from({ length: numSteps }, (_, i) => 1 / (i + 1));
  const total = ranked.reduce((s, v) => s + v, 0);
  const normalizedRanked = ranked.map(v => v / total);

  let left = peakStep;
  let right = peakStep;
  for (let i = 0; i < normalizedRanked.length; i++) {
    if (i === 0) {
      increments[peakStep] = normalizedRanked[i];
    } else if (i % 2 === 1 && right + 1 < numSteps) {
      right++;
      increments[right] = normalizedRanked[i];
    } else if (left - 1 >= 0) {
      left--;
      increments[left] = normalizedRanked[i];
    } else if (right + 1 < numSteps) {
      right++;
      increments[right] = normalizedRanked[i];
    }
  }

  const cumulative: number[] = [];
  let sum = 0;
  for (const v of increments) {
    sum += v;
    cumulative.push(sum);
  }
  return cumulative;
}

function triangularDistribution(t: number, peakT: number): number {
  if (t <= peakT) {
    return (t * t) / (2 * peakT);
  }
  return 1 - ((1 - t) * (1 - t)) / (2 * (1 - peakT));
}

function getDistributionFractions(patternId: string, numSteps: number): number[] {
  const t = Array.from({ length: numSteps }, (_, i) => (i + 1) / numSteps);

  switch (patternId) {
    case 'scs-type-i':
      return t.map(x => scsDistribution(x, 'I'));
    case 'scs-type-ia':
      return t.map(x => scsDistribution(x, 'IA'));
    case 'scs-type-ii':
      return t.map(x => scsDistribution(x, 'II'));
    case 'scs-type-iii':
      return t.map(x => scsDistribution(x, 'III'));
    case 'huff-q1':
      return t.map(x => huffDistribution(x, 1));
    case 'huff-q2':
      return t.map(x => huffDistribution(x, 2));
    case 'huff-q3':
      return t.map(x => huffDistribution(x, 3));
    case 'huff-q4':
      return t.map(x => huffDistribution(x, 4));
    case 'chicago-0.3':
      return chicagoDistribution(numSteps, 0.3);
    case 'chicago-0.375':
      return chicagoDistribution(numSteps, 0.375);
    case 'chicago-0.4':
      return chicagoDistribution(numSteps, 0.4);
    case 'chicago-0.5':
      return chicagoDistribution(numSteps, 0.5);
    case 'alt-block':
      return alternatingBlockDistribution(numSteps, 0.5);
    case 'alt-block-front':
      return alternatingBlockDistribution(numSteps, 0.25);
    case 'alt-block-back':
      return alternatingBlockDistribution(numSteps, 0.75);
    case 'uniform':
      return t;
    case 'triangular-front':
      return t.map(x => triangularDistribution(x, 0.167));
    case 'triangular-center':
      return t.map(x => triangularDistribution(x, 0.5));
    case 'triangular-back':
      return t.map(x => triangularDistribution(x, 0.833));
    case 'florida-fdot':
      return chicagoDistribution(numSteps, 0.33);
    case 'texas-txdot':
      return t.map(x => scsDistribution(x, 'II'));
    case 'georgia-dot':
      return chicagoDistribution(numSteps, 0.4);
    case 'nyc-dep':
      return t.map(x => scsDistribution(x, 'II'));
    case 'charlotte-meck':
      return t.map(x => scsDistribution(x, 'II'));
    case 'euler-type-ii':
      return chicagoDistribution(numSteps, 0.333);
    case 'yen-chow':
      return chicagoDistribution(numSteps, 0.4);
    case 'pilgrim-cordery':
      return chicagoDistribution(numSteps, 0.3);
    case 'singapore-pub':
      return t.map(x => triangularDistribution(x, 0.4));
    case 'uk-fsr':
      return chicagoDistribution(numSteps, 0.42);
    case 'japan-slsc':
      return chicagoDistribution(numSteps, 0.4);
    case 'hurricane-harvey':
      return t.map(x => huffDistribution(x, 3));
    case 'hurricane-florence':
      return t.map(x => huffDistribution(x, 4));
    case 'pds-depth-area':
      return t.map(x => scsDistribution(x, 'II'));
    default:
      return t.map(x => scsDistribution(x, 'II'));
  }
}

export function generateRainCanvasProfile(
  patternId: string,
  totalDepth: number,
  durationHours: number,
  timestepMinutes: number = 15
): RainResult {
  const numSteps = Math.max(1, Math.ceil((durationHours * 60) / timestepMinutes));
  const fractions = getDistributionFractions(patternId, numSteps);

  const incrementalDepths: number[] = [];
  for (let i = 0; i < fractions.length; i++) {
    const prev = i > 0 ? fractions[i - 1] : 0;
    incrementalDepths.push(Math.max(0, (fractions[i] - prev) * totalDepth));
  }

  const times: string[] = [];
  for (let i = 0; i < numSteps; i++) {
    const totalMinutes = i * timestepMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    times.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  }

  const intensities = incrementalDepths.map(d => d / (timestepMinutes / 60));
  const peakIntensity = Math.max(...intensities);
  const peakStep = incrementalDepths.indexOf(Math.max(...incrementalDepths));

  return {
    pattern: patternId,
    name: getPatternName(patternId),
    depth_total: totalDepth,
    depth_unit: 'inches',
    duration_hours: durationHours,
    timestep_minutes: timestepMinutes,
    num_steps: numSteps,
    times,
    cumulative_fractions: fractions,
    incremental_depths: incrementalDepths,
    intensities,
    peak_intensity: peakIntensity,
    peak_step: peakStep,
    total_check: incrementalDepths.reduce((a, b) => a + b, 0),
  };
}

export function rainCanvasToSwmmTimeseries(
  patternId: string,
  totalDepth: number,
  durationHours: number,
  timestepMinutes: number = 15
): [number, number][] {
  const result = generateRainCanvasProfile(patternId, totalDepth, durationHours, timestepMinutes);
  const pairs: [number, number][] = [];
  for (let i = 0; i < result.incremental_depths.length; i++) {
    const tHours = (i * timestepMinutes) / 60;
    const intensity = result.intensities[i];
    if (i === 0 || i === result.incremental_depths.length - 1 || intensity > 0.001) {
      pairs.push([tHours, intensity]);
    }
  }
  return pairs;
}

const LEGACY_MAP: Record<string, string> = {
  'uniform': 'uniform',
  'triangular': 'triangular-center',
  'scs_type_ii': 'scs-type-ii',
  'chicago': 'chicago-0.375',
  'custom_front': 'triangular-front',
  'custom_rear': 'triangular-back',
};

export function mapLegacyDistribution(legacyId: string): string {
  return LEGACY_MAP[legacyId] || legacyId;
}
