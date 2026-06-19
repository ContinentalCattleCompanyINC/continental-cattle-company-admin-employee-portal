import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SectionHeader from '@/components/SectionHeader';
import { Wheat, Train, Truck, DollarSign, TrendingDown, MapPin, Phone, Mail, Plus, X, ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { getBestCommodityPrices, compareFreightOptions, calculateOptimalOrderQuantity, getRegionalBasis } from '@/lib/commoditySourcing';

const COMMODITIES = [
  'Corn', 'Soybean Meal', 'Distillers Grains', 'Alfalfa Hay',
  'Wheat', 'Sorghum', 'Barley', 'Cottonseed Meal', 'Mineral Premix'
];

const CONTRACT_TYPES = ['spot', 'forward', 'basis', 'hedge_to_arrive', 'pre_contract'];
const SUPPLIER_TYPES = ['elevator', 'rail_terminal', 'port', 'processor', 'farm_direct'];
const DELIVERY_LOCATIONS = ['Shattuck OK Elevator', 'CBG Rail Terminal', 'Enid OK', 'Woodward OK', 'Liberal KS', 'Dodge City KS'];

export default function CommoditySourcing() {
  const queryClient = useQueryClient();
  const [selectedCommodity, setSelectedCommodity] = useState('Corn');
  const [showForm, setShowForm] = useState(false);
  const [showOptimalCalculator, setShowOptimalCalculator] = useState(false);
  const [basisInfo, setBasisInfo] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    commodity_name: 'Corn',
    supplier_type: 'elevator',
    supplier_name: '',
    location: '',
    contract_type: 'forward',
    quantity_tons: '',
    price_per_ton: '',
    delivery_location: 'Shattuck OK Elevator',
    rail_access: false,
  });

  // Data queries
  const { data: contracts = [] } = useQuery({
    queryKey: ['commodityContracts'],
    queryFn: () => base44.entities.FeedCommodityContract.list('-created_date', 100),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['feedSuppliers'],
    queryFn: () => base44.entities.FeedSupplier.filter({ active: true }, 'supplier_name', 50),
  });

  // Get best prices for selected commodity
  const { data: pricing, isLoading: pricingLoading } = useQuery({
    queryKey: ['bestPrices', selectedCommodity],
    queryFn: () => getBestCommodityPrices(selectedCommodity, 110),
  });

  const handleSubmit = async () => {
    try {
      await base44.entities.FeedCommodityContract.create({
        ...formData,
        quantity_tons: Number(formData.quantity_tons),
        price_per_ton: Number(formData.price_per_ton),
        contract_status: 'pending',
        created_date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['commodityContracts'] });
      setShowForm(false);
      toast.success('Contract created successfully');
    } catch (error) {
      toast.error('Failed to create contract');
    }
  };

  const handleLoadBasis = async () => {
    const basis = await getRegionalBasis(selectedCommodity);
    setBasisInfo(basis);
    toast.success('Basis data loaded');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <SectionHeader
        title="BULK COMMODITY SOURCING"
        subtitle="Railroad, elevator, and port contracts for best feed prices and ROI"
        badge="CBG / Shattuck OK"
      />

      {/* Commodity Selector */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wheat className="w-5 h-5 text-primary" />
            <h3 className="font-bebas text-lg text-foreground">SELECT COMMODITY</h3>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {COMMODITIES.map(comm => (
            <button
              key={comm}
              onClick={() => setSelectedCommodity(comm)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                selectedCommodity === comm
                  ? 'bg-primary/15 text-primary border-primary/20'
                  : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/60'
              }`}
            >
              {comm}
            </button>
          ))}
        </div>

        {/* Regional Basis */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          <button
            onClick={handleLoadBasis}
            className="px-3 py-1.5 bg-secondary border border-border rounded text-xs text-foreground hover:bg-secondary/60"
          >
            Load Regional Basis
          </button>
          {basisInfo && (
            <span className="text-muted-foreground">
              {selectedCommodity}: {JSON.stringify(basisInfo)}
            </span>
          )}
        </div>
      </div>

      {/* Best Prices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Best Deal Card */}
        <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-success" />
              <span className="font-bebas text-lg text-success">BEST PRICE</span>
            </div>
            {pricing?.best_option && (
              <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded-full">
                {pricing.best_option.contract.supplier_name}
              </span>
            )}
          </div>

          {pricingLoading ? (
            <div className="text-sm text-muted-foreground">Loading best prices...</div>
          ) : pricing?.best_option ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price per Ton:</span>
                <span className="font-bebas text-2xl text-success">
                  ${pricing.best_option.landed_cost_per_ton.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Contract:</span>
                <span className="font-semibold text-foreground">
                  ${pricing.best_option.total_cost.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {pricing.best_option.contract.location}
                {pricing.best_option.rail_access && (
                  <span className="text-success flex items-center gap-1">
                    <Train className="w-3 h-3" /> Rail Access
                  </span>
                )}
              </div>
              <div className="pt-2 border-t border-success/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Quality Score:</span>
                  <span className="text-foreground">{pricing.best_option.quality_score}/100</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Value Score:</span>
                  <span className="text-foreground">{pricing.best_option.value_score}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active contracts for {selectedCommodity}</div>
          )}
        </div>

        {/* Price Range */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-bebas text-lg text-foreground">PRICE RANGE</span>
          </div>

          {pricing?.count > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lowest:</span>
                <span className="font-bebas text-xl text-success">${pricing.price_range.min.toFixed(2)}/ton</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Highest:</span>
                <span className="font-bebas text-xl text-danger">${pricing.price_range.max.toFixed(2)}/ton</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  {pricing.count} active contract{pricing.count !== 1 ? 's' : ''} for {selectedCommodity}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No pricing data available</div>
          )}
        </div>
      </div>

      {/* Active Contracts Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-bebas text-lg text-foreground">ACTIVE CONTRACTS</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Commodity</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Supplier</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Location</th>
                <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Type</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Quantity</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Price/Ton</th>
                <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Total</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">Rail</th>
                <th className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.filter(c => c.contract_status === 'active').map((contract) => (
                <tr key={contract.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium text-foreground">{contract.commodity_name}</td>
                  <td className="px-4 py-3 text-foreground">{contract.supplier_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contract.location}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded">
                      {contract.contract_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{contract.quantity_tons} tons</td>
                  <td className="px-4 py-3 text-right font-bebas text-primary">${contract.price_per_ton.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    ${(contract.price_per_ton * contract.quantity_tons).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {contract.rail_access ? (
                      <Train className="w-4 h-4 text-success inline" />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded">
                      {contract.contract_status}
                    </span>
                  </td>
                </tr>
              ))}
              {contracts.filter(c => c.contract_status === 'active').length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No active contracts. Create your first contract to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Contract Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bebas text-lg text-foreground">NEW COMMODITY CONTRACT</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-secondary rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Commodity</label>
                  <select
                    value={formData.commodity_name}
                    onChange={e => setFormData({ ...formData, commodity_name: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                  >
                    {COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Supplier Type</label>
                  <select
                    value={formData.supplier_type}
                    onChange={e => setFormData({ ...formData, supplier_type: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                  >
                    {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Supplier Name</label>
                  <input
                    value={formData.supplier_name}
                    onChange={e => setFormData({ ...formData, supplier_name: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                    placeholder="e.g., CBG Elevator, Shattuck Grain"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Location</label>
                  <input
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                    placeholder="e.g., Shattuck, OK"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Contract Type</label>
                  <select
                    value={formData.contract_type}
                    onChange={e => setFormData({ ...formData, contract_type: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                  >
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Delivery Location</label>
                  <select
                    value={formData.delivery_location}
                    onChange={e => setFormData({ ...formData, delivery_location: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                  >
                    {DELIVERY_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Quantity (tons)</label>
                  <input
                    type="number"
                    value={formData.quantity_tons}
                    onChange={e => setFormData({ ...formData, quantity_tons: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                    placeholder="110 (1 rail car)"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Price per Ton ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_per_ton}
                    onChange={e => setFormData({ ...formData, price_per_ton: e.target.value })}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
                    placeholder="e.g., 185.50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.rail_access}
                      onChange={e => setFormData({ ...formData, rail_access: e.target.checked })}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">Rail Access Available</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Create Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}