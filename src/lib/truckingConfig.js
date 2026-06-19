/**
 * CONTINENTAL CATTLE — CENTRALIZED TRUCKING COST ENGINE
 *
 * Semi truck + 4-deck livestock pot trailer cost model
 * Used across the entire platform for breakevens, ROI, and freight estimates
 *
 * Key assumptions (real-world old iron, livestock operation):
 *   - Fuel economy: 3.5–5 MPG loaded (old equipment, heavy livestock)
 *   - Driver comp: 25–30% of gross load revenue (before deductions)
 *   - Loaded rate: diesel pump card (avg by state for route) + $1.30–$1.75/mi margin
 *   - Round trip: loaded out + deadhead/partial return factored in
 */

// ─── Diesel pump card baseline by major cattle state (avg $/gal) ───────────────
// These are typical fleet card (CFN/EFS/Comdata) averages — update as market moves
export const DIESEL_BY_STATE = {
  TX: 3.55,  OK: 3.50,  KS: 3.52,  NE: 3.58,  CO: 3.72,
  SD: 3.65,  ND: 3.68,  MT: 3.80,  WY: 3.75,  ID: 3.85,
  UT: 3.80,  NM: 3.65,  AZ: 3.90,  CA: 4.65,  OR: 4.20,
  WA: 4.30,  MN: 3.62,  IA: 3.55,  MO: 3.50,  AR: 3.48,
  LA: 3.45,  MS: 3.42,  AL: 3.45,  GA: 3.55,  FL: 3.60,
  TN: 3.48,  KY: 3.50,  OH: 3.65,  IN: 3.55,  IL: 3.88,
  WI: 3.68,  MI: 3.70,  PA: 3.85,  NY: 4.10,  VA: 3.72,
  NC: 3.58,  SC: 3.50,
};

/**
 * Average diesel price for a route between two states
 * Uses avg of origin + destination state (simplified route average)
 */
export function avgDieselForRoute(originState, destState) {
  const o = DIESEL_BY_STATE[originState?.toUpperCase()] || 3.60;
  const d = DIESEL_BY_STATE[destState?.toUpperCase()] || 3.60;
  return (o + d) / 2;
}

// ─── Platform-wide trucking defaults ──────────────────────────────────────────

export const TRUCKING_DEFAULTS = {
  // Fuel
  mpgLoaded:          4.0,      // lbs/gallon — old equipment, livestock pot loaded
  mpgDeadhead:        6.0,      // MPG running empty/deadhead
  deadheadPct:        0.40,     // 40% of miles are deadhead (return/reposition)

  // Rate structure — loaded miles only
  marginPerMileMin:   1.30,     // $/mile OVER diesel cost (low end)
  marginPerMileMax:   1.75,     // $/mile OVER diesel cost (high end)
  marginPerMileAvg:   1.52,     // $/mile OVER diesel cost (blended avg)

  // Driver compensation — 25–30% of gross load revenue before deductions
  driverPctMin:       0.25,
  driverPctMax:       0.30,
  driverPctAvg:       0.275,    // 27.5% blended

  // Fixed costs per truck (monthly) — semi + 4-deck pot trailer, older equipment
  fixedCosts: {
    truckPayment:     1800,     // older unit, low/no payment or rebuilt
    trailerPayment:   1200,     // 4-deck livestock pot — finance or lease
    insurance:        2200,     // commercial motor carrier + livestock liability
    registration:     380,      // IRP apportioned plates, livestock endorsement
    tires:            650,      // semi steer/drives + pot trailer tires, high wear livestock
    maintenance:      900,      // old equipment — higher maint; scheduled PM + repairs
    dotCompliance:    200,      // FMCSA, IFTA, IRP filings, annual inspections, ELD
    permits:          120,      // oversize/overweight livestock permits by state
    factoring:        0,        // if using freight factoring company (set to 0 if no factoring)
    communication:    85,       // satellite, cell, ELD data plan
    parking:          150,      // yard/lot parking shared cost per truck
    other:            250,      // scales, livestock fees, washes, contingency
  },

  // Variable costs per loaded mile (beyond fuel & driver — already computed separately)
  variableCostPerMile: 0.18,    // misc: tolls, scales, minor consumables

  // Load specs — 4-deck livestock pot
  loadCapacityLbs:    48000,    // maximum payload lbs (varies by state bridge law)
  typicalHeadCount:   40,       // varies by weight class
};

/**
 * Compute total cost per loaded mile for a semi + livestock pot operation
 *
 * @param {object} params
 * @param {number} params.dieselPrice     - $/gal pump card avg for route
 * @param {number} params.mpg             - fuel economy loaded (default 4.0)
 * @param {number} params.marginPerMile   - $/mi over diesel cost (1.30–1.75)
 * @param {number} params.driverPct       - driver's share of gross (0.25–0.30)
 * @param {number} params.loadsPerMonth   - loads run per truck per month (for fixed amortization)
 * @param {number} params.avgMilesPerLoad - avg loaded miles per load
 * @param {object} params.fixedOverrides  - optional overrides to default fixed costs
 * @returns {object} full cost breakdown
 */
