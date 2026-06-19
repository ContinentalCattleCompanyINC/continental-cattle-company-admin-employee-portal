/**
 * BULK COMMODITY SOURCING ENGINE
 * 
 * Finds best prices from:
 * - Country elevators (Shattuck, OK area)
 * - Rail terminals (CBG - Central Kansas Grain)
 * - Export ports
 * - Processors
 * 
 * Optimizes for:
 * - Lowest cost per ton
 * - Best quality specs
 * - Rail access efficiency
 * - Volume discounts
 */

import { base44 } from '@/api/base44Client';

// Shattuck, OK area elevators and rail terminals
const PRIMARY_LOCATIONS = [
  'Shattuck OK',
  'CBG Rail Terminal',
  'Enid OK',
  'Woodward OK',
  'Liberal KS',
  'Dodge City KS',
  'Guymon OK',
  'Perryton TX',
];

// Rail lines serving the region
const RAIL_LINES = ['BNSF', 'UP (Union Pacific)', 'SWP (Southwestern Plains)'];

/**
 * Get best commodity prices from all suppliers
 */
export async function getBestCommodityPrices(commodityName, minQuantityTons = 110) {
  try {
    // Get all active contracts
    const contracts = await base44.entities.FeedCommodityContract.filter({
      commodity_name: commodityName,
      contract_status: 'active',
    });

    // Get all preferred suppliers
    const suppliers = await base44.entities.FeedSupplier.filter({
      commodities_offered: { $regex: commodityName },
      preferred_status: true,
      active: true,
    });

    // Calculate landed cost for each option
    const options = contracts.map(contract => {
      const freightCost = contract.freight_included 
        ? 0 
        : (contract.freight_cost_per_ton || 0);
      
      const discount = contract.discount_percent || 0;
      const basePrice = contract.price_per_ton;
      const discountedPrice = basePrice * (1 - (discount / 100));
      const landedCost = discountedPrice + freightCost;

      // Quality score (0-100)
      const qualityScore = calculateQualityScore(contract.quality_specs, commodityName);

      // Rail efficiency bonus
      const railBonus = contract.rail_access ? 5 : 0;

      // Supplier rating bonus
      const supplier = suppliers.find(s => s.supplier_name === contract.supplier_name);
      const ratingBonus = supplier ? (supplier.rating || 3) * 2 : 0;

      // Overall value score
      const valueScore = qualityScore + railBonus + ratingBonus;

      return {
        contract,
        landed_cost_per_ton: landedCost,
        total_cost: landedCost * contract.quantity_tons,
        quality_score: qualityScore,
        value_score: valueScore,
        rail_access: contract.rail_access,
        supplier,
      };
    });

    // Sort by landed cost (ascending) and value score (descending)
    options.sort((a, b) => {
      const costDiff = a.landed_cost_per_ton - b.landed_cost_per_ton;
      if (Math.abs(costDiff) > 0.50) return costDiff; // Prioritize cost if significant difference
      return b.value_score - a.value_score; // Otherwise prefer higher value
    });

    return {
      best_option: options[0] || null,
      all_options: options,
      count: options.length,
      price_range: {
        min: options[0]?.landed_cost_per_ton || 0,
        max: options[options.length - 1]?.landed_cost_per_ton || 0,
      },
    };
  } catch (error) {
    console.error('[COMMODITY SOURCING] Error:', error.message);
    return { best_option: null, all_options: [], count: 0, error: error.message };
  }
}

/**
 * Calculate quality score based on commodity specs
 */
