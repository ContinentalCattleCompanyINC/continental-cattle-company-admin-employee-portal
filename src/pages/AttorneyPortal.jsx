import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, DollarSign, Scale, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AttorneyPortal() {
  const { data: entities } = useQuery({
    queryKey: ['operatingEntities'],
    queryFn: () => base44.entities.OperatingEntity.list(),
    initialData: [],
  });

  const { data: settlements } = useQuery({
    queryKey: ['allSettlements'],
    queryFn: () => base44.entities.BidSettlement.list('-settlement_timestamp', 50),
    initialData: [],
  });

  const { data: transactions } = useQuery({
    queryKey: ['allTransactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 50),
    initialData: [],
  });

  const totalRevenue = entities.reduce((a, e) => a + (e.annual_revenue || 0), 0);
  const totalExpenses = entities.reduce((a, e) => a + (e.annual_expenses || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Legal & Financial Portal"
        subtitle="Financial documents, entity data, and settlement reviews"
        badge="ATTORNEY ACCESS"
      />

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3" /> Annual Revenue
          </div>
          <div className="font-bebas text-3xl text-success">${totalRevenue.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="w-3 h-3" /> Annual Expenses
          </div>
          <div className="font-bebas text-3xl text-warning">${totalExpenses.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Scale className="w-3 h-3" /> Net Profit
          </div>
          <div className={`font-bebas text-3xl ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
            ${netProfit.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Operating Entities */}
      <div>
        <h2 className="font-bebas text-xl mb-3">OPERATING ENTITIES</h2>
        <div className="space-y-3">
          {entities.map((entity) => (
            <Card key={entity.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{entity.entity_name}</div>
                  <div className="text-sm text-muted-foreground">{entity.entity_type} • {entity.primary_function}</div>
                  <Badge className="mt-1 text-xs" variant="outline">{entity.status}</Badge>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-muted-foreground">Annual Revenue</div>
                  <div className="font-bebas text-lg text-success">${(entity.annual_revenue || 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Expenses: ${(entity.annual_expenses || 0).toLocaleString()}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Settlements */}
      <div>
        <h2 className="font-bebas text-xl mb-3">RECENT SETTLEMENTS</h2>
        <div className="space-y-2">
          {settlements.slice(0, 10).map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">#{s.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground ml-2">{s.buyer_id} → {s.seller_id}</span>
                </div>
                <div className="text-right">
                  <div className="font-bebas text-lg">${s.total_sale_price.toLocaleString()}</div>
                  <Badge className="text-xs" variant="outline">{s.payment_status}</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="font-bebas text-xl mb-3">TRANSACTIONS</h2>
        <div className="space-y-2">
          {transactions.slice(0, 10).map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium capitalize">{t.transaction_type}</span>
                  <span className="text-muted-foreground ml-2">{t.from_party_id} → {t.to_party_id}</span>
                </div>
                <div className="text-right">
                  <div className="font-bebas text-lg">${t.amount?.toLocaleString()}</div>
                  <Badge className="text-xs" variant="outline">{t.status}</Badge>
                </div>
              </div>
              {t.description && <div className="text-xs text-muted-foreground mt-1">{t.description}</div>}
            </Card>
          ))}
        </div>
      </div>

      {/* Link to Master Document */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">Master Document</div>
            <div className="text-sm text-muted-foreground">Legal contracts, SOP documents, compliance records</div>
          </div>
          <Link to="/document" className="text-primary text-sm hover:underline">View →</Link>
        </div>
      </Card>
    </div>
  );
}