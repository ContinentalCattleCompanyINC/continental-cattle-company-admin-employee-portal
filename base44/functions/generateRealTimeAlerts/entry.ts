/**
 * Real-Time Alert & Notification System
 * Triggers alerts for accuracy discrepancies, calculation errors, and cross-system mismatches
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function evaluateCriticalDiscrepancies(validationReport) {
  try {
    const alerts = [];

    // Critical: Market input hierarchy violations
    const marketIssues = validationReport.validations?.marketInputs?.issues || [];
    if (marketIssues.some(i => i.includes('Prime') || i.includes('Choice'))) {
      alerts.push({
        severity: 'CRITICAL',
        category: 'Market Data',
        message: 'Cutout price hierarchy violation detected',
        action: 'Manual market data review required',
        timestamp: new Date().toISOString(),
      });
    }

    // High: Profit calculation mismatches >$15/head
    const dealIssues = validationReport.validations?.deals?.issues || [];
    if (dealIssues.some(i => i.includes('mismatch'))) {
      alerts.push({
        severity: 'HIGH',
        category: 'Deal Calculations',
        message: 'Deal profitability calculations do not match current market',
        action: 'Review deal parameters against live cutouts',
        timestamp: new Date().toISOString(),
      });
    }

    // High: Cattle projection inconsistencies
    const projIssues = validationReport.validations?.projections?.issues || [];
    if (projIssues.some(i => i.includes('weight'))) {
      alerts.push({
        severity: 'HIGH',
        category: 'Cattle Operations',
        message: 'Cattle weight projections inconsistent with current actuals',
        action: 'Update lot weights from yard scale data',
        timestamp: new Date().toISOString(),
      });
    }

    // Medium: Carcass outcome deviations >5% from benchmark
    const carcassIssues = validationReport.validations?.carcass?.issues || [];
    if (carcassIssues.length > 0) {
      alerts.push({
        severity: 'MEDIUM',
        category: 'Carcass Quality',
        message: `${carcassIssues.length} carcass outcomes deviate from benchmarks`,
        action: 'Review plant performance and potential genetics/feeding adjustment',
        timestamp: new Date().toISOString(),
      });
    }

    // Medium: Financial consistency issues
    const finIssues = validationReport.validations?.financials?.issues || [];
    if (finIssues.length > 0) {
      alerts.push({
        severity: 'MEDIUM',
        category: 'Entity Financials',
        message: 'Monthly/annual financial data inconsistencies detected',
        action: 'Reconcile month-to-date accounting entries',
        timestamp: new Date().toISOString(),
      });
    }

    // Low: Domain sync lagging
    const domainIssues = validationReport.validations?.domainSync?.issues || [];
    if (domainIssues.some(i => i.includes('Pending >7'))) {
      alerts.push({
        severity: 'LOW',
        category: 'Admin Workflow',
        message: 'Pending approvals aging >7 days without action',
        action: 'Review and action pending orders/accounts',
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  } catch (error) {
    console.error('[ALERT GENERATION] Error:', error.message);
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validationReport = payload.validationReport || {};
    const alerts = await evaluateCriticalDiscrepancies(validationReport);

    // Log alerts for admin viewing
    console.log(`[ALERTS] Generated ${alerts.length} alerts:`, alerts);

    return Response.json({
      status: 'generated',
      alertCount: alerts.length,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ALERT GENERATION] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});