/**
 * Job auto-optimization algorithm.
 *
 * Pure functions — no Supabase, no React.
 * All data comes in via parameters, all results returned as plain objects.
 */

import type { VehicleType } from "@/types";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface OptimizerPickup {
  id: string;
  pickup_number: string;
  org_name: string;
  estimated_weight_kg: number | null;
  estimated_volume_m3: number | null;
  lat: number | null;
  lng: number | null;
}

export interface OptimizerFarmer {
  id: string;
  full_name: string | null;
  farm_lat: number | null;
  farm_lng: number | null;
}

export interface OptimizerRate {
  vehicle_type: VehicleType;
  base_fare_rs: number;
  per_km_rs: number;
}

export interface OptimizerVehicle {
  id: string;
  vehicle_type: VehicleType;
  capacity_kg: number;
  volume_capacity_m3: number | null;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface JobSuggestion {
  pickupIds: string[];
  pickups: OptimizerPickup[];
  farmerId: string;
  farmerName: string;
  vehicleType: VehicleType;
  availableVehicleIds: string[];
  estimatedTrips: number;
  estimatedDistanceKm: number;
  estimatedCostRs: number;
  totalWeightKg: number;
  totalVolumeM3: number;
}

export interface OptimizeResult {
  suggestions: JobSuggestion[];
  skippedPickups: OptimizerPickup[];
}

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

const R_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// DBSCAN clustering
// ---------------------------------------------------------------------------

interface GeoPoint {
  lat: number;
  lng: number;
  index: number;
}

function dbscan(points: GeoPoint[], epsKm: number, minPts: number): number[][] {
  const n = points.length;
  const labels = new Array<number>(n).fill(-1); // -1 = unvisited
  let cluster = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;

    const neighbors = regionQuery(points, i, epsKm);
    if (neighbors.length < minPts) {
      // noise — but we still want it in its own cluster (minPts=1 means this won't happen)
      labels[i] = cluster++;
      continue;
    }

    const currentCluster = cluster++;
    labels[i] = currentCluster;
    const queue = [...neighbors];

    while (queue.length > 0) {
      const j = queue.pop()!;
      if (labels[j] !== -1) continue;
      labels[j] = currentCluster;
      const jNeighbors = regionQuery(points, j, epsKm);
      if (jNeighbors.length >= minPts) {
        queue.push(...jNeighbors);
      }
    }
  }

  // Group indices by cluster label
  const clusters: Record<number, number[]> = {};
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (!clusters[c]) clusters[c] = [];
    clusters[c].push(i);
  }
  return Object.values(clusters);
}

