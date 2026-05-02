import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { settlement_id, cost_of_gain = 0, death_loss_percent = 0, interest_rate = 0 } = body;

    // Get settlement
    const settlements = await base44.entities.BidSettlement.list('', 1, { id: settlement_id });
    if (!settlements.length) {
      return Response.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const settlement = settlements[0];

    // Get cattle lot for details
    const lots = await base44.entities.CattleLot.list('', 1, { id: settlement.cattle_lot_id });
    const lot = lots[0];

    // Calculate ROI metrics
    const totalWeight = settlement.total_weight;
    const pricePerUnit = settlement.price_per_unit;
    const totalRevenue = settlement.total_sale_price;

    // Cost of livestock
    const purchaseCost = (lot.purchase_weight * (lot.purchase_price / 100)) * lot.head_count;

    // Operating costs
    const gainWeight = totalWeight - lot.purchase_weight;
    const costOfGainTotal = gainWeight * cost_of_gain;
    const deathLossAmount = (lot.head_count * lot.purchase_price / 100) * (death_loss_percent / 100);

    // Total costs
    const totalCosts = purchaseCost + costOfGainTotal + deathLossAmount + settlement.freight_cost + settlement.other_expenses;

    // Profit calculations
    const grossProfit = totalRevenue - purchaseCost;
    const netProfit = totalRevenue - totalCosts;
    const breakeven = totalCosts;

    // ROI calculations
    const grossROI = (grossProfit / purchaseCost) * 100;
    const netROI = (netProfit / purchaseCost) * 100;
    const totalROI = netROI;

    // Hedgable profit (before operational costs)
    const hedgableProfit = totalRevenue - purchaseCost - settlement.freight_cost;

    const settlementDoc = {
      settlement_id,
      settlement_date: settlement.settlement_timestamp,
      buyer: settlement.buyer_id,
      seller: settlement.seller_id,
      cattle_lot: settlement.cattle_lot_id,
      
      // Physical details
      head_count: lot.head_count,
      total_weight: totalWeight,
      purchase_weight: lot.purchase_weight,
      gain_weight: gainWeight,
      price_per_unit: pricePerUnit,
      
      // Revenue
      total_sale_price: totalRevenue,
      
      // Cost breakdown
      livestock_cost: purchaseCost,
      cost_of_gain_total: costOfGainTotal,
      cost_of_gain_per_lb: cost_of_gain,
      death_loss_amount: deathLossAmount,
      death_loss_percent,
      freight_cost: settlement.freight_cost,
      other_expenses: settlement.other_expenses,
      total_costs: totalCosts,
      
      // Continental charges
      commission_percent: settlement.commission_percent,
      commission_amount: settlement.commission_amount,
      
      // Payout
      seller_receives: settlement.seller_receives,
      continental_receives: settlement.continental_receives,
      
      // Profitability metrics
      hedgable_profit: hedgableProfit,
      gross_profit: grossProfit,
      net_profit: netProfit,
      breakeven_price: breakeven / (totalWeight || 1),
      
      // ROI breakdown
      roi: {
        gross_roi_percent: grossROI.toFixed(2),
        net_roi_percent: netROI.toFixed(2),
        total_roi_percent: totalROI.toFixed(2),
      },
      
      // Per head analysis
      per_head: {
        purchase_cost: purchaseCost / lot.head_count,
        gain_cost: costOfGainTotal / lot.head_count,
        total_cost: totalCosts / lot.head_count,
        revenue_per_head: totalRevenue / lot.head_count,
        profit_per_head: netProfit / lot.head_count,
      },
    };

    // Store settlement document
    await base44.asServiceRole.entities.BidSettlement.update(settlement_id, {
      settlement_document: JSON.stringify(settlementDoc),
    });

    console.log(`[AUDIT] Settlement document generated for ${settlement_id}`);

    return Response.json({
      success: true,
      settlement_document: settlementDoc,
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});