/** Satellite data types used across the application */

export interface Satellite {
  id: string;
  norad_id: number;
  name: string;
  alternate_names?: string[] | null;
  status?: string;
  country?: string | null;
  launch_date?: string | null;
  website?: string | null;
  description?: string | null;
  image_url?: string | null;
}

export interface TLE {
  satellite_id: string;
  tle_line1: string;
  tle_line2: string;
  epoch?: string;
  source: string;
}

export interface Transmitter {
  id?: string;
  satellite_id: string;
  description: string;
  mode?: string | null;
  alive: boolean;
  uplink_low?: number | null;
  uplink_high?: number | null;
  downlink_low?: number | null;
  downlink_high?: number | null;
}

export interface GlobeArc {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
}
