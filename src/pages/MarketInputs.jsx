import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { format } from 'date-fns';
import { Save, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtimeSync, useAutoRefetch } from '@/hooks/useRealtimeSync';

const FIELDS = [
  { key: 'lc_futures', label: 'LC Futures', unit: '$/cwt', default: 241.66 },
  { key: 'gf_futures', label: 'GF Futures', unit: '$/cwt', default: 285.40 },
  { key: 'corn_price', label: 'Corn', unit: '$/bu', default: 4.22 },
  { key: 'sbm_price', label: 'Soybean Meal', unit: '$/ton', default: 340 },
  { key: 'choice_cutout', label: 'Choice Cutout', unit: '$/cwt', default: 324.50 },
  { key: 'select_cutout', label: 'Select Cutout', unit: '$/cwt', default: 298.00 },
  { key: 'prime_cutout', label: 'Prime Cutout', unit: '$/cwt', default: 365.00 },
  { key: 'trim_90s', label: '90s Trim', unit: '$/lb', default: 3.15 },
  { key: 'trim_50s', label: '50s Trim', unit: '$/lb', default: 0.68 },
  { key: 'basis_southern_plains', label: 'Basis (S. Plains)', unit: '$/cwt', default: -2.50 },
];

export default function MarketInputsPage() {
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [form, setForm] = useState({
    date: today,
    import_volume: 'normal',
    export_volume: 'normal',
    notes: '',
    ...Object.fromEntries(FIELDS.map(f => [f.key, f.default])),
  });

  const { data: history } = useQuery({
    queryKey: ['marketInputs'],
    queryFn: () => base44.entities.MarketInputs.list('-date', 10),
    initialData: [],
    staleTime: 2000,
    refetchInterval: 8000,
  });

  // Real-time sync
  useRealtimeSync('MarketInputs', () => {
    qc.invalidateQueries({ queryKey: ['marketInputs'] });
    setLastUpdated(new Date());
  });

  useAutoRefetch(qc, ['marketInputs'], 8000);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MarketInputs.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['marketInputs']);
      toast.success('Market data saved');
    },
  });

  // Auto-calculations
  const cogCalc = (form.corn_price * 56 / 2000 * 6.5 + form.sbm_price / 2000 * 0.8).toFixed(3);
  const gridAdj = ((form.choice_cutout - form.lc_futures) * 0.62).toFixed(2);
  const spreadSignal = form.choice_cutout - form.lc_futures;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <SectionHeader
          title="MARKET INPUTS"
          subtitle="Daily CME & USDA data entry — drives all calculations across the platform"
          badge="Live Panel"
        />
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Live • {format(lastUpdated, 'h:mm a')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bebas text-xl text-foreground">TODAY'S INPUTS</h2>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="bg-secondary border border-border text-foreground text-sm rounded px-3 py-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground block mb-1">{f.label} <span className="text-primary/60">{f.unit}</span></label>
                <input
                  type="number"
                  step="0.01"
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm focus:border-primary/50 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Import Volume</label>
              <select
                value={form.import_volume}
                onChange={e => setForm(p => ({ ...p, import_volume: e.target.value }))}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm"
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Export Volume</label>
              <select
                value={form.export_volume}
                onChange={e => setForm(p => ({ ...p, export_volume: e.target.value }))}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm"
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <textarea
            placeholder="Notes..."
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm h-20 resize-none mb-4"
          />

          <button
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded font-medium hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Market Data
          </button>
        </div>

        {/* Auto-Calculations */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-bebas text-xl text-foreground mb-4">AUTO-CALCULATIONS</h2>
            <div className="space-y-3">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="text-xs text-muted-foreground">Est. COG (corn-based)</div>
                <div className="text-xl font-bebas text-primary">${cogCalc}/lb</div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="text-xs text-muted-foreground">Grid Adjustment</div>
                <div className={`text-xl font-bebas ${parseFloat(gridAdj) > 0 ? 'text-success' : 'text-danger'}`}>
                  {parseFloat(gridAdj) > 0 ? '+' : ''}${gridAdj}/cwt
                </div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="text-xs text-muted-foreground">Cutout-to-Live Spread</div>
                <div className={`text-xl font-bebas ${spreadSignal > 80 ? 'text-success' : spreadSignal > 60 ? 'text-warning' : 'text-danger'}`}>
                  ${spreadSignal.toFixed(2)}/cwt
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {spreadSignal > 80 ? 'Wide — strong packer bids' : spreadSignal > 60 ? 'Normal range' : 'Tight — weak bids'}
                </div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg">
                <div className="text-xs text-muted-foreground">Trim Impact (import adj)</div>
                <div className={`text-xl font-bebas ${form.import_volume === 'low' ? 'text-success' : form.import_volume === 'high' ? 'text-danger' : 'text-warning'}`}>
                  {form.import_volume === 'low' ? '+$0.30' : form.import_volume === 'high' ? '–$0.30' : 'Neutral'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">on 90s trim</div>
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-bebas text-xl text-foreground mb-3">RECENT ENTRIES</h2>
            <div className="space-y-2">
              {history.length === 0 && <p className="text-xs text-muted-foreground">No entries yet</p>}
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                  <span className="text-xs text-muted-foreground">{h.date}</span>
                  <div className="flex gap-3">
                    <span className="text-xs text-primary">LC: ${h.lc_futures}</span>
                    <span className="text-xs text-success">Cut: ${h.choice_cutout}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}