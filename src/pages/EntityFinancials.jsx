import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { useRealtimeSync, useAutoRefetch } from '@/hooks/useRealtimeSync';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function EntityFinancials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const isAuthorized = ['super_admin', 'admin', 'attorney_cpa'].includes(user?.role);

  const { data: entities } = useQuery({
    queryKey: ['operatingEntities'],
    queryFn: () => base44.entities.OperatingEntity.list('-annual_revenue'),
    initialData: [],
    staleTime: 10000,
    refetchInterval: 30000,
    enabled: isAuthorized,
  });

  useRealtimeSync('OperatingEntity', (event) => {
    queryClient.invalidateQueries({ queryKey: ['operatingEntities'] });
    setLastUpdated(new Date());
  });

  useAutoRefetch(queryClient, ['operatingEntities'], 30000);

  if (!isAuthorized) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-danger mx-auto mb-2" />
          <div className="text-foreground font-medium">Access Restricted</div>
          <div className="text-sm text-muted-foreground">Only administrators can view entity financials</div>
        </div>
      </div>
    );
  }

  const totalRevenue = entities.reduce((sum, e) => sum + (e.annual_revenue || 0), 0);
  const totalExpenses = entities.reduce((sum, e) => sum + (e.annual_expenses || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader 
          title="ENTITY FINANCIALS"
          subtitle="Consolidated performance across all 11 operating entities"
        />
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Live • {format(lastUpdated, 'h:mm a')}
        </div>
      </div>

      {/* Consolidated Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-xs text-muted-foreground mb-2">Total Revenue</div>
          <div className="font-bebas text-2xl text-primary">${(totalRevenue/1000000).toFixed(1)}M</div>
          <div className="text-xs text-muted-foreground mt-1">Annual</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-xs text-muted-foreground mb-2">Total Expenses</div>
          <div className="font-bebas text-2xl text-warning">${(totalExpenses/1000000).toFixed(1)}M</div>
          <div className="text-xs text-muted-foreground mt-1">Annual</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-xs text-muted-foreground mb-2">Net Profit</div>
          <div className={`font-bebas text-2xl ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
            ${(totalProfit/1000000).toFixed(1)}M
          </div>
          <div className="text-xs text-muted-foreground mt-1">Annual</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-xs text-muted-foreground mb-2">Profit Margin</div>
          <div className={`font-bebas text-2xl ${profitMargin >= 20 ? 'text-success' : 'text-warning'}`}>
            {profitMargin}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Of Revenue</div>
        </div>
      </div>

      {/* Entity Breakdown */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">ENTITY PERFORMANCE</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-medium py-2 px-3">Entity</th>
                <th className="text-right text-muted-foreground font-medium py-2 px-3">Annual Revenue</th>
                <th className="text-right text-muted-foreground font-medium py-2 px-3">Annual Expenses</th>
                <th className="text-right text-muted-foreground font-medium py-2 px-3">Net Profit</th>
                <th className="text-center text-muted-foreground font-medium py-2 px-3">Margin</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => {
                const profit = (entity.annual_revenue || 0) - (entity.annual_expenses || 0);
                const margin = (entity.annual_revenue || 0) > 0 ? ((profit / entity.annual_revenue) * 100).toFixed(1) : 0;
                
                return (
                  <tr key={entity.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-3">
                      <div className="font-medium text-foreground">{entity.entity_name}</div>
                      <div className="text-xs text-muted-foreground">{entity.primary_function}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-foreground">${(entity.annual_revenue || 0).toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="text-foreground">${(entity.annual_expenses || 0).toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className={profit >= 0 ? 'text-success' : 'text-danger'}>
                        ${profit.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className={margin >= 20 ? 'text-success font-medium' : 'text-warning font-medium'}>
                        {margin}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}