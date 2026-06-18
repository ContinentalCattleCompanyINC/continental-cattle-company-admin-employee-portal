import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both scheduled automation (no user) and manual admin invocation
    const isScheduled = req.headers.get('x-base44-trigger') === 'scheduled';

    if (!isScheduled) {
      // Manual call — require admin auth
      const user = await base44.auth.me();
      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    const PUBLIC_APP_ID = Deno.env.get('PUBLIC_APP_ID');
    if (!PUBLIC_APP_ID) {
      // Not a hard failure — log and return gracefully so automation doesn't keep erroring
      return Response.json({
        status: 'skipped',
        message: 'PUBLIC_APP_ID not configured — sync skipped. Set this secret in your dashboard to enable cross-app sync.',
        timestamp: new Date().toISOString()
      });
    }

    let direction = 'both';
    try {
      const body = await req.json();
      direction = body.direction || 'both';
    } catch (_) {
      // No body (scheduled call) — use default 'both'
    }

    const syncLog = {
      timestamp: new Date().toISOString(),
      adminAppId: Deno.env.get('BASE44_APP_ID'),
      publicAppId: PUBLIC_APP_ID,
      directions: {}
    };

    // Sync TO public
    if (direction === 'both' || direction === 'to_public') {
      try {
        const result = await base44.asServiceRole.functions.invoke('syncToPublicApp', {});
        syncLog.directions.to_public = result?.data || { status: 'invoked' };
      } catch (error) {
        syncLog.directions.to_public = { status: 'error', error: error.message };
      }
    }

    // Sync FROM public
    if (direction === 'both' || direction === 'from_public') {
      try {
        const result = await base44.asServiceRole.functions.invoke('syncFromPublicApp', {});
        syncLog.directions.from_public = result?.data || { status: 'invoked' };
      } catch (error) {
        syncLog.directions.from_public = { status: 'error', error: error.message };
      }
    }

    return Response.json({
      status: 'success',
      message: 'Bidirectional sync orchestrated',
      syncLog
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});