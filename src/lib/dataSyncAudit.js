/**
 * CROSS-DOMAIN DATA SYNC AUDIT & VALIDATION SYSTEM
 * Ensures all calculations, projections, and numbers stay synchronized
 * across Dashboard, Admin Portal, and all connected applications
 */

export const DATA_DEPENDENCIES = {
  MarketInputs: {
    fields: [
      'date', 'lc_futures', 'gf_futures', 'corn_price', 'sbm_price',
      'choice_cutout', 'select_cutout', 'prime_cutout', 'trim_90s', 'trim_50s',
      'basis_southern_plains', 'import_volume', 'export_volume'
    ],
    dependents: [
      'Dashboard', 'ROILadder', 'CutoutEngine', 'PurchaseCalculator',
      'EnterpriseModel', 'WeeklyPlaybook', 'TradeAnalytics', 'GlobalIntel'
    ],
    criticalFor: ['ROI', 'Cutout', 'Spread', 'Decision Trees'],
  },

  CattleLot: {
    fields: [
      'lot_id', 'entity', 'cattle_class', 'head_count', 'purchase_weight',
      'current_weight', 'target_weight', 'purchase_price', 'purchase_date',
      'cog', 'yardage', 'status', 'stage'
    ],
    dependents: [
      'Dashboard', 'CattleLots', 'ROILadder', 'PurchaseCalculator',
      'EnterpriseModel', 'CarcassQualityValidation'
    ],
    criticalFor: ['Portfolio Value', 'Profit Projections', 'Feed/Health Planning'],
  },

  DealCalculator: {
    fields: [
      'deal_type', 'buy_weight', 'buy_price_per_lb', 'target_weight',
      'cost_of_gain', 'death_loss_percent', 'interest_rate',
      'days_on_feed', 'slaughter_cutout_price', 'expected_profit_per_head'
    ],
    dependents: ['PurchaseCalculator', 'EnterpriseModel', 'Dashboard'],
    criticalFor: ['ROI Ranking', 'Deal Comparisons', 'Profitability'],
  },

  CarcassOutcomeActual: {
    fields: [
      'sale_date', 'cattle_lot_id', 'plant_name', 'plant_type', 'head_count',
      'prime_count', 'choice_count', 'select_count', 'avg_carcass_weight',
      'yg2_count', 'yg3_count', 'yg4_count', 'avg_trim_loss_percent'
    ],
    dependents: ['CarcassQualityValidation', 'Dashboard', 'TradeAnalytics'],
    criticalFor: ['Grading Performance', 'Margin Validation', 'Risk Flagging'],
  },

  BuyingGuide: {
    fields: [
      'guide_name', 'cattle_class', 'profit_target', 'trucking_per_mile',
      'haul_distance', 'load_capacity', 'commission_percent',
      'max_price_per_lb', 'meat_value_per_lb', 'carcass_yield'
    ],
    dependents: ['PurchaseCalculator', 'Dashboard'],
    criticalFor: ['Max Offer Price', 'Profit Targets'],
  },

  CattleProgram: {
    fields: [
      'program_name', 'cattle_class', 'volume_per_period', 'frequency',
      'buy_weight', 'target_weight', 'cost_of_gain', 'expected_roi_percent'
    ],
    dependents: ['Dashboard', 'OperationalPrograms', 'EnterpriseModel'],
    criticalFor: ['Annual Volume', 'ROI Tracking'],
  },

  PublicOrder: {
    fields: ['order_type', 'customer_name', 'head_count', 'cattle_class', 'status'],
    dependents: ['Approvals', 'Dashboard', 'SyncMonitor'],
    criticalFor: ['Order Pipeline', 'Sync Status'],
  },

  CustomerAccount: {
    fields: ['full_name', 'email', 'account_type', 'status'],
    dependents: ['Approvals', 'SyncMonitor'],
    criticalFor: ['Account Approvals', 'Sync Status'],
  },
};

/**
 * CALCULATION CHAINS - Order of operations for accuracy
 */
