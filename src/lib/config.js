export const adsense = {
  // Set PUBLIC_ADSENSE_CLIENT in .env / Vercel env vars, e.g. 'ca-pub-1234567890123456'
  client: import.meta.env.PUBLIC_ADSENSE_CLIENT || '',
  units: {
    // Replace with your AdSense ad unit IDs (AdSense dashboard > Ads > Ad units)
    leaderboard: import.meta.env.PUBLIC_ADSENSE_UNIT_LEADERBOARD || '',
    rectangle: import.meta.env.PUBLIC_ADSENSE_UNIT_RECTANGLE || '',
  },
};

export function adsEnabled() {
  return Boolean(adsense.client && (adsense.units.leaderboard || adsense.units.rectangle));
}