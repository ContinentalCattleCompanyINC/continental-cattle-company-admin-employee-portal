import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Beef, TrendingUp, Calendar, MapPin } from 'lucide-react';

export default function OperationalPrograms() {
  const { data: programs } = useQuery({
    queryKey: ['cattlePrograms'],
    queryFn: () => base44.entities.CattleProgram.list('-created_date'),
    initialData: [],
  });

  const activePrograms = programs.filter(p => p.status === 'active');
  const totalAnnualVolume = activePrograms.reduce((sum, p) => sum + (p.annual_volume || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <SectionHeader 
        title="OPERATIONAL PROGRAMS"
        subtitle="Active cattle programs and trading volumes"
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Active Programs</div>
          <div className="font-bebas text-3xl text-primary">{activePrograms.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Annual Volume</div>
          <div className="font-bebas text-3xl text-success">{totalAnnualVolume.toLocaleString()} hd</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs text-muted-foreground mb-1">Avg ROI Target</div>
          <div className="font-bebas text-3xl text-primary">18-25%</div>
        </div>
      </div>

      {/* Program Cards */}
      <div className="space-y-3">
        {programs.map((program) => (
          <div
            key={program.id}
            className={`border rounded-lg p-5 ${
              program.status === 'active'
                ? 'bg-card border-primary/20 hover:bg-primary/5'
                : 'bg-secondary/30 border-border opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Beef className="w-5 h-5 text-primary" />
                  <h3 className="font-bebas text-lg text-foreground">{program.title}</h3>
                  <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                    {program.program_name}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{program.cattle_class}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-0.5">Volume/Period</div>
                    <div className="font-semibold text-foreground">{program.volume_per_period || '—'} hd</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-0.5">Frequency</div>
                    <div className="font-semibold text-foreground">{program.frequency || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-0.5">Annual Total</div>
                    <div className="font-semibold text-foreground">{program.annual_volume?.toLocaleString() || '—'} hd</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-0.5">Target ROI</div>
                    <div className={`font-semibold ${program.expected_roi_percent >= 20 ? 'text-success' : 'text-warning'}`}>
                      {program.expected_roi_percent}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {program.source_location} → {program.destination_location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {program.buy_weight} → {program.target_weight} lbs
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-xs font-medium px-2 py-1 rounded ${
                  program.status === 'active' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  {program.status.toUpperCase()}
                </div>
              </div>
            </div>

            {program.notes && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border italic">
                {program.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}