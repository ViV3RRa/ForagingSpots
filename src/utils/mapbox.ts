// Mapbox configuration utility
export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Default map configuration
export const DEFAULT_MAP_CONFIG = {
  style: 'mapbox://styles/mapbox/outdoors-v12', // Good for foraging/outdoor activities
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
