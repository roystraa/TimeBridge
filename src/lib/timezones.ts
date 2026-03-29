// Map IANA timezone IDs to country names
const tzCountryMap: Record<string, string> = {
  'Africa/Abidjan': 'Ivory Coast', 'Africa/Accra': 'Ghana', 'Africa/Algiers': 'Algeria',
  'Africa/Cairo': 'Egypt', 'Africa/Casablanca': 'Morocco', 'Africa/Johannesburg': 'South Africa',
  'Africa/Lagos': 'Nigeria', 'Africa/Nairobi': 'Kenya', 'Africa/Tunis': 'Tunisia',
  'America/Anchorage': 'United States', 'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Bogota': 'Colombia', 'America/Chicago': 'United States',
  'America/Denver': 'United States', 'America/Edmonton': 'Canada',
  'America/Halifax': 'Canada', 'America/Lima': 'Peru',
  'America/Los_Angeles': 'United States', 'America/Manaus': 'Brazil',
  'America/Mexico_City': 'Mexico', 'America/New_York': 'United States',
  'America/Phoenix': 'United States', 'America/Santiago': 'Chile',
  'America/Sao_Paulo': 'Brazil', 'America/St_Johns': 'Canada',
  'America/Toronto': 'Canada', 'America/Vancouver': 'Canada',
  'America/Winnipeg': 'Canada',
  'Asia/Baghdad': 'Iraq', 'Asia/Bangkok': 'Thailand', 'Asia/Colombo': 'Sri Lanka',
  'Asia/Dhaka': 'Bangladesh', 'Asia/Dubai': 'UAE', 'Asia/Ho_Chi_Minh': 'Vietnam',
  'Asia/Hong_Kong': 'China', 'Asia/Istanbul': 'Turkey',
  'Asia/Jakarta': 'Indonesia', 'Asia/Jerusalem': 'Israel',
  'Asia/Karachi': 'Pakistan', 'Asia/Kathmandu': 'Nepal',
  'Asia/Kolkata': 'India', 'Asia/Kuala_Lumpur': 'Malaysia',
  'Asia/Makassar': 'Indonesia', 'Asia/Manila': 'Philippines',
  'Asia/Riyadh': 'Saudi Arabia', 'Asia/Seoul': 'South Korea',
  'Asia/Shanghai': 'China', 'Asia/Singapore': 'Singapore',
  'Asia/Taipei': 'Taiwan', 'Asia/Tehran': 'Iran',
  'Asia/Tokyo': 'Japan', 'Asia/Yangon': 'Myanmar',
  'Atlantic/Reykjavik': 'Iceland',
  'Australia/Adelaide': 'Australia', 'Australia/Brisbane': 'Australia',
  'Australia/Darwin': 'Australia', 'Australia/Melbourne': 'Australia',
  'Australia/Perth': 'Australia', 'Australia/Sydney': 'Australia',
  'Europe/Amsterdam': 'Netherlands', 'Europe/Athens': 'Greece',
  'Europe/Belgrade': 'Serbia', 'Europe/Berlin': 'Germany',
  'Europe/Brussels': 'Belgium', 'Europe/Bucharest': 'Romania',
  'Europe/Budapest': 'Hungary', 'Europe/Copenhagen': 'Denmark',
  'Europe/Dublin': 'Ireland', 'Europe/Helsinki': 'Finland',
  'Europe/Kyiv': 'Ukraine', 'Europe/Lisbon': 'Portugal',
  'Europe/London': 'United Kingdom', 'Europe/Madrid': 'Spain',
  'Europe/Moscow': 'Russia', 'Europe/Oslo': 'Norway',
  'Europe/Paris': 'France', 'Europe/Prague': 'Czech Republic',
  'Europe/Rome': 'Italy', 'Europe/Stockholm': 'Sweden',
  'Europe/Vienna': 'Austria', 'Europe/Warsaw': 'Poland',
  'Europe/Zurich': 'Switzerland',
  'Pacific/Auckland': 'New Zealand', 'Pacific/Fiji': 'Fiji',
  'Pacific/Guam': 'Guam', 'Pacific/Honolulu': 'United States',
};

function cityFromTz(tz: string): string {
  const parts = tz.split('/');
  return (parts[parts.length - 1] || tz).replace(/_/g, ' ');
}

