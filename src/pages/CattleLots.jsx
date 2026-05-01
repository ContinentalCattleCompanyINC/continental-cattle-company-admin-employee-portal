import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Plus, X, Beef } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CLASSES = [
  { value: 'holstein_steer', label: 'Holstein Steer' },
  { value: 'holstein_heifer', label: 'Holstein Heifer' },
  { value: 'beef_dairy_steer', label: 'Beef × Dairy Steer' },
  { value: 'beef_dairy_heifer', label: 'Beef × Dairy Heifer' },
  { value: 'feeder_cow', label: 'Feeder Cow' },
  { value: 'feeder_bull', label: 'Feeder Bull' },
  { value: 'packer_cow', label: 'Packer Cow' },
  { value: 'packer_bull', label: 'Packer Bull' },
  { value: 'day_old_calf', label: 'Day-Old Calf' },
];

const ENTITIES = ['Continental', 'Rincon', 'Flying3BarB', 'GrandSlam', 'FullCount', 'BeesonBulls'];
const STAGES = ['calf_ranch', 'grower', 'feedyard', 'finish', 'rail'];

const BLANK_FORM = {
  lot_id: '', entity: 'Continental', cattle_class: 'beef_dairy_steer',
  head_count: 0, purchase_weight: 0, current_weight: 0, target_weight: 0,
  purchase_price: 0, purchase_date: format(new Date(), 'yyyy-MM-dd'),
  yard: '', pen: '', cog: 0.92, yardage: 0.45, status: 'active',
  stage: 'calf_ranch', notes: '',
};

export default function CattleLots() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  const { data: lots } = useQuery({
    queryKey: ['cattleLots'],
    queryFn: () => base44.entities.CattleLot.list('-purchase_date'),
    initialData: [],
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.CattleLot.create(d),
    onSuccess: () => { qc.invalidateQueries(['cattleLots']); setShowForm(false); setForm(BLANK_FORM); toast.success('Lot created'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CattleLot.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['cattleLots']); toast.success('Updated'); },
  });

  const filtered = lots.filter(l =>
    (filterEntity === 'all' || l.entity === filterEntity) &&
    (filterStatus === 'all' || l.status === filterStatus)
  );

  const totalHead = filtered.reduce((s, l) => s + (l.head_count || 0), 0);
  const totalValue = filtered.reduce((s, l) => s + ((l.current_weight || l.purchase_weight) * (l.purchase_price / 100) * l.head_count), 0);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="CATTLE LOTS" subtitle="Track all active lots across entities and stages" badge="Live" />

      {/* Filters + Stats */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
            className="bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
            <option value="all">All Entities</option>
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="transferred">Transferred</option>
          </select>
          <div className="flex items-center gap-3 bg-card border border-border rounded px-3 py-2">
            <span className="text-xs text-muted-foreground">Head: <span className="text-primary font-medium">{totalHead.toLocaleString()}</span></span>
            <span className="text-xs text-muted-foreground">Value: <span className="text-success font-medium">${(totalValue/1000).toFixed(0)}K</span></span>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-medium hover:bg-primary/90 text-sm">
          <Plus className="w-4 h-4" /> Add Lot
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-card border border-primary/20 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bebas text-xl text-foreground">NEW LOT</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Lot ID', key: 'lot_id', type: 'text' },
              { label: 'Head Count', key: 'head_count', type: 'number' },
              { label: 'Purchase Weight', key: 'purchase_weight', type: 'number' },
              { label: 'Current Weight', key: 'current_weight', type: 'number' },
              { label: 'Target Weight', key: 'target_weight', type: 'number' },
              { label: 'Purchase Price ($/cwt)', key: 'purchase_price', type: 'number' },
              { label: 'Purchase Date', key: 'purchase_date', type: 'date' },
              { label: 'Yard', key: 'yard', type: 'text' },
              { label: 'Pen', key: 'pen', type: 'text' },
              { label: 'COG ($/lb)', key: 'cog', type: 'number', step: 0.01 },
            ].map(fi => (
              <div key={fi.key}>
                <label className="text-xs text-muted-foreground block mb-1">{fi.label}</label>
                <input type={fi.type} step={fi.step} value={form[fi.key]}
                  onChange={e => f(fi.key, fi.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Cattle Class</label>
              <select value={form.cattle_class} onChange={e => f('cattle_class', e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
                {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Entity</label>
              <select value={form.entity} onChange={e => f('entity', e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
                {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Stage</label>
              <select value={form.stage} onChange={e => f('stage', e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm">
                {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <textarea placeholder="Notes..." value={form.notes} onChange={e => f('notes', e.target.value)}
            className="w-full bg-secondary border border-border rounded px-3 py-2 text-foreground text-sm h-16 resize-none mb-3" />
          <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}
            className="bg-primary text-primary-foreground px-5 py-2 rounded font-medium hover:bg-primary/90 text-sm">
            Save Lot
          </button>
        </div>
      )}

      {/* Lots Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/80 border-b border-border">
                {['Lot ID', 'Entity', 'Class', 'Head', 'Buy Wt', 'Cur Wt', 'Buy Price', 'Date', 'Stage', 'Status', 'Value', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground text-sm">No lots found. Add your first lot above.</td></tr>
              )}
              {filtered.map(lot => {
                const val = ((lot.current_weight || lot.purchase_weight) * (lot.purchase_price / 100) * lot.head_count);
                return (
                  <tr key={lot.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-3 py-2.5 font-medium text-foreground">{lot.lot_id || lot.id.slice(-6)}</td>
                    <td className="px-3 py-2.5 text-primary text-xs">{lot.entity}</td>
                    <td className="px-3 py-2.5 text-foreground text-xs">{CLASSES.find(c => c.value === lot.cattle_class)?.label || lot.cattle_class}</td>
                    <td className="px-3 py-2.5 text-foreground">{lot.head_count}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{lot.purchase_weight} lb</td>
                    <td className="px-3 py-2.5 text-foreground">{lot.current_weight || '—'}</td>
                    <td className="px-3 py-2.5 text-primary">${lot.purchase_price}/cwt</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{lot.purchase_date}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded">{lot.stage}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        lot.status === 'active' ? 'bg-success/15 text-success border-success/20' :
                        lot.status === 'sold' ? 'bg-primary/15 text-primary border-primary/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>{lot.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-success font-medium">${(val/1000).toFixed(1)}K</td>
                    <td className="px-3 py-2.5">
                      <select value={lot.status}
                        onChange={e => updateMut.mutate({ id: lot.id, data: { status: e.target.value } })}
                        className="bg-secondary border border-border rounded px-2 py-1 text-foreground text-xs">
                        <option value="active">Active</option>
                        <option value="sold">Sold</option>
                        <option value="transferred">Transferred</option>
                        <option value="dead">Dead</option>
                      </select>
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