export function computeTruckingCosts({
  dieselPrice     = 3.60,
  mpg             = TRUCKING_DEFAULTS.mpgLoaded,
  marginPerMile   = TRUCKING_DEFAULTS.marginPerMileAvg,
  driverPct       = TRUCKING_DEFAULTS.driverPctAvg,
  loadsPerMonth   = 12,
  avgMilesPerLoad = 300,
  fixedOverrides  = {},
}) {
  const fixed = { ...TRUCKING_DEFAULTS.fixedCosts, ...fixedOverrides };

  // Fuel cost per loaded mile
  const fuelCostPerMile = dieselPrice / mpg;

  // Rate per loaded mile = diesel + margin
  const ratePerMile = fuelCostPerMile + marginPerMile;

  // Revenue per load (loaded miles only)
  const revenuePerLoad = ratePerMile * avgMilesPerLoad;

  // Driver pay per load (% of gross)
  const driverPayPerLoad = revenuePerLoad * driverPct;

  // Fuel cost per load (loaded miles)
  const fuelCostPerLoad = fuelCostPerMile * avgMilesPerLoad;

  // Deadhead fuel cost (partial return)
  const deadheadMiles = avgMilesPerLoad * TRUCKING_DEFAULTS.deadheadPct;
  const deadheadFuelCostPerLoad = (dieselPrice / TRUCKING_DEFAULTS.mpgDeadhead) * deadheadMiles;

  // Other variable cost per load
  const miscVariablePerLoad = TRUCKING_DEFAULTS.variableCostPerMile * avgMilesPerLoad;

  // Total variable cost per load (excluding driver)
  const variableCostPerLoad = fuelCostPerLoad + deadheadFuelCostPerLoad + miscVariablePerLoad;

  // Fixed cost allocation per load
  const totalFixedMonthly = Object.values(fixed).reduce((a, b) => a + b, 0);
  const fixedCostPerLoad = loadsPerMonth > 0 ? totalFixedMonthly / loadsPerMonth : 0;

  // Total cost per load
  const totalCostPerLoad = variableCostPerLoad + driverPayPerLoad + fixedCostPerLoad;

  // Cost per loaded mile
  const totalCostPerMile = avgMilesPerLoad > 0 ? totalCostPerLoad / avgMilesPerLoad : 0;

  // Profit per load
  const profitPerLoad = revenuePerLoad - totalCostPerLoad;

  return {
    // Rates
    fuelCostPerMile,
    ratePerMile,
    marginPerMile,
    // Per load
    revenuePerLoad,
    driverPayPerLoad,
    fuelCostPerLoad,
    deadheadFuelCostPerLoad,
    miscVariablePerLoad,
    variableCostPerLoad,
    fixedCostPerLoad,
    totalCostPerLoad,
    totalCostPerMile,
    profitPerLoad,
    // Fixed summary
    totalFixedMonthly,
    fixedDetail: fixed,
  };
}

/**
 * Compute freight cost per head for a cattle load
 *
 * @param {number} miles         - one-way loaded miles
 * @param {number} headCount     - number of head on load
 * @param {number} dieselPrice   - $/gal avg for route (use avgDieselForRoute or manual)
 * @param {number} mpg           - fuel economy (default 4.0 MPG)
 * @param {number} marginPerMile - $/mi over diesel (default 1.52)
 * @param {number} driverPct     - driver's share of gross (default 0.275)
 * @param {number} loadsPerMonth - for fixed amortization (default 12)
 * @returns {object} { costPerHead, costPerLoad, ratePerMile, driverPayPerLoad, ... }
 */
export function freightCostPerHead({
  miles         = 300,
  headCount     = 40,
  dieselPrice   = 3.60,
  mpg           = TRUCKING_DEFAULTS.mpgLoaded,
  marginPerMile = TRUCKING_DEFAULTS.marginPerMileAvg,
  driverPct     = TRUCKING_DEFAULTS.driverPctAvg,
  loadsPerMonth = 12,
  fixedOverrides = {},
}) {
  const result = computeTruckingCosts({
    dieselPrice, mpg, marginPerMile, driverPct,
    loadsPerMonth, avgMilesPerLoad: miles, fixedOverrides,
  });

  const headsOnLoad = headCount || TRUCKING_DEFAULTS.typicalHeadCount;
  const costPerHead = headsOnLoad > 0 ? result.totalCostPerLoad / headsOnLoad : 0;
  const revenuePerHead = headsOnLoad > 0 ? result.revenuePerLoad / headsOnLoad : 0;
  const driverPayPerHead = headsOnLoad > 0 ? result.driverPayPerLoad / headsOnLoad : 0;

  return {
    ...result,
    miles,
    headCount: headsOnLoad,
    costPerHead,
    revenuePerHead,
    driverPayPerHead,
  };
}

/**
 * Quick estimate: freight $/head given only miles and head count
 * Uses all platform defaults — good for breakeven / ROI calculators
 *
 * @param {number} miles       - one-way loaded miles
 * @param {number} headCount   - head on load (default 40)
 * @param {number} dieselPrice - optional override
 * @returns {number} freight cost per head in dollars
 */
export function quickFreightPerHead(miles, headCount = 40, dieselPrice = 3.60) {
  return freightCostPerHead({ miles, headCount, dieselPrice }).costPerHead;
}

/**
 * Trucking cost summary label for UI display
 * Returns: "$X.XX/mi | $XX.XX/hd | Driver: $XXX"
 */
export function freightSummaryLabel(miles, headCount = 40, dieselPrice = 3.60) {
  const r = freightCostPerHead({ miles, headCount, dieselPrice });
  return `$${r.ratePerMile.toFixed(2)}/mi | $${r.costPerHead.toFixed(2)}/hd | Driver: $${r.driverPayPerLoad.toFixed(0)}/load`;
}