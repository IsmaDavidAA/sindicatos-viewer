/** Minimal types consumed from trufi-gtfs-builder output. */

export interface OSMTags {
  [key: string]: string;
}

export interface LogEntry {
  id: number;
  tags: OSMTags;
  error?: unknown;
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: [number, number][] | [number, number];
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GTFSAgency {
  agency_id: number;
  agency_name: string;
  agency_timezone: string;
  agency_url: string;
}

export interface GTFSRoute {
  route_id: number | string;
  agency_id: number;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  route_type: string;
}

export interface GTFSTrip {
  trip_id: number;
  route_id: number | string;
  service_id: string;
  shape_id: number;
  trip_headsign?: string;
  direction_id?: number;
}

export interface GTFSStop {
  stop_id: number;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_desc?: string;
}

export interface GTFSStopTime {
  trip_id: number;
  stop_sequence: string | number;
  stop_id: number;
  arrival_time: string;
  departure_time: string;
  timepoint: number;
}

export interface GTFSData {
  agency: GTFSAgency[];
  calendar: unknown[];
  routes: GTFSRoute[];
  trips: GTFSTrip[];
  frequencies: unknown[];
  stops: GTFSStop[];
  stop_times: GTFSStopTime[];
  shapes: unknown[];
  fare_attributes: unknown[];
  fare_rules: unknown[];
  feed_info: Array<{ feed_id: string; [key: string]: string }>;
}

export interface GtfsBuilderOut {
  log: LogEntry[];
  gtfs: GTFSData;
  geojsonFeatures: { [key: string]: GeoJSONFeatureCollection };
  cityName: string;
}
