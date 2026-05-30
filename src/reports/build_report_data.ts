import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GTFSData,
  GTFSStop,
  LogEntry,
} from '../gtfs_types';
import { uniqueSlugs } from './slug';
import type { ReportRefGroup, ReportRouteVariant, ReportStop, SindicatoReport } from './types';

export interface BuildReportsInput {
  log: LogEntry[];
  geojsonFeatures: { [key: string]: GeoJSONFeatureCollection };
  gtfs: GTFSData;
  cityName: string;
}

function escapeMdCell(value: string): string {
  return (value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function getRouteFeature(fc: GeoJSONFeatureCollection | undefined): GeoJSONFeature | undefined {
  if (!fc?.features?.length) return undefined;
  return fc.features.find((f) => f.geometry?.type === 'LineString') || fc.features[0];
}

function getCoordinates(feature: GeoJSONFeature | undefined): [number, number][] {
  if (!feature?.geometry || feature.geometry.type !== 'LineString') return [];
  const coords = feature.geometry.coordinates as [number, number][];
  return coords.map((c) => [c[0], c[1]]);
}

function buildStopsForTrip(
  tripId: number,
  gtfs: GTFSData,
  stopById: Map<number, GTFSStop>,
): ReportStop[] {
  const sequences = gtfs.stop_times
    .filter((st) => st.trip_id === tripId)
    .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));

  const seen = new Set<number>();
  const stops: ReportStop[] = [];

  for (const st of sequences) {
    if (seen.has(st.stop_id)) continue;
    seen.add(st.stop_id);
    const stop = stopById.get(st.stop_id);
    if (!stop) continue;
    stops.push({
      id: stop.stop_id,
      name: stop.stop_name,
      lat: stop.stop_lat,
      lon: stop.stop_lon,
    });
  }

  return stops;
}

function buildVariant(
  entry: LogEntry,
  geojsonFeatures: { [key: string]: GeoJSONFeatureCollection },
  gtfs: GTFSData,
  stopById: Map<number, GTFSStop>,
  routeById: Map<number | string, GTFSData['routes'][0]>,
): ReportRouteVariant {
  const osmId = entry.id;
  const tags = entry.tags || {};
  const fc = geojsonFeatures[String(osmId)];
  const feature = getRouteFeature(fc);
  const trip = gtfs.trips.find((t) => t.trip_id === osmId);
  const gtfsRoute = trip ? routeById.get(trip.route_id) : undefined;
  const stops = trip ? buildStopsForTrip(osmId, gtfs, stopById) : [];

  let errorMessage = '';
  if (entry.error) {
    if (typeof entry.error === 'string') {
      errorMessage = entry.error;
    } else if (typeof entry.error === 'object' && entry.error !== null && 'extractor_error' in entry.error) {
      errorMessage = String((entry.error as { extractor_error?: string }).extractor_error);
    } else {
      errorMessage = JSON.stringify(entry.error);
    }
  }

  return {
    osmId,
    ref: tags.ref || '',
    name: tags.name || '',
    from: tags.from || '',
    to: tags.to || '',
    description: tags.description || '',
    tripHeadsign: trip?.trip_headsign || tags.to || '',
    routeType: tags.route || '',
    gtfsRouteId: gtfsRoute?.route_id ?? '',
    routeColor: (gtfsRoute?.route_color || '888888').replace('#', ''),
    stopCount: stops.length,
    stops,
    coordinates: getCoordinates(feature),
    osmUrl: `https://www.openstreetmap.org/relation/${osmId}`,
    status: entry.error ? 'error' : 'ok',
    errorMessage,
    fee: tags.fee || '',
    onDemand: tags.on_demand || '',
    directionLabel: 'unico',
    directionId: trip?.direction_id,
  };
}

function assignDirectionLabels(variants: ReportRouteVariant[]): void {
  const paired = new Set<number>();

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (paired.has(v.osmId)) continue;

    const reverse = variants.find(
      (o, j) =>
        j !== i &&
        !paired.has(o.osmId) &&
        o.ref === v.ref &&
        o.from.trim().toLowerCase() === v.to.trim().toLowerCase() &&
        o.to.trim().toLowerCase() === v.from.trim().toLowerCase(),
    );

    if (reverse) {
      v.directionLabel = 'ida';
      reverse.directionLabel = 'vuelta';
      paired.add(v.osmId);
      paired.add(reverse.osmId);
    } else if (!paired.has(v.osmId)) {
      v.directionLabel = 'unico';
    }
  }
}

export function buildSindicatoReports(input: BuildReportsInput): SindicatoReport[] {
  const { log, geojsonFeatures, gtfs, cityName } = input;

  const stopById = new Map<number, GTFSStop>();
  for (const stop of gtfs.stops) stopById.set(stop.stop_id, stop);

  const routeById = new Map<number | string, GTFSData['routes'][0]>();
  for (const route of gtfs.routes) routeById.set(route.route_id, route);

  const byOperator = new Map<string, LogEntry[]>();
  for (const entry of log) {
    const operator = entry.tags?.operator || 'default';
    if (!byOperator.has(operator)) byOperator.set(operator, []);
    byOperator.get(operator)!.push(entry);
  }

  const slugMap = uniqueSlugs([...byOperator.keys()]);
  const reports: SindicatoReport[] = [];

  for (const [operator, entries] of byOperator) {
    const variants = entries.map((e) =>
      buildVariant(e, geojsonFeatures, gtfs, stopById, routeById),
    );

    const refMap = new Map<string, ReportRefGroup>();
    for (const variant of variants) {
      const refKey = variant.ref || '(sin ref)';
      if (!refMap.has(refKey)) {
        refMap.set(refKey, {
          ref: refKey,
          gtfsRouteId: variant.gtfsRouteId,
          routeColor: variant.routeColor,
          routeLongName: '',
          variants: [],
        });
      }
      const group = refMap.get(refKey)!;
      group.variants.push(variant);
      if (!group.routeLongName && variant.name) {
        const colonIdx = variant.name.indexOf(':');
        group.routeLongName = colonIdx > 0 ? variant.name.slice(0, colonIdx).trim() : variant.name;
      }
    }

    const refGroups = [...refMap.values()].sort((a, b) =>
      a.ref.localeCompare(b.ref, 'es', { numeric: true }),
    );

    for (const group of refGroups) {
      group.variants.sort((a, b) => a.from.localeCompare(b.from, 'es') || a.to.localeCompare(b.to, 'es'));
      assignDirectionLabels(group.variants);
    }

    const errors = variants.filter((v) => v.status === 'error').length;
    const totalStops = variants.reduce((sum, v) => sum + v.stopCount, 0);

    reports.push({
      slug: slugMap.get(operator)!,
      operator,
      cityName,
      generatedAt: new Date().toISOString(),
      stats: {
        totalVariants: variants.length,
        uniqueRefs: refGroups.length,
        errors,
        totalStops,
      },
      refGroups,
    });
  }

  reports.sort((a, b) => a.operator.localeCompare(b.operator, 'es'));
  return reports;
}

export { escapeMdCell };
