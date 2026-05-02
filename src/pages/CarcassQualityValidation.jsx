import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { AlertTriangle, TrendingDown, TrendingUp, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useRealtimeSync, useAutoRefetch } from '@/hooks/useRealtimeSync';

export default function CarcassQualityValidation() {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const qc = useQueryClient();

  const { data: outcomes } = useQuery({
    queryKey: ['carcassOutcomes'],
    queryFn: () => base44.entities.CarcassOutcomeActual.list('-sale_date', 20),
    initialData: [],
    staleTime: 2000,
    refetchInterval: 8000,
  });

  const { data: benchmarks } = useQuery({
    queryKey: ['carcassBenchmarks'],
    queryFn: () => base44.entities.CarcassQualityBenchmark.list(),
    initialData: [],
    staleTime: 5000,
    refetchInterval: 15000,
  });

  // Real-time sync
  useRealtimeSync('CarcassOutcomeActual', () => {
    qc.invalidateQueries({ queryKey: ['carcassOutcomes'] });
    setLastUpdated(new Date());
  });

  useAutoRefetch(qc, ['carcassOutcomes'], 8000);

  const handleValidate = async (outcomeId) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('validateCarcassQuality', { carcassOutcomeId: outcomeId });
      setValidationResult(res.data);
      setSelectedOutcomeId(outcomeId);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader 
          title="CARCASS QUALITY VALIDATION"
          subtitle="NBQA 2022 benchmarking — flag outcomes & protect margins"
        />
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Live • {format(lastUpdated, 'h:mm a')}
        </div>
      </div>

      {/* Benchmark Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {benchmarks.map((b) => (
          <div key={b.id} className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs font-semibold text-primary mb-2 uppercase">{b.plant_type}</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prime</span>
                <span className="font-medium">{b.prime_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Choice</span>
                <span className="font-medium">{b.choice_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Select</span>
                <span className="font-medium">{b.select_percent}%</span>
              </div>
              <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                Trim Loss: {b.trim_loss_percent}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Outcomes */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">RECENT CARCASS OUTCOMES</h3>
        
        <div className="space-y-2">
          {outcomes.map((outcome) => {
            const totalHead = outcome.head_count || 1;
            const primePercent = ((outcome.prime_count || 0) / totalHead * 100).toFixed(1);
            const choicePercent = ((outcome.choice_count || 0) / totalHead * 100).toFixed(1);
            
            return (
              <div
                key={outcome.id}
                className={`p-4 rounded-lg border transition-all ${
                  outcome.risk_flag
                    ? 'bg-danger/5 border-danger/20'
                    : 'bg-secondary/30 border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-foreground">{outcome.plant_name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        outcome.plant_type === 'integrated'
                          ? 'bg-success/10 border-success/20 text-success'
                          : 'bg-warning/10 border-warning/20 text-warning'
                      }`}>
                        {outcome.plant_type}
                      </span>
                      {outcome.risk_flag && (
                        <span className="text-xs px-2 py-0.5 rounded bg-danger/10 border border-danger/20 text-danger flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Risk
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(outcome.sale_date), 'MMM d, yyyy')} • {outcome.head_count} head
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div><span className="text-muted-foreground">Prime:</span> <span className="font-medium">{primePercent}%</span></div>
                      <div><span className="text-muted-foreground">Choice:</span> <span className="font-medium">{choicePercent}%</span></div>
                      <div><span className="text-muted-foreground">Trim Loss:</span> <span className="font-medium">{outcome.avg_trim_loss_percent}%</span></div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleValidate(outcome.id)}
                    disabled={loading || selectedOutcomeId === outcome.id}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading && selectedOutcomeId === outcome.id ? 'Validating...' : 'Validate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={`rounded-lg border p-5 ${
          validationResult.status === 'above_expected'
            ? 'bg-success/5 border-success/20'
            : validationResult.status === 'below_expected'
            ? 'bg-danger/5 border-danger/20'
            : 'bg-primary/5 border-primary/20'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {validationResult.status === 'above_expected' ? (
              <TrendingUp className="w-6 h-6 text-success" />
            ) : validationResult.status === 'below_expected' ? (
              <TrendingDown className="w-6 h-6 text-danger" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            )}
            <h4 className="font-bebas text-xl text-foreground">
              {validationResult.status === 'above_expected' ? 'ABOVE EXPECTED' : 
               validationResult.status === 'below_expected' ? 'BELOW EXPECTED' : 
               'WITHIN RANGE'}
            </h4>
          </div>

          {/* Risk Details */}
          {validationResult.riskDetails?.length > 0 && (
            <div className="mb-4 space-y-2">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase">Variance Detected</h5>
              {validationResult.riskDetails.map((risk, i) => (
                <div key={i} className="p-3 bg-background/50 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{risk.metric}</span>
                    <span className={risk.severity === 'high' ? 'text-danger' : 'text-warning'}>
                      {risk.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Actual: {risk.actual}% | Expected: {risk.expected}% | Variance: ±{risk.variance}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Margin Impact */}
          {validationResult.marginImpact && (
            <div className="mb-4 p-3 bg-background/50 rounded">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Margin Impact</h5>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Expected Premium</div>
                  <div className="font-bebas text-lg">${validationResult.marginImpact.expectedPremiumPerCwt}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Actual Premium</div>
                  <div className="font-bebas text-lg">${validationResult.marginImpact.actualPremiumPerCwt}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Loss/cwt</div>
                  <div className={`font-bebas text-lg ${parseFloat(validationResult.marginImpact.lossPerCwt) > 0 ? 'text-danger' : 'text-success'}`}>
                    ${validationResult.marginImpact.lossPerCwt}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="p-3 bg-background/50 rounded border-l-2 border-primary">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recommendation</div>
            <div className="text-sm text-foreground">{validationResult.recommendation}</div>
          </div>
        </div>
      )}
    </div>
  );
}