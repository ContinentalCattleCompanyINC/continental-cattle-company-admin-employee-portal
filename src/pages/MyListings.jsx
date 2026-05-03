import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Beef, DollarSign, TrendingUp } from 'lucide-react';

const statusColors = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  approved: 'bg-success/20 text-success border-success/30',
  denied: 'bg-danger/20 text-danger border-danger/30',
  completed: 'bg-primary/20 text-primary border-primary/30',
};

export default function MyListings() {
  const { data: myUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myListings } = useQuery({
    queryKey: ['mySellerListings'],
    queryFn: async () => {
      if (!myUser) return [];
      return base44.entities.PublicOrder.filter({ customer_email: myUser.email, order_type: 'sell' });
    },
    initialData: [],
    enabled: !!myUser,
    refetchInterval: 5000,
  });

  // Settlements where I'm the seller
  const { data: mySettlements } = useQuery({
    queryKey: ['mySellerSettlements'],
    queryFn: async () => {
      if (!myUser) return [];
      return base44.entities.BidSettlement.filter({ seller_id: myUser.email });
    },
    initialData: [],
    enabled: !!myUser,
    refetchInterval: 5000,
  });

  const totalSold = mySettlements.reduce((a, s) => a + (s.seller_receives || 0), 0);
  const pendingPayment = mySettlements.filter(s => s.payment_status !== 'dispersed').reduce((a, s) => a + (s.seller_receives || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="My Listings & Sales"
        subtitle="Track your listed cattle and settlement payments"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Active Listings</div>
          <div className="font-bebas text-3xl text-primary">
            {myListings.filter(l => ['pending', 'approved'].includes(l.status)).length}
          </div>
        </Card>
        <Card className="p-4 bg-success/5 border-success/30">
          <div className="text-xs text-muted-foreground mb-1">Total Received</div>
          <div className="font-bebas text-3xl text-success">${totalSold.toLocaleString()}</div>
        </Card>
        <Card className="p-4 bg-warning/5 border-warning/30">
          <div className="text-xs text-muted-foreground mb-1">Pending Payment</div>
          <div className="font-bebas text-3xl text-warning">${pendingPayment.toLocaleString()}</div>
        </Card>
      </div>

      {/* My Listings */}
      <div>
        <h2 className="font-bebas text-xl mb-3">MY LISTINGS</h2>
        <div className="space-y-3">
          {myListings.length === 0 ? (
            <div className="text-muted-foreground text-sm p-4">No listings yet</div>
          ) : myListings.map((listing) => (
            <Card key={listing.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Beef className="w-4 h-4 text-primary" />
                    <span className="font-medium">{listing.cattle_class}</span>
                    <Badge className={statusColors[listing.status]}>{listing.status.toUpperCase()}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{listing.head_count} head • {listing.weight_range}</div>
                  <div className="text-sm text-muted-foreground">{listing.location}</div>
                  {listing.internal_notes && (
                    <div className="text-xs text-primary bg-primary/10 rounded px-2 py-1 mt-2">
                      Admin Note: {listing.internal_notes}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Ask</div>
                  <div className="font-bebas text-xl text-foreground">{listing.price_expectation || 'Open'}</div>
                  <div className="text-xs text-muted-foreground">{listing.requested_date}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Settlement history */}
      {mySettlements.length > 0 && (
        <div>
          <h2 className="font-bebas text-xl mb-3">SALE SETTLEMENTS</h2>
          <div className="space-y-3">
            {mySettlements.map((s) => (
              <Card key={s.id} className={`p-4 ${s.payment_status === 'dispersed' ? 'border-success/30' : 'border-warning/30'}`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">Settlement #{s.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.total_weight?.toLocaleString()} lbs @ ${s.price_per_unit}/cwt
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Commission: -${(s.commission_amount || 0).toFixed(2)} • Freight: -${(s.freight_cost || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">You Receive</div>
                    <div className="font-bebas text-xl text-success">${(s.seller_receives || 0).toLocaleString()}</div>
                    <Badge className={s.payment_status === 'dispersed' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                      {s.payment_status === 'dispersed' ? 'PAID' : 'PENDING'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}