import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, AlertTriangle, Activity, Zap, Server, RefreshCw, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import SectionHeader from '@/components/SectionHeader';

const STATUS_ICONS = {
  online: Check,
  offline: AlertTriangle,
  synchronized: Check,
  degraded: AlertTriangle,
};

const STATUS_COLORS = {
  online: 'text-success',
  offline: 'text-danger',
  synchronized: 'text-success',
  degraded: 'text-warning',
};

function ServiceCard({ service, loading }) {
  const Icon = STATUS_ICONS[service?.status] || Activity;
  const color = STATUS_COLORS[service?.status] || 'text-muted-foreground';

  return (
    <div className={`bg-card border rounded-lg p-4 transition-all ${
      service?.healthy ? 'border-success/20' : 'border-danger/20'
    }`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="font-medium text-sm text-foreground">{service?.name}</div>
          <div className="text-xs text-muted-foreground mt-1">{service?.url}</div>
          {service?.responseTime && (
            <div className="text-xs text-muted-foreground mt-1">
              Response: {service.responseTime}ms
            </div>
          )}
          <div className={`text-xs mt-2 font-medium capitalize ${color}`}>
            {service?.status || 'checking...'}
          </div>
        </div>
        {loading && <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
      </div>
    </div>
  );
}

function SyncEntityStatus({ entity, status }) {
  const isAccessible = status?.accessible;
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isAccessible ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'
    }`}>
      <div>
        <div className="text-sm font-medium text-foreground">{entity}</div>
        {status?.lastUpdate && (
          <div className="text-xs text-muted-foreground mt-1">
            Last: {format(new Date(status.lastUpdate), 'h:mm:ss a')}
          </div>
        )}
      </div>
      <div className={`text-xs font-medium ${isAccessible ? 'text-success' : 'text-danger'}`}>
        {isAccessible ? '✓ Sync' : '✗ Error'}
      </div>
    </div>
  );
}

export default function SystemHealthDashboard() {
  const queryClient = useQueryClient();
  const [lastCheck, setLastCheck] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: healthReport, isLoading, refetch } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('autonomousSystemHealthCheck', {});
        setLastCheck(new Date());
        return response.data;
      } catch (error) {
        console.error('Health check failed:', error);
        return null;
      }
    },
    staleTime: 5000,
    refetchInterval: autoRefresh ? 10000 : false,
  });

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
        setLastCheck(new Date());
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  const allHealthy = healthReport?.overallHealthy;
  const servicesHealthy = healthReport?.summary?.servicesHealthy || 0;
  const servicesTotal = healthReport?.summary?.servicesTotal || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          title="SYSTEM HEALTH MONITOR"
          subtitle="Real-time autonomous checks of all apps, websites, domains, and data sync"
          badge={allHealthy ? 'OPERATIONAL' : 'DEGRADED'}
        />
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 rounded font-medium text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Check Now
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-colors border ${
              autoRefresh
                ? 'bg-success/15 text-success border-success/20 hover:bg-success/25'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Zap className="w-4 h-4" />
            {autoRefresh ? 'Auto On' : 'Auto Off'}
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`rounded-lg p-6 border ${
        allHealthy
          ? 'bg-success/10 border-success/20'
          : 'bg-warning/10 border-warning/20'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            allHealthy
              ? 'bg-success/20'
              : 'bg-warning/20'
          }`}>
            {allHealthy ? (
              <Check className="w-8 h-8 text-success" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-warning" />
            )}
          </div>
          <div>
            <div className={`font-bebas text-2xl ${
              allHealthy ? 'text-success' : 'text-warning'
            }`}>
              {healthReport?.overallStatus || 'CHECKING...'}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {servicesHealthy}/{servicesTotal} services operational
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Last checked {format(lastCheck, 'h:mm:ss a')}
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div>
        <h3 className="font-bebas text-lg text-foreground mb-3">CONNECTED SERVICES</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {healthReport?.services?.map((service) => (
            <ServiceCard key={service.name} service={service} loading={isLoading} />
          ))}
        </div>
      </div>

      {/* Database Health */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Server className={`w-5 h-5 ${healthReport?.summary?.databaseConnected ? 'text-success' : 'text-danger'}`} />
          <h3 className="font-bebas text-lg text-foreground">DATABASE CONNECTION</h3>
        </div>
        <div className={`p-4 rounded-lg border ${
          healthReport?.summary?.databaseConnected
            ? 'bg-success/5 border-success/20'
            : 'bg-danger/5 border-danger/20'
        }`}>
          <div className={`text-sm font-medium ${
            healthReport?.summary?.databaseConnected ? 'text-success' : 'text-danger'
          }`}>
            {healthReport?.summary?.databaseConnected ? '✓ Connected' : '✗ Disconnected'}
          </div>
          {healthReport?.summary?.databaseConnected && (
            <div className="text-xs text-muted-foreground mt-1">
              All records accessible and synchronized
            </div>
          )}
        </div>
      </div>

      {/* Cross-Sync Status */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className={`w-5 h-5 ${healthReport?.crossSync?.healthy ? 'text-success' : 'text-danger'}`} />
          <h3 className="font-bebas text-lg text-foreground">CROSS-SYNC INTEGRITY</h3>
        </div>
        <div className="space-y-2">
          {healthReport?.crossSync?.entities ? (
            Object.entries(healthReport.crossSync.entities).map(([entity, status]) => (
              <SyncEntityStatus key={entity} entity={entity} status={status} />
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">Checking sync status...</div>
          )}
        </div>
      </div>

      {/* Check Duration */}
      <div className="text-xs text-muted-foreground text-center py-4 border-t border-border">
        Last health check completed in {healthReport?.checkDuration || 0}ms
      </div>
    </div>
  );
}