// Extra search aliases: maps IANA tz → additional search terms (unambiguous only)
const tzAliases: Record<string, string[]> = {
  // Destinations & islands
  'Asia/Makassar': ['Bali', 'WITA'],
  'Asia/Bangkok': ['Phuket', 'Koh Samui', 'Chiang Mai'],
  'Asia/Colombo': ['Maldives'],
  'America/Mexico_City': ['Cancun', 'Guadalajara'],
  'Africa/Nairobi': ['Zanzibar', 'Dar es Salaam', 'EAT'],
  'Asia/Dubai': ['Abu Dhabi', 'Mauritius', 'Gulf', 'GST'],
  'Europe/Athens': ['Santorini', 'Mykonos', 'Crete', 'EET'],
  'Europe/Madrid': ['Barcelona', 'Valencia', 'Ibiza', 'Mallorca', 'Seville'],
  'Atlantic/Canary': ['Tenerife', 'Gran Canaria', 'Lanzarote'],

  // Well-known cities not in IANA
  'America/Los_Angeles': ['San Francisco', 'Seattle', 'Portland', 'Las Vegas', 'California', 'West Coast', 'PST', 'PDT', 'Pacific Time'],
  'America/New_York': ['Boston', 'Miami', 'Atlanta', 'Detroit', 'Philadelphia', 'Washington DC', 'East Coast', 'EST', 'EDT', 'Eastern Time'],
  'America/Chicago': ['Dallas', 'Austin', 'Houston', 'Minneapolis', 'Nashville', 'CST', 'CDT', 'Central Time'],
  'America/Denver': ['Salt Lake City', 'MST', 'MDT', 'Mountain Time'],
  'Europe/Berlin': ['Munich', 'Frankfurt', 'Hamburg', 'Cologne', 'Bavaria', 'CET'],
  'Europe/Rome': ['Milan', 'Florence', 'Naples', 'Venice', 'Turin'],
  'Europe/Paris': ['Lyon', 'Marseille', 'Nice', 'Cannes'],
  'Asia/Tokyo': ['Osaka', 'Kyoto', 'Yokohama', 'JST'],
  'America/Toronto': ['Montreal', 'Ottawa', 'Ontario'],
  'Africa/Johannesburg': ['Cape Town', 'Durban', 'Pretoria', 'SAST'],
  'Asia/Riyadh': ['Doha', 'Qatar', 'Jeddah', 'AST'],
  'Asia/Ho_Chi_Minh': ['Hanoi', 'Da Nang'],
  'Africa/Casablanca': ['Marrakech', 'Fez', 'Tangier'],
  'Asia/Jakarta': ['Surabaya', 'Bandung', 'WIB'],
  'Asia/Manila': ['Cebu', 'PHT'],
  'Asia/Seoul': ['Busan', 'KST'],
  'Asia/Hong_Kong': ['Macau', 'HKT'],
  'Asia/Kolkata': ['Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Chennai', 'Hyderabad', 'IST'],
  'Asia/Shanghai': ['Beijing', 'Shenzhen', 'Guangzhou', 'Chengdu', 'CST'],
  'Europe/London': ['Manchester', 'Edinburgh', 'Glasgow', 'GMT', 'BST'],
  'Europe/Amsterdam': ['Rotterdam', 'The Hague'],
  'Europe/Lisbon': ['Porto', 'Algarve'],
  'Australia/Sydney': ['Canberra', 'AEST'],
  'Australia/Melbourne': ['Geelong'],
  'Australia/Brisbane': ['Gold Coast', 'Queensland'],
  'Australia/Perth': ['AWST', 'Western Australia'],
  'Pacific/Auckland': ['Wellington', 'Christchurch', 'NZST', 'NZDT'],
  'America/Vancouver': ['Victoria', 'British Columbia'],
  'America/Sao_Paulo': ['Rio de Janeiro', 'BRT'],
  'America/Argentina/Buenos_Aires': ['Cordoba', 'ART'],
  'Europe/Moscow': ['St Petersburg', 'MSK'],
  'Asia/Singapore': ['SGT'],
  'Europe/Zurich': ['Geneva', 'Basel', 'Bern'],
  'Europe/Vienna': ['Salzburg', 'Graz'],
  'Europe/Stockholm': ['Gothenburg', 'Malmö'],
  'Europe/Copenhagen': ['Aarhus'],
  'Europe/Oslo': ['Bergen', 'Stavanger'],
  'Europe/Helsinki': ['Tampere', 'EET'],
  'Europe/Warsaw': ['Krakow', 'Gdansk', 'Wroclaw'],
  'Europe/Prague': ['Brno'],
  'Europe/Budapest': ['Debrecen'],
  'Europe/Bucharest': ['Cluj'],
  'Asia/Taipei': ['Kaohsiung'],
  'Asia/Kuala_Lumpur': ['Penang', 'Johor Bahru', 'MYT'],
  'America/Anchorage': ['Alaska', 'AKST'],
  'Pacific/Honolulu': ['Hawaii', 'Maui', 'HST'],
};

export type TzOption = { label: string; value: string; keywords?: string[] };

export function buildTimezoneOptions(): TzOption[] {
  const zones = Intl.supportedValuesOf('timeZone');
  return zones.map(tz => {
    const city = cityFromTz(tz);
    const country = tzCountryMap[tz] || '';
    const label = country ? `${city}, ${country}` : city;
    const keywords = tzAliases[tz];
    return keywords ? { label, value: tz, keywords } : { label, value: tz };
  });
}
