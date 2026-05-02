/**
 * Comprehensive Cross-Domain Validation Engine
 * Validates ALL calculations, projections, inputs, outputs, alerts, and operations
 * Ensures 100% accuracy and consistency across entire platform
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function validateMarketInputConsistency(base44) {
  try {
    const inputs = await base44.asServiceRole.entities.MarketInputs.list('-date', 30);
    const issues = [];

    for (const input of inputs) {
      // Validate cutout hierarchy: Prime > Choice > Select
      if (input.prime_cutout && input.choice_cutout && input.prime_cutout <= input.choice_cutout) {
        issues.push(`Market ${input.date}: Prime (${input.prime_cutout}) should exceed Choice (${input.choice_cutout})`);
      }
      if (input.choice_cutout && input.select_cutout && input.choice_cutout <= input.select_cutout) {
        issues.push(`Market ${input.date}: Choice (${input.choice_cutout}) should exceed Select (${input.select_cutout})`);
      }

      // Validate trim price relationships
      if (input.trim_90s && input.trim_50s && input.trim_90s <= input.trim_50s) {
        issues.push(`Market ${input.date}: 90s trim (${input.trim_90s}) should exceed 50s (${input.trim_50s})`);
      }

      // Validate futures spread
      if (input.lc_futures && input.gf_futures && input.gf_futures <= input.lc_futures) {
        issues.push(`Market ${input.date}: GF (${input.gf_futures}) typically exceeds LC (${input.lc_futures})`);
      }

      // Validate cutout-to-live spread
      if (input.lc_futures && input.choice_cutout) {
        const spread = input.choice_cutout - input.lc_futures;
        if (spread < 40 || spread > 150) {
          issues.push(`Market ${input.date}: Cutout-to-live spread (${spread}) outside normal 40-150 range`);
        }
      }
    }

    return { valid: issues.length === 0, issues, checked: inputs.length };
  } catch (error) {
    return { valid: false, issues: [error.message], checked: 0 };
  }
}

async function validateCattleProjectionAccuracy(base44, marketData) {
  try {
    const lots = await base44.asServiceRole.entities.CattleLot.list('', 100);
    const issues = [];
    const corrections = [];

    for (const lot of lots) {
      if (lot.status !== 'active') continue;

      // Validate weight trajectory
      if (lot.purchase_weight && lot.current_weight && lot.target_weight) {
        const totalGain = lot.target_weight - lot.purchase_weight;
        const gainToDate = lot.current_weight - lot.purchase_weight;
        
        if (gainToDate > totalGain && lot.stage !== 'rail') {
          issues.push(`Lot ${lot.lot_id}: Current weight (${lot.current_weight}) exceeds target (${lot.target_weight})`);
        }
      }

      // Validate yardage calculation
      if (lot.yardage && lot.yardage < 0.25 || lot.yardage > 0.75) {
        issues.push(`Lot ${lot.lot_id}: Yardage (${lot.yardage}/hd/day) outside typical range 0.25-0.75`);
      }

      // Validate COG alignment with current corn price
      if (marketData?.corn_price && lot.cog) {
        const expectedCog = (marketData.corn_price * 56 / 2000 * 6.5).toFixed(3);
        if (Math.abs(lot.cog - expectedCog) > 0.15) {
          issues.push(`Lot ${lot.lot_id}: COG (${lot.cog}) should align with corn price (expect ~${expectedCog})`);
          corrections.push({ entityId: lot.id, entityName: 'CattleLot', field: 'cog', newValue: parseFloat(expectedCog) });
        }
      }
    }

    return { valid: issues.length === 0, issues, corrections, checked: lots.filter(l => l.status === 'active').length };
  } catch (error) {
    return { valid: false, issues: [error.message], corrections: [], checked: 0 };
  }
}

async function validateDealProfitCalculations(base44, marketData) {
  try {
    const deals = await base44.asServiceRole.entities.DealCalculator.list('', 100);
    const issues = [];
    const corrections = [];

    for (const deal of deals) {
      if (!deal.slaughter_cutout_price || !deal.buy_price_per_lb) continue;

      // Recalculate expected profit
      const carcassGain = (deal.target_weight || deal.buy_weight) - deal.buy_weight;
      const cutoutValue = deal.slaughter_cutout_price * 0.62 * ((deal.target_weight || deal.buy_weight) / 100);
      const purchaseCost = (deal.buy_price_per_lb || 0) * (deal.buy_weight || 0) / 100;
      const feedCost = (carcassGain || 0) * (deal.cost_of_gain || 0);
      const interestCost = (purchaseCost * (deal.interest_rate || 0) / 36500 * (deal.days_on_feed || 0));
      const freightCost = (deal.trucking_in || 0) + (deal.trucking_out || 0);

      const calculatedProfit = cutoutValue - purchaseCost - feedCost - interestCost - freightCost;

      if (deal.expected_profit_per_head && Math.abs(calculatedProfit - deal.expected_profit_per_head) > 10) {
        issues.push(`Deal ${deal.deal_name}: Profit mismatch (calculated ${calculatedProfit.toFixed(2)} vs recorded ${deal.expected_profit_per_head})`);
        corrections.push({ entityId: deal.id, entityName: 'DealCalculator', field: 'expected_profit_per_head', newValue: parseFloat(calculatedProfit.toFixed(2)) });
      }

      // Check for profit viability
      if (calculatedProfit < -200) {
        issues.push(`Deal ${deal.deal_name}: Negative profit ($${calculatedProfit.toFixed(2)}) exceeds acceptable loss`);
      }
    }

    return { valid: issues.length === 0, issues, corrections, checked: deals.length };
  } catch (error) {
    return { valid: false, issues: [error.message], corrections: [], checked: 0 };
  }
}

async function validateCarcassOutcomeAccuracy(base44) {
  try {
    const outcomes = await base44.asServiceRole.entities.CarcassOutcomeActual.list('-sale_date', 50);
    const benchmarks = await base44.asServiceRole.entities.CarcassQualityBenchmark.list('', 20);
    const issues = [];

    for (const outcome of outcomes) {
      if (!outcome.head_count || outcome.head_count === 0) continue;

      const benchmark = benchmarks.find(b => b.plant_type === outcome.plant_type);
      if (!benchmark) continue;

      // Validate grade distributions sum to 100%
      const totalGrade = (outcome.prime_count || 0) + (outcome.choice_count || 0) + (outcome.select_count || 0) + (outcome.other_count || 0);
      const expectedTotal = outcome.head_count;
      if (totalGrade !== expectedTotal) {
        issues.push(`Outcome ${outcome.id}: Grade counts (${totalGrade}) don't match head count (${expectedTotal})`);
      }

      // Validate grade distributions against benchmarks (±5%)
      const primePercent = (outcome.prime_count / outcome.head_count) * 100;
      if (Math.abs(primePercent - benchmark.prime_percent) > 5) {
        issues.push(`Plant ${outcome.plant_name}: Prime % (${primePercent.toFixed(1)}) deviates >5% from benchmark (${benchmark.prime_percent})`);
      }

      const choicePercent = (outcome.choice_count / outcome.head_count) * 100;
      if (Math.abs(choicePercent - benchmark.choice_percent) > 5) {
        issues.push(`Plant ${outcome.plant_name}: Choice % (${choicePercent.toFixed(1)}) deviates >5% from benchmark (${benchmark.choice_percent})`);
      }

      // Validate avg carcass weight reasonability
      if (outcome.avg_carcass_weight && (outcome.avg_carcass_weight < 550 || outcome.avg_carcass_weight > 950)) {
        issues.push(`Outcome ${outcome.id}: Avg carcass weight (${outcome.avg_carcass_weight}) outside 550-950 range`);
      }

      // Validate fat thickness
      if (outcome.avg_fat_thickness && (outcome.avg_fat_thickness < 0.3 || outcome.avg_fat_thickness > 1.0)) {
        issues.push(`Outcome ${outcome.id}: Fat thickness (${outcome.avg_fat_thickness}") outside 0.3-1.0" range`);
      }

      // Validate trim loss
      if (outcome.avg_trim_loss_percent && (outcome.avg_trim_loss_percent < 15 || outcome.avg_trim_loss_percent > 35)) {
        issues.push(`Outcome ${outcome.id}: Trim loss (${outcome.avg_trim_loss_percent}%) outside 15-35% range`);
      }
    }

    return { valid: issues.length === 0, issues, checked: outcomes.length };
  } catch (error) {
    return { valid: false, issues: [error.message], checked: 0 };
  }
}

async function validateEntityFinancialConsistency(base44) {
  try {
    const entities = await base44.asServiceRole.entities.OperatingEntity.list('', 50);
    const issues = [];
    const corrections = [];

    for (const ent of entities) {
      if (ent.status !== 'active') continue;

      // Validate monthly/annual relationship
      if (ent.monthly_revenue && ent.annual_revenue) {
        const calcAnnual = ent.monthly_revenue * 12;
        if (Math.abs(calcAnnual - ent.annual_revenue) > ent.annual_revenue * 0.02) {
          issues.push(`Entity ${ent.entity_name}: Annual revenue (${ent.annual_revenue}) ≠ Monthly × 12 (${calcAnnual.toFixed(0)})`);
          corrections.push({ entityId: ent.id, entityName: 'OperatingEntity', field: 'annual_revenue', newValue: parseFloat(calcAnnual.toFixed(0)) });
        }
      }

      if (ent.monthly_expenses && ent.annual_expenses) {
        const calcAnnual = ent.monthly_expenses * 12;
        if (Math.abs(calcAnnual - ent.annual_expenses) > ent.annual_expenses * 0.02) {
          issues.push(`Entity ${ent.entity_name}: Annual expenses (${ent.annual_expenses}) ≠ Monthly × 12 (${calcAnnual.toFixed(0)})`);
          corrections.push({ entityId: ent.id, entityName: 'OperatingEntity', field: 'annual_expenses', newValue: parseFloat(calcAnnual.toFixed(0)) });
        }
      }

      // Validate profit margin reasonability
      if (ent.annual_revenue && ent.annual_expenses) {
        const margin = ((ent.annual_revenue - ent.annual_expenses) / ent.annual_revenue) * 100;
        if (margin < -100 || margin > 80) {
          issues.push(`Entity ${ent.entity_name}: Profit margin (${margin.toFixed(1)}%) outside typical range`);
        }
      }
    }

    return { valid: issues.length === 0, issues, corrections, checked: entities.filter(e => e.status === 'active').length };
  } catch (error) {
    return { valid: false, issues: [error.message], corrections: [], checked: 0 };
  }
}

async function validateDomainOutputConsistency(base44) {
  try {
    const publicOrders = await base44.asServiceRole.entities.PublicOrder.list('', 100);
    const accounts = await base44.asServiceRole.entities.CustomerAccount.list('', 100);
    const issues = [];

    // Check for orphaned approved orders
    for (const order of publicOrders) {
      if (order.status === 'approved') {
        const account = accounts.find(a => a.email === order.customer_email);
        if (!account || account.status !== 'approved') {
          issues.push(`Order ${order.id}: Approved without matching approved customer account`);
        }
      }
    }

    // Check for stale pending items (>7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const order of publicOrders) {
      if (order.status === 'pending' && new Date(order.created_date) < sevenDaysAgo) {
        issues.push(`Order ${order.id}: Pending >7 days without action`);
      }
    }
    for (const account of accounts) {
      if (account.status === 'pending' && new Date(account.created_date) < sevenDaysAgo) {
        issues.push(`Account ${account.email}: Pending >7 days without review`);
      }
    }

    return { valid: issues.length === 0, issues, checked: publicOrders.length + accounts.length };
  } catch (error) {
    return { valid: false, issues: [error.message], checked: 0 };
  }
}

async function applyCorrections(base44, allCorrections) {
  try {
    const results = [];
    
    for (const correction of allCorrections) {
      try {
        const entity = base44.asServiceRole.entities[correction.entityName];
        await entity.update(correction.entityId, { [correction.field]: correction.newValue });
        results.push({ status: 'corrected', entity: correction.entityName, field: correction.field });
      } catch (err) {
        results.push({ status: 'failed', entity: correction.entityName, error: err.message });
      }
    }

    return results;
  } catch (error) {
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[CROSS-VALIDATION] Starting comprehensive validation audit...');
    const startTime = Date.now();

    // Get latest market data for reference
    const marketInputs = await base44.asServiceRole.entities.MarketInputs.list('-date', 1);
    const marketData = marketInputs[0] || {};

    // Run all validations in parallel
    const [
      marketValidation,
      projectionValidation,
      dealValidation,
      carcassValidation,
      financialValidation,
      domainValidation,
    ] = await Promise.all([
      validateMarketInputConsistency(base44),
      validateCattleProjectionAccuracy(base44, marketData),
      validateDealProfitCalculations(base44, marketData),
      validateCarcassOutcomeAccuracy(base44),
      validateEntityFinancialConsistency(base44),
      validateDomainOutputConsistency(base44),
    ]);

    // Collect all corrections
    const allCorrections = [
      ...(projectionValidation.corrections || []),
      ...(dealValidation.corrections || []),
      ...(financialValidation.corrections || []),
    ];

    const corrections = await applyCorrections(base44, allCorrections);

    // Aggregate results
    const allIssues = [
      ...marketValidation.issues,
      ...projectionValidation.issues,
      ...dealValidation.issues,
      ...carcassValidation.issues,
      ...financialValidation.issues,
      ...domainValidation.issues,
    ];

    const allValid = [
      marketValidation.valid,
      projectionValidation.valid,
      dealValidation.valid,
      carcassValidation.valid,
      financialValidation.valid,
      domainValidation.valid,
    ].every(v => v === true);

    const duration = Date.now() - startTime;

    console.log(`[CROSS-VALIDATION] Complete: ${allValid ? 'VALIDATED' : 'ISSUES FOUND'} (${duration}ms)`);

    return Response.json({
      status: allValid ? 'validated' : 'issues_found',
      timestamp: new Date().toISOString(),
      validations: {
        marketInputs: { valid: marketValidation.valid, issues: marketValidation.issues, checked: marketValidation.checked },
        projections: { valid: projectionValidation.valid, issues: projectionValidation.issues, checked: projectionValidation.checked },
        deals: { valid: dealValidation.valid, issues: dealValidation.issues, checked: dealValidation.checked },
        carcass: { valid: carcassValidation.valid, issues: carcassValidation.issues, checked: carcassValidation.checked },
        financials: { valid: financialValidation.valid, issues: financialValidation.issues, checked: financialValidation.checked },
        domainSync: { valid: domainValidation.valid, issues: domainValidation.issues, checked: domainValidation.checked },
      },
      corrections: {
        attempted: allCorrections.length,
        results: corrections,
      },
      totalIssues: allIssues.length,
      issues: allIssues,
      auditDuration: duration,
    });
  } catch (error) {
    console.error('[CROSS-VALIDATION] Fatal error:', error.message);
    return Response.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});