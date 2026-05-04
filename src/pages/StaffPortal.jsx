import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SectionHeader from '@/components/SectionHeader';
import { ROLE_CONFIG, ROLE_CATEGORIES } from '@/lib/roleConfig';
import { Users, Plus, Edit2, Check, X, Phone, Mail, Truck, Shield, Search } from 'lucide-react';
import { toast } from 'sonner';

const ALL_ROLES = Object.keys(ROLE_CONFIG).filter(r => r !== 'pending');

const DEPT_COLORS = {
  Executive: 'text-primary border-primary/20 bg-primary/5',
  Financial: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
  Management: 'text-amber-400 border-amber-400/20 bg-amber-400/5',
  Trucking: 'text-orange-400 border-orange-400/20 bg-orange-400/5',
  'Ranch Ops': 'text-green-400 border-green-400/20 bg-green-400/5',
  Feedlot: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5',
  Maintenance: 'text-red-400 border-red-400/20 bg-red-400/5',
  External: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5',
};

const BLANK = {
  full_name: '', email: '', phone: '', role: 'cowboy', department: 'Ranch Ops',
  entity_assignment: [], job_title: '', start_date: '', employment_type: 'full_time',
  pay_type: 'hourly', pay_rate: '', emergency_contact: '', license_plate: '',
  truck_number: '', cdl_number: '', cdl_expiry: '', certifications: '', status: 'active', notes: '',
};

const ENTITIES = ['Continental', 'Rincon', 'Flying3BarB', 'GrandSlam', 'FullCount', 'BeesonBulls'];

