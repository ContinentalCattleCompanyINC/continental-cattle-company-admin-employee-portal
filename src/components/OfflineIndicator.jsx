import { useState, useEffect } from 'react';
import { checkServiceHealth, getQueueStatus, forceSync } from '@/lib/offlineEngine';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function OfflineIndicator() {
  const [health, setHealth] = useState({
    internet: { online: true },
    backend: { online: true },
    ai: { creditsAvailable: true },
  });
  const [queueStatus, setQueueStatus] = useState({ pending: 0, failed: 0, syncing: false });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const healthStatus = await checkServiceHealth();
      setHealth(healthStatus);
      setQueueStatus(getQueueStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const isOffline = !health.internet.online || !health.backend.online;
  const hasPending = queueStatus.pending > 0;
  const hasFailed = queueStatus.failed > 0;

  const handleSync = async () => {
    try {
      await forceSync();
      toast.success('Sync completed');
      setQueueStatus(getQueueStatus());
    } catch (error) {
      toast.error('Sync failed: ' + error.message);
    }
  };

  // Don't show if everything is online and no queue
  if (!isOffline && !hasPending && !hasFailed && !expanded) {
    return null;
  }

  return (
    <div className={`fixed bottom-20 md:bottom-4 right-4 z-50 transition-all duration-300 ${expanded ? 'w-80' : 'w-auto'}`}>
      {/* Main Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border transition-all ${
          isOffline
            ? 'bg-warning/90 border-warning text-warning-foreground'
            : hasPending
              ? 'bg-primary/90 border-primary text-primary-foreground'
              : hasFailed
                ? 'bg-danger/90 border-danger text-danger-foreground'
                : 'bg-card/90 border-border text-foreground'
        }`}
      >
        {isOffline ? (
          <WifiOff className="w-5 h-5" />
        ) : hasPending ? (
          <Cloud className="w-5 h-5" />
        ) : hasFailed ? (
          <AlertTriangle className="w-5 h-5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-success" />
        )}
        <span className="font-medium text-sm">
          {isOffline ? 'Offline' : hasPending ? `${queueStatus.pending} Pending` : hasFailed ? 'Failed' : 'Synced'}
        </span>
        {queueStatus.syncing && <RefreshCw className="w-4 h-4 animate-spin" />}
      </button>

      {/* Expanded Panel */}
      {expanded && (
        <div className="mt-2 bg-card border border-border rounded-lg shadow-xl p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-bebas text-lg text-foreground">Connection Status</h3>
            <button
              onClick={handleSync}
              disabled={queueStatus.syncing || isOffline}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/10 border border-primary/20 rounded hover:bg-primary/20 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${queueStatus.syncing ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          </div>

          {/* Health Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <Wifi className="w-3 h-3" /> Internet
              </span>
              <span className={health.internet.online ? 'text-success' : 'text-danger'}>
                {health.internet.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <Cloud className="w-3 h-3" /> Backend
              </span>
              <span className={health.backend.online ? 'text-success' : 'text-danger'}>
                {health.backend.online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-3 h-3" /> AI Credits
              </span>
              <span className={health.ai.creditsAvailable ? 'text-success' : 'text-warning'}>
                {health.ai.creditsAvailable ? 'Available' : 'Using Fallback'}
              </span>
            </div>
          </div>

          {/* Queue Status */}
          {(hasPending || hasFailed) && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="text-xs font-medium text-foreground">Sync Queue</div>
              {hasPending && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Pending Sync</span>
                  <span className="text-primary font-medium">{queueStatus.pending} operations</span>
                </div>
              )}
              {hasFailed && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Failed</span>
                  <span className="text-danger font-medium">{queueStatus.failed} operations</span>
                </div>
              )}
              {queueStatus.syncing && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing...
                </div>
              )}
            </div>
          )}

          {/* Info Message */}
          <div className="pt-3 border-t border-border text-xs text-muted-foreground">
            {isOffline
              ? 'All changes are saved locally and will sync when connection is restored.'
              : hasPending
                ? 'Operations will sync automatically when backend is available.'
                : hasFailed
                  ? 'Some operations failed. Check System Status for details.'
                  : 'All data is synced and up to date.'}
          </div>
        </div>
      )}
    </div>
  );
}