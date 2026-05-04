import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { Wrench, Plus, Check, X, AlertTriangle, Clock, CheckCircle, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PRIORITY_STYLE = {
  urgent: 'bg-danger/20 text-danger border-danger/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  medium: 'bg-primary/15 text-primary border-primary/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const STATUS_STYLE = {
  open: 'bg-danger/10 text-danger border-danger/20',
  in_progress: 'bg-warning/10 text-warning border-warning/20',
  on_hold: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

const CATEGORIES = ['fence_repair','equipment','welding','plumbing','electrical','pen_maintenance','vehicle','building','other'];
const ENTITIES = ['Continental','Rincon','Flying3BarB','GrandSlam','FullCount','BeesonBulls'];

const BLANK = {
  entity: 'Continental', location: '', category: 'fence_repair', priority: 'medium',
  title: '', description: '', assigned_to: '', estimated_hours: '', parts_cost: '',
  status: 'open', notes: '',
};

function TicketCard({ ticket, onStatusChange, onEdit, canEdit }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden ${PRIORITY_STYLE[ticket.priority]}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">{ticket.title}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[ticket.priority]}`}>{ticket.priority}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_STYLE[ticket.status]}`}>{ticket.status.replace('_',' ')}</span>
            </div>
            <div className="text-xs text-muted-foreground flex gap-3 mt-0.5 flex-wrap">
              {ticket.entity && <span>{ticket.entity}</span>}
              {ticket.location && <span>📍 {ticket.location}</span>}
              {ticket.category && <span className="capitalize">{ticket.category.replace('_',' ')}</span>}
              {ticket.assigned_to && <span>→ {ticket.assigned_to}</span>}
              <span>{format(new Date(ticket.created_date), 'MMM d')}</span>
            </div>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
          {ticket.description && <p className="text-sm text-foreground">{ticket.description}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {ticket.estimated_hours && <div><span className="text-muted-foreground">Est. Hours: </span>{ticket.estimated_hours}</div>}
            {ticket.actual_hours && <div><span className="text-muted-foreground">Actual Hours: </span>{ticket.actual_hours}</div>}
            {ticket.parts_cost && <div><span className="text-muted-foreground">Parts: </span>${ticket.parts_cost}</div>}
            {ticket.labor_cost && <div><span className="text-muted-foreground">Labor: </span>${ticket.labor_cost}</div>}
          </div>
          {ticket.notes && <p className="text-xs text-muted-foreground italic">{ticket.notes}</p>}
          {canEdit && ticket.status !== 'completed' && (
            <div className="flex flex-wrap gap-2 pt-1">
              {ticket.status === 'open' && (
                <button onClick={() => onStatusChange(ticket.id, 'in_progress')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/15 hover:bg-warning/25 text-warning border border-warning/20 rounded text-xs font-medium">
                  <Clock className="w-3 h-3" /> Start Work
                </button>
              )}
              {ticket.status === 'in_progress' && (
                <>
                  <button onClick={() => onStatusChange(ticket.id, 'completed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-success/15 hover:bg-success/25 text-success border border-success/20 rounded text-xs font-medium">
                    <CheckCircle className="w-3 h-3" /> Mark Complete
                  </button>
                  <button onClick={() => onStatusChange(ticket.id, 'on_hold')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-secondary text-muted-foreground border border-border rounded text-xs font-medium">
                    <Pause className="w-3 h-3" /> Hold
                  </button>
                </>
              )}
              {ticket.status === 'on_hold' && (
                <button onClick={() => onStatusChange(ticket.id, 'in_progress')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/15 hover:bg-warning/25 text-warning border border-warning/20 rounded text-xs font-medium">
                  <Clock className="w-3 h-3" /> Resume
                </button>
              )}
              {canEdit && <button onClick={() => onEdit(ticket)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground border border-border rounded text-xs font-medium">Edit</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TicketForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bebas text-lg text-primary">{initial.id ? 'EDIT TICKET' : 'NEW MAINTENANCE TICKET'}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
          <input required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Entity</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value }))}>
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Category</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {['urgent','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Location</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Pen 4, Shop, etc." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Assigned To</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Est. Hours</label>
          <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Parts Cost ($)</label>
          <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.parts_cost} onChange={e => setForm(f => ({ ...f, parts_cost: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Description</label>
        <textarea rows={3} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} disabled={saving || !form.title}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Ticket'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-2 px-6 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function Maintenance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');

  const canEdit = ['admin','super_admin','manager','office_manager','welder','maintenance'].includes(user?.role);

  const { data: tickets = [] } = useQuery({
    queryKey: ['maintenanceTickets'],
    queryFn: () => base44.entities.MaintenanceTicket.list('-created_date', 200),
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceTicket.create({ ...data, reported_by: user.email }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenanceTickets'] }); toast.success('Ticket created'); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTicket.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenanceTickets'] }); toast.success('Ticket updated'); setEditItem(null); },
  });

  const handleSave = (form) => {
    const payload = { ...form, estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined, parts_cost: form.parts_cost ? Number(form.parts_cost) : undefined };
    if (form.id) updateMutation.mutate({ id: form.id, data: payload });
    else createMutation.mutate(payload);
  };

  const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);
  const urgent = tickets.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeader
          title="MAINTENANCE & WORK ORDERS"
          subtitle="Fence repairs, welding, equipment, vehicles, and facilities across all entities"
          badge={urgent > 0 ? `${urgent} URGENT` : undefined}
        />
        {canEdit && !showForm && !editItem && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: tickets.filter(t => t.status === 'open').length, color: 'text-danger' },
          { label: 'In Progress', value: tickets.filter(t => t.status === 'in_progress').length, color: 'text-warning' },
          { label: 'On Hold', value: tickets.filter(t => t.status === 'on_hold').length, color: 'text-muted-foreground' },
          { label: 'Completed', value: tickets.filter(t => t.status === 'completed').length, color: 'text-success' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`font-bebas text-3xl ${k.color}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      {showForm && <TicketForm initial={BLANK} onSave={handleSave} onCancel={() => setShowForm(false)} saving={createMutation.isPending} />}
      {editItem && <TicketForm initial={editItem} onSave={handleSave} onCancel={() => setEditItem(null)} saving={updateMutation.isPending} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['open','in_progress','on_hold','completed','all'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
            {s.replace('_',' ')} {s !== 'all' ? `(${tickets.filter(t => t.status === s).length})` : ''}
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No {filterStatus} tickets
          </div>
        ) : (
          filtered.map(t => (
            <TicketCard key={t.id} ticket={t}
              onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status, ...(status === 'completed' ? { completed_date: new Date().toISOString().split('T')[0] } : {}) } })}
              onEdit={setEditItem} canEdit={canEdit} />
          ))
        )}
      </div>
    </div>
  );
}