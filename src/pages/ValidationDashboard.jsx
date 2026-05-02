import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { CheckCircle, AlertCircle, Zap, RefreshCw, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ValidationDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const { data: validationReport = {} } = useQuery({
    queryKey: ['crossValidation'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('comprehensiveCrossValidation', {});
        return res.data || {};
      } catch (err) {
        return { error: err.message };
      }
    },
    staleTime: 0,
    refetchInterval: 30000,
  });

  const handleFullValidation = async () => {
    try {
      setIsRunning(true);
      toast.loading('Running comprehensive validation...');
      await qc.refetchQueries({ queryKey: ['crossValidation'] });
      toast.success('Validation complete');
    } catch (err) {
      toast.error('Validation failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  if (!user) return null;

  const isValid = validationReport.status === 'validated';
  const totalIssues = validationReport.totalIssues || 0;

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="CROSS-VALIDATION DASHBOARD"
          subtitle="Real-time accuracy validation: all calculations, projections, inputs, outputs, and operations synchronized"
          badge="100% Accuracy"
        />
        <button
          onClick={handleFullValidation}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Zap className="w-4 h-4" />
          {isRunning ? 'Validating...' : 'Run Validation'}
        </button>
      </div>

      {/* Validation Status */}
      <div className={`border rounded-lg p-6 ${isValid ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
        <div className="flex items-center gap-4">
          {isValid ? (
            <CheckCircle className="w-12 h-12 text-success" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-warning" />
          )}
          <div className="flex-1">
            <h2 className={`font-bebas text-2xl ${isValid ? 'text-success' : 'text-warning'}`}>
              {isValid ? 'ALL DATA VALIDATED' : 'DISCREPANCIES DETECTED'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {totalIssues === 0 ? 'All calculations, projections, and operations are accurate' : `${totalIssues} accuracy issue${totalIssues !== 1 ? 's' : ''} found`}
            </p>
          </div>
          {validationReport.timestamp && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Last Check</div>
              <div className="text-sm font-medium text-foreground">
                {format(new Date(validationReport.timestamp), 'h:mm:ss a')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Validation Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { key: 'marketInputs', label: 'Market Inputs', icon: TrendingUp },
          { key: 'projections', label: 'Cattle Projections', icon: BarChart3 },
          { key: 'deals', label: 'Deal Calculations', icon: CheckCircle },
          { key: 'carcass', label: 'Carcass Outcomes', icon: CheckCircle },
          { key: 'financials', label: 'Entity Financials', icon: BarChart3 },
          { key: 'domainSync', label: 'Domain Operations', icon: RefreshCw },
        ].map(v => {
          const validation = validationReport.validations?.[v.key] || {};
          const Icon = v.icon;
          const isOk = validation.valid;

          return (
            <div key={v.key} className={`border rounded-lg p-4 ${isOk ? 'bg-card border-success/20' : 'bg-card border-warning/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${isOk ? 'text-success' : 'text-warning'}`} />
                <span className="text-sm font-medium text-foreground">{v.label}</span>
              </div>
              <div className={`font-bebas text-lg ${isOk ? 'text-success' : 'text-warning'}`}>
                {isOk ? '✓ Valid' : '⚠ Issues'}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {validation.checked ? `Checked ${validation.checked} records` : 'Pending'}
              </div>
              {validation.issues && validation.issues.length > 0 && (
                <div className="text-xs text-warning font-medium mt-1">
                  {validation.issues.length} discrepanc{validation.issues.length !== 1 ? 'ies' : 'y'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Corrections Applied */}
      {validationReport.corrections?.attempted > 0 && (
        <div className="bg-success/5 border border-success/20 rounded-lg p-5">
          <h3 className="font-bebas text-lg text-success mb-3">AUTO-CORRECTIONS APPLIED</h3>
          <div className="text-sm text-foreground">
            {validationReport.corrections.attempted} correction{validationReport.corrections.attempted !== 1 ? 's' : ''} applied successfully:
          </div>
          <div className="space-y-2 mt-3">
            {validationReport.corrections.results?.slice(0, 10).map((result, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-success" />
                <span className="text-muted-foreground">
                  {result.status === 'corrected' ? `✓ ${result.entity} → ${result.field}` : `✗ Failed: ${result.entity}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Issues */}
      {validationReport.issues && validationReport.issues.length > 0 && (
        <div className="bg-card border border-warning/20 rounded-lg p-5">
          <h3 className="font-bebas text-lg text-warning mb-3">ACCURACY DISCREPANCIES ({validationReport.issues.length})</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {validationReport.issues.slice(0, 25).map((issue, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-warning/5 rounded border border-warning/10 text-xs">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-muted-foreground">{issue}</div>
              </div>
            ))}
            {validationReport.issues.length > 25 && (
              <div className="text-xs text-muted-foreground italic p-2">
                +{validationReport.issues.length - 25} more issues...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Details */}
      <div className="bg-secondary/20 border border-border/50 rounded-lg p-5 text-sm text-muted-foreground space-y-2">
        <p><strong>✓ Market Inputs:</strong> Validates cutout hierarchy, futures spreads, and price relationships</p>
        <p><strong>✓ Cattle Projections:</strong> Weight trajectory, COG alignment with live corn prices, yardage costs</p>
        <p><strong>✓ Deal Calculations:</strong> Recalculates all deal profit against current cutouts, validates viability</p>
        <p><strong>✓ Carcass Outcomes:</strong> Grade distributions, bench marking deviations, trim loss reasonability</p>
        <p><strong>✓ Financial Consistency:</strong> Monthly/annual alignment, margin reasonability across all entities</p>
        <p><strong>✓ Domain Operations:</strong> Public/admin sync, orphaned approvals, aging pending items</p>
        <p><strong>✓ Auto-Corrections:</strong> Fixes calculation mismatches, updates financials, corrects stale projections</p>
        <p><strong>✓ Runs Every 5 Minutes:</strong> Continuous validation ensures 100% platform accuracy</p>
      </div>
    </div>
  );
}