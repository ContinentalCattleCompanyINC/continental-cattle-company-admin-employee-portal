import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { cattle_lot_id, bid_amount, price_per_unit, unit_type, bank_account_id } = body;

    // Verify bank account exists and is verified
    const bankAccounts = await base44.entities.BankAccount.list('', 1, { id: bank_account_id });
    if (!bankAccounts.length) {
      return Response.json({ error: 'Bank account not found' }, { status: 404 });
    }

    const account = bankAccounts[0];
    if (!account.funds_verified || !account.is_active) {
      return Response.json({
        error: 'Bank account not verified or inactive',
        verification_status: account.verification_label,
      }, { status: 400 });
    }

    // Check bid doesn't exceed max limit
    if (bid_amount > account.max_bid_limit) {
      return Response.json({
        error: 'Bid exceeds available funds limit',
        max_bid_limit: account.max_bid_limit,
        bid_requested: bid_amount,
      }, { status: 400 });
    }

    // Verify cattle lot exists
    const lots = await base44.entities.CattleLot.list('', 1, { id: cattle_lot_id });
    if (!lots.length) {
      return Response.json({ error: 'Cattle lot not found' }, { status: 404 });
    }

    // Create bid
    const bid = await base44.entities.Bid.create({
      cattle_lot_id,
      bidder_type: 'user',
      bidder_id: user.email,
      bid_amount,
      price_per_unit,
      unit_type,
      bank_account_id,
      bid_timestamp: new Date().toISOString(),
      status: 'active',
    });

    // Notify admins
    const admins = await base44.asServiceRole.entities.User.list();
    const adminEmails = admins.filter(u => u.role === 'admin').map(u => u.email);

    for (const adminEmail of adminEmails) {
      await base44.integrations.Core.SendEmail({
        to: adminEmail,
        subject: `New Bid Received - Lot ${cattle_lot_id}`,
        body: `${user.full_name} has placed a bid of $${bid_amount} ($${price_per_unit}/${unit_type}) on cattle lot ${cattle_lot_id}. Review in Admin Dashboard.`,
      });
    }

    console.log(`[AUDIT] New bid created by ${user.email}: $${bid_amount}`);

    return Response.json({
      success: true,
      bid_id: bid.id,
      message: 'Bid placed successfully',
    });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});