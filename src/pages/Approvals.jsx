import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { CheckCircle, XCircle, Clock, User, ShoppingCart, Truck, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending:   'bg-warning/15 text-warning border-warning/20',
  approved:  'bg-success/15 text-success border-success/20',
  denied:    'bg-danger/15 text-danger border-danger/20',
  completed: 'bg-primary/15 text-primary border-primary/20',
};

const ORDER_TYPE_ICONS = { buy: ShoppingCart, sell: ShoppingCart, haul: Truck };

function AccountRow({ acct, onAction }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium text-foreground">{acct.full_name}</div>
            <div className="text-xs text-muted-foreground">{acct.email} · {acct.account_type?.replace('_', '/')} · {acct.state || '—'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${STATUS_STYLES[acct.status]}`}>{acct.status}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-secondary/20 border-t border-border space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Phone: </span><span className="text-foreground">{acct.phone || '—'}</span></div>
            <div><span className="text-muted-foreground">Business: </span><span className="text-foreground">{acct.business_name || '—'}</span></div>
            <div><span className="text-muted-foreground">Submitted: </span><span className="text-foreground">{acct.created_date ? format(new Date(acct.created_date), 'MMM d, yyyy') : '—'}</span></div>
            {acct.reviewed_by && <div><span className="text-muted-foreground">Reviewed by: </span><span className="text-foreground">{acct.reviewed_by}</span></div>}
          </div>
          {acct.notes && <p className="text-xs text-muted-foreground italic">"{acct.notes}"</p>}
          {acct.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => onAction(acct.id, 'approved')}
                className="flex items-center gap-1.5 px-4 py-2 bg-success/15 hover:bg-success/25 text-success border border-success/20 rounded text-sm font-medium transition-colors">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => onAction(acct.id, 'denied')}
                className="flex items-center gap-1.5 px-4 py-2 bg-danger/15 hover:bg-danger/25 text-danger border border-danger/20 rounded text-sm font-medium transition-colors">
                <XCircle className="w-4 h-4" /> Deny
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order, onAction }) {
  const [open, setOpen] = useState(false);
  const Icon = ORDER_TYPE_ICONS[order.order_type] || ShoppingCart;
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-sm font-medium text-foreground">
              <span className={`uppercase font-bebas mr-2 ${order.order_type === 'haul' ? 'text-primary' : order.order_type === 'buy' ? 'text-success' : 'text-warning'}`}>{order.order_type}</span>
              {order.customer_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {order.head_count ? `${order.head_count} hd` : ''} {order.cattle_class || ''} · {order.location || '—'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${STATUS_STYLES[order.status]}`}>{order.status}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-secondary/20 border-t border-border space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Email: </span><span className="text-foreground">{order.customer_email}</span></div>
            <div><span className="text-muted-foreground">Phone: </span><span className="text-foreground">{order.customer_phone || '—'}</span></div>
            <div><span className="text-muted-foreground">Business: </span><span className="text-foreground">{order.business_name || '—'}</span></div>
            <div><span className="text-muted-foreground">Weight Range: </span><span className="text-foreground">{order.weight_range || '—'}</span></div>
            <div><span className="text-muted-foreground">Destination: </span><span className="text-foreground">{order.destination || '—'}</span></div>
            <div><span className="text-muted-foreground">Requested Date: </span><span className="text-foreground">{order.requested_date || '—'}</span></div>
            <div><span className="text-muted-foreground">Price Expectation: </span><span className="text-foreground">{order.price_expectation || '—'}</span></div>
            <div><span className="text-muted-foreground">Submitted: </span><span className="text-foreground">{order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy') : '—'}</span></div>
          </div>
          {order.details && <p className="text-xs text-muted-foreground italic">"{order.details}"</p>}
          {order.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => onAction(order.id, 'approved')}
                className="flex items-center gap-1.5 px-4 py-2 bg-success/15 hover:bg-success/25 text-success border border-success/20 rounded text-sm font-medium transition-colors">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => onAction(order.id, 'denied')}
                className="flex items-center gap-1.5 px-4 py-2 bg-danger/15 hover:bg-danger/25 text-danger border border-danger/20 rounded text-sm font-medium transition-colors">
                <XCircle className="w-4 h-4" /> Deny
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Approvals() {
  const [tab, setTab] = useState('accounts');
  const [filter, setFilter] = useState('pending');
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['customerAccounts'],
    queryFn: () => base44.entities.CustomerAccount.list('-created_date', 100),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['publicOrders'],
    queryFn: () => base44.entities.PublicOrder.list('-created_date', 100),
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, status }) => base44.entities.CustomerAccount.update(id, { status, reviewed_date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customerAccounts'] }),
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PublicOrder.update(id, { status, reviewed_date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['publicOrders'] }),
  });

  const filteredAccounts = accounts.filter(a => filter === 'all' || a.status === filter);
  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  const pendingAccounts = accounts.filter(a => a.status === 'pending').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="APPROVALS DASHBOARD"
        subtitle="Manage customer account requests and incoming buy/sell/haul orders"
        badge="Admin Only"
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Accounts', value: pendingAccounts, color: 'warning' },
          { label: 'Pending Orders', value: pendingOrders, color: 'warning' },
          { label: 'Approved Accounts', value: accounts.filter(a => a.status === 'approved').length, color: 'success' },
          { label: 'Approved Orders', value: orders.filter(o => o.status === 'approved').length, color: 'success' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <div className={`font-bebas text-3xl ${k.color === 'warning' ? 'text-warning' : 'text-success'}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { key: 'accounts', label: `Accounts ${pendingAccounts > 0 ? `(${pendingAccounts} pending)` : ''}` },
            { key: 'orders', label: `Orders ${pendingOrders > 0 ? `(${pendingOrders} pending)` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['pending', 'approved', 'denied', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-secondary text-foreground border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {tab === 'accounts' && (
          filteredAccounts.length === 0
            ? <div className="text-center py-12 text-muted-foreground">No {filter} accounts</div>
            : filteredAccounts.map(a => (
              <AccountRow key={a.id} acct={a} onAction={(id, status) => updateAccount.mutate({ id, status })} />
            ))
        )}
        {tab === 'orders' && (
          filteredOrders.length === 0
            ? <div className="text-center py-12 text-muted-foreground">No {filter} orders</div>
            : filteredOrders.map(o => (
              <OrderRow key={o.id} order={o} onAction={(id, status) => updateOrder.mutate({ id, status })} />
            ))
        )}
      </div>
    </div>
  );
}