export const CALCULATION_CHAINS = {
  // ROI Calculation Chain
  roi: {
    steps: [
      { step: 1, input: 'MarketInputs (lc_futures, basis, grid_adj)', output: 'effective_lc' },
      { step: 2, input: 'CattleLot (purchase_weight, cattle_class)', output: 'start_carcass_value' },
      { step: 3, input: 'MarketInputs (cog, corn_price, sbm_price)', output: 'total_feed_cost' },
      { step: 4, input: 'CattleLot (cog, days_to_market)', output: 'total_variable_cost' },
      { step: 5, input: 'BuyingGuide (profit_target)', output: 'target_breakeven' },
      { step: 6, input: 'All costs vs revenue', output: 'final_roi' },
    ],
    dependencies: ['MarketInputs', 'CattleLot', 'BuyingGuide'],
    tolerance: 0.5, // ±0.5% variance acceptable
  },

  // Cutout Value Chain
  cutout: {
    steps: [
      { step: 1, input: 'MarketInputs (choice/select/prime cutouts)', output: 'base_cutout' },
      { step: 2, input: 'MarketInputs (import/export volumes)', output: 'cutout_adjustment' },
      { step: 3, input: 'CattleLot (dressing %, cattle_class)', output: 'adjusted_carcass_value' },
      { step: 4, input: 'MarketInputs (trim_90s, trim_50s)', output: 'byproduct_value' },
      { step: 5, input: 'All components', output: 'total_cutout_value' },
    ],
    dependencies: ['MarketInputs', 'CattleLot'],
    tolerance: 1.0, // ±$1.00/cwt acceptable
  },

  // Profit Projection Chain
  profit: {
    steps: [
      { step: 1, input: 'MarketInputs + CattleLot setup', output: 'revenue_projection' },
      { step: 2, input: 'All cost components', output: 'total_cost' },
      { step: 3, input: 'BuyingGuide + DealCalculator', output: 'adjustments' },
      { step: 4, input: 'Revenue - Total Cost + Adjustments', output: 'net_profit' },
    ],
    dependencies: ['MarketInputs', 'CattleLot', 'BuyingGuide', 'DealCalculator'],
    tolerance: 50, // ±$50/head acceptable
  },
};

/**
 * SYNC VALIDATION RULES
 */
export const SYNC_VALIDATION_RULES = [
  {
    name: 'MarketInputs Currency',
    rule: (data) => {
      const required = ['date', 'lc_futures', 'choice_cutout'];
      return required.every(f => data[f] !== null && data[f] !== undefined);
    },
    severity: 'critical',
    impact: 'All ROI/Cutout calculations fail',
  },

  {
    name: 'CattleLot Consistency',
    rule: (data) => {
      return data.current_weight <= data.target_weight && data.purchase_weight > 0;
    },
    severity: 'critical',
    impact: 'Portfolio value and projections invalid',
  },

  {
    name: 'LC-Cutout Spread Logic',
    rule: (market) => {
      const lc = market.lc_futures || 0;
      const choice = market.choice_cutout || 0;
      const spread = choice - lc;
      return spread >= 40 && spread <= 120; // Realistic range
    },
    severity: 'warning',
    impact: 'Cutout-driven signals may be anomalous',
  },

  {
    name: 'Basis Reasonability',
    rule: (market) => {
      const basis = market.basis_southern_plains || 0;
      return basis >= -10 && basis <= 5; // Normal basis range
    },
    severity: 'warning',
    impact: 'Feed/Buy signals may be unreliable',
  },

  {
    name: 'Trim Price Consistency',
    rule: (market) => {
      const trim90 = market.trim_90s || 0;
      const trim50 = market.trim_50s || 0;
      return trim90 >= 2.0 && trim90 <= 4.5 && trim50 >= 1.5 && trim50 <= 3.5;
    },
    severity: 'warning',
    impact: 'Cow/Bull sell signals unreliable',
  },
];

/**
 * Cross-Domain Sync Checkpoints
 */
