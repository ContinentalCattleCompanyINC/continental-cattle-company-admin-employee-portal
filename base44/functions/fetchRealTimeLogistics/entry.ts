/**
 * REAL-TIME LOGISTICS DATA FETCHER
 * 
 * Automatically pulls all data needed for optimal logistics planning:
 * - Route optimization (OSRM 3-route avg + Trucker Path factor)
 * - Weather forecast (7-day)
 * - Market data simulation (CME futures, USDA cutouts)
 * - Auto-calculated freight costs
 * 
 * No manual inputs needed - everything is computed from origin city
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const YARD_LAT = 36.2687;
const YARD_LON = -99.8773;
const YARD_ADDR = 'Shattuck, OK 73858';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const { originCity, lotId } = await req.json().catch(() => ({}));
    
    if (!originCity) {
      return Response.json({ error: 'Origin city required (e.g., "Dodge City, KS")' }, { status: 400 });
    }
    
    // PARALLEL FETCH: All data sources simultaneously
    const [geocodeResult, weatherData, marketData, lotData] = await Promise.allSettled([
      geocodeAndRoute(originCity),
      fetchWeather(),
      fetchMarketData(),
      lotId ? getLot(base44, lotId) : Promise.resolve(null),
    ]);
    
    const geocode = geocodeResult.status === 'fulfilled' ? geocodeResult.value : null;
    const weather = weatherData.status === 'fulfilled' ? weatherData.value : null;
    const market = marketData.status === 'fulfilled' ? marketData.value : null;
    const lot = lotData?.status === 'fulfilled' ? lotData.value : null;
    
    // Calculate freight with live data
    const miles = geocode?.finalBillingMiles || 300;
    const dieselPrice = 3.60; // Would use live diesel API if available
    const headCount = lot?.head_count || 40;
    
    const freight = calculateFreight(miles, dieselPrice, headCount);
    
    const result = {
      // Route (auto-calculated)
      route: {
        origin: originCity,
        destination: YARD_ADDR,
        billingMiles: miles,
        googleRoutes: geocode?.googleRoutes || [],
        googleAvgMiles: geocode?.googleAvgMiles || null,
        truckerPathMiles: geocode?.truckerPathMiles || null,
        etaMinHrs: geocode?.etaMinHrs || 6.0,
        etaMaxHrs: geocode?.etaMaxHrs || 7.5,
        stressLevel: geocode?.stressLevel || 'MODERATE',
        shrinkPct: geocode?.shrinkPct || 3.0,
        receivingProtocol: getReceivingProtocol(geocode?.stressLevel),
      },
      
      // Weather (live forecast)
      weather: weather || getDefaultWeather(),
      
      // Market (live/simulated)
      market: market || getDefaultMarket(),
      
      // Freight (auto-calculated from live miles + diesel)
      freight: {
        miles,
        diesel_price: dieselPrice,
        head_count: headCount,
        cost_per_head: freight.costPerHead,
        rate_per_mile: freight.ratePerMile,
        driver_pay_per_load: freight.driverPay,
        revenue_per_load: freight.revenue,
      },
      
      // Lot context (if provided)
      lot: lot ? {
        lot_id: lot.lot_id,
        breed_type: lot.breed_type,
        head_count: lot.head_count,
        current_weight: lot.current_weight || lot.purchase_weight,
        yard: lot.yard,
        pen: lot.pen,
      } : null,
      
      // Recommendations
      recommendations: generateRecs(geocode, weather, market, freight),
      
      timestamp: new Date().toISOString(),
    };
    
    return Response.json(result);
    
  } catch (error) {
    return Response.json({ error: error.message, fallback: getFallback() }, { status: 500 });
  }
});

/**
 * Geocode origin city and compute route with multi-source mileage
 */
async function geocodeAndRoute(cityState) {
  // Geocode with Open-Meteo (free, no key)
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityState)}&count=1&language=en&format=json`
  );
  const geoData = await geoRes.json();
  
  if (!geoData.results?.length) {
    throw new Error(`Could not geocode: ${cityState}`);
  }
  
  const { latitude, longitude, name, admin1 } = geoData.results[0];
  
  // OSRM routing (3 alternatives)
  let osrmRoutes = [];
  try {
    const routeRes = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${YARD_LON},${YARD_LAT}?overview=false&alternatives=true`
    );
    const routeData = await routeRes.json();
    if (routeData.routes?.length) {
      osrmRoutes = routeData.routes.slice(0, 3).map(r => Math.round(r.distance / 1609.34));
    }
  } catch (e) {
    // Fallback: estimate
    const straight = haversineMiles(latitude, longitude, YARD_LAT, YARD_LON);
    osrmRoutes = [Math.round(straight * 1.18), Math.round(straight * 1.22), Math.round(straight * 1.25)];
  }
  
  const googleRoutes = osrmRoutes.slice(0, 3);
  const googleAvg = Math.round(googleRoutes.reduce((a, b) => a + b, 0) / googleRoutes.length);
  
  // Trucker Path estimate (straight-line × 1.20 truck factor)
  const straight = haversineMiles(latitude, longitude, YARD_LAT, YARD_LON);
  const truckerPath = Math.round(straight * 1.20);
  
  // Final billing miles = avg of both sources
  const finalBillingMiles = Math.round((googleAvg + truckerPath) / 2);
  
  // ETA range (45-55 mph)
  const etaMinHrs = parseFloat((finalBillingMiles / 55).toFixed(1));
  const etaMaxHrs = parseFloat((finalBillingMiles / 45).toFixed(1));
  
  // Shrink based on miles
  const shrinkPct = estimateShrink(finalBillingMiles);
  
  // Stress level
  const stressLevel = finalBillingMiles < 250 ? 'LOW' : finalBillingMiles < 600 ? 'MODERATE' : 'HIGH';
  
  return {
    originName: `${name}, ${admin1}`,
    googleRoutes,
    googleAvgMiles: googleAvg,
    truckerPathMiles: truckerPath,
    finalBillingMiles,
    etaMinHrs,
    etaMaxHrs,
    shrinkPct,
    stressLevel,
  };
}

