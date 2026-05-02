import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp } from 'lucide-react';

export default function LiveMarketplace() {
  const [selectedLot, setSelectedLot] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [bidding, setBidding] = useState(false);

  // Fetch available lots
  const { data: activeLots } = useQuery({
    queryKey: ['activeLots'],
    queryFn: () => base44.entities.CattleLot.filter({ status: 'active' }),
    refetchInterval: 2000,
  });

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ['myBankAccounts'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.BankAccount.filter({ account_holder_id: user.email });
    },
    initialData: [],
  });

  // Fetch active bids for selected lot
  const { data: activeBids } = useQuery({
    queryKey: ['activeBids', selectedLot?.id],
    queryFn: () => selectedLot ? base44.entities.Bid.filter({ cattle_lot_id: selectedLot.id, status: 'active' }) : Promise.resolve([]),
    refetchInterval: 1000,
  });

  const placeBidMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createBid', {
        cattle_lot_id: selectedLot.id,
        bid_amount: parseFloat(bidAmount),
        price_per_unit: parseFloat(pricePerUnit),
        unit_type: 'cwt',
        bank_account_id: selectedBank,
      });
      return response.data;
    },
    onSuccess: () => {
      setBidAmount('');
      setPricePerUnit('');
      alert('Bid placed successfully!');
    },
    onError: (error) => {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleBid = async () => {
    if (!selectedLot || !bidAmount || !pricePerUnit || !selectedBank) {
      alert('Please fill all fields and select a bank account');
      return;
    }

    const verifiedBank = bankAccounts.find(b => b.id === selectedBank);
    if (!verifiedBank?.funds_verified) {
      alert('Selected bank account funds not verified');
      return;
    }

    setBidding(true);
    await placeBidMutation.mutateAsync();
    setBidding(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Lots */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-bebas text-2xl">AVAILABLE LOTS</h2>
          <div className="space-y-3">
            {activeLots?.map((lot) => (
              <Card
                key={lot.id}
                className={`p-4 cursor-pointer border-2 transition-all ${
                  selectedLot?.id === lot.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
                }`}
                onClick={() => setSelectedLot(lot)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bebas text-lg">Lot {lot.lot_id}</div>
                    <div className="text-sm text-muted-foreground">{lot.cattle_class}</div>
                    <div className="text-sm mt-2">
                      <span className="font-medium">{lot.head_count} head</span> • {lot.current_weight}lbs
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Ask Price</div>
                    <div className="font-bebas text-xl text-primary">${lot.purchase_price}/cwt</div>
                  </div>
                </div>

                {/* Live bid count */}
                {selectedLot?.id === lot.id && activeBids?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Live Bids ({activeBids.length})</div>
                    <div className="space-y-1">
                      {activeBids.slice(0, 3).map((bid) => (
                        <div key={bid.id} className="text-xs flex justify-between p-1.5 bg-secondary/50 rounded">
                          <span>${bid.price_per_unit}/cwt</span>
                          <span className="text-muted-foreground">${bid.bid_amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Bid Form */}
        {selectedLot && (
          <Card className="p-4 h-fit sticky top-4 border-primary/50 bg-primary/5">
            <h3 className="font-bebas text-lg mb-4">Place Bid</h3>

            {/* Verification Alert */}
            {!bankAccounts.some(b => b.funds_verified) && (
              <div className="mb-4 flex items-start gap-2 p-2 bg-warning/10 border border-warning/20 rounded text-xs text-warning">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Verify bank funds to place bids</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Lot Summary */}
              <div className="text-sm p-2 bg-card/50 rounded border border-border">
                <div className="text-muted-foreground text-xs mb-1">Selected Lot</div>
                <div className="font-medium">{selectedLot.lot_id} • {selectedLot.head_count} head</div>
                <div className="text-xs text-muted-foreground">{selectedLot.current_weight}lbs</div>
              </div>

              {/* Price per unit */}
              <div>
                <label className="text-xs font-medium mb-1 block">Price per cwt</label>
                <input
                  type="number"
                  value={pricePerUnit}
                  onChange={(e) => {
                    setPricePerUnit(e.target.value);
                    if (e.target.value) {
                      const weight = selectedLot.current_weight / 100;
                      const heads = selectedLot.head_count;
                      setBidAmount((parseFloat(e.target.value) * weight * heads).toFixed(0));
                    }
                  }}
                  placeholder="e.g., 245.50"
                  className="w-full px-2 py-1.5 border border-border rounded bg-card text-sm"
                  step="0.01"
                />
              </div>

              {/* Total Bid */}
              <div>
                <label className="text-xs font-medium mb-1 block">Total Bid</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-border rounded bg-card text-sm font-bebas text-lg"
                  disabled
                />
              </div>

              {/* Bank Selection */}
              <div>
                <label className="text-xs font-medium mb-1 block">Payment Method</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-2 py-1.5 border border-border rounded bg-card text-sm"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts?.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.institution_name} {bank.funds_verified ? '✓' : '(unverified)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bid Button */}
              <Button
                onClick={handleBid}
                disabled={bidding || !bankAccounts.some(b => b.funds_verified)}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {bidding ? 'Placing Bid...' : 'Place Bid Now'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}