import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, User, Mail, Building, Phone, Edit2 } from 'lucide-react';
import { ROLE_CONFIG, ROLE_CATEGORIES } from '@/lib/roleConfig';
import { toast } from 'sonner';

const ROLE_LABELS = Object.fromEntries(Object.entries(ROLE_CONFIG).map(([k, v]) => [k, v.label]));

export default function UserApprovalPanel() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  const { data: pendingUsers = [] } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: () => base44.entities.User.filter({ role: 'pending' }),
    refetchInterval: 5000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allNonAdminUsers'],
    queryFn: () => base44.entities.User.list('full_name', 500),
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, role, action }) => {
      const me = await base44.auth.me();
      if (action === 'approve') {
        await base44.entities.User.update(userId, { role, approval_status: 'approved', approved_by: me.email, approved_date: new Date().toISOString() });
      } else {
        await base44.entities.User.update(userId, { role: 'user', approval_status: 'denied', approved_by: me.email, approved_date: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allNonAdminUsers'] });
      toast.success('User updated');
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allNonAdminUsers'] });
      setEditingUser(null);
      toast.success('Role updated');
    },
  });

  const handleApprove = (u) => {
    const role = selectedRole[u.id] || u.requested_role || 'user';
    approveMutation.mutate({ userId: u.id, role, action: 'approve' });
  };

  const nonAdminUsers = allUsers.filter(u => !['super_admin'].includes(u.role));
  const byCategory = Object.entries(ROLE_CATEGORIES).reduce((acc, [cat, roles]) => {
    const users = nonAdminUsers.filter(u => roles.includes(u.role));
    if (users.length > 0) acc[cat] = users;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-bebas text-xl">PENDING APPROVALS</h3>
          {pendingUsers.length > 0 && (
            <span className="bg-warning/20 text-warning border border-warning/30 text-xs px-2 py-0.5 rounded-full font-medium">{pendingUsers.length} waiting</span>
          )}
        </div>
        {pendingUsers.length === 0 ? (
          <div className="text-muted-foreground text-sm p-4 bg-card border border-border rounded-lg">No pending approvals</div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <Card key={u.id} className="p-4 border-warning/30 bg-warning/5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{u.full_name}</span>
                      <Badge className="text-xs bg-warning/20 text-warning border-warning/30">PENDING</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3 h-3" />{u.email}</div>
                    {u.company_name && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building className="w-3 h-3" />{u.company_name}</div>}
                    {u.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3 h-3" />{u.phone}</div>}
                    {u.requested_role && <div className="text-xs text-primary">Requested: {ROLE_LABELS[u.requested_role] || u.requested_role}</div>}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <select
                      value={selectedRole[u.id] || u.requested_role || 'user'}
                      onChange={(e) => setSelectedRole(prev => ({ ...prev, [u.id]: e.target.value }))}
                      className="px-2 py-1.5 border border-border rounded bg-card text-sm"
                    >
                      {Object.entries(ROLE_CATEGORIES).map(([cat, roles]) => (
                        <optgroup key={cat} label={cat}>
                          {roles.filter(r => r !== 'pending').map(r => (
                            <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(u)} disabled={approveMutation.isPending}
                        className="flex-1 bg-success hover:bg-success/90 text-white gap-1">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => approveMutation.mutate({ userId: u.id, role: u.role, action: 'deny' })}
                        disabled={approveMutation.isPending} className="flex-1 gap-1">
                        <XCircle className="w-3 h-3" /> Deny
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Users by Category */}
      {Object.entries(byCategory).map(([cat, users]) => (
        <div key={cat}>
          <h3 className="font-bebas text-lg mb-2 text-muted-foreground">{cat.toUpperCase()} ({users.length})</h3>
          <div className="space-y-2">
            {users.map(u => (
              <Card key={u.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {u.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{u.full_name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingUser === u.id ? (
                      <>
                        <select value={newRole || u.role} onChange={e => setNewRole(e.target.value)}
                          className="px-2 py-1 border border-border rounded bg-card text-xs">
                          {Object.entries(ROLE_CATEGORIES).map(([cat, roles]) => (
                            <optgroup key={cat} label={cat}>
                              {roles.filter(r => r !== 'pending').map(r => (
                                <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <button onClick={() => changeRoleMutation.mutate({ userId: u.id, role: newRole || u.role })}
                          className="p-1 text-success hover:bg-success/10 rounded"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => setEditingUser(null)} className="p-1 text-danger hover:bg-danger/10 rounded"><XCircle className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <Badge className={`text-xs ${ROLE_CONFIG[u.role]?.color ? 'border border-current' : 'bg-muted text-muted-foreground'}`} style={{ color: 'inherit' }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                        <button onClick={() => { setEditingUser(u.id); setNewRole(u.role); }} className="p-1 text-muted-foreground hover:text-foreground rounded">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}