function calculateQualityScore(specs, commodityName) {
  if (!specs) return 50; // Default score

  let score = 50;

  switch (commodityName) {
    case 'Corn':
      if (specs.test_weight >= 56) score += 20;
      else if (specs.test_weight >= 54) score += 15;
      else if (specs.test_weight >= 52) score += 10;

      if (specs.moisture_percent <= 14) score += 15;
      else if (specs.moisture_percent <= 15) score += 10;

      if (specs.damage_percent <= 3) score += 15;
      else if (specs.damage_percent <= 5) score += 8;
      break;

    case 'Soybean Meal':
      if (specs.protein_percent >= 48) score += 25;
      else if (specs.protein_percent >= 46) score += 15;
      else if (specs.protein_percent >= 44) score += 8;

      if (specs.moisture_percent <= 12) score += 15;
      break;

    case 'Distillers Grains':
      if (specs.protein_percent >= 28) score += 15;
      if (specs.tdn_percent >= 90) score += 15;
      if (specs.moisture_percent <= 10) score += 15;
      break;

    case 'Alfalfa Hay':
      if (specs.protein_percent >= 18) score += 20;
      if (specs.tdn_percent >= 58) score += 15;
      if (specs.moisture_percent <= 16) score += 15;
      break;

    default:
      if (specs.protein_percent) score += 10;
      if (specs.tdn_percent) score += 10;
      if (specs.test_weight) score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Compare rail vs truck freight costs
 */
export function compareFreightOptions(distanceMiles, quantityTons) {
  const truckRatePerMile = 2.85;
  const truckCapacity = 24;
  const trucksNeeded = Math.ceil(quantityTons / truckCapacity);
  const truckCost = trucksNeeded * distanceMiles * truckRatePerMile;
  const truckCostPerTon = truckCost / quantityTons;

  const railRatePerTonMile = 0.04;
  const railCost = quantityTons * distanceMiles * railRatePerTonMile;
  const railCostPerTon = railCost / quantityTons;

  const railMinimum = quantityTons >= 110;

  return {
    truck: {
      total_cost: truckCost,
      cost_per_ton: truckCostPerTon,
      trucks_needed: trucksNeeded,
      transit_days: Math.ceil(distanceMiles / 500),
    },
    rail: {
      total_cost: railCost,
      cost_per_ton: railCostPerTon,
      rail_cars_needed: Math.ceil(quantityTons / 110),
      transit_days: Math.ceil(distanceMiles / 300),
      minimum_met: railMinimum,
    },
    recommendation: quantityTons >= 110 && distanceMiles > 300 ? 'rail' : 'truck',
    savings: quantityTons >= 110 
      ? {
          amount: truckCost - railCost,
          percent: ((truckCost - railCost) / truckCost * 100).toFixed(1),
        }
      : null,
  };
}

/**
 * Calculate optimal order quantity for volume discounts
 */
export function calculateOptimalOrderQuantity(
  basePricePerTon,
  currentInventoryTons,
  monthlyConsumptionTons,
  discountTiers = [
    { min_tons: 110, discount_percent: 2 },
    { min_tons: 220, discount_percent: 4 },
    { min_tons: 440, discount_percent: 6 },
    { min_tons: 1100, discount_percent: 10 },
  ]
) {
  const options = [];

  for (const tier of discountTiers) {
    const quantity = tier.min_tons;
    const discountedPrice = basePricePerTon * (1 - tier.discount_percent / 100);
    const totalCost = quantity * discountedPrice;
    
    const monthsSupply = quantity / monthlyConsumptionTons;
    const avgInventory = quantity / 2;
    const storageCost = avgInventory * 0.50 * monthsSupply;
    const totalLandedCost = totalCost + storageCost;
    const effectiveCostPerTon = totalLandedCost / quantity;

    options.push({
      quantity_tons: quantity,
      discount_percent: tier.discount_percent,
      price_per_ton: discountedPrice,
      total_cost: totalCost,
      storage_cost: storageCost,
      total_landed_cost: totalLandedCost,
      months_supply: monthsSupply.toFixed(1),
      effective_cost_per_ton: effectiveCostPerTon,
      rail_cars_needed: Math.ceil(quantity / 110),
    });
  }

  options.sort((a, b) => a.effective_cost_per_ton - b.effective_cost_per_ton);

  return {
    recommended_option: options[0],
    all_options: options,
    current_inventory: currentInventoryTons,
    monthly_consumption: monthlyConsumptionTons,
  };
}

/**
 * Get commodity basis for region (Shattuck, OK / CBG)
 */
export async function getRegionalBasis(commodityName) {
  const basisData = {
    'Corn': {
      'Dec': '+$0.45 to +$0.55 bu',
      'Mar': '+$0.50 to +$0.60 bu',
      'May': '+$0.55 to +$0.65 bu',
    },
    'Soybean Meal': {
      'Dec': '+$5 to +$10 ton',
      'Jan': '+$8 to +$15 ton',
    },
    'Wheat': {
      'Jul': '+$0.30 to +$0.40 bu',
      'Sep': '+$0.35 to +$0.45 bu',
    },
    'Sorghum': {
      'Dec': '+$0.40 to +$0.50 bu',
    },
  };

  return basisData[commodityName] || { note: 'Contact local elevators for current basis' };
}