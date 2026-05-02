import { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSync, useAutoRefetch } from '@/hooks/useRealtimeSync';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import SectionHeader from '@/components/SectionHeader';
import { TrendingUp, TrendingDown, Globe } from 'lucide-react';

export default function TradeAnalytics() {
  const [selectedProduct, setSelectedProduct] = useState('beef_veal');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: tradeData } = useQuery({
    queryKey: ['tradeData'],
    queryFn: () => base44.entities.TradeData.list('-date'),
    initialData: [],
    staleTime: 2000,
    refetchInterval: 8000,
  });

  useRealtimeSync('TradeData', (event) => {
    queryClient.invalidateQueries({ queryKey: ['tradeData'] });
    setLastUpdated(new Date());
  });

  useAutoRefetch(queryClient, ['tradeData'], 8000);

  const filtered = useMemo(() => {
    return tradeData.filter(t => t.product_type === selectedProduct);
  }, [tradeData, selectedProduct]);

  const imports = useMemo(() => {
    return filtered.filter(t => t.trade_type === 'import');
  }, [filtered]);

  const exports = useMemo(() => {
    return filtered.filter(t => t.trade_type === 'export');
  }, [filtered]);

  const totalImports = imports.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalExports = exports.reduce((sum, e) => sum + (e.quantity || 0), 0);

  const countryImports = {};
  imports.forEach(imp => {
    if (!countryImports[imp.country]) countryImports[imp.country] = 0;
    countryImports[imp.country] += imp.quantity || 0;
  });

  const topImporters = Object.entries(countryImports)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader 
          title="TRADE ANALYTICS"
          subtitle="U.S. beef, cattle, and lamb import/export trends (1989-2026)"
        />
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Live • {format(lastUpdated, 'h:mm a')}
        </div>
      </div>

      {/* Product Filter */}
      <div className="flex gap-2">
        {[
          { value: 'beef_veal', label: 'Beef & Veal' },
          { value: 'cattle', label: 'Live Cattle' },
          { value: 'lamb_mutton', label: 'Lamb & Mutton' },
        ].map((product) => (
          <button
            key={product.value}
            onClick={() => setSelectedProduct(product.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedProduct === product.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80 text-foreground'
            }`}
          >
            {product.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-xs text-muted-foreground mb-1">Total Imports (YTD 2026)</div>
          <div className="font-bebas text-2xl text-primary">{totalImports.toLocaleString()}</div>
          <div className="text-xs text-success mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Rising trend
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-xs text-muted-foreground mb-1">Total Exports (YTD 2026)</div>
          <div className="font-bebas text-2xl text-warning">{totalExports.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Strong demand</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-xs text-muted-foreground mb-1">Top Source</div>
          <div className="font-bebas text-2xl text-foreground">
            {topImporters.length > 0 ? topImporters[0][0] : '—'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {topImporters.length > 0 ? `${topImporters[0][1].toLocaleString()} volume` : 'No data'}
          </div>
        </div>
      </div>

      {/* Top Importers */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" /> Top Import Sources
        </h3>

        <div className="space-y-2">
          {topImporters.map(([country, volume], index) => {
            const percentage = totalImports > 0 ? ((volume / totalImports) * 100).toFixed(1) : 0;
            return (
              <div key={country} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
                  <span className="text-foreground font-medium">{country}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bebas text-primary">{volume.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{percentage}% of total</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Data */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-bebas text-lg text-foreground mb-4">Recent Trade Activity</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted-foreground font-medium py-2 px-3">Date</th>
                <th className="text-left text-muted-foreground font-medium py-2 px-3">Country</th>
                <th className="text-center text-muted-foreground font-medium py-2 px-3">Type</th>
                <th className="text-right text-muted-foreground font-medium py-2 px-3">Volume</th>
                <th className="text-right text-muted-foreground font-medium py-2 px-3">YTD Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 10).map((trade) => (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-3 px-3 text-muted-foreground">{trade.date}</td>
                  <td className="py-3 px-3 text-foreground font-medium">{trade.country}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${
                      trade.trade_type === 'import'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-success/15 text-success'
                    }`}>
                      {trade.trade_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-foreground">{(trade.quantity || 0).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-foreground font-medium">{(trade.ytd_volume || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}