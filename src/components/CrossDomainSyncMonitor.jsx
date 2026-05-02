import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, Zap, AlertCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import {
  DATA_DEPENDENCIES,
  CALCULATION_CHAINS,
  SYNC_VALIDATION_RULES,
  generateAuditReport,
  verifyDataSync,
} from '@/lib/dataSyncAudit';

export default function CrossDomainSyncMonitor() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [lastAudit, setLastAudit] = useState(new Date());
  const [auditReport, setAuditReport] = useState(null);
  const [syncIssues, setSyncIssues] = useState([]);

  // Fetch all critical entities
  const { data: marketInputs = [] } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 1),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const { data: cattleLots = [] } = useQuery({
    queryKey: ['cattleLots'],
    queryFn: () => base44.entities.CattleLot.list('-purchase_date'),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ['dealCalculators'],
    queryFn: () => base44.entities.DealCalculator.list(),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const { data: outcomes = [] } = useQuery({
    queryKey: ['carcassOutcomes'],
    queryFn: () => base44.entities.CarcassOutcomeActual.list('-sale_date', 20),
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const { data: guides = [] } = useQuery({
    queryKey: ['buyingGuides'],
    queryFn: () => base44.entities.BuyingGuide.list(),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['cattlePrograms'],
    queryFn: () => base44.entities.CattleProgram.list(),
    staleTime: 10000,
    refetchInterval: 15000,
  });

  // Run sync audit
  useEffect(() => {
    const runAudit = () => {
      const systemState = {
        MarketInputs: marketInputs[0] || {},
        CattleLot: cattleLots,
        DealCalculator: deals,
        CarcassOutcomeActual: outcomes,
        BuyingGuide: guides,
        CattleProgram: programs,
      };

      const report = generateAuditReport(systemState);
      setAuditReport(report);

      // Check validation rules
      const issues = [];
      const market = marketInputs[0] || {};

      SYNC_VALIDATION_RULES.forEach(rule => {
        const valid = rule.rule(market);
        if (!valid) {
          issues.push({
            name: rule.name,
            severity: rule.severity,
            impact: rule.impact,
          });
        }
      });

      setSyncIssues(issues);
      setLastAudit(new Date());
    };

    runAudit();
    const interval = setInterval(runAudit, 30000); // Run every 30s
    return () => clearInterval(interval);
  }, [marketInputs, cattleLots, deals, outcomes, guides, programs]);

  const criticalIssueCount = syncIssues.filter(i => i.severity === 'critical').length;
  const warningCount = syncIssues.filter(i => i.severity === 'warning').length;

  const dataCompleteness = auditReport?.dataCompleteness || {};
  const completenessScores = Object.entries(dataCompleteness).map(([entity, data]) => ({
    entity,
    score: parseFloat(data.percentage),
  }));

  const avgCompleteness = completenessScores.length > 0
    ? (completenessScores.reduce((s, c) => s + c.score, 0) / completenessScores.length).toFixed(1)
    : 0;

  const allChainValid = Object.values(auditReport?.calculationDrift || {}).every(c => c.chainValid);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Sync Status</div>
          <div className={`font-bebas text-2xl ${criticalIssueCount === 0 ? 'text-success' : 'text-danger'}`}>
            {criticalIssueCount === 0 ? 'GREEN' : 'RED'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {criticalIssueCount} critical · {warningCount} warning
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Data Completeness</div>
          <div className="font-bebas text-2xl text-primary">{avgCompleteness}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {completenessScores.filter(c => c.score >= 95).length}/{completenessScores.length} entities complete
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Calc Chains</div>
          <div className={`font-bebas text-2xl ${allChainValid ? 'text-success' : 'text-danger'}`}>
            {allChainValid ? 'VALID' : 'ISSUES'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">ROI, Cutout, Profit chains</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Last Audit</div>
          <div className="font-bebas text-2xl text-primary">{format(lastAudit, 'h:mm a')}</div>
          <div className="text-xs text-muted-foreground mt-1">Live monitoring active</div>
        </div>
      </div>

      {/* Issues Alert */}
      {syncIssues.length > 0 && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-foreground">Data Sync Issues Detected</div>
              <div className="text-sm text-muted-foreground">Fix these to ensure calculation accuracy</div>
            </div>
          </div>
          <div className="space-y-2">
            {syncIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  issue.severity === 'critical' ? 'bg-danger' : 'bg-warning'
                }`} />
                <div>
                  <div className="font-medium text-foreground">{issue.name}</div>
                  <div className="text-xs text-muted-foreground">{issue.impact}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'completeness', label: 'Data Completeness' },
          { key: 'chains', label: 'Calculation Chains' },
          { key: 'validations', label: 'Validation Rules' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-lg p-5">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-3">Critical Entities Status</h3>
              <div className="space-y-2">
                {Object.entries(DATA_DEPENDENCIES).map(([entity, config]) => {
                  const completion = dataCompleteness[entity];
                  const score = completion ? parseFloat(completion.percentage) : 0;
                  return (
                    <div key={entity} className="flex items-center justify-between p-3 bg-secondary/30 rounded">
                      <div className="flex items-center gap-3">
                        {score >= 95 ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground">{entity}</div>
                          <div className="text-xs text-muted-foreground">
                            Used by {config.dependents.length} tools
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium text-sm ${score >= 95 ? 'text-success' : 'text-warning'}`}>
                          {score.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">complete</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'completeness' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Data completeness for each critical entity. Missing fields block dependent calculations.
            </p>
            {Object.entries(dataCompleteness).map(([entity, data]) => (
              <div key={entity} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-foreground">{entity}</div>
                  <div className={`font-bebas text-lg ${parseFloat(data.percentage) >= 95 ? 'text-success' : 'text-warning'}`}>
                    {data.percentage}%
                  </div>
                </div>
                {data.missingFields.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Missing: {data.missingFields.join(', ')}
                  </div>
                )}
                <div className="w-full bg-secondary rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      parseFloat(data.percentage) >= 95 ? 'bg-success' : 'bg-warning'
                    }`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'chains' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Calculation dependencies and validation status. All must be valid for accurate projections.
            </p>
            {Object.entries(auditReport?.calculationDrift || {}).map(([chain, status]) => (
              <div key={chain} className={`border rounded-lg p-4 ${
                status.chainValid
                  ? 'bg-success/5 border-success/20'
                  : 'bg-danger/5 border-danger/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-foreground uppercase text-sm">{chain}</div>
                  {status.chainValid ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-danger" />
                  )}
                </div>
                {status.missingDeps.length > 0 && (
                  <div className="text-xs text-danger mb-2">
                    Missing deps: {status.missingDeps.join(', ')}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Requires: {status.requiredDeps.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'validations' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Business logic validation rules. Warnings indicate data may produce anomalous results.
            </p>
            {SYNC_VALIDATION_RULES.map((rule, i) => {
              const market = marketInputs[0] || {};
              const isValid = rule.rule(market);
              return (
                <div key={i} className={`border rounded-lg p-4 ${
                  isValid
                    ? 'bg-success/5 border-success/20'
                    : 'bg-warning/5 border-warning/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-foreground text-sm">{rule.name}</div>
                    {isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rule.impact}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center">
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-3 h-3 animate-pulse" />
          Continuous monitoring · Updates every 30 seconds
        </div>
      </div>
    </div>
  );
}