export const SYNC_CHECKPOINTS = [
  {
    name: 'Daily Market Snapshot',
    frequency: 'daily',
    entities: ['MarketInputs'],
    validation: 'Check date is current, all prices exist',
    critical: true,
  },

  {
    name: 'Cattle Lot Reconciliation',
    frequency: '8-hourly',
    entities: ['CattleLot', 'CarcassOutcomeActual'],
    validation: 'Match sold lots to outcomes, verify head counts',
    critical: true,
  },

  {
    name: 'Calculation Drift Detection',
    frequency: '6-hourly',
    entities: ['MarketInputs', 'CattleLot', 'DealCalculator'],
    validation: 'Re-run ROI chains, flag variance > tolerance',
    critical: true,
  },

  {
    name: 'Approval Pipeline Sync',
    frequency: '2-hourly',
    entities: ['PublicOrder', 'CustomerAccount'],
    validation: 'Verify pending counts match between systems',
    critical: false,
  },

  {
    name: 'Inter-App Data Consistency',
    frequency: '4-hourly',
    entities: ['All'],
    validation: 'Cross-check dashboard totals with source data',
    critical: true,
  },
];

/**
 * Generate Audit Report
 */
export function generateAuditReport(systemState) {
  const report = {
    timestamp: new Date().toISOString(),
    dataCompleteness: {},
    calculationDrift: {},
    syncStatus: {},
    issues: [],
    recommendations: [],
  };

  // Check data completeness for each entity
  Object.entries(DATA_DEPENDENCIES).forEach(([entity, config]) => {
    const entityData = systemState[entity] || {};
    const completeness = config.fields.filter(f => entityData[f] !== null && entityData[f] !== undefined).length / config.fields.length;
    report.dataCompleteness[entity] = {
      percentage: (completeness * 100).toFixed(1),
      missingFields: config.fields.filter(f => !entityData[f]),
    };

    if (completeness < 0.95) {
      report.issues.push({
        severity: 'warning',
        entity,
        message: `${entity} is ${(completeness * 100).toFixed(0)}% complete. Missing: ${config.fields.filter(f => !entityData[f]).join(', ')}`,
      });
    }
  });

  // Validate calculation chains
  Object.entries(CALCULATION_CHAINS).forEach(([chain, config]) => {
    const deps = config.dependencies;
    const allDepsPresent = deps.every(d => systemState[d]);
    report.calculationDrift[chain] = {
      chainValid: allDepsPresent,
      requiredDeps: deps,
      missingDeps: deps.filter(d => !systemState[d]),
    };

    if (!allDepsPresent) {
      report.issues.push({
        severity: 'critical',
        chain,
        message: `${chain} calculation missing dependencies: ${deps.filter(d => !systemState[d]).join(', ')}`,
      });
    }
  });

  return report;
}

/**
 * Data Sync Verification Helper
 */
export function verifyDataSync(sourceData, targetData, entity) {
  const config = DATA_DEPENDENCIES[entity];
  if (!config) return { valid: false, reason: 'Unknown entity' };

  const mismatches = [];
  config.fields.forEach(field => {
    if (sourceData[field] !== targetData[field]) {
      mismatches.push({
        field,
        source: sourceData[field],
        target: targetData[field],
        variance: calculateVariance(sourceData[field], targetData[field]),
      });
    }
  });

  return {
    valid: mismatches.length === 0,
    entity,
    mismatches,
    syncStatus: `${((1 - mismatches.length / config.fields.length) * 100).toFixed(1)}% synced`,
  };
}

function calculateVariance(source, target) {
  if (typeof source === 'number' && typeof target === 'number') {
    if (source === 0) return target !== 0 ? '100%' : '0%';
    const pct = ((Math.abs(source - target) / Math.abs(source)) * 100).toFixed(2);
    return `${pct}%`;
  }
  return source === target ? 'Match' : 'Mismatch';
}

export default {
  DATA_DEPENDENCIES,
  CALCULATION_CHAINS,
  SYNC_VALIDATION_RULES,
  SYNC_CHECKPOINTS,
  generateAuditReport,
  verifyDataSync,
};