function regionQuery(points: GeoPoint[], idx: number, epsKm: number): number[] {
  const result: number[] = [];
  const p = points[idx];
  for (let i = 0; i < points.length; i++) {
    if (i === idx) continue;
    if (haversineKm(p, points[i]) <= epsKm) {
      result.push(i);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centroid(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

function nearestFarmer(
  center: { lat: number; lng: number },
  farmers: OptimizerFarmer[],
): OptimizerFarmer | null {
  let best: OptimizerFarmer | null = null;
  let bestDist = Infinity;
  for (const f of farmers) {
    if (f.farm_lat == null || f.farm_lng == null) continue;
    const d = haversineKm(center, { lat: f.farm_lat, lng: f.farm_lng });
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

/** Sum of consecutive haversine legs through pickups + final leg to farmer. */
function routeKm(
  pickupPoints: { lat: number; lng: number }[],
  farmPoint: { lat: number; lng: number },
): number {
  if (pickupPoints.length === 0) return 0;
  let total = 0;
  for (let i = 1; i < pickupPoints.length; i++) {
    total += haversineKm(pickupPoints[i - 1], pickupPoints[i]);
  }
  total += haversineKm(pickupPoints[pickupPoints.length - 1], farmPoint);
  return total;
}

interface VehicleEval {
  vehicleType: VehicleType;
  trips: number;
  distKm: number;
  costRs: number;
}

function evaluateVehicleType(
  totalWeightKg: number,
  totalVolumeM3: number,
  rate: OptimizerRate,
  vehicleCapKg: number,
  vehicleVolM3: number,
  distKm: number,
): VehicleEval {
  const tripsByWeight = vehicleCapKg > 0 ? Math.ceil(totalWeightKg / vehicleCapKg) : 1;
  const tripsByVolume = vehicleVolM3 > 0 ? Math.ceil(totalVolumeM3 / vehicleVolM3) : 1;
  const trips = Math.max(tripsByWeight, tripsByVolume, 1);
  const cost = trips * (rate.base_fare_rs + rate.per_km_rs * distKm);
  return { vehicleType: rate.vehicle_type, trips, distKm, costRs: cost };
}

// ---------------------------------------------------------------------------
// Main optimizer
// ---------------------------------------------------------------------------

export function optimizeJobs(
  pickups: OptimizerPickup[],
  farmers: OptimizerFarmer[],
  rates: OptimizerRate[],
  vehicles: OptimizerVehicle[],
  densityKgPerM3: number,
  epsKm = 3,
): OptimizeResult {
  // 1. Separate pickups with / without coordinates
  const geoPickups: (OptimizerPickup & { lat: number; lng: number })[] = [];
  const skippedPickups: OptimizerPickup[] = [];

  for (const p of pickups) {
    if (p.lat != null && p.lng != null) {
      geoPickups.push(p as OptimizerPickup & { lat: number; lng: number });
    } else {
      skippedPickups.push(p);
    }
  }

  if (geoPickups.length === 0) {
    return { suggestions: [], skippedPickups };
  }

  // 2. DBSCAN
  const geoPoints: GeoPoint[] = geoPickups.map((p, i) => ({
    lat: p.lat,
    lng: p.lng,
    index: i,
  }));
  const clusters = dbscan(geoPoints, epsKm, 1);

  // Build lookup: vehicle_type → capacity (use the type's max capacity from vehicles list)
  const typeCapacity: Partial<Record<VehicleType, { kg: number; m3: number }>> = {};
  for (const v of vehicles) {
    const existing = typeCapacity[v.vehicle_type];
    if (!existing || v.capacity_kg > existing.kg) {
      typeCapacity[v.vehicle_type] = {
        kg: v.capacity_kg,
        m3: v.volume_capacity_m3 ?? 0,
      };
    }
  }

  // Build lookup: vehicle_type → available vehicle IDs
  const typeVehicleIds: Partial<Record<VehicleType, string[]>> = {};
  for (const v of vehicles) {
    if (!typeVehicleIds[v.vehicle_type]) typeVehicleIds[v.vehicle_type] = [];
    typeVehicleIds[v.vehicle_type]!.push(v.id);
  }

  const activeFarmers = farmers.filter(
    (f) => f.farm_lat != null && f.farm_lng != null,
  );

  const suggestions: JobSuggestion[] = [];

  // 3. For each cluster, build suggestion
  for (const clusterIndices of clusters) {
    const clusterPickups = clusterIndices.map((i) => geoPickups[i]);
    const points = clusterPickups.map((p) => ({ lat: p.lat, lng: p.lng }));

    const center = centroid(points);
    const farmer = nearestFarmer(center, activeFarmers);
    if (!farmer) continue; // no farmer with coordinates

    const farmPoint = { lat: farmer.farm_lat!, lng: farmer.farm_lng! };
    const distKm = routeKm(points, farmPoint);

    const totalWeightKg = clusterPickups.reduce(
      (s, p) => s + (p.estimated_weight_kg ?? 0),
      0,
    );
    const totalVolumeM3 = clusterPickups.reduce(
      (s, p) =>
        s +
        (p.estimated_volume_m3 ??
          (p.estimated_weight_kg ?? 0) / densityKgPerM3),
      0,
    );

    // Evaluate each vehicle type that has a rate AND physical vehicles
    let bestEval: VehicleEval | null = null;
    for (const rate of rates) {
      const cap = typeCapacity[rate.vehicle_type];
      if (!cap) continue; // no physical vehicle of this type
      const ev = evaluateVehicleType(
        totalWeightKg,
        totalVolumeM3,
        rate,
        cap.kg,
        cap.m3,
        distKm,
      );
      if (!bestEval || ev.costRs < bestEval.costRs) {
        bestEval = ev;
      }
    }

    if (!bestEval) continue;

    suggestions.push({
      pickupIds: clusterPickups.map((p) => p.id),
      pickups: clusterPickups,
      farmerId: farmer.id,
      farmerName: farmer.full_name ?? "Unknown",
      vehicleType: bestEval.vehicleType,
      availableVehicleIds: typeVehicleIds[bestEval.vehicleType] ?? [],
      estimatedTrips: bestEval.trips,
      estimatedDistanceKm: Math.round(bestEval.distKm * 10) / 10,
      estimatedCostRs: Math.round(bestEval.costRs),
      totalWeightKg: Math.round(totalWeightKg),
      totalVolumeM3: Math.round(totalVolumeM3 * 10) / 10,
    });
  }

  // 4. Sort by cost ascending
  suggestions.sort((a, b) => a.estimatedCostRs - b.estimatedCostRs);

  return { suggestions, skippedPickups };
}
