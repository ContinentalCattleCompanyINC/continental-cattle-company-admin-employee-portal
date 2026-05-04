import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Plus, AlertCircle, Activity, Camera, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EVENT_TYPES = [
  { value: 'pull', label: 'Pull', color: 'text-danger' },
  { value: 'treatment', label: 'Treatment', color: 'text-warning' },
  { value: 'death', label: 'Death', color: 'text-danger' },
  { value: 'weight_check', label: 'Weight Check', color: 'text-primary' },
  { value: 'observation', label: 'Observation', color: 'text-muted-foreground' },
  { value: 'vaccination', label: 'Vaccination', color: 'text-success' },
];

const EVENT_COLOR = {
  pull: 'bg-danger/15 text-danger border-danger/20',
  treatment: 'bg-warning/15 text-warning border-warning/20',
  death: 'bg-danger/20 text-danger border-danger/30',
  weight_check: 'bg-primary/15 text-primary border-primary/20',
  observation: 'bg-muted text-muted-foreground border-border',
  vaccination: 'bg-success/15 text-success border-success/20',
  preg_check: 'bg-primary/15 text-primary border-primary/20',
  pregnancy_check: 'bg-primary/15 text-primary border-primary/20',
};

export default function LotPerformance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedLot, setSelectedLot] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    event_date: new Date().toISOString().split('T')[0],
    event_type: 'observation',
    head_affected: 1,
    diagnosis: '', treatment: '', product_used: '', dosage: '',
    cost_per_head: '', weight_recorded: '', notes: '',
    follow_up_required: false, follow_up_date: '',
    photos: [],
  });

  const isAdmin = ['admin', 'super_admin', 'manager'].includes(user?.role);
  const canLog = isAdmin || ['cowboy', 'field_rep'].includes(user?.role);

  const { data: lots = [] } = useQuery({
    queryKey: ['activeLots'],
    queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }, '-purchase_date', 200),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['healthEvents', selectedLot],
    queryFn: () => selectedLot
      ? base44.entities.LotHealthEvent.filter({ cattle_lot_id: selectedLot }, '-event_date', 100)
      : base44.entities.LotHealthEvent.list('-event_date', 100),
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LotHealthEvent.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['healthEvents'] });
      toast.success('Event logged');
      setShowForm(false);
      setForm({ event_date: new Date().toISOString().split('T')[0], event_type: 'observation', head_affected: 1, diagnosis: '', treatment: '', product_used: '', dosage: '', cost_per_head: '', weight_recorded: '', notes: '', follow_up_required: false, follow_up_date: '', photos: [] });
    },
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(f => ({ ...f, photos: [...f.photos, ...urls] }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const lot = lots.find(l => l.id === selectedLot);
    createMutation.mutate({
      ...form,
      cattle_lot_id: selectedLot,
      yard: lot?.yard,
      pen: lot?.pen,
      entity: lot?.entity,
      head_affected: Number(form.head_affected),
      cost_per_head: form.cost_per_head ? Number(form.cost_per_head) : undefined,
      weight_recorded: form.weight_recorded ? Number(form.weight_recorded) : undefined,
      recorded_by: user.email,
    });
  };

  // Per-lot stats
  const lotStats = lots.map(lot => {
    const lotEvents = events.filter(e => e.cattle_lot_id === lot.id);
    const pulls = lotEvents.filter(e => e.event_type === 'pull').reduce((s, e) => s + (e.head_affected || 0), 0);
    const deaths = lotEvents.filter(e => e.event_type === 'death').reduce((s, e) => s + (e.head_affected || 0), 0);
    const lastWeight = lotEvents.filter(e => e.event_type === 'weight_check').sort((a, b) => new Date(b.event_date) - new Date(a.event_date))[0];
    const morbidity = lot.head_count ? ((pulls / lot.head_count) * 100).toFixed(1) : 0;
    const mortality = lot.head_count ? ((deaths / lot.head_count) * 100).toFixed(1) : 0;
    return { ...lot, pulls, deaths, morbidity, mortality, lastWeight, eventCount: lotEvents.length };
  });

  const selectedLotData = lotStats.find(l => l.id === selectedLot);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="LOT PERFORMANCE & HEALTH"
          subtitle="Field health events, weight checks, and cowboy updates by lot"
          badge={canLog ? 'Can Log' : 'View Only'}
        />
        {canLog && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Log Event
          </button>
        )}
      </div>

      {/* Lot Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedLot(null)}
          className={`text-left p-3 rounded-lg border transition-colors ${!selectedLot ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/30'}`}>
          <div className="text-sm font-medium text-foreground">All Lots</div>
          <div className="text-xs text-muted-foreground">{events.length} total events</div>
        </button>
        {lotStats.map(lot => (
          <button key={lot.id}
            onClick={() => setSelectedLot(lot.id)}
            className={`text-left p-3 rounded-lg border transition-colors ${selectedLot === lot.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground truncate">{lot.lot_id || lot.cattle_class}</span>
              {(Number(lot.morbidity) > 10 || Number(lot.mortality) > 2) && <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />}
            </div>
            <div className="text-xs text-muted-foreground">{lot.head_count} hd · {lot.yard || '—'} · Pen {lot.pen || '—'}</div>
            <div className="flex gap-3 mt-1 text-xs">
              <span className={Number(lot.morbidity) > 10 ? 'text-danger' : 'text-muted-foreground'}>Morb: {lot.morbidity}%</span>
              <span className={Number(lot.mortality) > 2 ? 'text-danger' : 'text-muted-foreground'}>Mort: {lot.mortality}%</span>
              <span className="text-muted-foreground">{lot.eventCount} events</span>
            </div>
          </button>
        ))}
      </div>

      {/* Log Event Form */}
      {showForm && canLog && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-bebas text-lg text-primary">LOG HEALTH / FIELD EVENT</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Lot</label>
                <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={selectedLot || ''} onChange={e => setSelectedLot(e.target.value)}>
                  <option value="">Select lot...</option>
                  {lots.map(l => <option key={l.id} value={l.id}>{l.lot_id || l.cattle_class} — {l.yard}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Event Type *</label>
                <select required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date *</label>
                <input type="date" required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Head Affected</label>
                <input type="number" min="1" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.head_affected} onChange={e => setForm(f => ({ ...f, head_affected: e.target.value }))} />
              </div>
            </div>

            {['pull', 'treatment', 'death'].includes(form.event_type) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Diagnosis</label>
                  <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                    value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="BRD, Scours..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Treatment</label>
                  <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                    value={form.treatment} onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Product Used</label>
                  <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                    value={form.product_used} onChange={e => setForm(f => ({ ...f, product_used: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cost / Head</label>
                  <input type="number" step="0.01" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                    value={form.cost_per_head} onChange={e => setForm(f => ({ ...f, cost_per_head: e.target.value }))} />
                </div>
              </div>
            )}

            {form.event_type === 'weight_check' && (
              <div className="max-w-xs">
                <label className="text-xs text-muted-foreground mb-1 block">Weight Recorded (lbs/head)</label>
                <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.weight_recorded} onChange={e => setForm(f => ({ ...f, weight_recorded: e.target.value }))} />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <textarea rows={2} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.follow_up_required}
                  onChange={e => setForm(f => ({ ...f, follow_up_required: e.target.checked }))}
                  className="rounded" />
                Follow-up required
              </label>
              {form.follow_up_required && (
                <input type="date" className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Photos</label>
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors text-sm text-muted-foreground w-fit">
                <Camera className="w-4 h-4" />
                {uploading ? 'Uploading...' : `Upload Photos ${form.photos.length > 0 ? `(${form.photos.length})` : ''}`}
                <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {createMutation.isPending ? 'Saving...' : 'Log Event'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Feed */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {selectedLotData ? `Events — ${selectedLotData.lot_id || selectedLotData.cattle_class}` : 'All Recent Events'} ({events.length})
        </h3>
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            No events logged yet.
          </div>
        ) : (
          events.map(evt => (
            <div key={evt.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${EVENT_COLOR[evt.event_type] || 'bg-muted text-muted-foreground border-border'}`}>
                      {evt.event_type.replace('_', ' ')}
                    </span>
                    {evt.head_affected > 1 && <span className="text-xs text-muted-foreground">{evt.head_affected} head</span>}
                    {evt.yard && <span className="text-xs text-primary">{evt.yard}{evt.pen ? ` · Pen ${evt.pen}` : ''}</span>}
                    <span className="text-xs text-muted-foreground">{format(new Date(evt.event_date), 'MMM d, yyyy')}</span>
                    <span className="text-xs text-muted-foreground">by {evt.recorded_by}</span>
                  </div>
                  {evt.diagnosis && <div className="text-sm text-foreground mt-1">Dx: {evt.diagnosis}</div>}
                  {evt.treatment && <div className="text-xs text-muted-foreground">Tx: {evt.treatment} {evt.product_used && `· ${evt.product_used}`} {evt.dosage && `· ${evt.dosage}`}</div>}
                  {evt.weight_recorded && <div className="text-sm text-primary mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" />{evt.weight_recorded} lbs/head</div>}
                  {evt.cost_per_head && <div className="text-xs text-warning">Cost: ${evt.cost_per_head}/hd</div>}
                  {evt.notes && <p className="text-xs text-muted-foreground mt-1 italic">{evt.notes}</p>}
                  {evt.follow_up_required && evt.follow_up_date && (
                    <div className="text-xs text-warning mt-1">⚠ Follow-up: {format(new Date(evt.follow_up_date), 'MMM d')}</div>
                  )}
                  {evt.photos?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {evt.photos.map((url, i) => <img key={i} src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-border" />)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}