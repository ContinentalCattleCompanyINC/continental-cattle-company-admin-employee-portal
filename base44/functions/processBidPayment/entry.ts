import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { bid_id, seller_id, commission_percent = 5, freight_cost = 0, other_expenses = 0 } = body;

    // Get bid details
    const bids = await base44.asServiceRole.entities.Bid.list('', 1, { id: bid_id });
    if (!bids.length) {
      return Response.json({ error: 'Bid not found' }, { status: 404 });
    }

    const bid = bids[0];
    const cattleLots = await base44.asServiceRole.entities.CattleLot.list('', 1, { id: bid.cattle_lot_id });
    const lot = cattleLots[0];

    // Calculate settlement
    const totalSalePrice = bid.bid_amount;
    const commissionAmount = totalSalePrice * (commission_percent / 100);
    const totalExpenses = freight_cost + other_expenses;
    const sellerReceives = totalSalePrice - commissionAmount - totalExpenses;
    const continentalReceives = commissionAmount;

    // Create settlement record
    const settlement = await base44.asServiceRole.entities.BidSettlement.create({
      bid_id,
      cattle_lot_id: bid.cattle_lot_id,
      buyer_id: bid.bidder_id,
      seller_id,
      total_sale_price: totalSalePrice,
      total_weight: lot.current_weight || lot.purchase_weight,
      price_per_unit: bid.price_per_unit,
      commission_percent,
      commission_amount: commissionAmount,
      freight_cost,
      other_expenses: totalExpenses,
      seller_receives: sellerReceives,
      continental_receives: continentalReceives,
      expenses_to_collect: totalExpenses,
      payment_status: 'collected',
      buyer_payment_timestamp: new Date().toISOString(),
      settlement_timestamp: new Date().toISOString(),
    });

    // Update bid status
    await base44.asServiceRole.entities.Bid.update(bid_id, {
      status: 'accepted',
      settlement_id: settlement.id,
      accepted_timestamp: new Date().toISOString(),
      accepted_by: user.email,
    });

    // Create transactions for payment distribution
    await base44.asServiceRole.entities.Transaction.create({
      transaction_type: 'payment',
      from_party_type: 'user',
      from_party_id: bid.bidder_id,
      from_bank_account_id: bid.bank_account_id,
      to_party_type: 'entity',
      to_party_id: 'Continental Cattle Co INC',
      amount: totalSalePrice,
      description: `Cattle lot ${bid.cattle_lot_id} purchase - ${lot.head_count} head`,
      status: 'completed',
      admin_approved: true,
      admin_approved_by: user.email,
      admin_approved_timestamp: new Date().toISOString(),
      executed_timestamp: new Date().toISOString(),
      notes: `Commission: $${commissionAmount}, Freight: $${freight_cost}`,
    });

    // Create transaction for seller payout
    await base44.asServiceRole.entities.Transaction.create({
      transaction_type: 'payment',
      from_party_type: 'entity',
      from_party_id: 'Continental Cattle Co INC',
      to_party_type: 'user',
      to_party_id: seller_id,
      amount: sellerReceives,
      description: `Payment for cattle lot ${bid.cattle_lot_id} sale`,
      status: 'completed',
      admin_approved: true,
      admin_approved_by: user.email,
      admin_approved_timestamp: new Date().toISOString(),
      executed_timestamp: new Date().toISOString(),
    });

    // Notify buyer and seller
    await base44.integrations.Core.SendEmail({
      to: bid.bidder_id,
      subject: 'Bid Accepted - Cattle Lot Purchase Confirmed',
      body: `Your bid for $${totalSalePrice} on cattle lot ${bid.cattle_lot_id} has been accepted. Payment has been collected. Settlement details available in your dashboard.`,
    });

    await base44.integrations.Core.SendEmail({
      to: seller_id,
      subject: 'Cattle Lot Sold - Payment Issued',
      body: `Your cattle lot ${bid.cattle_lot_id} has been sold for $${totalSalePrice}. You will receive $${sellerReceives} after commission and expenses. Transaction reference: ${settlement.id}`,
    });

    console.log(`[AUDIT] Bid ${bid_id} accepted and payment processed. Settlement: ${settlement.id}`);

    return Response.json({
      success: true,
      settlement_id: settlement.id,
      buyer_charged: totalSalePrice,
      seller_receives: sellerReceives,
      commission: commissionAmount,
      expenses: totalExpenses,
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});