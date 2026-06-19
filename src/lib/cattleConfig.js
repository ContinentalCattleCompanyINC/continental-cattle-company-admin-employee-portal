/**
 * CENTRALIZED CATTLE CLASSIFICATION
 *
 * Breed Types + Sex → used across the entire platform for
 * accurate dressing %, grid adjustments, USDA age limits,
 * ROI calculations, feed planning, and economic modeling.
 */

export const BREED_TYPES = [
  { value: 'english_beef',          label: 'English Beef' },
  { value: 'crossbred_beef',        label: 'Crossbred Beef' },
  { value: 'beef_x_dairy_holstein', label: 'Beef × Dairy Holstein' },
  { value: 'beef_x_dairy_jersey',   label: 'Beef × Dairy Jersey' },
  { value: 'dairy_holstein',        label: '100% Dairy Holstein' },
  { value: 'dairy_jersey',          label: '100% Dairy Jersey' },
];

export const SEX_OPTIONS = [
  { value: 'steer',  label: 'Steer' },
  { value: 'heifer', label: 'Heifer' },
  { value: 'bull',   label: 'Bull' },
];

/** Build a display label from breed_type + sex values */
export function getCattleLabel(breedType, sex) {
  const breed = BREED_TYPES.find(b => b.value === breedType)?.label || breedType || '—';
  const s = SEX_OPTIONS.find(o => o.value === sex)?.label || sex || '';
  return s ? `${breed} ${s}` : breed;
}

/**
 * Breed × Sex performance parameters
 * dressingPct: expected dressing percentage (decimal)
 * gridAdj: $/cwt grid adjustment vs. Choice base
 * maxWeight: max finish weight for ROI ladder
 */
const PERF = {
  // English Beef
  english_beef_steer:  { dressingPct: 0.645, gridAdj: 12,  maxWeight: 1500 },
  english_beef_heifer: { dressingPct: 0.635, gridAdj: 10,  maxWeight: 1350 },
  english_beef_bull:   { dressingPct: 0.620, gridAdj: 5,   maxWeight: 2200 },
  // Crossbred Beef
  crossbred_beef_steer:  { dressingPct: 0.640, gridAdj: 10, maxWeight: 1500 },
  crossbred_beef_heifer: { dressingPct: 0.630, gridAdj: 8,  maxWeight: 1350 },
  crossbred_beef_bull:   { dressingPct: 0.610, gridAdj: 3,  maxWeight: 2000 },
  // Beef × Dairy Holstein
  beef_x_dairy_holstein_steer:  { dressingPct: 0.625, gridAdj: 6,  maxWeight: 1550 },
  beef_x_dairy_holstein_heifer: { dressingPct: 0.615, gridAdj: 3,  maxWeight: 1350 },
  beef_x_dairy_holstein_bull:   { dressingPct: 0.600, gridAdj: 0,  maxWeight: 1800 },
  // Beef × Dairy Jersey
  beef_x_dairy_jersey_steer:  { dressingPct: 0.610, gridAdj: 3,  maxWeight: 1400 },
  beef_x_dairy_jersey_heifer: { dressingPct: 0.600, gridAdj: 0,  maxWeight: 1250 },
  beef_x_dairy_jersey_bull:   { dressingPct: 0.585, gridAdj: -2, maxWeight: 1600 },
  // 100% Dairy Holstein
  dairy_holstein_steer:  { dressingPct: 0.610, gridAdj: 0,  maxWeight: 1600 },
  dairy_holstein_heifer: { dressingPct: 0.600, gridAdj: -3, maxWeight: 1400 },
  dairy_holstein_bull:   { dressingPct: 0.585, gridAdj: -5, maxWeight: 1800 },
  // 100% Dairy Jersey
  dairy_jersey_steer:  { dressingPct: 0.585, gridAdj: -4, maxWeight: 1300 },
  dairy_jersey_heifer: { dressingPct: 0.575, gridAdj: -6, maxWeight: 1200 },
  dairy_jersey_bull:   { dressingPct: 0.560, gridAdj: -8, maxWeight: 1400 },
};

/** Get performance params for a breed × sex combo */
export function getPerformance(breedType, sex) {
  const key = `${breedType}_${sex}`;
  return PERF[key] || { dressingPct: 0.62, gridAdj: 0, maxWeight: 1400 };
}

/** Is this a dairy-influenced breed? (affects USDA age limits, grade targets) */
export function isDairy(breedType) {
  return ['dairy_holstein', 'dairy_jersey'].includes(breedType);
}

export function isBeefDairy(breedType) {
  return ['beef_x_dairy_holstein', 'beef_x_dairy_jersey'].includes(breedType);
}

export function isFullBeef(breedType) {
  return ['english_beef', 'crossbred_beef'].includes(breedType);
}

/**
 * USDA BQA weight-based compliance (age-in-days deprecated)
 * 100% dairy → Select grade, max 1350 lbs
 * Beef × Dairy → Choice grade, max 1400 lbs
 * English/Crossbred Beef → Choice/Prime grade, max 1500 lbs
 */
export const USDA_WEIGHT_LIMITS = {
  select:   { maxWeight: 1350, label: 'Select (≤1350 lbs)',   grade: 'Select' },
  choice:   { maxWeight: 1400, label: 'Choice (≤1400 lbs)',   grade: 'Choice' },
  prime:    { maxWeight: 1500, label: 'Prime (≤1500 lbs)',    grade: 'Prime' },
};

export function getUsdaLimit(breedType, focus) {
  if (isDairy(breedType)) return USDA_WEIGHT_LIMITS.select;
  if (focus === 'grade') return USDA_WEIGHT_LIMITS.prime;
  return USDA_WEIGHT_LIMITS.choice;
}

/** Target grade based on breed type */
export function getTargetGrade(breedType) {
  if (isDairy(breedType)) return 'Select / Low Choice';
  if (isBeefDairy(breedType)) return 'Choice';
  return 'Choice / Prime';
}

/**
 * Build list of all breed × sex combos for ROI ladder / dropdowns
 * Returns: [{ value, label, dressingPct, gridAdj, maxWeight, breedType, sex }]
 */
export function getAllCombos() {
  const combos = [];
  for (const breed of BREED_TYPES) {
    for (const sex of SEX_OPTIONS) {
      const perf = getPerformance(breed.value, sex.value);
      combos.push({
        value: `${breed.value}__${sex.value}`,
        label: `${breed.label} ${sex.label}`,
        breedType: breed.value,
        sex: sex.value,
        ...perf,
      });
    }
  }
  return combos;
}