function StaffCard({ staff, onEdit, canEdit }) {
  const cfg = ROLE_CONFIG[staff.role];
  const deptColor = DEPT_COLORS[staff.department] || 'text-muted-foreground border-border bg-card';
  return (
    <div className={`border rounded-xl p-4 ${deptColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{staff.full_name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${deptColor}`}>{cfg?.label || staff.role}</span>
            {staff.status !== 'active' && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-danger/20 bg-danger/10 text-danger capitalize">{staff.status}</span>
            )}
          </div>
          {staff.job_title && <div className="text-xs text-muted-foreground mt-0.5">{staff.job_title}</div>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            {staff.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{staff.email}</span>}
            {staff.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{staff.phone}</span>}
            {staff.truck_number && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />Truck #{staff.truck_number}</span>}
            {staff.cdl_number && <span className="flex items-center gap-1"><Shield className="w-3 h-3" />CDL {staff.cdl_number}</span>}
          </div>
          {staff.entity_assignment?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {staff.entity_assignment.map(e => (
                <span key={e} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{e}</span>
              ))}
            </div>
          )}
        </div>
        {canEdit && (
          <button onClick={() => onEdit(staff)} className="p-1.5 hover:bg-white/10 rounded transition-colors flex-shrink-0">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

function StaffForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const roleCfg = ROLE_CONFIG[form.role];

  const toggleEntity = (entity) => {
    const arr = form.entity_assignment || [];
    setForm(f => ({
      ...f,
      entity_assignment: arr.includes(entity) ? arr.filter(e => e !== entity) : [...arr, entity],
    }));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="font-bebas text-lg text-primary">{initial.id ? 'EDIT STAFF' : 'ADD STAFF MEMBER'}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
          <input required className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <input type="email" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Role *</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.role} onChange={e => {
              const cfg = ROLE_CONFIG[e.target.value];
              setForm(f => ({ ...f, role: e.target.value, department: cfg?.category || f.department }));
            }}>
            {Object.entries(ROLE_CATEGORIES).map(([cat, roles]) => (
              <optgroup key={cat} label={cat}>
                {roles.map(r => <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Job Title</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder={roleCfg?.label} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Employment Type</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contractor">Contractor</option>
            <option value="seasonal">Seasonal</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pay Type</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.pay_type} onChange={e => setForm(f => ({ ...f, pay_type: e.target.value }))}>
            <option value="salary">Salary</option>
            <option value="hourly">Hourly</option>
            <option value="per_load">Per Load</option>
            <option value="per_job">Per Job</option>
            <option value="commission">Commission</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pay Rate ($)</label>
          <input type="number" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.pay_rate} onChange={e => setForm(f => ({ ...f, pay_rate: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
          <input type="date" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Trucking specific */}
      {['truck_driver', 'truck_owner', 'dispatch', 'hauler'].includes(form.role) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
          <div className="md:col-span-4 text-xs text-orange-400 font-medium uppercase tracking-wide">Trucking Details</div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Truck Number</label>
            <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form.truck_number} onChange={e => setForm(f => ({ ...f, truck_number: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">License Plate</label>
            <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form.license_plate} onChange={e => setForm(f => ({ ...f, license_plate: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">CDL Number</label>
            <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form.cdl_number} onChange={e => setForm(f => ({ ...f, cdl_number: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">CDL Expiry</label>
            <input type="date" className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={form.cdl_expiry} onChange={e => setForm(f => ({ ...f, cdl_expiry: e.target.value }))} />
          </div>
        </div>
      )}

      {/* Entity assignment */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Entity Assignments</label>
        <div className="flex flex-wrap gap-2">
          {ENTITIES.map(e => (
            <button key={e} type="button"
              onClick={() => toggleEntity(e)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                (form.entity_assignment || []).includes(e)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Emergency Contact</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Certifications / Notes</label>
          <input className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground"
            value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onSave(form)} disabled={saving || !form.full_name}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 px-6 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
}

export default function StaffPortal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');

  const isAdmin = ['admin', 'super_admin', 'office_manager'].includes(user?.role);

  const { data: staff = [] } = useQuery({
    queryKey: ['staffDirectory'],
    queryFn: () => base44.entities.StaffDirectory.list('full_name', 500),
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffDirectory.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffDirectory'] }); toast.success('Staff member added'); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffDirectory.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staffDirectory'] }); toast.success('Staff updated'); setEditItem(null); },
  });

  const handleSave = (form) => {
    const payload = { ...form, pay_rate: form.pay_rate ? Number(form.pay_rate) : undefined };
    if (form.id) updateMutation.mutate({ id: form.id, data: payload });
    else createMutation.mutate(payload);
  };

  const filtered = staff.filter(s => {
    const matchSearch = !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) || s.role?.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'All' || s.department === filterDept;
    return matchSearch && matchDept;
  });

  const depts = ['All', ...Object.keys(ROLE_CATEGORIES)];
  const byDept = Object.keys(ROLE_CATEGORIES).reduce((acc, d) => {
    acc[d] = filtered.filter(s => s.department === d);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SectionHeader
          title="STAFF DIRECTORY"
          subtitle="All employees, contractors, and operators across every entity and LLC"
          badge={`${staff.length} people`}
        />
        {isAdmin && !showForm && !editItem && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: staff.filter(s => s.status === 'active').length, color: 'text-primary' },
          { label: 'Drivers / Haulers', value: staff.filter(s => ['truck_driver','truck_owner','hauler','dispatch'].includes(s.role)).length, color: 'text-orange-400' },
          { label: 'Ranch / Feedlot', value: staff.filter(s => ['cowboy','feed_mill','feed_truck','field_rep'].includes(s.role)).length, color: 'text-green-400' },
          { label: 'Maintenance', value: staff.filter(s => ['welder','maintenance'].includes(s.role)).length, color: 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`font-bebas text-3xl ${k.color}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <StaffForm initial={BLANK} onSave={handleSave} onCancel={() => setShowForm(false)}
          saving={createMutation.isPending} />
      )}
      {editItem && (
        <StaffForm initial={editItem} onSave={handleSave} onCancel={() => setEditItem(null)}
          saving={updateMutation.isPending} />
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search by name, email, role..." className="w-full bg-input border border-border rounded-md pl-9 pr-3 py-2 text-sm text-foreground"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {depts.map(d => (
            <button key={d} onClick={() => setFilterDept(d)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${filterDept === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Directory by Department */}
      {filterDept === 'All' ? (
        Object.entries(byDept).map(([dept, members]) => {
          if (members.length === 0) return null;
          return (
            <div key={dept} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-1 h-5 rounded-full ${DEPT_COLORS[dept]?.includes('primary') ? 'bg-primary' : DEPT_COLORS[dept]?.includes('amber') ? 'bg-amber-400' : DEPT_COLORS[dept]?.includes('orange') ? 'bg-orange-400' : DEPT_COLORS[dept]?.includes('green') ? 'bg-green-400' : DEPT_COLORS[dept]?.includes('yellow') ? 'bg-yellow-400' : DEPT_COLORS[dept]?.includes('red') ? 'bg-red-400' : DEPT_COLORS[dept]?.includes('blue') ? 'bg-blue-400' : 'bg-cyan-400'}`} />
                <h3 className={`font-bebas text-base ${DEPT_COLORS[dept]?.split(' ')[0]}`}>{dept}</h3>
                <span className="text-xs text-muted-foreground">({members.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {members.map(s => <StaffCard key={s.id} staff={s} onEdit={setEditItem} canEdit={isAdmin} />)}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map(s => <StaffCard key={s.id} staff={s} onEdit={setEditItem} canEdit={isAdmin} />)}
        </div>
      )}

      {staff.length === 0 && !showForm && (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="font-medium">No staff added yet</div>
          <div className="text-sm mt-1">Add your first employee, contractor, or operator</div>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Add First Staff Member</button>
          )}
        </div>
      )}
    </div>
  );
}