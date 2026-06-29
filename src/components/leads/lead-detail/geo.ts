const COUNTRY: Record<string, string> = {
  CA: 'Canada', US: 'United States', GB: 'United Kingdom', AU: 'Australia',
  NZ: 'New Zealand', DE: 'Germany', FR: 'France', JP: 'Japan',
  SG: 'Singapore', AE: 'UAE', IE: 'Ireland', NL: 'Netherlands',
  CH: 'Switzerland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', BE: 'Belgium', AT: 'Austria', IT: 'Italy',
  ES: 'Spain', PT: 'Portugal', PL: 'Poland', CZ: 'Czech Republic',
  ZA: 'South Africa', IN: 'India', CN: 'China', KR: 'South Korea',
  BR: 'Brazil', MX: 'Mexico', AR: 'Argentina',
}

const PROVINCE_STATE: Record<string, string> = {
  // Canadian provinces & territories
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba',
  NB: 'New Brunswick', NL: 'Newfoundland and Labrador', NS: 'Nova Scotia',
  NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario',
  PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
  // US states
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington D.C.',
}

export function countryName(code: string | null | undefined): string {
  if (!code) return ''
  return COUNTRY[code.toUpperCase()] ?? code
}

export function provinceName(code: string | null | undefined): string {
  if (!code) return ''
  return PROVINCE_STATE[code.toUpperCase()] ?? code
}
