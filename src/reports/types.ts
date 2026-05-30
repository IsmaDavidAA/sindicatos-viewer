export interface ReportStop {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

export interface ReportRouteVariant {
  osmId: number;
  ref: string;
  name: string;
  from: string;
  to: string;
  description: string;
  tripHeadsign: string;
  routeType: string;
  gtfsRouteId: number | string;
  routeColor: string;
  stopCount: number;
  stops: ReportStop[];
  /** GeoJSON [lon, lat][] for map rendering */
  coordinates: [number, number][];
  osmUrl: string;
  status: 'ok' | 'error';
  errorMessage: string;
  fee: string;
  onDemand: string;
  /** ida | vuelta | unico — inferred from from/to pairs within same ref */
  directionLabel: 'ida' | 'vuelta' | 'unico';
  directionId?: number;
}

export interface ReportRefGroup {
  ref: string;
  gtfsRouteId: number | string;
  routeColor: string;
  routeLongName: string;
  variants: ReportRouteVariant[];
}

export interface SindicatoReport {
  slug: string;
  operator: string;
  cityName: string;
  generatedAt: string;
  stats: {
    totalVariants: number;
    uniqueRefs: number;
    errors: number;
    totalStops: number;
  };
  refGroups: ReportRefGroup[];
}

export interface SindicatoReportManifestEntry {
  slug: string;
  operator: string;
  urlPath: string;
  stats: SindicatoReport['stats'];
}
