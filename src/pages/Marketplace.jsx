import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import LiveMarketplace from '@/components/LiveMarketplace';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('live-bids');

  // Fetch user bids
  const { data: myBids } = useQuery({
    queryKey: ['myBids'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Bid.filter({ bidder_id: user.email });
    },
    initialData: [],
    refetchInterval: 3000,
  });

  // Fetch settlements to show results
  const { data: settlements } = useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.BidSettlement.filter({ buyer_id: user.email });
    },
    initialData: [],
  });

  const activeBids = myBids?.filter(b => b.status === 'active') || [];
  const acceptedBids = myBids?.filter(b => b.status === 'accepted') || [];

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="Live Cattle Marketplace" 
        subtitle="Bid on available cattle lots in real-time"
        badge="LIVE"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Active Bids</div>
          <div className="font-bebas text-3xl text-primary">{activeBids.length}</div>
        </Card>
        <Card className="p-4 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Accepted Bids</div>
          <div className="font-bebas text-3xl text-success">{acceptedBids.length}</div>
        </Card>
        <Card className="p-4 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Settled Sales</div>
          <div className="font-bebas text-3xl text-accent">{settlements.length}</div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live-bids">Live Bids</TabsTrigger>
          <TabsTrigger value="my-bids">My Bids</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
        </TabsList>

        {/* Live Bidding */}
        <TabsContent value="live-bids" className="space-y-4">
          <LiveMarketplace />
        </TabsContent>

        {/* My Bids */}
        <TabsContent value="my-bids" className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {activeBids.length === 0 && acceptedBids.length === 0 ? (
              <div className="text-muted-foreground text-sm p-4">No active bids yet</div>
            ) : (
              <>
                {activeBids.map((bid) => (
                  <Card key={bid.id} className="p-4 border border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Lot {bid.cattle_lot_id}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ${bid.price_per_unit}/cwt • ${bid.bid_amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-warning mt-2">Status: ACTIVE</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Bid Time</div>
                        <div className="text-sm">{new Date(bid.bid_timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                ))}
                {acceptedBids.map((bid) => (
                  <Card key={bid.id} className="p-4 border border-success bg-success/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-success">✓ Lot {bid.cattle_lot_id}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          ${bid.price_per_unit}/cwt • ${bid.bid_amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-success mt-2">Status: ACCEPTED</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Accepted</div>
                        <div className="text-sm">{new Date(bid.accepted_timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </TabsContent>

        {/* Settlements */}
        <TabsContent value="settlements" className="space-y-4">
          {settlements.length === 0 ? (
            <div className="text-muted-foreground text-sm p-4">No settlements yet</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {settlements.map((settlement) => (
                <Card key={settlement.id} className="p-4 border border-border">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bebas text-lg">Settlement {settlement.id.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">Lot {settlement.cattle_lot_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Sale Price</div>
                        <div className="font-bebas text-2xl text-primary">${settlement.total_sale_price.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/50 rounded">
                      <div>
                        <div className="text-xs text-muted-foreground">Weight</div>
                        <div className="font-medium">{settlement.total_weight.toLocaleString()} lbs</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Price/Unit</div>
                        <div className="font-medium">${settlement.price_per_unit}/cwt</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Commission</div>
                        <div className="font-medium text-warning">-${settlement.commission_amount.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Freight</div>
                        <div className="font-medium text-warning">-${settlement.freight_cost.toFixed(0)}</div>
                      </div>
                    </div>

                    {/* ROI Details */}
                    {settlement.settlement_document && (() => {
                      const doc = JSON.parse(settlement.settlement_document);
                      return (
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Net Profit</span>
                            <span className={`font-bebas text-lg ${doc.net_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                              ${doc.net_profit.toFixed(0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">ROI</span>
                            <span className="font-bebas text-lg text-primary">{doc.roi.net_roi_percent}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}