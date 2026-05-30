import * as fs from 'fs';
import * as path from 'path';
import type { GeoJSONFeatureCollection, GTFSData, LogEntry } from './gtfs_types';

/** Parse simple GTFS CSV (no quoted commas in values). */
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || '').trim();
    });
    return row;
  });
}

export function loadGtfsFromDir(gtfsDir: string): GTFSData {
  const read = (file: string) => fs.readFileSync(path.join(gtfsDir, file), 'utf8');
  const num = (v: string) => (v === '' ? 0 : Number(v));
  const optional = (file: string) => fs.existsSync(path.join(gtfsDir, file));

  return {
    agency: parseCsv(read('agency.txt')).map((r) => ({
      agency_id: num(r.agency_id),
      agency_name: r.agency_name,
      agency_timezone: r.agency_timezone,
      agency_url: r.agency_url,
    })),
    calendar: optional('calendar.txt') ? parseCsv(read('calendar.txt')) : [],
    routes: parseCsv(read('routes.txt')).map((r) => ({
      route_id: num(r.route_id),
      agency_id: num(r.agency_id),
      route_short_name: r.route_short_name,
      route_long_name: r.route_long_name,
      route_color: r.route_color,
      route_type: r.route_type,
    })),
    trips: parseCsv(read('trips.txt')).map((r) => ({
      trip_id: num(r.trip_id),
      route_id: num(r.route_id),
      service_id: r.service_id,
      shape_id: num(r.shape_id),
      trip_headsign: r.trip_headsign,
      direction_id: r.direction_id ? num(r.direction_id) : undefined,
    })),
    frequencies: optional('frequencies.txt') ? parseCsv(read('frequencies.txt')) : [],
    stops: parseCsv(read('stops.txt')).map((r) => ({
      stop_id: num(r.stop_id),
      stop_name: r.stop_name,
      stop_lat: parseFloat(r.stop_lat),
      stop_lon: parseFloat(r.stop_lon),
      stop_desc: r.stop_desc,
    })),
    stop_times: parseCsv(read('stop_times.txt')).map((r) => ({
      trip_id: num(r.trip_id),
      stop_sequence: r.stop_sequence,
      stop_id: num(r.stop_id),
      arrival_time: r.arrival_time,
      departure_time: r.departure_time,
      timepoint: num(r.timepoint),
    })),
    shapes: optional('shapes.txt') ? parseCsv(read('shapes.txt')) : [],
    fare_attributes: optional('fare_attributes.txt') ? parseCsv(read('fare_attributes.txt')) : [],
    fare_rules: optional('fare_rules.txt') ? parseCsv(read('fare_rules.txt')) : [],
    feed_info: parseCsv(read('feed_info.txt')).map((r) => ({
      feed_publisher_url: r.feed_publisher_url,
      feed_publisher_name: r.feed_publisher_name,
      feed_lang: r.feed_lang,
      feed_version: r.feed_version,
      feed_contact_email: r.feed_contact_email,
      feed_contact_url: r.feed_contact_url,
      feed_start_date: r.feed_start_date,
      feed_end_date: r.feed_end_date,
      feed_id: r.feed_id,
    })),
  };
}

export function loadGeojsonFeatures(routesDir: string): { [key: string]: GeoJSONFeatureCollection } {
  const features: { [key: string]: GeoJSONFeatureCollection } = {};
  if (!fs.existsSync(routesDir)) return features;
  for (const file of fs.readdirSync(routesDir)) {
    if (!file.endsWith('.geojson')) continue;
    const id = file.replace('.geojson', '');
    features[id] = JSON.parse(fs.readFileSync(path.join(routesDir, file), 'utf8'));
  }
  return features;
}

export interface LoadGtfsOutOptions {
  gtfsOutDir: string;
  cityName?: string;
}

/**
 * Load everything needed to build sindicato reports from a trufi-gtfs-builder out/ folder.
 */
export function loadGtfsBuilderOut(options: LoadGtfsOutOptions) {
  const gtfsOutDir = path.resolve(options.gtfsOutDir);
  const logPath = path.join(gtfsOutDir, 'log.json');
  const gtfsDir = path.join(gtfsOutDir, 'gtfs');
  const routesDir = path.join(gtfsOutDir, 'routes');

  if (!fs.existsSync(logPath)) {
    throw new Error(`Missing log.json — run trufi-gtfs-builder with log: true\n  ${logPath}`);
  }
  if (!fs.existsSync(gtfsDir)) {
    throw new Error(`Missing gtfs/ — run trufi-gtfs-builder with gtfs: true\n  ${gtfsDir}`);
  }
  if (!fs.existsSync(routesDir)) {
    throw new Error(
      `Missing routes/ — run trufi-gtfs-builder with routes: true (needed for map geometry)\n  ${routesDir}`,
    );
  }

  const log: LogEntry[] = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const gtfs = loadGtfsFromDir(gtfsDir);
  const geojsonFeatures = loadGeojsonFeatures(routesDir);
  const cityName = options.cityName || gtfs.feed_info[0]?.feed_id || 'city';

  return { log, gtfs, geojsonFeatures, cityName, gtfsOutDir };
}
