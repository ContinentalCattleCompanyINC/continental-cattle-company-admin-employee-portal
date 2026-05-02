import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { AlertCircle, Activity, Pill } from 'lucide-react';

export default function FeedAndHealth() {
  const { data: feedProtocols } = useQuery({
    queryKey: ['feedProtocols'],
    queryFn: () => base44.entities.FeedProtocol.list('-cost_per_ton'),
    initialData: [],
  });

  const { data: healthProtocols } = useQuery({
    queryKey: ['healthProtocols'],
    queryFn: () => base44.entities.HealthProtocol.list('protocol_name'),
    initialData: [],
  });

  const feedCost = feedProtocols.reduce((sum, f) => sum + ((f.cost_per_ton || 0) * (f.daily_intake_head || 0)), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <SectionHeader 
        title="FEED & HEALTH MANAGEMENT"
        subtitle="Protocols, commodities, and livestock health schedule"
      />

      {/* Feed Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feed Protocols */}
        <div>
          <h3 className="font-bebas text-lg text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Feed Commodities
          </h3>
          
          <div className="space-y-2">
            {feedProtocols.map((feed) => (
              <div key={feed.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-foreground">{feed.commodity_name}</div>
                    <div className="text-xs text-muted-foreground">{feed.source}</div>
                  </div>
                  <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                    ${feed.unit_price}/{feed.unit_type}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-border/50">
                  <div>
                    <div className="text-muted-foreground">TDN</div>
                    <div className="text-foreground font-medium">{feed.tdn_percent}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">CP</div>
                    <div className="text-foreground font-medium">{feed.cp_percent}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">DMI/hd/day</div>
                    <div className="text-foreground font-medium">{feed.daily_intake_head} lbs</div>
                  </div>
                </div>

                {feed.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{feed.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Health Protocols */}
        <div>
          <h3 className="font-bebas text-lg text-foreground mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5" /> Health Schedule
          </h3>
          
          <div className="space-y-2">
            {healthProtocols.map((protocol) => (
              <div key={protocol.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-foreground">{protocol.action}</div>
                    <div className="text-xs text-muted-foreground">{protocol.cattle_class}</div>
                  </div>
                  <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded">
                    {protocol.timing}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/50">
                  <div>
                    <div className="text-muted-foreground">Product</div>
                    <div className="text-foreground font-medium">{protocol.product}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cost/Head</div>
                    <div className="text-foreground font-medium">${protocol.cost_per_head || '—'}</div>
                  </div>
                </div>

                <div className="text-xs mt-2 pt-2 border-t border-border/50">
                  <div className="text-muted-foreground mb-0.5">BQA Standard</div>
                  <div className="text-foreground">{protocol.bqa_standard}</div>
                </div>

                {protocol.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{protocol.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}