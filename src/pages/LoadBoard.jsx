import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Calendar, DollarSign, FileText, Map, Cloud, CloudRain, Wind, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function LoadBoard() {
  const [activeTab, setActiveTab] = useState('available');
  const [showMap, setShowMap] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

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

      {/* Tabs + Map Toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-border">
        <div className="flex gap-2">
          {['available', 'my-bols', 'map'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'map' && <Map className="w-4 h-4" />}
              {tab === 'available' ? 'Available Loads' : tab === 'my-bols' ? 'My BOLs' : 'Live Map'}
            </button>
          ))}
        </div>
        {activeTab !== 'map' && (
          <button
            onClick={() => { setActiveTab('map'); setShowMap(true); }}
            className="flex items-center gap-2 px-3 py-2 text-xs bg-primary/10 border border-primary/20 rounded-lg text-primary hover:bg-primary/20 transition-colors"
          >
            <Map className="w-3 h-3" />
            Open Map View
          </button>
        )}
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

      {/* Live Map View */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          {/* Map + Weather Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Interactive Map Placeholder */}
            <Card className="lg:col-span-2 p-0 overflow-hidden min-h-[500px] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Map className="w-16 h-16 text-primary/40 mx-auto" />
                  <div className="text-muted-foreground text-sm">Interactive Route Map</div>
                  <div className="text-xs text-muted-foreground max-w-md">
                    Real-time visualization of active routes with weather overlays and transit status
                  </div>
                </div>
              </div>
              
              {/* Route Overlays */}
              <div className="absolute top-4 left-4 space-y-2">
                {availableLoads.slice(0, 5).map((load, idx) => (
                  <div
                    key={load.id}
                    className="flex items-center gap-2 bg-white/90 dark:bg-card/90 backdrop-blur px-3 py-2 rounded-lg border border-border shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                    style={{ transform: `translateY(${idx * 60}px)` }}
                    onClick={() => setSelectedRoute(load)}
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      idx % 3 === 0 ? 'bg-success animate-pulse' : idx % 3 === 1 ? 'bg-warning' : 'bg-primary'
                    }`} />
                    <div className="text-xs">
                      <div className="font-medium text-foreground">{load.cattle_class || 'Load'} #{idx + 1}</div>
                      <div className="text-muted-foreground">{load.location?.slice(0, 20)}...</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Weather Overlay Legend */}
              <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-card/90 backdrop-blur px-4 py-3 rounded-lg border border-border shadow-sm">
                <div className="text-xs font-medium text-foreground mb-2">Weather Impact</div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-muted-foreground">Clear</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-muted-foreground">Moderate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-danger" />
                    <span className="text-muted-foreground">Severe</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Real-Time Status Panel */}
            <Card className="p-4 space-y-4">
              <h3 className="font-bebas text-lg text-foreground flex items-center gap-2">
                <Cloud className="w-5 h-5 text-primary" />
                LIVE CONDITIONS
              </h3>

              {/* Weather Summary */}
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Route Weather</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shattuck, OK</span>
                      <span className="text-foreground font-medium">72°F Clear</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Enid, OK</span>
                      <span className="text-foreground font-medium">68°F Partly Cloudy</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Liberal, KS</span>
                      <span className="text-foreground font-medium">65°F Windy</span>
                    </div>
                  </div>
                </div>

                {/* Transit Status */}
                <div className="p-3 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">Active Shipments</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-success" />
                        <span className="text-muted-foreground">On Time</span>
                      </div>
                      <span className="text-foreground font-medium">3 loads</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-warning" />
                        <span className="text-muted-foreground">Delayed</span>
                      </div>
                      <span className="text-foreground font-medium">1 load</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-danger" />
                        <span className="text-muted-foreground">Weather Impact</span>
                      </div>
                      <span className="text-foreground font-medium">0 loads</span>
                    </div>
                  </div>
                </div>

                {/* Wind Conditions */}
                <div className="p-3 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">Wind Advisory</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Liberal, KS area: 25-35 mph gusts. Monitor high-profile loads.
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center p-2 bg-success/5 rounded-lg">
                    <div className="text-muted-foreground">Avg Transit</div>
                    <div className="font-bebas text-lg text-success">8.5 hrs</div>
                  </div>
                  <div className="text-center p-2 bg-primary/5 rounded-lg">
                    <div className="text-muted-foreground">Active Routes</div>
                    <div className="font-bebas text-lg text-primary">{availableLoads.length}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Selected Route Details */}
          {selectedRoute && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bebas text-lg text-foreground">Route Details</h3>
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Route</div>
                  <div className="text-sm font-medium text-foreground">{selectedRoute.location} → {selectedRoute.destination}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Commodity</div>
                  <div className="text-sm text-foreground">{selectedRoute.cattle_class || selectedRoute.details}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Volume</div>
                  <div className="text-sm text-foreground">{selectedRoute.head_count} head</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <Badge variant="outline" className="text-xs">Available</Badge>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}