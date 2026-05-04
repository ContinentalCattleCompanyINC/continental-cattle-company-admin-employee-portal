import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Plus, CheckCircle, Truck, AlertCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';

const FEED_TIMES = ['morning', 'midday', 'afternoon', 'evening'];
const STATUS_STYLE = {
  scheduled: 'bg-warning/15 text-warning border-warning/20',
  mixed: 'bg-primary/15 text-primary border-primary/20',
  delivered: 'bg-success/15 text-success border-success/20',
  complete: 'bg-muted text-muted-foreground border-border',
};
const ENTITIES = ['Continental', 'Rincon', 'Flying3BarB', 'GrandSlam', 'FullCount', 'BeesonBulls'];

function FeedOrderCard({ order, canUpdate, onStatusChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/30 transition-colors text-left">
        <div className="flex items-center gap-3">
          <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Pen {order.pen}</span>
              <span className="text-xs text-muted-foreground">— {order.yard}</span>
              {order.entity && <span className="text-xs text-primary">{order.entity}</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {order.ration_name} · {order.total_lbs?.toLocaleString() || '—'} lbs total · {order.lbs_per_head} lbs/hd · {order.feed_time}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${STATUS_STYLE[order.status]}`}>{order.status}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 bg-secondary/20 border-t border-border space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-muted-foreground">Head Count: </span><span className="text-foreground font-medium">{order.head_count || '—'}</span></div>
            <div><span className="text-muted-foreground">Feed Date: </span><span className="text-foreground">{order.feed_date}</span></div>
            <div><span className="text-muted-foreground">Total lbs: </span><span className="text-foreground font-medium">{order.total_lbs?.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">lbs/head: </span><span className="text-foreground">{order.lbs_per_head}</span></div>
          </div>
          {order.ingredients && (
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Mix Instructions</div>
              <div className="text-sm text-foreground whitespace-pre-line">{order.ingredients}</div>
            </div>
          )}
          {order.special_instructions && (
            <div className="text-xs bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 text-warning">
              ⚠ {order.special_instructions}
            </div>
          )}

          {canUpdate && (
            <div className="flex gap-2 flex-wrap">
              {order.status === 'scheduled' && (
                <button onClick={() => onStatusChange(order.id, 'mixed')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/15 text-primary border border-primary/20 rounded text-xs font-medium hover:bg-primary/25 transition-colors">
                  Mark Mixed
                </button>
              )}
              {order.status === 'mixed' && (
                <button onClick={() => onStatusChange(order.id, 'delivered')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-success/15 text-success border border-success/20 rounded text-xs font-medium hover:bg-success/25 transition-colors">
                  <Truck className="w-3 h-3" /> Mark Delivered
                </button>
              )}
              {order.status === 'delivered' && (
                <button onClick={() => onStatusChange(order.id, 'complete')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground border border-border rounded text-xs font-medium hover:bg-secondary transition-colors">
                  <CheckCircle className="w-3 h-3" /> Complete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FeedlotOps() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    entity: 'Continental', yard: '', pen: '', cattle_lot_id: '',
    head_count: '', ration_name: '', lbs_per_head: '', total_lbs: '',
    feed_time: 'morning', feed_date: new Date().toISOString().split('T')[0],
    ingredients: '', special_instructions: '',
  });

  const isAdmin = ['admin', 'super_admin', 'manager'].includes(user?.role);
  const isFeedMill = user?.role === 'feed_mill';
  const isTruckDriver = user?.role === 'feed_truck';
  const isCowboy = user?.role === 'cowboy';

  const { data: orders = [] } = useQuery({
    queryKey: ['penFeedOrders', filterDate],
    queryFn: () => base44.entities.PenFeedOrder.filter({ feed_date: filterDate }, '-feed_time', 100),
    refetchInterval: 15000,
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['activeLots'],
    queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }, 'yard', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PenFeedOrder.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['penFeedOrders'] });
      toast.success('Feed order created');
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PenFeedOrder.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['penFeedOrders'] }),
  });

  const handleLbsChange = (field, value) => {
    const updated = { ...form, [field]: value };
    if (field === 'lbs_per_head' && updated.head_count) {
      updated.total_lbs = (Number(value) * Number(updated.head_count)).toString();
    }
    if (field === 'head_count' && updated.lbs_per_head) {
      updated.total_lbs = (Number(updated.lbs_per_head) * Number(value)).toString();
    }
    setForm(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      head_count: form.head_count ? Number(form.head_count) : undefined,
      lbs_per_head: form.lbs_per_head ? Number(form.lbs_per_head) : undefined,
      total_lbs: form.total_lbs ? Number(form.total_lbs) : undefined,
    });
  };

  const filtered = orders.filter(o => filterStatus === 'all' || o.status === filterStatus);
  const grouped = FEED_TIMES.reduce((acc, t) => {
    acc[t] = filtered.filter(o => o.feed_time === t);
    return acc;
  }, {});

  const stats = {
    total: orders.length,
    scheduled: orders.filter(o => o.status === 'scheduled').length,
    mixed: orders.filter(o => o.status === 'mixed').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    complete: orders.filter(o => o.status === 'complete').length,
    totalLbs: orders.reduce((s, o) => s + (o.total_lbs || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="FEEDLOT OPERATIONS"
          subtitle="Daily pen feed orders, ration schedules, and delivery tracking"
          badge={isAdmin ? 'Admin' : isFeedMill ? 'Feed Mill' : isTruckDriver ? 'Driver' : 'Field'}
        />
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Feed Order
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Pens', value: stats.total, color: 'text-foreground' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-warning' },
          { label: 'Mixed', value: stats.mixed, color: 'text-primary' },
          { label: 'Delivered', value: stats.delivered, color: 'text-success' },
          { label: 'Complete', value: stats.complete, color: 'text-muted-foreground' },
          { label: 'Total Lbs', value: stats.totalLbs.toLocaleString(), color: 'text-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center">
            <div className={`font-bebas text-2xl ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground" />
        {['all', 'scheduled', 'mixed', 'delivered', 'complete'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* New Order Form */}
      {showForm && isAdmin && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-bebas text-lg text-primary">NEW FEED ORDER</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Entity</label>
                <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value }))}>
                  {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Yard *</label>
                <input required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.yard} onChange={e => setForm(f => ({ ...f, yard: e.target.value }))} placeholder="e.g. Rincon Yard" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Pen *</label>
                <input required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.pen} onChange={e => setForm(f => ({ ...f, pen: e.target.value }))} placeholder="e.g. 12A" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Feed Date *</label>
                <input type="date" required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.feed_date} onChange={e => setForm(f => ({ ...f, feed_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ration Name *</label>
                <input required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.ration_name} onChange={e => setForm(f => ({ ...f, ration_name: e.target.value }))} placeholder="e.g. Grower Blend A" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Head Count</label>
                <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.head_count} onChange={e => handleLbsChange('head_count', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">lbs / Head</label>
                <input type="number" step="0.1" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.lbs_per_head} onChange={e => handleLbsChange('lbs_per_head', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Total lbs (auto)</label>
                <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.total_lbs} onChange={e => setForm(f => ({ ...f, total_lbs: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Feed Time</label>
                <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                  value={form.feed_time} onChange={e => setForm(f => ({ ...f, feed_time: e.target.value }))}>
                  {FEED_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Mix Instructions / Ingredients</label>
              <textarea rows={3} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
                placeholder="List ingredients and amounts..."
                value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Special Instructions</label>
              <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
                placeholder="Any warnings or special notes..."
                value={form.special_instructions} onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {createMutation.isPending ? 'Saving...' : 'Create Feed Order'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders by Feed Time */}
      {FEED_TIMES.map(time => {
        const timeOrders = grouped[time];
        if (timeOrders.length === 0) return null;
        return (
          <div key={time} className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-bebas text-base text-foreground uppercase tracking-wide">{time} Feed</h3>
              <span className="text-xs text-muted-foreground">({timeOrders.length} pens)</span>
            </div>
            {timeOrders.map(order => (
              <FeedOrderCard
                key={order.id}
                order={order}
                canUpdate={isAdmin || isFeedMill || isTruckDriver}
                onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status, delivered_by: user.email } })}
              />
            ))}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
          No feed orders for {filterDate}. {isAdmin ? 'Create one above.' : 'Check back later.'}
        </div>
      )}
    </div>
  );
}