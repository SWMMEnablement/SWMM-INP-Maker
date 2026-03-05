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
      { id: 'nrcs-mse3', name: 'NRCS MSE3', region: 'Midwest/Semi-Arid', peak: 0.50 },
      { id: 'nrcs-mse4', name: 'NRCS MSE4', region: 'Arizona/SW Desert', peak: 0.50 },
    ],
  },
  {
    label: 'Huff Quartiles',
    patterns: [
      { id: 'huff-q1', name: 'Huff 1st Quartile', region: 'Illinois/Midwest', peak: 0.125 },
      { id: 'huff-q2', name: 'Huff 2nd Quartile', region: 'Illinois/Midwest', peak: 0.375 },
      { id: 'huff-q3', name: 'Huff 3rd Quartile', region: 'Illinois/Midwest', peak: 0.625 },
      { id: 'huff-q4', name: 'Huff 4th Quartile', region: 'Illinois/Midwest', peak: 0.875 },
      { id: 'huff-q1-50pct', name: 'Huff Q1 (50th %ile)', region: 'Illinois/Midwest', peak: 0.10 },
      { id: 'huff-q1-90pct', name: 'Huff Q1 (90th %ile)', region: 'Illinois/Midwest', peak: 0.08 },
      { id: 'huff-q2-50pct', name: 'Huff Q2 (50th %ile)', region: 'Illinois/Midwest', peak: 0.35 },
      { id: 'huff-q2-90pct', name: 'Huff Q2 (90th %ile)', region: 'Illinois/Midwest', peak: 0.30 },
      { id: 'huff-q3-50pct', name: 'Huff Q3 (50th %ile)', region: 'Illinois/Midwest', peak: 0.60 },
      { id: 'huff-q3-90pct', name: 'Huff Q3 (90th %ile)', region: 'Illinois/Midwest', peak: 0.55 },
      { id: 'huff-q4-50pct', name: 'Huff Q4 (50th %ile)', region: 'Illinois/Midwest', peak: 0.80 },
      { id: 'huff-q4-90pct', name: 'Huff Q4 (90th %ile)', region: 'Illinois/Midwest', peak: 0.85 },
    ],
  },
  {
    label: 'Chicago',
    patterns: [
      { id: 'chicago-0.1', name: 'Chicago (r=0.1)', region: 'General', peak: 0.10 },
      { id: 'chicago-0.15', name: 'Chicago (r=0.15)', region: 'General', peak: 0.15 },
      { id: 'chicago-0.2', name: 'Chicago (r=0.2)', region: 'General', peak: 0.20 },
      { id: 'chicago-0.25', name: 'Chicago (r=0.25)', region: 'General', peak: 0.25 },
      { id: 'chicago-0.3', name: 'Chicago (r=0.3)', region: 'General', peak: 0.30 },
      { id: 'chicago-0.35', name: 'Chicago (r=0.35)', region: 'General', peak: 0.35 },
      { id: 'chicago-0.375', name: 'Chicago (r=0.375)', region: 'General', peak: 0.375 },
      { id: 'chicago-0.4', name: 'Chicago (r=0.4)', region: 'General', peak: 0.40 },
      { id: 'chicago-0.45', name: 'Chicago (r=0.45)', region: 'General', peak: 0.45 },
      { id: 'chicago-0.5', name: 'Chicago (r=0.5)', region: 'General', peak: 0.50 },
      { id: 'chicago-0.55', name: 'Chicago (r=0.55)', region: 'General', peak: 0.55 },
      { id: 'chicago-0.6', name: 'Chicago (r=0.6)', region: 'General', peak: 0.60 },
      { id: 'chicago-0.65', name: 'Chicago (r=0.65)', region: 'General', peak: 0.65 },
      { id: 'chicago-0.7', name: 'Chicago (r=0.7)', region: 'General', peak: 0.70 },
      { id: 'chicago-0.75', name: 'Chicago (r=0.75)', region: 'General', peak: 0.75 },
      { id: 'chicago-0.8', name: 'Chicago (r=0.8)', region: 'General', peak: 0.80 },
      { id: 'chicago-0.85', name: 'Chicago (r=0.85)', region: 'General', peak: 0.85 },
      { id: 'chicago-0.9', name: 'Chicago (r=0.9)', region: 'General', peak: 0.90 },
    ],
  },
  {
    label: 'Alternating Block',
    patterns: [
      { id: 'alt-block', name: 'Alternating Block', region: 'General', peak: 0.50 },
      { id: 'alt-block-front', name: 'Alt Block (Front-loaded)', region: 'General', peak: 0.25 },
      { id: 'alt-block-back', name: 'Alt Block (Back-loaded)', region: 'General', peak: 0.75 },
      { id: 'alt-block-10pct', name: 'Alt Block (10% peak)', region: 'General', peak: 0.10 },
      { id: 'alt-block-20pct', name: 'Alt Block (20% peak)', region: 'General', peak: 0.20 },
      { id: 'alt-block-30pct', name: 'Alt Block (30% peak)', region: 'General', peak: 0.30 },
      { id: 'alt-block-40pct', name: 'Alt Block (40% peak)', region: 'General', peak: 0.40 },
      { id: 'alt-block-60pct', name: 'Alt Block (60% peak)', region: 'General', peak: 0.60 },
      { id: 'alt-block-70pct', name: 'Alt Block (70% peak)', region: 'General', peak: 0.70 },
      { id: 'alt-block-80pct', name: 'Alt Block (80% peak)', region: 'General', peak: 0.80 },
      { id: 'alt-block-90pct', name: 'Alt Block (90% peak)', region: 'General', peak: 0.90 },
    ],
  },
  {
    label: 'Uniform / Triangular',
    patterns: [
      { id: 'uniform', name: 'Uniform (Constant)', region: 'General', peak: 0.50 },
      { id: 'triangular-front', name: 'Triangular (Front)', region: 'General', peak: 0.167 },
      { id: 'triangular-center', name: 'Triangular (Center)', region: 'General', peak: 0.50 },
      { id: 'triangular-back', name: 'Triangular (Back)', region: 'General', peak: 0.833 },
      { id: 'triangular-10pct', name: 'Triangular (10%)', region: 'General', peak: 0.10 },
      { id: 'triangular-20pct', name: 'Triangular (20%)', region: 'General', peak: 0.20 },
      { id: 'triangular-30pct', name: 'Triangular (30%)', region: 'General', peak: 0.30 },
      { id: 'triangular-40pct', name: 'Triangular (40%)', region: 'General', peak: 0.40 },
      { id: 'triangular-60pct', name: 'Triangular (60%)', region: 'General', peak: 0.60 },
      { id: 'triangular-70pct', name: 'Triangular (70%)', region: 'General', peak: 0.70 },
      { id: 'triangular-80pct', name: 'Triangular (80%)', region: 'General', peak: 0.80 },
      { id: 'triangular-90pct', name: 'Triangular (90%)', region: 'General', peak: 0.90 },
      { id: 'bimodal-early', name: 'Bimodal (Early+Late)', region: 'General', peak: 0.30 },
      { id: 'bimodal-symmetric', name: 'Bimodal (Symmetric)', region: 'General', peak: 0.50 },
      { id: 'exponential-decay', name: 'Exponential Decay', region: 'General', peak: 0.05 },
      { id: 'exponential-rise', name: 'Exponential Rise', region: 'General', peak: 0.95 },
      { id: 'step-early', name: 'Step Function (Early)', region: 'General', peak: 0.25 },
      { id: 'step-late', name: 'Step Function (Late)', region: 'General', peak: 0.75 },
    ],
  },
  {
    label: 'Regional US — State DOT',
    patterns: [
      { id: 'florida-fdot', name: 'Florida FDOT', region: 'Florida', peak: 0.33 },
      { id: 'texas-txdot', name: 'Texas TxDOT', region: 'Texas', peak: 0.50 },
      { id: 'georgia-dot', name: 'Georgia DOT', region: 'Georgia', peak: 0.40 },
      { id: 'nyc-dep', name: 'NYC DEP', region: 'New York City', peak: 0.50 },
      { id: 'charlotte-meck', name: 'Charlotte-Mecklenburg', region: 'North Carolina', peak: 0.50 },
      { id: 'alabama-dot', name: 'Alabama DOT', region: 'Alabama', peak: 0.50 },
      { id: 'arizona-dot', name: 'Arizona DOT', region: 'Arizona', peak: 0.25 },
      { id: 'arkansas-dot', name: 'Arkansas DOT', region: 'Arkansas', peak: 0.50 },
      { id: 'california-dot', name: 'Caltrans (CA)', region: 'California', peak: 0.50 },
      { id: 'colorado-dot', name: 'Colorado DOT', region: 'Colorado', peak: 0.40 },
      { id: 'connecticut-dot', name: 'Connecticut DOT', region: 'Connecticut', peak: 0.50 },
      { id: 'delaware-dot', name: 'Delaware DOT', region: 'Delaware', peak: 0.50 },
      { id: 'hawaii-dot', name: 'Hawaii DOT', region: 'Hawaii', peak: 0.50 },
      { id: 'idaho-dot', name: 'Idaho DOT', region: 'Idaho', peak: 0.50 },
      { id: 'illinois-dot', name: 'Illinois DOT', region: 'Illinois', peak: 0.375 },
      { id: 'indiana-dot', name: 'Indiana DOT', region: 'Indiana', peak: 0.50 },
      { id: 'iowa-dot', name: 'Iowa DOT', region: 'Iowa', peak: 0.375 },
      { id: 'kansas-dot', name: 'Kansas DOT', region: 'Kansas', peak: 0.45 },
      { id: 'kentucky-dot', name: 'Kentucky DOT', region: 'Kentucky', peak: 0.50 },
      { id: 'louisiana-dot', name: 'Louisiana DOT', region: 'Louisiana', peak: 0.50 },
      { id: 'maine-dot', name: 'Maine DOT', region: 'Maine', peak: 0.50 },
      { id: 'maryland-dot', name: 'Maryland DOT', region: 'Maryland', peak: 0.50 },
      { id: 'massachusetts-dot', name: 'MassDOT', region: 'Massachusetts', peak: 0.50 },
      { id: 'michigan-dot', name: 'Michigan DOT', region: 'Michigan', peak: 0.375 },
      { id: 'minnesota-dot', name: 'MnDOT', region: 'Minnesota', peak: 0.375 },
      { id: 'mississippi-dot', name: 'Mississippi DOT', region: 'Mississippi', peak: 0.50 },
      { id: 'missouri-dot', name: 'Missouri DOT', region: 'Missouri', peak: 0.50 },
      { id: 'montana-dot', name: 'Montana DOT', region: 'Montana', peak: 0.50 },
      { id: 'nebraska-dot', name: 'Nebraska DOT', region: 'Nebraska', peak: 0.45 },
      { id: 'nevada-dot', name: 'Nevada DOT', region: 'Nevada', peak: 0.25 },
      { id: 'new-hampshire-dot', name: 'New Hampshire DOT', region: 'New Hampshire', peak: 0.50 },
      { id: 'new-jersey-dot', name: 'New Jersey DOT', region: 'New Jersey', peak: 0.50 },
      { id: 'new-mexico-dot', name: 'New Mexico DOT', region: 'New Mexico', peak: 0.30 },
      { id: 'new-york-dot', name: 'New York DOT', region: 'New York', peak: 0.50 },
      { id: 'nc-dot', name: 'North Carolina DOT', region: 'North Carolina', peak: 0.50 },
      { id: 'north-dakota-dot', name: 'North Dakota DOT', region: 'North Dakota', peak: 0.375 },
      { id: 'ohio-dot', name: 'Ohio DOT', region: 'Ohio', peak: 0.50 },
      { id: 'oklahoma-dot', name: 'Oklahoma DOT', region: 'Oklahoma', peak: 0.45 },
      { id: 'oregon-dot', name: 'Oregon DOT', region: 'Oregon', peak: 0.50 },
      { id: 'pennsylvania-dot', name: 'PennDOT', region: 'Pennsylvania', peak: 0.50 },
      { id: 'rhode-island-dot', name: 'Rhode Island DOT', region: 'Rhode Island', peak: 0.50 },
      { id: 'sc-dot', name: 'South Carolina DOT', region: 'South Carolina', peak: 0.50 },
      { id: 'south-dakota-dot', name: 'South Dakota DOT', region: 'South Dakota', peak: 0.375 },
      { id: 'tennessee-dot', name: 'Tennessee DOT', region: 'Tennessee', peak: 0.50 },
      { id: 'utah-dot', name: 'Utah DOT', region: 'Utah', peak: 0.40 },
      { id: 'vermont-dot', name: 'Vermont DOT', region: 'Vermont', peak: 0.50 },
      { id: 'virginia-dot', name: 'Virginia DOT', region: 'Virginia', peak: 0.50 },
      { id: 'washington-dot', name: 'Washington DOT', region: 'Washington', peak: 0.50 },
      { id: 'west-virginia-dot', name: 'West Virginia DOT', region: 'West Virginia', peak: 0.50 },
      { id: 'wisconsin-dot', name: 'Wisconsin DOT', region: 'Wisconsin', peak: 0.375 },
      { id: 'wyoming-dot', name: 'Wyoming DOT', region: 'Wyoming', peak: 0.40 },
      { id: 'dc-ddot', name: 'DC DDOT', region: 'Washington DC', peak: 0.50 },
      { id: 'puerto-rico', name: 'Puerto Rico', region: 'Puerto Rico', peak: 0.50 },
    ],
  },
  {
    label: 'NOAA Atlas 14 Return Periods',
    patterns: [
      { id: 'noaa-1yr-1hr', name: 'NOAA 1-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-2yr-1hr', name: 'NOAA 2-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-5yr-1hr', name: 'NOAA 5-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-10yr-1hr', name: 'NOAA 10-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-25yr-1hr', name: 'NOAA 25-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-50yr-1hr', name: 'NOAA 50-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-100yr-1hr', name: 'NOAA 100-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-200yr-1hr', name: 'NOAA 200-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-500yr-1hr', name: 'NOAA 500-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-1000yr-1hr', name: 'NOAA 1000-yr, 1-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-1yr-6hr', name: 'NOAA 1-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-2yr-6hr', name: 'NOAA 2-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-5yr-6hr', name: 'NOAA 5-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-10yr-6hr', name: 'NOAA 10-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-25yr-6hr', name: 'NOAA 25-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-50yr-6hr', name: 'NOAA 50-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-100yr-6hr', name: 'NOAA 100-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-200yr-6hr', name: 'NOAA 200-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-500yr-6hr', name: 'NOAA 500-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-1000yr-6hr', name: 'NOAA 1000-yr, 6-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-1yr-24hr', name: 'NOAA 1-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-2yr-24hr', name: 'NOAA 2-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-5yr-24hr', name: 'NOAA 5-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-10yr-24hr', name: 'NOAA 10-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-25yr-24hr', name: 'NOAA 25-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-50yr-24hr', name: 'NOAA 50-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-100yr-24hr', name: 'NOAA 100-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-200yr-24hr', name: 'NOAA 200-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-500yr-24hr', name: 'NOAA 500-yr, 24-hr', region: 'US National', peak: 0.50 },
      { id: 'noaa-1000yr-24hr', name: 'NOAA 1000-yr, 24-hr', region: 'US National', peak: 0.50 },
    ],
  },
  {
    label: 'International',
    patterns: [
      { id: 'euler-type-i', name: 'Euler Type I', region: 'Germany/Europe', peak: 0.50 },
      { id: 'euler-type-ii', name: 'Euler Type II', region: 'Germany/Europe', peak: 0.33 },
      { id: 'yen-chow', name: 'Yen & Chow', region: 'Taiwan/Asia', peak: 0.40 },
      { id: 'pilgrim-cordery', name: 'Pilgrim & Cordery', region: 'Australia', peak: 0.30 },
      { id: 'singapore-pub', name: 'Singapore PUB', region: 'Singapore', peak: 0.40 },
      { id: 'uk-fsr', name: 'UK FSR (75% Winter)', region: 'United Kingdom', peak: 0.42 },
      { id: 'uk-fsr-50', name: 'UK FSR (50% Summer)', region: 'United Kingdom', peak: 0.50 },
      { id: 'uk-feh', name: 'UK FEH ReFH2', region: 'United Kingdom', peak: 0.42 },
      { id: 'japan-slsc', name: 'Japan SLSC', region: 'Japan', peak: 0.40 },
      { id: 'japan-moc', name: 'Japan MOC (Ministry)', region: 'Japan', peak: 0.35 },
      { id: 'korea-moct', name: 'Korea MOCT', region: 'South Korea', peak: 0.40 },
      { id: 'china-p&s', name: 'China P&S Method', region: 'China', peak: 0.35 },
      { id: 'china-shanghai', name: 'Shanghai P&S', region: 'Shanghai, China', peak: 0.40 },
      { id: 'china-beijing', name: 'Beijing P&S', region: 'Beijing, China', peak: 0.35 },
      { id: 'china-guangzhou', name: 'Guangzhou IDF', region: 'Guangzhou, China', peak: 0.38 },
      { id: 'india-imd', name: 'India IMD', region: 'India', peak: 0.33 },
      { id: 'india-mumbai', name: 'Mumbai Monsoon', region: 'Mumbai, India', peak: 0.30 },
      { id: 'brazil-cetesb', name: 'Brazil CETESB', region: 'Brazil', peak: 0.40 },
      { id: 'brazil-sao-paulo', name: 'São Paulo IDF', region: 'São Paulo, Brazil', peak: 0.35 },
      { id: 'mexico-scr', name: 'Mexico SCT', region: 'Mexico', peak: 0.40 },
      { id: 'canada-idf', name: 'Canada IDF', region: 'Canada', peak: 0.50 },
      { id: 'canada-ontario', name: 'Ontario MTO', region: 'Ontario, Canada', peak: 0.50 },
      { id: 'canada-bc', name: 'BC MoTI', region: 'British Columbia, Canada', peak: 0.50 },
      { id: 'canada-alberta', name: 'Alberta Transportation', region: 'Alberta, Canada', peak: 0.45 },
      { id: 'canada-quebec', name: 'Quebec MTQ', region: 'Quebec, Canada', peak: 0.50 },
      { id: 'australia-arr', name: 'Australia ARR2019', region: 'Australia', peak: 0.42 },
      { id: 'australia-sydney', name: 'Sydney ARR', region: 'Sydney, Australia', peak: 0.40 },
      { id: 'australia-melbourne', name: 'Melbourne ARR', region: 'Melbourne, Australia', peak: 0.42 },
      { id: 'australia-brisbane', name: 'Brisbane ARR', region: 'Brisbane, Australia', peak: 0.38 },
      { id: 'australia-perth', name: 'Perth ARR', region: 'Perth, Australia', peak: 0.45 },
      { id: 'new-zealand-tp108', name: 'NZ TP108', region: 'New Zealand', peak: 0.42 },
      { id: 'south-africa-sanral', name: 'South Africa SANRAL', region: 'South Africa', peak: 0.40 },
      { id: 'netherlands-rioned', name: 'Netherlands RIONED', region: 'Netherlands', peak: 0.50 },
      { id: 'belgium-kvbr', name: 'Belgium KVBR', region: 'Belgium', peak: 0.42 },
      { id: 'france-montana', name: 'France Montana IDF', region: 'France', peak: 0.40 },
      { id: 'france-paris', name: 'Paris (France)', region: 'Paris, France', peak: 0.42 },
      { id: 'spain-temez', name: 'Spain Témez', region: 'Spain', peak: 0.38 },
      { id: 'italy-lspp', name: 'Italy LSPP', region: 'Italy', peak: 0.40 },
      { id: 'sweden-svf', name: 'Sweden SVF', region: 'Sweden', peak: 0.33 },
      { id: 'norway-nve', name: 'Norway NVE', region: 'Norway', peak: 0.33 },
      { id: 'denmark-spildevand', name: 'Denmark Spildevandskomiteen', region: 'Denmark', peak: 0.40 },
      { id: 'finland-syke', name: 'Finland SYKE', region: 'Finland', peak: 0.35 },
      { id: 'switzerland-vsa', name: 'Switzerland VSA', region: 'Switzerland', peak: 0.42 },
      { id: 'austria-owwv', name: 'Austria ÖWWV', region: 'Austria', peak: 0.40 },
      { id: 'poland-bogdanowicz', name: 'Poland Bogdanowicz-Stachy', region: 'Poland', peak: 0.42 },
      { id: 'czech-trupl', name: 'Czech Republic Trupl', region: 'Czech Republic', peak: 0.40 },
      { id: 'russia-snip', name: 'Russia SNiP', region: 'Russia', peak: 0.35 },
      { id: 'turkey-dsi', name: 'Turkey DSİ', region: 'Turkey', peak: 0.40 },
      { id: 'iran-jamab', name: 'Iran JAMAB', region: 'Iran', peak: 0.35 },
      { id: 'saudi-aramco', name: 'Saudi Arabia (Aramco)', region: 'Saudi Arabia', peak: 0.33 },
      { id: 'uae-dm', name: 'UAE Dubai Municipality', region: 'UAE', peak: 0.30 },
      { id: 'israel-ihs', name: 'Israel IHS', region: 'Israel', peak: 0.35 },
      { id: 'egypt-hri', name: 'Egypt HRI', region: 'Egypt', peak: 0.30 },
      { id: 'nigeria-nimet', name: 'Nigeria NiMet', region: 'Nigeria', peak: 0.33 },
      { id: 'kenya-kmd', name: 'Kenya KMD', region: 'Kenya', peak: 0.35 },
      { id: 'ghana-gmet', name: 'Ghana GMet', region: 'Ghana', peak: 0.33 },
      { id: 'colombia-ideam', name: 'Colombia IDEAM', region: 'Colombia', peak: 0.38 },
      { id: 'chile-dgf', name: 'Chile DGF', region: 'Chile', peak: 0.40 },
      { id: 'argentina-smn', name: 'Argentina SMN', region: 'Argentina', peak: 0.42 },
      { id: 'peru-senamhi', name: 'Peru SENAMHI', region: 'Peru', peak: 0.35 },
      { id: 'thailand-rid', name: 'Thailand RID', region: 'Thailand', peak: 0.35 },
      { id: 'vietnam-monre', name: 'Vietnam MONRE', region: 'Vietnam', peak: 0.38 },
      { id: 'malaysia-did', name: 'Malaysia DID', region: 'Malaysia', peak: 0.40 },
      { id: 'indonesia-bmkg', name: 'Indonesia BMKG', region: 'Indonesia', peak: 0.35 },
      { id: 'philippines-pagasa', name: 'Philippines PAGASA', region: 'Philippines', peak: 0.38 },
      { id: 'hong-kong-dsd', name: 'Hong Kong DSD', region: 'Hong Kong', peak: 0.42 },
      { id: 'taiwan-wra', name: 'Taiwan WRA', region: 'Taiwan', peak: 0.40 },
    ],
  },
  {
    label: 'Historical / Extreme',
    patterns: [
      { id: 'hurricane-harvey', name: 'Hurricane Harvey Profile', region: 'Houston TX', peak: 0.60 },
      { id: 'hurricane-florence', name: 'Hurricane Florence Profile', region: 'Carolinas', peak: 0.55 },
      { id: 'hurricane-irma', name: 'Hurricane Irma Profile', region: 'Florida/Caribbean', peak: 0.55 },
      { id: 'hurricane-katrina', name: 'Hurricane Katrina Profile', region: 'Gulf Coast', peak: 0.45 },
      { id: 'hurricane-sandy', name: 'Hurricane Sandy Profile', region: 'NE US', peak: 0.50 },
      { id: 'hurricane-maria', name: 'Hurricane Maria Profile', region: 'Puerto Rico', peak: 0.55 },
      { id: 'hurricane-ida', name: 'Hurricane Ida Profile', region: 'Louisiana/NE', peak: 0.50 },
      { id: 'hurricane-ian', name: 'Hurricane Ian Profile', region: 'Florida', peak: 0.55 },
      { id: 'hurricane-michael', name: 'Hurricane Michael Profile', region: 'Florida Panhandle', peak: 0.60 },
      { id: 'hurricane-dorian', name: 'Hurricane Dorian Profile', region: 'Bahamas/SE US', peak: 0.50 },
      { id: 'ts-allison', name: 'TS Allison Profile', region: 'Houston TX', peak: 0.45 },
      { id: 'ts-imelda', name: 'TS Imelda Profile', region: 'SE Texas', peak: 0.50 },
      { id: 'pds-depth-area', name: 'PDS Depth-Area', region: 'General', peak: 0.50 },
      { id: 'ams-depth-area', name: 'AMS Depth-Area', region: 'General', peak: 0.50 },
      { id: 'ar-pineapple-express', name: 'Atmospheric River (Pineapple Express)', region: 'Pacific Coast', peak: 0.40 },
      { id: 'ar-bomb-cyclone', name: 'Atmospheric River (Bomb Cyclone)', region: 'Pacific Coast', peak: 0.45 },
      { id: 'midwest-derecho', name: 'Midwest Derecho Profile', region: 'Midwest US', peak: 0.65 },
      { id: 'flash-flood-arid', name: 'Flash Flood (Arid Region)', region: 'SW US', peak: 0.15 },
      { id: 'flash-flood-urban', name: 'Flash Flood (Urban)', region: 'General', peak: 0.20 },
      { id: 'nor-easter', name: "Nor'easter Profile", region: 'NE US', peak: 0.50 },
      { id: 'monsoon-sw-us', name: 'Monsoon (SW US)', region: 'Arizona/New Mexico', peak: 0.20 },
      { id: 'pmp-wmo', name: 'PMP (WMO Method)', region: 'General', peak: 0.50 },
      { id: 'cloudburst-copenhagen', name: 'Copenhagen Cloudburst 2011', region: 'Copenhagen, Denmark', peak: 0.15 },
      { id: 'cloudburst-beijing', name: 'Beijing Cloudburst 2012', region: 'Beijing, China', peak: 0.20 },
      { id: 'chennai-flood', name: 'Chennai Flood 2015', region: 'Chennai, India', peak: 0.35 },
      { id: 'germany-ahr-valley', name: 'Ahr Valley Flood 2021', region: 'Germany', peak: 0.40 },
      { id: 'japan-kumamoto', name: 'Kumamoto Flood 2020', region: 'Kumamoto, Japan', peak: 0.35 },
      { id: 'dubai-2024', name: 'Dubai Storm 2024', region: 'Dubai, UAE', peak: 0.25 },
      { id: 'brazil-rs-2024', name: 'Rio Grande do Sul 2024', region: 'Brazil', peak: 0.40 },
      { id: 'libya-derna-2023', name: 'Derna Storm Daniel 2023', region: 'Libya', peak: 0.45 },
      { id: 'pakistan-monsoon-2022', name: 'Pakistan Monsoon 2022', region: 'Pakistan', peak: 0.30 },
      { id: 'zhengzhou-2021', name: 'Zhengzhou Flood 2021', region: 'Henan, China', peak: 0.20 },
    ],
  },
  {
    label: 'Synthetic IDF-Based',
    patterns: [
      { id: 'idf-convective-short', name: 'IDF Convective (1-hr)', region: 'General', peak: 0.30 },
      { id: 'idf-convective-med', name: 'IDF Convective (3-hr)', region: 'General', peak: 0.35 },
      { id: 'idf-frontal-6hr', name: 'IDF Frontal (6-hr)', region: 'General', peak: 0.42 },
      { id: 'idf-frontal-12hr', name: 'IDF Frontal (12-hr)', region: 'General', peak: 0.45 },
      { id: 'idf-frontal-24hr', name: 'IDF Frontal (24-hr)', region: 'General', peak: 0.50 },
      { id: 'idf-tropical-12hr', name: 'IDF Tropical (12-hr)', region: 'General', peak: 0.40 },
      { id: 'idf-tropical-24hr', name: 'IDF Tropical (24-hr)', region: 'General', peak: 0.45 },
      { id: 'idf-tropical-48hr', name: 'IDF Tropical (48-hr)', region: 'General', peak: 0.50 },
      { id: 'idf-tropical-72hr', name: 'IDF Tropical (72-hr)', region: 'General', peak: 0.55 },
      { id: 'idf-orographic', name: 'IDF Orographic', region: 'Mountainous', peak: 0.40 },
      { id: 'idf-monsoon', name: 'IDF Monsoon', region: 'Tropical', peak: 0.35 },
      { id: 'idf-snowmelt-rain', name: 'IDF Rain-on-Snow', region: 'Cold Climate', peak: 0.50 },
      { id: 'idf-arid-thunderstorm', name: 'IDF Arid Thunderstorm', region: 'Arid', peak: 0.15 },
      { id: 'idf-marine-west-coast', name: 'IDF Marine West Coast', region: 'Pacific NW', peak: 0.50 },
      { id: 'idf-continental', name: 'IDF Continental', region: 'Interior US', peak: 0.42 },
      { id: 'idf-subtropical-humid', name: 'IDF Subtropical Humid', region: 'SE US', peak: 0.40 },
      { id: 'idf-mediterranean', name: 'IDF Mediterranean', region: 'Mediterranean', peak: 0.38 },
    ],
  },
  {
    label: 'Climate Change Scenarios',
    patterns: [
      { id: 'cc-rcp45-2050', name: 'RCP 4.5 (2050)', region: 'Global', peak: 0.50 },
      { id: 'cc-rcp45-2100', name: 'RCP 4.5 (2100)', region: 'Global', peak: 0.50 },
      { id: 'cc-rcp85-2050', name: 'RCP 8.5 (2050)', region: 'Global', peak: 0.50 },
      { id: 'cc-rcp85-2100', name: 'RCP 8.5 (2100)', region: 'Global', peak: 0.50 },
      { id: 'cc-ssp245-2050', name: 'SSP2-4.5 (2050)', region: 'Global', peak: 0.50 },
      { id: 'cc-ssp245-2100', name: 'SSP2-4.5 (2100)', region: 'Global', peak: 0.50 },
      { id: 'cc-ssp585-2050', name: 'SSP5-8.5 (2050)', region: 'Global', peak: 0.50 },
      { id: 'cc-ssp585-2100', name: 'SSP5-8.5 (2100)', region: 'Global', peak: 0.50 },
      { id: 'cc-uplift-10pct', name: 'Climate Uplift +10%', region: 'General', peak: 0.50 },
      { id: 'cc-uplift-20pct', name: 'Climate Uplift +20%', region: 'General', peak: 0.50 },
      { id: 'cc-uplift-30pct', name: 'Climate Uplift +30%', region: 'General', peak: 0.50 },
      { id: 'cc-uplift-40pct', name: 'Climate Uplift +40%', region: 'General', peak: 0.50 },
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
    'MSE3': [
      [0, 0], [0.083, 0.020], [0.167, 0.045], [0.25, 0.080],
      [0.333, 0.120], [0.417, 0.200], [0.5, 0.580],
      [0.583, 0.680], [0.667, 0.750], [0.75, 0.820],
      [0.833, 0.880], [0.917, 0.940], [1.0, 1.0],
    ],
    'MSE4': [
      [0, 0], [0.083, 0.015], [0.167, 0.035], [0.25, 0.060],
      [0.333, 0.095], [0.417, 0.175], [0.5, 0.620],
      [0.583, 0.720], [0.667, 0.785], [0.75, 0.840],
      [0.833, 0.890], [0.917, 0.945], [1.0, 1.0],
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

function bimodalDistribution(t: number, peak1: number, peak2: number): number {
  const w1 = 0.5, w2 = 0.5;
  const s1 = 0.12, s2 = 0.12;
  const gaussian = (x: number, mu: number, sigma: number) =>
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
  const n = 200;
  const dt = t / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * dt;
    sum += (w1 * gaussian(x, peak1, s1) + w2 * gaussian(x, peak2, s2)) * dt;
  }
  const dtFull = 1.0 / n;
  let fullSum = 0;
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * dtFull;
    fullSum += (w1 * gaussian(x, peak1, s1) + w2 * gaussian(x, peak2, s2)) * dtFull;
  }
  return Math.min(1, sum / fullSum);
}

function exponentialDistribution(t: number, rising: boolean): number {
  const k = 4.0;
  if (rising) {
    return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
  }
  return 1 - (Math.exp(k * (1 - t)) - 1) / (Math.exp(k) - 1);
}

function stepDistribution(t: number, stepT: number): number {
  const rampWidth = 0.08;
  if (t < stepT - rampWidth) return t / (2 * stepT);
  if (t > stepT + rampWidth) return 0.5 + (t - stepT) / (2 * (1 - stepT));
  const localT = (t - (stepT - rampWidth)) / (2 * rampWidth);
  return 0.5 * (t / 1.0) + 0.3 * localT;
}

function climateUpliftFactor(patternId: string): number {
  const upliftMap: Record<string, number> = {
    'cc-rcp45-2050': 1.10,
    'cc-rcp45-2100': 1.15,
    'cc-rcp85-2050': 1.20,
    'cc-rcp85-2100': 1.35,
    'cc-ssp245-2050': 1.12,
    'cc-ssp245-2100': 1.18,
    'cc-ssp585-2050': 1.25,
    'cc-ssp585-2100': 1.40,
    'cc-uplift-10pct': 1.10,
    'cc-uplift-20pct': 1.20,
    'cc-uplift-30pct': 1.30,
    'cc-uplift-40pct': 1.40,
  };
  return upliftMap[patternId] || 1.0;
}

function getDistributionFractions(patternId: string, numSteps: number): number[] {
  const t = Array.from({ length: numSteps }, (_, i) => (i + 1) / numSteps);

  if (patternId.startsWith('cc-')) {
    return t.map(x => scsDistribution(x, 'II'));
  }

  if (patternId.startsWith('noaa-')) {
    const m = patternId.match(/noaa-(\d+)yr-(\d+)hr/);
    if (m) {
      const returnPeriod = parseInt(m[1]);
      const duration = parseInt(m[2]);
      if (duration <= 1) return chicagoDistribution(numSteps, 0.375);
      if (duration <= 6) return t.map(x => scsDistribution(x, 'II'));
      return t.map(x => scsDistribution(x, returnPeriod >= 100 ? 'III' : 'II'));
    }
    return t.map(x => scsDistribution(x, 'II'));
  }

  const stateTypeII = [
    'alabama-dot','arkansas-dot','connecticut-dot','delaware-dot','indiana-dot',
    'kentucky-dot','louisiana-dot','maine-dot','maryland-dot','massachusetts-dot',
    'mississippi-dot','missouri-dot','new-hampshire-dot','new-jersey-dot',
    'new-york-dot','nc-dot','ohio-dot','pennsylvania-dot','rhode-island-dot',
    'sc-dot','tennessee-dot','vermont-dot','virginia-dot','west-virginia-dot',
    'dc-ddot','puerto-rico','hawaii-dot','texas-txdot','nyc-dep','charlotte-meck',
  ];
  const stateTypeI = [
    'oregon-dot','washington-dot','idaho-dot','california-dot','montana-dot',
  ];
  const stateHuff = [
    'illinois-dot','iowa-dot','michigan-dot','minnesota-dot','wisconsin-dot',
    'north-dakota-dot','south-dakota-dot',
  ];
  const stateChicago: Record<string, number> = {
    'arizona-dot': 0.25,
    'colorado-dot': 0.40,
    'georgia-dot': 0.40,
    'florida-fdot': 0.33,
    'kansas-dot': 0.45,
    'nebraska-dot': 0.45,
    'nevada-dot': 0.25,
    'new-mexico-dot': 0.30,
    'oklahoma-dot': 0.45,
    'utah-dot': 0.40,
    'wyoming-dot': 0.40,
    'canada-alberta': 0.45,
  };

  if (stateTypeII.includes(patternId)) return t.map(x => scsDistribution(x, 'II'));
  if (stateTypeI.includes(patternId)) return t.map(x => scsDistribution(x, 'I'));
  if (stateHuff.includes(patternId)) return t.map(x => huffDistribution(x, 2));
  if (stateChicago[patternId] !== undefined) return chicagoDistribution(numSteps, stateChicago[patternId]);

  switch (patternId) {
    case 'scs-type-i':
      return t.map(x => scsDistribution(x, 'I'));
    case 'scs-type-ia':
      return t.map(x => scsDistribution(x, 'IA'));
    case 'scs-type-ii':
      return t.map(x => scsDistribution(x, 'II'));
    case 'scs-type-iii':
      return t.map(x => scsDistribution(x, 'III'));
    case 'nrcs-mse3':
      return t.map(x => scsDistribution(x, 'MSE3'));
    case 'nrcs-mse4':
      return t.map(x => scsDistribution(x, 'MSE4'));

    case 'huff-q1':
      return t.map(x => huffDistribution(x, 1));
    case 'huff-q2':
      return t.map(x => huffDistribution(x, 2));
    case 'huff-q3':
      return t.map(x => huffDistribution(x, 3));
    case 'huff-q4':
      return t.map(x => huffDistribution(x, 4));
    case 'huff-q1-50pct':
      return t.map(x => incompleteBeta(x, 1.3, 5.5));
    case 'huff-q1-90pct':
      return t.map(x => incompleteBeta(x, 1.8, 7.0));
    case 'huff-q2-50pct':
      return t.map(x => incompleteBeta(x, 2.5, 3.5));
    case 'huff-q2-90pct':
      return t.map(x => incompleteBeta(x, 3.5, 4.5));
    case 'huff-q3-50pct':
      return t.map(x => incompleteBeta(x, 3.5, 2.5));
    case 'huff-q3-90pct':
      return t.map(x => incompleteBeta(x, 4.5, 3.5));
    case 'huff-q4-50pct':
      return t.map(x => incompleteBeta(x, 5.5, 1.3));
    case 'huff-q4-90pct':
      return t.map(x => incompleteBeta(x, 7.0, 1.8));

    case 'chicago-0.1': return chicagoDistribution(numSteps, 0.1);
    case 'chicago-0.15': return chicagoDistribution(numSteps, 0.15);
    case 'chicago-0.2': return chicagoDistribution(numSteps, 0.2);
    case 'chicago-0.25': return chicagoDistribution(numSteps, 0.25);
    case 'chicago-0.3': return chicagoDistribution(numSteps, 0.3);
    case 'chicago-0.35': return chicagoDistribution(numSteps, 0.35);
    case 'chicago-0.375': return chicagoDistribution(numSteps, 0.375);
    case 'chicago-0.4': return chicagoDistribution(numSteps, 0.4);
    case 'chicago-0.45': return chicagoDistribution(numSteps, 0.45);
    case 'chicago-0.5': return chicagoDistribution(numSteps, 0.5);
    case 'chicago-0.55': return chicagoDistribution(numSteps, 0.55);
    case 'chicago-0.6': return chicagoDistribution(numSteps, 0.6);
    case 'chicago-0.65': return chicagoDistribution(numSteps, 0.65);
    case 'chicago-0.7': return chicagoDistribution(numSteps, 0.7);
    case 'chicago-0.75': return chicagoDistribution(numSteps, 0.75);
    case 'chicago-0.8': return chicagoDistribution(numSteps, 0.8);
    case 'chicago-0.85': return chicagoDistribution(numSteps, 0.85);
    case 'chicago-0.9': return chicagoDistribution(numSteps, 0.9);

    case 'alt-block': return alternatingBlockDistribution(numSteps, 0.5);
    case 'alt-block-front': return alternatingBlockDistribution(numSteps, 0.25);
    case 'alt-block-back': return alternatingBlockDistribution(numSteps, 0.75);
    case 'alt-block-10pct': return alternatingBlockDistribution(numSteps, 0.10);
    case 'alt-block-20pct': return alternatingBlockDistribution(numSteps, 0.20);
    case 'alt-block-30pct': return alternatingBlockDistribution(numSteps, 0.30);
    case 'alt-block-40pct': return alternatingBlockDistribution(numSteps, 0.40);
    case 'alt-block-60pct': return alternatingBlockDistribution(numSteps, 0.60);
    case 'alt-block-70pct': return alternatingBlockDistribution(numSteps, 0.70);
    case 'alt-block-80pct': return alternatingBlockDistribution(numSteps, 0.80);
    case 'alt-block-90pct': return alternatingBlockDistribution(numSteps, 0.90);

    case 'uniform':
      return t;
    case 'triangular-front':
      return t.map(x => triangularDistribution(x, 0.167));
    case 'triangular-center':
      return t.map(x => triangularDistribution(x, 0.5));
    case 'triangular-back':
      return t.map(x => triangularDistribution(x, 0.833));
    case 'triangular-10pct':
      return t.map(x => triangularDistribution(x, 0.10));
    case 'triangular-20pct':
      return t.map(x => triangularDistribution(x, 0.20));
    case 'triangular-30pct':
      return t.map(x => triangularDistribution(x, 0.30));
    case 'triangular-40pct':
      return t.map(x => triangularDistribution(x, 0.40));
    case 'triangular-60pct':
      return t.map(x => triangularDistribution(x, 0.60));
    case 'triangular-70pct':
      return t.map(x => triangularDistribution(x, 0.70));
    case 'triangular-80pct':
      return t.map(x => triangularDistribution(x, 0.80));
    case 'triangular-90pct':
      return t.map(x => triangularDistribution(x, 0.90));
    case 'bimodal-early':
      return t.map(x => bimodalDistribution(x, 0.25, 0.70));
    case 'bimodal-symmetric':
      return t.map(x => bimodalDistribution(x, 0.30, 0.70));
    case 'exponential-decay':
      return t.map(x => exponentialDistribution(x, false));
    case 'exponential-rise':
      return t.map(x => exponentialDistribution(x, true));
    case 'step-early':
      return t.map(x => stepDistribution(x, 0.25));
    case 'step-late':
      return t.map(x => stepDistribution(x, 0.75));

    case 'euler-type-i':
      return chicagoDistribution(numSteps, 0.5);
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
    case 'uk-fsr-50':
      return chicagoDistribution(numSteps, 0.50);
    case 'uk-feh':
      return chicagoDistribution(numSteps, 0.42);
    case 'japan-slsc':
      return chicagoDistribution(numSteps, 0.4);
    case 'japan-moc':
      return chicagoDistribution(numSteps, 0.35);
    case 'korea-moct':
      return chicagoDistribution(numSteps, 0.4);
    case 'china-p&s':
      return chicagoDistribution(numSteps, 0.35);
    case 'china-shanghai':
      return chicagoDistribution(numSteps, 0.40);
    case 'china-beijing':
      return chicagoDistribution(numSteps, 0.35);
    case 'china-guangzhou':
      return chicagoDistribution(numSteps, 0.38);
    case 'india-imd':
      return chicagoDistribution(numSteps, 0.33);
    case 'india-mumbai':
      return t.map(x => huffDistribution(x, 3));
    case 'brazil-cetesb':
      return chicagoDistribution(numSteps, 0.4);
    case 'brazil-sao-paulo':
      return chicagoDistribution(numSteps, 0.35);
    case 'mexico-scr':
      return chicagoDistribution(numSteps, 0.4);
    case 'canada-idf':
      return t.map(x => scsDistribution(x, 'II'));
    case 'canada-ontario':
      return t.map(x => scsDistribution(x, 'II'));
    case 'canada-bc':
      return t.map(x => scsDistribution(x, 'I'));
    case 'canada-quebec':
      return t.map(x => scsDistribution(x, 'II'));
    case 'australia-arr':
      return chicagoDistribution(numSteps, 0.42);
    case 'australia-sydney':
      return chicagoDistribution(numSteps, 0.40);
    case 'australia-melbourne':
      return chicagoDistribution(numSteps, 0.42);
    case 'australia-brisbane':
      return chicagoDistribution(numSteps, 0.38);
    case 'australia-perth':
      return chicagoDistribution(numSteps, 0.45);
    case 'new-zealand-tp108':
      return chicagoDistribution(numSteps, 0.42);
    case 'south-africa-sanral':
      return chicagoDistribution(numSteps, 0.40);
    case 'netherlands-rioned':
      return t.map(x => scsDistribution(x, 'II'));
    case 'belgium-kvbr':
      return chicagoDistribution(numSteps, 0.42);
    case 'france-montana':
      return chicagoDistribution(numSteps, 0.40);
    case 'france-paris':
      return chicagoDistribution(numSteps, 0.42);
    case 'spain-temez':
      return chicagoDistribution(numSteps, 0.38);
    case 'italy-lspp':
      return chicagoDistribution(numSteps, 0.40);
    case 'sweden-svf':
      return chicagoDistribution(numSteps, 0.33);
    case 'norway-nve':
      return chicagoDistribution(numSteps, 0.33);
    case 'denmark-spildevand':
      return chicagoDistribution(numSteps, 0.40);
    case 'finland-syke':
      return chicagoDistribution(numSteps, 0.35);
    case 'switzerland-vsa':
      return chicagoDistribution(numSteps, 0.42);
    case 'austria-owwv':
      return chicagoDistribution(numSteps, 0.40);
    case 'poland-bogdanowicz':
      return chicagoDistribution(numSteps, 0.42);
    case 'czech-trupl':
      return chicagoDistribution(numSteps, 0.40);
    case 'russia-snip':
      return chicagoDistribution(numSteps, 0.35);
    case 'turkey-dsi':
      return chicagoDistribution(numSteps, 0.40);
    case 'iran-jamab':
      return chicagoDistribution(numSteps, 0.35);
    case 'saudi-aramco':
      return chicagoDistribution(numSteps, 0.33);
    case 'uae-dm':
      return chicagoDistribution(numSteps, 0.30);
    case 'israel-ihs':
      return chicagoDistribution(numSteps, 0.35);
    case 'egypt-hri':
      return chicagoDistribution(numSteps, 0.30);
    case 'nigeria-nimet':
      return chicagoDistribution(numSteps, 0.33);
    case 'kenya-kmd':
      return chicagoDistribution(numSteps, 0.35);
    case 'ghana-gmet':
      return chicagoDistribution(numSteps, 0.33);
    case 'colombia-ideam':
      return chicagoDistribution(numSteps, 0.38);
    case 'chile-dgf':
      return chicagoDistribution(numSteps, 0.40);
    case 'argentina-smn':
      return chicagoDistribution(numSteps, 0.42);
    case 'peru-senamhi':
      return chicagoDistribution(numSteps, 0.35);
    case 'thailand-rid':
      return chicagoDistribution(numSteps, 0.35);
    case 'vietnam-monre':
      return chicagoDistribution(numSteps, 0.38);
    case 'malaysia-did':
      return chicagoDistribution(numSteps, 0.40);
    case 'indonesia-bmkg':
      return chicagoDistribution(numSteps, 0.35);
    case 'philippines-pagasa':
      return chicagoDistribution(numSteps, 0.38);
    case 'hong-kong-dsd':
      return chicagoDistribution(numSteps, 0.42);
    case 'taiwan-wra':
      return chicagoDistribution(numSteps, 0.40);

    case 'hurricane-harvey':
      return t.map(x => huffDistribution(x, 3));
    case 'hurricane-florence':
      return t.map(x => huffDistribution(x, 4));
    case 'hurricane-irma':
      return t.map(x => huffDistribution(x, 3));
    case 'hurricane-katrina':
      return t.map(x => huffDistribution(x, 2));
    case 'hurricane-sandy':
      return t.map(x => scsDistribution(x, 'III'));
    case 'hurricane-maria':
      return t.map(x => huffDistribution(x, 3));
    case 'hurricane-ida':
      return t.map(x => scsDistribution(x, 'III'));
    case 'hurricane-ian':
      return t.map(x => huffDistribution(x, 3));
    case 'hurricane-michael':
      return chicagoDistribution(numSteps, 0.35);
    case 'hurricane-dorian':
      return t.map(x => scsDistribution(x, 'III'));
    case 'ts-allison':
      return t.map(x => huffDistribution(x, 2));
    case 'ts-imelda':
      return t.map(x => huffDistribution(x, 3));
    case 'pds-depth-area':
      return t.map(x => scsDistribution(x, 'II'));
    case 'ams-depth-area':
      return t.map(x => scsDistribution(x, 'II'));
    case 'ar-pineapple-express':
      return t.map(x => triangularDistribution(x, 0.40));
    case 'ar-bomb-cyclone':
      return t.map(x => triangularDistribution(x, 0.45));
    case 'midwest-derecho':
      return chicagoDistribution(numSteps, 0.20);
    case 'flash-flood-arid':
      return chicagoDistribution(numSteps, 0.15);
    case 'flash-flood-urban':
      return chicagoDistribution(numSteps, 0.20);
    case 'nor-easter':
      return t.map(x => scsDistribution(x, 'III'));
    case 'monsoon-sw-us':
      return chicagoDistribution(numSteps, 0.20);
    case 'pmp-wmo':
      return t.map(x => scsDistribution(x, 'II'));
    case 'cloudburst-copenhagen':
      return chicagoDistribution(numSteps, 0.15);
    case 'cloudburst-beijing':
      return chicagoDistribution(numSteps, 0.20);
    case 'chennai-flood':
      return t.map(x => huffDistribution(x, 3));
    case 'germany-ahr-valley':
      return chicagoDistribution(numSteps, 0.40);
    case 'japan-kumamoto':
      return chicagoDistribution(numSteps, 0.35);
    case 'dubai-2024':
      return chicagoDistribution(numSteps, 0.25);
    case 'brazil-rs-2024':
      return t.map(x => huffDistribution(x, 3));
    case 'libya-derna-2023':
      return chicagoDistribution(numSteps, 0.35);
    case 'pakistan-monsoon-2022':
      return t.map(x => huffDistribution(x, 3));
    case 'zhengzhou-2021':
      return chicagoDistribution(numSteps, 0.20);

    case 'idf-convective-short':
      return chicagoDistribution(numSteps, 0.30);
    case 'idf-convective-med':
      return chicagoDistribution(numSteps, 0.35);
    case 'idf-frontal-6hr':
      return chicagoDistribution(numSteps, 0.42);
    case 'idf-frontal-12hr':
      return chicagoDistribution(numSteps, 0.45);
    case 'idf-frontal-24hr':
      return t.map(x => scsDistribution(x, 'II'));
    case 'idf-tropical-12hr':
      return t.map(x => huffDistribution(x, 2));
    case 'idf-tropical-24hr':
      return t.map(x => huffDistribution(x, 3));
    case 'idf-tropical-48hr':
      return t.map(x => scsDistribution(x, 'III'));
    case 'idf-tropical-72hr':
      return t.map(x => scsDistribution(x, 'III'));
    case 'idf-orographic':
      return chicagoDistribution(numSteps, 0.40);
    case 'idf-monsoon':
      return t.map(x => huffDistribution(x, 3));
    case 'idf-snowmelt-rain':
      return t.map(x => scsDistribution(x, 'I'));
    case 'idf-arid-thunderstorm':
      return chicagoDistribution(numSteps, 0.15);
    case 'idf-marine-west-coast':
      return t.map(x => scsDistribution(x, 'IA'));
    case 'idf-continental':
      return chicagoDistribution(numSteps, 0.42);
    case 'idf-subtropical-humid':
      return chicagoDistribution(numSteps, 0.40);
    case 'idf-mediterranean':
      return chicagoDistribution(numSteps, 0.38);

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

  const uplift = climateUpliftFactor(patternId);
  const effectiveDepth = totalDepth * uplift;

  const incrementalDepths: number[] = [];
  for (let i = 0; i < fractions.length; i++) {
    const prev = i > 0 ? fractions[i - 1] : 0;
    incrementalDepths.push(Math.max(0, (fractions[i] - prev) * effectiveDepth));
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
    depth_total: effectiveDepth,
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
