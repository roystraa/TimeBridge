const PREFS_KEY = 'tb_preferences';
const GUESTS_KEY = 'tb_recent_guests';
const MAX_GUESTS = 10;

export type Preferences = {
  hostEmail: string;
  timezone: string;
  timeFormat: '24h' | '12h';
  meetingDuration: number;
  slotInterval: 60 | 30 | 15;
  hostStart: number;
  hostEnd: number;
};

export type SavedGuest = {
  id: string;
  name: string;
  timezone: string;
  email: string;
  officeStart: number;
  officeEnd: number;
  savedAt: number;
};

const defaultPrefs: Preferences = {
  hostEmail: '',
  timezone: '',
  timeFormat: '24h',
  meetingDuration: 60,
  slotInterval: 60,
  hostStart: 9,
  hostEnd: 17,
};

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...defaultPrefs };
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return { ...defaultPrefs };
  }
}

export function savePreferences(prefs: Partial<Preferences>): void {
  try {
    const current = loadPreferences();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
}

export function loadRecentGuests(): SavedGuest[] {
  try {
    const raw = localStorage.getItem(GUESTS_KEY);
    if (!raw) return [];
    const guests = JSON.parse(raw);
    return Array.isArray(guests) ? guests : [];
  } catch {
    return [];
  }
}

export function saveRecentGuest(guest: Omit<SavedGuest, 'id' | 'savedAt'>): void {
  try {
    const guests = loadRecentGuests();
    // Update existing guest with same timezone, or add new
    const existingIdx = guests.findIndex((g: SavedGuest) => g.timezone === guest.timezone);
    const entry: SavedGuest = {
      ...guest,
      id: existingIdx >= 0 ? guests[existingIdx].id : String(Date.now()),
      savedAt: Date.now(),
    };
    if (existingIdx >= 0) {
      guests[existingIdx] = entry;
    } else {
      guests.unshift(entry);
    }
    // Keep only the most recent guests
    localStorage.setItem(GUESTS_KEY, JSON.stringify(guests.slice(0, MAX_GUESTS)));
  } catch {
    // localStorage unavailable
  }
}

export function removeRecentGuest(id: string): void {
  try {
    const guests = loadRecentGuests().filter((g: SavedGuest) => g.id !== id);
    localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
  } catch {
    // localStorage unavailable
  }
}
