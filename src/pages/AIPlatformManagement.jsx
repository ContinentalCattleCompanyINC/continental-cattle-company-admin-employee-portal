import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, Shield, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Wrench, Activity } from 'lucide-react';
import { format } from 'date-fns';
import SectionHeader from '@/components/SectionHeader';

function StatusBadge({ status }) {
  const colors = {
    healthy: 'bg-success/15 text-success border-success/20',
    degraded: 'bg-warning/15 text-warning border-warning/20',
    error: 'bg-danger/15 text-danger border-danger/20',
    completed: 'bg-success/15 text-success border-success/20',
    pending: 'bg-warning/15 text-warning border-warning/20',
    identified: 'bg-warning/15 text-warning border-warning/20',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

function IssueCard({ issue }) {
  const severityColors = {
    high: 'bg-danger/5 border-danger/20',
    medium: 'bg-warning/5 border-warning/20',
    low: 'bg-success/5 border-success/20',
  };

  const severityIcons = {
    high: AlertTriangle,
    medium: AlertTriangle,
    low: CheckCircle,
  };

  const Icon = severityIcons[issue.severity];

  return (
    <div className={`border rounded-lg p-4 ${severityColors[issue.severity]}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          issue.severity === 'high' ? 'text-danger' : issue.severity === 'medium' ? 'text-warning' : 'text-success'
        }`} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-sm text-foreground">{issue.message}</div>
            <StatusBadge status={issue.severity} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">{issue.entity} · {issue.type}</div>
        </div>
      </div>
    </div>
  );
}

function SectionPanel({ title, icon: Icon, items }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-bebas text-lg text-foreground">{title}</h3>
      </div>
      <div className="space-y-3">
        {items && items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-foreground font-medium">{item.message || item.type || item.check}</div>
                <StatusBadge status={item.status} />
              </div>
              {item.entity && <div className="text-xs text-muted-foreground mt-1">Entity: {item.entity}</div>}
              {item.recordsProcessed && <div className="text-xs text-muted-foreground mt-1">{item.recordsProcessed} records</div>}
              {item.adminCount !== undefined && <div className="text-xs text-muted-foreground mt-1">{item.adminCount} admin accounts</div>}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">No items to display</div>
        )}
      </div>
    </div>
  );
}

export default function AIPlatformManagement() {
  const queryClient = useQueryClient();
  const [autoRun, setAutoRun] = useState(true);
  const [lastRun, setLastRun] = useState(new Date());

  const { data: platformReport, isLoading, refetch } = useQuery({
    queryKey: ['aiPlatformOrchestrator'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('aiPlatformOrchestrator', {});
        setLastRun(new Date());
        return response.data;
      } catch (error) {
        console.error('Orchestrator error:', error);
        return null;
      }
    },
    staleTime: 15000,
    refetchInterval: autoRun ? 300000 : false, // 5 minutes
  });

  useEffect(() => {
    if (autoRun) {
      const interval = setInterval(() => refetch(), 300000);
      return () => clearInterval(interval);
    }
  }, [autoRun, refetch]);

  const issuesSection = platformReport?.sections?.find(s => s.name === 'Issues Detected');
  const fixesSection = platformReport?.sections?.find(s => s.name === 'Auto-Fixes Applied');
  const optimizationsSection = platformReport?.sections?.find(s => s.name === 'Performance Optimizations');
  const securitySection = platformReport?.sections?.find(s => s.name === 'Security Verification');

  const criticalCount = issuesSection?.data?.filter(i => i.severity === 'high')?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          title="AI PLATFORM MANAGEMENT"
          subtitle="Autonomous monitoring, updates, fixes, and optimization across entire platform"
          badge="LIVE MONITORING"
        />
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/20 rounded font-medium text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Now
          </button>
          <button
            onClick={() => setAutoRun(!autoRun)}
            className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-colors border ${
              autoRun
                ? 'bg-success/15 text-success border-success/20 hover:bg-success/25'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Zap className="w-4 h-4" />
            {autoRun ? 'Auto On' : 'Auto Off'}
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`rounded-lg p-6 border ${
        platformReport?.overallStatus === 'healthy'
          ? 'bg-success/10 border-success/20'
          : 'bg-warning/10 border-warning/20'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-bebas text-2xl ${
              platformReport?.overallStatus === 'healthy' ? 'text-success' : 'text-warning'
            }`}>
              {platformReport?.overallStatus?.toUpperCase() || 'SCANNING...'}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Platform Status • {platformReport?.version || 'v1.0'}
            </div>
          </div>
          <div className="text-right">
            {criticalCount > 0 && (
              <div className="text-danger font-bebas text-xl mb-2">{criticalCount} Critical Issues</div>
            )}
            <div className="text-xs text-muted-foreground">
              Last audit: {format(lastRun, 'h:mm:ss a')}
            </div>
            {platformReport?.nextAudit && (
              <div className="text-xs text-muted-foreground">
                Next audit: {format(new Date(platformReport.nextAudit), 'h:mm:ss a')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel
          title="Issues Detected"
          icon={AlertTriangle}
          items={issuesSection?.data}
        />
        <SectionPanel
          title="Auto-Fixes Applied"
          icon={Wrench}
          items={fixesSection?.data}
        />
      </div>

      {/* Performance & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionPanel
          title="Performance Optimizations"
          icon={TrendingUp}
          items={optimizationsSection?.data}
        />
        <SectionPanel
          title="Security Verification"
          icon={Shield}
          items={securitySection?.data}
        />
      </div>

      {/* Audit Duration */}
      <div className="text-xs text-muted-foreground text-center py-4 border-t border-border">
        Last platform audit completed in {platformReport?.auditDuration || 0}ms
      </div>
    </div>
  );
}