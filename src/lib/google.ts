import { formatInTimeZone } from 'date-fns-tz';
import { saveGoogleToken, loadGoogleToken, clearGoogleToken } from './storage';

// TypeScript declarations for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }): TokenClient;
          revoke(token: string, callback?: () => void): void;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

type CalEvent = { title: string; startHour: number; endHour: number };

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[];
  };
}

interface CreateEventParams {
  title: string;
  description: string;
  startTime: number; // UTC timestamp
  duration: number; // minutes
  timezone: string;
  attendeeEmail?: string;
}

interface CreateEventResult {
  eventUrl: string;
  meetLink: string;
}

// --- State ---
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const CAL_API = 'https://www.googleapis.com/calendar/v3';

let tokenClient: TokenClient | null = null;
let accessToken = '';
let tokenExpiry = 0;

// --- Auth ---

export function isGisLoaded(): boolean {
  return !!window.google?.accounts?.oauth2;
}

export function isSignedIn(): boolean {
  return !!accessToken && !isTokenExpired();
}

export function isTokenExpired(): boolean {
  return tokenExpiry > 0 && Date.now() > tokenExpiry;
}

export function getAccessToken(): string {
  return accessToken;
}

function setToken(token: string, expiresIn: number) {
  accessToken = token;
  tokenExpiry = Date.now() + expiresIn * 1000;
  saveGoogleToken(token, tokenExpiry);
}

export function restoreToken(): boolean {
  const stored = loadGoogleToken();
  if (stored && stored.expiry > Date.now()) {
    accessToken = stored.token;
    tokenExpiry = stored.expiry;
    return true;
  }
  clearGoogleToken();
  return false;
}

export function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isGisLoaded()) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    if (!tokenClient) {
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: TokenResponse) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          setToken(response.access_token, response.expires_in);
          resolve(response.access_token);
        },
      });
    }

    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function revokeToken(): void {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = '';
  tokenExpiry = 0;
  tokenClient = null;
  clearGoogleToken();
}

// --- Calendar API ---

export async function fetchCalendarEvents(date: string, timezone: string): Promise<CalEvent[]> {
  if (!accessToken) return [];

  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  // Convert local day boundaries to ISO strings
  const timeMin = new Date(formatInTimeZone(new Date(`${dayStart}Z`), timezone, "yyyy-MM-dd'T'HH:mm:ssXXX")).toISOString();
  const timeMax = new Date(formatInTimeZone(new Date(`${dayEnd}Z`), timezone, "yyyy-MM-dd'T'HH:mm:ssXXX")).toISOString();

  const params = new URLSearchParams({
    timeMin: `${date}T00:00:00.000Z`,
    timeMax: `${date}T23:59:59.999Z`,
    singleEvents: 'true',
    orderBy: 'startTime',
    timeZone: timezone,
  });

  const res = await fetch(`${CAL_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) {
    // Token expired
    accessToken = '';
    tokenExpiry = 0;
    clearGoogleToken();
    throw new Error('TOKEN_EXPIRED');
  }

  if (!res.ok) {
    throw new Error(`Calendar API error: ${res.status}`);
  }

  const data = await res.json();
  const events: CalEvent[] = [];

  for (const item of data.items || []) {
    const ev = item as GoogleCalendarEvent;
    if (!ev.start?.dateTime || !ev.end?.dateTime) continue; // Skip all-day events

    const startHour = parseHourInTimezone(ev.start.dateTime, timezone);
    const endHour = parseHourInTimezone(ev.end.dateTime, timezone);

    events.push({
      title: ev.summary || 'Busy',
      startHour,
      endHour,
    });
  }

  return events;
}

function parseHourInTimezone(isoString: string, timezone: string): number {
  const d = new Date(isoString);
  const timeStr = formatInTimeZone(d, timezone, 'H.mm');
  const [h, m] = timeStr.split('.');
  return Number(h) + Number(m) / 60;
}

export async function createCalendarEvent(params: CreateEventParams): Promise<CreateEventResult> {
  if (!accessToken) throw new Error('Not signed in');

  const start = new Date(params.startTime);
  const end = new Date(params.startTime + params.duration * 60 * 1000);

  const body: Record<string, unknown> = {
    summary: params.title || 'Meeting via TimeBridge',
    description: params.description || 'Scheduled using TimeBridge',
    start: {
      dateTime: start.toISOString(),
      timeZone: params.timezone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: params.timezone,
    },
    conferenceData: {
      createRequest: {
        requestId: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  if (params.attendeeEmail) {
    body.attendees = [{ email: params.attendeeEmail }];
  }

  const res = await fetch(`${CAL_API}/calendars/primary/events?conferenceDataVersion=1`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    accessToken = '';
    tokenExpiry = 0;
    clearGoogleToken();
    throw new Error('TOKEN_EXPIRED');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Calendar API error: ${res.status} ${JSON.stringify(errData)}`);
  }

  const created = await res.json();
  const meetLink = created.conferenceData?.entryPoints?.find(
    (ep: { entryPointType: string; uri: string }) => ep.entryPointType === 'video'
  )?.uri || '';

  return {
    eventUrl: created.htmlLink || '',
    meetLink,
  };
}
