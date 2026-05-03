import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Calendar, DollarSign, FileText } from 'lucide-react';

export default function LoadBoard() {
  const [activeTab, setActiveTab] = useState('available');

  const { data: myUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Available loads (all approved haul orders)
  const { data: availableLoads } = useQuery({
    queryKey: ['availableLoads'],
    queryFn: () => base44.entities.PublicOrder.filter({ order_type: 'haul', status: 'approved' }),
    initialData: [],
    refetchInterval: 5000,
  });

  // My BOLs — haul orders assigned to me
  const { data: myLoads } = useQuery({
    queryKey: ['myLoads'],
    queryFn: async () => {
      if (!myUser) return [];
      return base44.entities.PublicOrder.filter({
        order_type: 'haul',
        reviewed_by: myUser.email,
        status: 'completed',
      });
    },
    initialData: [],
    enabled: !!myUser,
  });

  // My settlements (payments)
  const { data: mySettlements } = useQuery({
    queryKey: ['myHaulerSettlements'],
    queryFn: async () => {
      if (!myUser) return [];
      return base44.entities.BidSettlement.filter({ seller_id: myUser.email });
    },
    initialData: [],
    enabled: !!myUser,
  });

  const totalPaid = mySettlements.filter(s => s.payment_status === 'dispersed').reduce((a, s) => a + (s.freight_cost || 0), 0);
  const totalUnpaid = mySettlements.filter(s => s.payment_status !== 'dispersed').reduce((a, s) => a + (s.freight_cost || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Hauler Load Board"
        subtitle="Available loads and your BOL history"
        badge="LIVE"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Available Loads</div>
          <div className="font-bebas text-3xl text-primary">{availableLoads.length}</div>
        </Card>
        <Card className="p-4 bg-success/5 border-success/30">
          <div className="text-xs text-muted-foreground mb-1">Paid BOLs</div>
          <div className="font-bebas text-3xl text-success">${totalPaid.toLocaleString()}</div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/30">
          <div className="text-xs text-muted-foreground mb-1">Pending Payment</div>
          <div className="font-bebas text-3xl text-warning">${totalUnpaid.toLocaleString()}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {['available', 'my-bols'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'available' ? 'Available Loads' : 'My BOLs'}
          </button>
        ))}
      </div>

      {/* Available Loads */}
      {activeTab === 'available' && (
        <div className="space-y-3">
          {availableLoads.length === 0 ? (
            <div className="text-muted-foreground text-sm p-4">No available loads at this time</div>
          ) : availableLoads.map((load) => (
            <Card key={load.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="font-medium">{load.cattle_class || load.details}</span>
                    <Badge variant="outline" className="text-xs">{load.head_count} head</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {load.location} → {load.destination}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {load.requested_date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Rate</div>
                  <div className="font-bebas text-xl text-primary">{load.price_expectation || 'Negotiable'}</div>
                  <div className="text-xs text-muted-foreground mt-1">{load.weight_range}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* My BOLs */}
      {activeTab === 'my-bols' && (
        <div className="space-y-3">
          {mySettlements.length === 0 ? (
            <div className="text-muted-foreground text-sm p-4">No BOLs on record yet</div>
          ) : mySettlements.map((s) => (
            <Card key={s.id} className={`p-4 ${s.payment_status === 'dispersed' ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">BOL #{s.id.slice(0, 8)}</span>
                    <Badge className={s.payment_status === 'dispersed' ? 'bg-success/20 text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}>
                      {s.payment_status === 'dispersed' ? 'PAID' : 'PENDING'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">Lot: {s.cattle_lot_id}</div>
                  <div className="text-sm text-muted-foreground">{s.total_weight?.toLocaleString()} lbs</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Freight</div>
                  <div className="font-bebas text-xl text-foreground">${(s.freight_cost || 0).toLocaleString()}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}