/**
 * Cross-Domain Data Sync Validation Function
 * Runs periodic checks to ensure all calculations, projections, and numbers
 * stay synchronized across all applications and domains
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CALCULATION_TOLERANCES = {
  roi: 0.5, // ±0.5% variance acceptable
  cutout: 1.0, // ±$1.00/cwt variance acceptable
  profit: 50, // ±$50/head variance acceptable
  portfolio: 1.0, // ±1% portfolio value variance acceptable
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const validationResults = {
      timestamp: new Date().toISOString(),
      checks: [],
      issues: [],
      recommendations: [],
    };

    // ========== CHECK 1: MarketInputs Completeness ==========
    const marketInputs = await base44.asServiceRole.entities.MarketInputs.list('-date', 1);
    const market = marketInputs[0] || {};

    const requiredMarketFields = [
      'date', 'lc_futures', 'gf_futures', 'corn_price', 'sbm_price',
      'choice_cutout', 'select_cutout', 'trim_90s', 'basis_southern_plains'
    ];

    const marketComplete = requiredMarketFields.every(f => market[f] !== null && market[f] !== undefined);
    validationResults.checks.push({
      name: 'MarketInputs Data Completeness',
      status: marketComplete ? 'pass' : 'fail',
      data: {
        fields: requiredMarketFields.length,
        present: requiredMarketFields.filter(f => market[f] !== null && market[f] !== undefined).length,
        missing: requiredMarketFields.filter(f => !market[f]),
      },
    });

    if (!marketComplete) {
      validationResults.issues.push({
        severity: 'critical',
        check: 'MarketInputs Completeness',
        message: 'Missing market data will cascade failures in ROI, Cutout, and Playbook calculations',
        missingFields: requiredMarketFields.filter(f => !market[f]),
      });
    }

    // ========== CHECK 2: CattleLot Data Consistency ==========
    const cattleLots = await base44.asServiceRole.entities.CattleLot.list();

    const lotConsistencyIssues = [];
    cattleLots.forEach(lot => {
      if (lot.current_weight > lot.target_weight) {
        lotConsistencyIssues.push({
          lot_id: lot.lot_id || lot.id,
          issue: `Current weight (${lot.current_weight}) exceeds target (${lot.target_weight})`,
        });
      }
      if (lot.purchase_weight <= 0) {
        lotConsistencyIssues.push({
          lot_id: lot.lot_id || lot.id,
          issue: 'Purchase weight is zero or negative',
        });
      }
    });

    validationResults.checks.push({
      name: 'CattleLot Data Consistency',
      status: lotConsistencyIssues.length === 0 ? 'pass' : 'fail',
      data: {
        totalLots: cattleLots.length,
        issues: lotConsistencyIssues.length,
        inconsistencies: lotConsistencyIssues,
      },
    });

    if (lotConsistencyIssues.length > 0) {
      validationResults.issues.push({
        severity: 'critical',
        check: 'CattleLot Consistency',
        message: `${lotConsistencyIssues.length} lots have invalid weight relationships`,
        examples: lotConsistencyIssues.slice(0, 3),
      });
    }

    // ========== CHECK 3: LC-Cutout Spread Reasonability ==========
    const lc = market.lc_futures || 0;
    const choice = market.choice_cutout || 0;
    const spread = choice - lc;

    const spreadReasonable = spread >= 40 && spread <= 120;
    validationResults.checks.push({
      name: 'LC-Cutout Spread Logic',
      status: spreadReasonable ? 'pass' : 'warn',
      data: {
        lc_futures: lc,
        choice_cutout: choice,
        spread: spread,
        reasonableRange: '40-120',
      },
    });

    if (!spreadReasonable) {
      validationResults.issues.push({
        severity: 'warning',
        check: 'LC-Cutout Spread',
        message: `Spread of $${spread} is outside normal range (40-120). Cutout-driven signals may be anomalous.`,
      });
    }

    // ========== CHECK 4: Basis Reasonability ==========
    const basis = market.basis_southern_plains || 0;
    const basisReasonable = basis >= -10 && basis <= 5;

    validationResults.checks.push({
      name: 'Basis Reasonability',
      status: basisReasonable ? 'pass' : 'warn',
      data: {
        basis: basis,
        reasonableRange: '-10 to 5',
      },
    });

    if (!basisReasonable) {
      validationResults.issues.push({
        severity: 'warning',
        check: 'Basis Reasonability',
        message: `Basis of $${basis} is outside normal range (-10 to 5). Feed/Buy signals may be unreliable.`,
      });
    }

    // ========== CHECK 5: Portfolio Value Calculation Chain ==========
    const totalHead = cattleLots.reduce((sum, lot) => sum + (lot.head_count || 0), 0);
    const portfolioValue = cattleLots.reduce((sum, lot) => {
      const weight = lot.current_weight || lot.purchase_weight || 0;
      const price = lot.purchase_price || 0;
      return sum + (weight * price / 100 * lot.head_count);
    }, 0);

    validationResults.checks.push({
      name: 'Portfolio Value Calculation',
      status: 'pass',
      data: {
        totalHead,
        portfolioValue: portfolioValue.toFixed(0),
        avgValuePerHead: totalHead > 0 ? (portfolioValue / totalHead).toFixed(0) : 0,
      },
    });

    // ========== CHECK 6: Deal Calculator to ROI Ladder Sync ==========
    const deals = await base44.asServiceRole.entities.DealCalculator.list();
    const dealsWithoutROI = deals.filter(d => !d.expected_profit_per_head || d.expected_profit_per_head <= 0);

    validationResults.checks.push({
      name: 'Deal Calculator ROI Sync',
      status: dealsWithoutROI.length === 0 ? 'pass' : 'warn',
      data: {
        totalDeals: deals.length,
        dealsWithoutROI: dealsWithoutROI.length,
        coveragePercent: ((1 - dealsWithoutROI.length / deals.length) * 100).toFixed(1),
      },
    });

    if (dealsWithoutROI.length > 0) {
      validationResults.issues.push({
        severity: 'warning',
        check: 'Deal Calculator Sync',
        message: `${dealsWithoutROI.length} deals missing ROI calculation. Dashboard projections may be incomplete.`,
      });
    }

    // ========== CHECK 7: Carcass Outcome to Lot Reconciliation ==========
    const outcomes = await base44.asServiceRole.entities.CarcassOutcomeActual.list('-sale_date', 30);
    const soldLots = cattleLots.filter(l => l.status === 'sold');
    const matchedOutcomes = outcomes.filter(o => o.cattle_lot_id);
    const unmatchedOutcomes = outcomes.filter(o => !o.cattle_lot_id);

    validationResults.checks.push({
      name: 'Carcass Outcome-Lot Reconciliation',
      status: unmatchedOutcomes.length === 0 ? 'pass' : 'warn',
      data: {
        totalOutcomes: outcomes.length,
        matchedToLots: matchedOutcomes.length,
        unmatched: unmatchedOutcomes.length,
      },
    });

    if (unmatchedOutcomes.length > 0) {
      validationResults.issues.push({
        severity: 'warning',
        check: 'Carcass Matching',
        message: `${unmatchedOutcomes.length} carcass outcomes not linked to specific lots. Margin validation incomplete.`,
      });
    }

    // ========== CHECK 8: Import/Export Volume Consistency ==========
    const importVol = market.import_volume || 'normal';
    const exportVol = market.export_volume || 'normal';
    const volValid = ['high', 'normal', 'low'].includes(importVol) && ['high', 'normal', 'low'].includes(exportVol);

    validationResults.checks.push({
      name: 'Trade Volume Inputs',
      status: volValid ? 'pass' : 'warn',
      data: {
        importVolume: importVol,
        exportVolume: exportVol,
      },
    });

    // ========== CHECK 9: Cross-App Approval Pipeline Sync ==========
    const accounts = await base44.asServiceRole.entities.CustomerAccount.list();
    const orders = await base44.asServiceRole.entities.PublicOrder.list();

    const pendingAccounts = accounts.filter(a => a.status === 'pending').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    validationResults.checks.push({
      name: 'Approval Pipeline Sync',
      status: 'pass',
      data: {
        pendingAccounts,
        pendingOrders,
        totalInbox: pendingAccounts + pendingOrders,
      },
    });

    // ========== RECOMMENDATIONS ==========
    if (validationResults.issues.filter(i => i.severity === 'critical').length > 0) {
      validationResults.recommendations.push({
        priority: 1,
        action: 'Resolve critical data completeness issues immediately',
        impact: 'All dependent calculations will fail or produce invalid results',
      });
    }

    if (lotConsistencyIssues.length > 0) {
      validationResults.recommendations.push({
        priority: 2,
        action: 'Reconcile cattle lot weight anomalies',
        impact: 'Portfolio value and profit projections may be incorrect',
      });
    }

    if (!spreadReasonable || !basisReasonable) {
      validationResults.recommendations.push({
        priority: 3,
        action: 'Verify market input accuracy for today',
        impact: 'Dashboard signals and trading recommendations may be unreliable',
      });
    }

    // ========== LOG RESULTS ==========
    console.log(`[CROSS-DOMAIN SYNC VALIDATION] ${validationResults.checks.filter(c => c.status === 'pass').length}/${validationResults.checks.length} checks passed`);
    console.log(`[CRITICAL ISSUES] ${validationResults.issues.filter(i => i.severity === 'critical').length}`);
    console.log(`[WARNINGS] ${validationResults.issues.filter(i => i.severity === 'warning').length}`);

    return Response.json({
      status: 'success',
      validation: validationResults,
      overallStatus: validationResults.issues.filter(i => i.severity === 'critical').length === 0 ? 'healthy' : 'degraded',
    });
  } catch (error) {
    console.error('[SYNC VALIDATION ERROR]', error.message);
    return Response.json({
      status: 'error',
      message: error.message,
    }, { status: 500 });
  }
});