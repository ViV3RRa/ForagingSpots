import type { Theme } from '../contexts/ThemeContext';

// Mapbox configuration utility
export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Custom Mapbox Studio styles tuned to the design palette (see
// plans/subtasks/1.4-mapbox-studio-instructions.md). Stock styles are used
// until the Studio styles are published and set in .env.
const FALLBACK_STYLE_LIGHT = 'mapbox://styles/mapbox/outdoors-v12';
const FALLBACK_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';
// Satellite mode uses a single theme-independent Studio style (recipe in
// plans/subtasks/3.9-satellite-mode.md). Must stay a Classic style —
// mapbox-gl v2 cannot render Standard-architecture styles.
const FALLBACK_STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';

export type MapMode = 'base' | 'satellite';

export const MAP_STYLES: Record<Theme, string> = {
  light: import.meta.env.VITE_MAPBOX_STYLE_LIGHT || FALLBACK_STYLE_LIGHT,
  dark: import.meta.env.VITE_MAPBOX_STYLE_DARK || FALLBACK_STYLE_DARK,
};

export const MAP_STYLE_SATELLITE: string =
  import.meta.env.VITE_MAPBOX_STYLE_SATELLITE || FALLBACK_STYLE_SATELLITE;

export const getMapStyle = (theme: Theme, mode: MapMode = 'base'): string =>
  mode === 'satellite' ? MAP_STYLE_SATELLITE : MAP_STYLES[theme];

// Default map configuration
export const DEFAULT_MAP_CONFIG = {
  center: [24.9354, 60.1695] as [number, number], // Helsinki, Finland (default location)
  zoom: 10,
};

// Validate that Mapbox token is configured
export const validateMapboxToken = (): boolean => {
  if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'your_mapbox_access_token_here') {
    console.error(
      'Mapbox access token is not configured. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.'
    );
    return false;
  }
  return true;
};