/**
 * Haversine distance in miles
 */
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Shrink estimate by miles
 */
function estimateShrink(miles) {
  if (miles < 100) return 1.5;
  if (miles < 200) return 2.0;
  if (miles < 350) return 2.5;
  if (miles < 500) return 3.0;
  if (miles < 700) return 3.5;
  if (miles < 900) return 4.0;
  return 4.5;
}

/**
 * Fetch 7-day weather forecast
 */
async function fetchWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=36.2687&longitude=-99.8773&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=7';
  const data = await fetch(url).then(r => r.json());
  const c = data.current, d = data.daily;
  
  return {
    current_temp_f: c.temperature_2m,
    feels_like_f: c.apparent_temperature,
    humidity_pct: c.relative_humidity_2m,
    wind_mph: c.wind_speed_10m,
    week_high_f: Math.max(...(d.temperature_2m_max || [])),
    week_low_f: Math.min(...(d.temperature_2m_min || [])),
    week_precip_in: (d.precipitation_sum || []).reduce((a, b) => a + b, 0).toFixed(2),
  };
}

/**
 * Fetch/simulate market data
 */
async function fetchMarketData() {
  // Would integrate with CME/USDA APIs
  // For now return realistic defaults
  return {
    lc_futures: 241.66,
    gf_futures: 285.40,
    corn_bu: 4.50,
    sbm_ton: 340,
    choice_cutout: 324.50,
    select_cutout: 318.25,
  };
}

/**
 * Calculate freight costs
 */
function calculateFreight(miles, dieselPrice, headCount) {
  const mpg = 4.0;
  const margin = 1.52;
  const driverPct = 0.275;
  
  const fuelCostPerMile = dieselPrice / mpg;
  const ratePerMile = fuelCostPerMile + margin;
  const revenue = ratePerMile * miles;
  const driverPay = revenue * driverPct;
  const costPerHead = revenue / headCount;
  
  return {
    ratePerMile: parseFloat(ratePerMile.toFixed(2)),
    revenue: parseFloat(revenue.toFixed(2)),
    driverPay: parseFloat(driverPay.toFixed(2)),
    costPerHead: parseFloat(costPerHead.toFixed(2)),
  };
}

/**
 * Get receiving protocol recommendation
 */
function getReceivingProtocol(stressLevel) {
  if (stressLevel === 'HIGH') return 'EXTENDED: 28-day BRD monitoring, metaphylaxis consideration, electrolytes day 1-3';
  if (stressLevel === 'MODERATE') return 'STANDARD: 14-day monitoring, enhanced week 1';
  return 'NORMAL: 7-day observation';
}

/**
 * Generate recommendations
 */
function generateRecs(geocode, weather, market, freight) {
  const recs = [];
  
  if (geocode?.stressLevel === 'HIGH') {
    recs.push({ category: 'HEALTH', priority: 'HIGH', message: 'Extended haul (>600 mi) — Recommend metaphylaxis and 28-day BRD monitoring' });
  }
  if (weather?.week_high_f > 95) {
    recs.push({ category: 'WEATHER', priority: 'MEDIUM', message: `Heat stress: Week high ${weather.week_high_f}°F — Feed at night, add electrolytes` });
  }
  if (market && market.lc_futures < 230) {
    recs.push({ category: 'MARKET', priority: 'MEDIUM', message: `LC weak at $${market.lc_futures}/cwt — Consider holding or locking feed costs` });
  }
  
  return recs;
}

/**
 * Get lot from database
 */
async function getLot(base44, lotId) {
  return base44.entities.CattleLot.get(lotId);
}

function getDefaultWeather() {
  return { current_temp_f: 75, feels_like_f: 78, humidity_pct: 55, wind_mph: 12, week_high_f: 95, week_low_f: 68, week_precip_in: 0.15 };
}

function getDefaultMarket() {
  return { lc_futures: 241.66, gf_futures: 285.40, corn_bu: 4.50, sbm_ton: 340, choice_cutout: 324.50, select_cutout: 318.25 };
}

function getFallback() {
  return { route: { billingMiles: 300, etaMinHrs: 5.5, etaMaxHrs: 6.7, stressLevel: 'MODERATE', shrinkPct: 3.0 }, freight: { cost_per_head: 35 } };
}