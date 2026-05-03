import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    // Only trigger on create events for pending users
    if (event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const newUser = data;
    if (!newUser || newUser.role !== 'pending') {
      return Response.json({ skipped: true, reason: 'Not a pending user' });
    }

    // Notify all admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => ['admin', 'super_admin'].includes(u.role));

    for (const admin of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `New Account Pending Approval — ${newUser.full_name}`,
        body: `A new user has registered and is awaiting your approval.

Name: ${newUser.full_name}
Email: ${newUser.email}
Requested Role: ${newUser.requested_role || 'Not specified'}
Company: ${newUser.company_name || 'N/A'}
Phone: ${newUser.phone || 'N/A'}

Log in to the admin dashboard and go to Approvals → User Accounts to review this request.`,
      });
    }

    console.log(`[USER_REGISTRATION] New pending user ${newUser.email} — notified ${admins.length} admins`);
    return Response.json({ success: true, notified: admins.length });
  } catch (error) {
    console.error('[ERROR]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});