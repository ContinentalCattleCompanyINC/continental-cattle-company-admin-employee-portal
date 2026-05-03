import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, User, Mail, Building, Phone } from 'lucide-react';

const ROLE_LABELS = {
  buyer: 'Buyer',
  seller: 'Seller',
  hauler: 'Hauler / Trucking',
  attorney_cpa: 'Attorney / CPA',
  pending: 'Pending',
  manager: 'Manager',
  accountant: 'Accountant',
  office_manager: 'Office Manager',
};

const ROLE_COLORS = {
  buyer: 'bg-primary/20 text-primary border-primary/30',
  seller: 'bg-success/20 text-success border-success/30',
  hauler: 'bg-warning/20 text-warning border-warning/30',
  attorney_cpa: 'bg-accent/20 text-accent border-accent/30',
  pending: 'bg-muted text-muted-foreground border-border',
};

export default function UserApprovalPanel() {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState(null);
  const [selectedRole, setSelectedRole] = useState({});

  const { data: pendingUsers } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: () => base44.entities.User.filter({ role: 'pending' }),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: allExternalUsers } = useQuery({
    queryKey: ['externalUsers'],
    queryFn: async () => {
      const buyers = await base44.entities.User.filter({ role: 'buyer' });
      const sellers = await base44.entities.User.filter({ role: 'seller' });
      const haulers = await base44.entities.User.filter({ role: 'hauler' });
      const attorneys = await base44.entities.User.filter({ role: 'attorney_cpa' });
      return [...buyers, ...sellers, ...haulers, ...attorneys];
    },
    initialData: [],
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, role, action }) => {
      const me = await base44.auth.me();
      if (action === 'approve') {
        await base44.entities.User.update(userId, {
          role,
          approval_status: 'approved',
          approved_by: me.email,
          approved_date: new Date().toISOString(),
        });
      } else {
        await base44.entities.User.update(userId, {
          approval_status: 'denied',
          approved_by: me.email,
          approved_date: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['externalUsers'] });
      setApprovingId(null);
    },
  });

  const handleApprove = (user) => {
    const role = selectedRole[user.id] || user.requested_role || 'buyer';
    approveMutation.mutate({ userId: user.id, role, action: 'approve' });
  };

  const handleDeny = (user) => {
    approveMutation.mutate({ userId: user.id, role: user.role, action: 'deny' });
  };

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-bebas text-xl">PENDING APPROVALS</h3>
          {pendingUsers.length > 0 && (
            <span className="bg-warning/20 text-warning border border-warning/30 text-xs px-2 py-0.5 rounded-full font-medium">
              {pendingUsers.length} waiting
            </span>
          )}
        </div>

        {pendingUsers.length === 0 ? (
          <div className="text-muted-foreground text-sm p-4 bg-card border border-border rounded-lg">
            No pending approvals
          </div>
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" /> {u.email}
                    </div>
                    {u.company_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="w-3 h-3" /> {u.company_name}
                      </div>
                    )}
                    {u.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" /> {u.phone}
                      </div>
                    )}
                    {u.requested_role && (
                      <div className="text-xs text-primary">Requested: {ROLE_LABELS[u.requested_role] || u.requested_role}</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[180px]">
                    {/* Role selector for approval */}
                    <select
                      value={selectedRole[u.id] || u.requested_role || 'buyer'}
                      onChange={(e) => setSelectedRole(prev => ({ ...prev, [u.id]: e.target.value }))}
                      className="px-2 py-1.5 border border-border rounded bg-card text-sm"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="hauler">Hauler</option>
                      <option value="attorney_cpa">Attorney / CPA</option>
                      <option value="manager">Manager</option>
                      <option value="office_manager">Office Manager</option>
                      <option value="accountant">Accountant</option>
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(u)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-success hover:bg-success/90 text-white gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeny(u)}
                        disabled={approveMutation.isPending}
                        className="flex-1 gap-1"
                      >
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

      {/* Approved External Users */}
      {allExternalUsers.length > 0 && (
        <div>
          <h3 className="font-bebas text-xl mb-3">ACTIVE EXTERNAL USERS</h3>
          <div className="space-y-2">
            {allExternalUsers.map((u) => (
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
                  <Badge className={`text-xs ${ROLE_COLORS[u.role] || 'bg-muted text-muted-foreground'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}