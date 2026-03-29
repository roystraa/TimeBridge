<script lang="ts">
  import { Calendar, Globe, Download, ExternalLink, Check, Copy, MessageCircle, Mail, CalendarCheck, Video } from 'lucide-svelte';
  import { formatInTimeZone } from 'date-fns-tz';
  import { toasts } from '../lib/toast';
  import { isGisLoaded, isSignedIn, requestAccessToken, createCalendarEvent } from '../lib/google';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Tag from './ui/Tag.svelte';
  import Divider from './ui/Divider.svelte';

  let { slots = [], hostTimezone = 'UTC', title = '', description = '', hostEmail = '', duration = 60 } = $props<{
    slots: number[];
    hostTimezone: string;
    title?: string;
    description?: string;
    hostEmail?: string;
    duration?: number;
  }>();
  const guestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Accept flow state
  let acceptedSlot = $state<number | null>(null);
  let meetLink = $state('');
  let eventUrl = $state('');
  let accepting = $state(false);
  let expandedSlot = $state<number | null>(null);
  let guestGoogleConnected = $state(false);

  function formatTime(timestamp: number, tz: string = guestTimezone) {
    return formatInTimeZone(new Date(timestamp), tz, 'h:mm a');
  }

  function formatDate(timestamp: number, tz: string = guestTimezone) {
    return formatInTimeZone(new Date(timestamp), tz, 'EEE, MMM d');
  }

  function addToCalendar(timestamp: number) {
    const date = new Date(timestamp);
    const startDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = new Date(timestamp + duration * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${title || 'Meeting via TimeBridge'}`,
      `DESCRIPTION:${description || 'Scheduled using TimeBridge'}`,
    ];
    if (hostEmail) {
      lines.push(`ORGANIZER;CN=Host:mailto:${hostEmail}`);
    }
    if (meetLink) {
      lines.push(`LOCATION:${meetLink}`);
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');
    const icsContent = lines.join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meeting.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    acceptedSlot = timestamp;
    toasts.success('Downloaded .ics file.');
  }

  function googleCalendarUrl(timestamp: number): string {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = fmt(new Date(timestamp));
    const end = fmt(new Date(timestamp + duration * 60 * 1000));
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title || 'Meeting via TimeBridge',
      dates: `${start}/${end}`,
      details: description || 'Scheduled using TimeBridge',
    });
    if (hostEmail) params.set('add', hostEmail);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  async function connectGuestGoogle() {
    if (!isGisLoaded()) {
      toasts.error('Google login wordt geladen, probeer het opnieuw.');
      return;
    }
    try {
      await requestAccessToken();
      guestGoogleConnected = true;
      toasts.success('Google Calendar verbonden');
    } catch {
      toasts.error('Kon niet verbinden met Google.');
    }
  }

  async function acceptWithGoogle(timestamp: number) {
    accepting = true;
    try {
      const result = await createCalendarEvent({
        title: title || 'Meeting via TimeBridge',
        description: description || 'Scheduled using TimeBridge',
        startTime: timestamp,
        duration: duration,
        timezone: guestTimezone,
        attendeeEmail: hostEmail || undefined,
      });
      meetLink = result.meetLink;
      eventUrl = result.eventUrl;
      acceptedSlot = timestamp;
      expandedSlot = null;
      toasts.success('Event aangemaakt in Google Calendar!');
    } catch (err) {
      toasts.error('Kon event niet aanmaken: ' + (err as Error).message);
    }
    accepting = false;
  }

  function acceptedTimeText(timestamp: number): string {
    return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
  }

  function confirmWhatsAppUrl(): string {
    const time = acceptedSlot ? acceptedTimeText(acceptedSlot) : '';
    let msg = `I've accepted ${time}`;
    if (title) msg += ` for "${title}"`;
    if (meetLink) msg += `\n\nMeet link: ${meetLink}`;
    msg += '\n\nSent via TimeBridge';
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function confirmEmailUrl(): string {
    const time = acceptedSlot ? acceptedTimeText(acceptedSlot) : '';
    const subject = title ? `Accepted: ${title}` : 'Meeting Time Accepted';
    let body = `Hi,\n\nI've accepted ${time}`;
    if (title) body += ` for "${title}"`;
    body += '.';
    if (meetLink) body += `\n\nMeet link: ${meetLink}`;
    body += '\n\nSent via TimeBridge';
    return `mailto:${hostEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
</script>

<Card tone="elevated">
  <div class="mb-8">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-2xl font-bold text-slate-800">{title || 'Proposed Meeting Times'}</h2>
      <div class="flex gap-2 flex-wrap justify-end items-center">
        {#if !guestGoogleConnected && !acceptedSlot}
          <button
            type="button"
            onclick={connectGuestGoogle}
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all"
          >
            <CalendarCheck size={12} />
            Connect Google
          </button>
        {/if}
        <Tag tone="neutral">
          <Globe size={14} />
          Host: {hostTimezone.split('/').pop()?.replace('_', ' ')}
        </Tag>
        <Tag tone="brand">
          <Globe size={14} />
          You: {guestTimezone.split('/').pop()?.replace('_', ' ')}
        </Tag>
      </div>
    </div>
    {#if description}
      <p class="text-sm text-slate-500 mb-2">{description}</p>
    {/if}
    <div class="flex items-center gap-3 text-xs text-slate-400">
      {#if hostEmail}
        <span>Organizer: {hostEmail}</span>
      {/if}
      <span>Duration: {duration}min</span>
    </div>
  </div>

  <!-- Accepted confirmation -->
  {#if acceptedSlot}
    <div class="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
      <div class="flex items-center gap-2 mb-3">
        <div class="p-1 bg-emerald-100 rounded-full">
          <Check size={16} class="text-emerald-600" />
        </div>
        <span class="text-sm font-semibold text-emerald-800">
          Accepted: {acceptedTimeText(acceptedSlot)}
        </span>
      </div>
      {#if meetLink}
        <div class="flex items-center gap-2 mb-3 p-2.5 bg-white rounded-lg border border-emerald-100">
          <Video size={16} class="text-indigo-600 shrink-0" />
          <a href={meetLink} target="_blank" rel="noopener noreferrer" class="text-sm text-indigo-600 font-medium hover:underline truncate">{meetLink}</a>
          <button
            type="button"
            onclick={async () => { try { await navigator.clipboard.writeText(meetLink); toasts.success('Meet link gekopieerd!'); } catch { toasts.error('Kon niet kopiëren.'); }}}
            class="shrink-0 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Copy size={14} />
          </button>
        </div>
      {/if}
      <p class="text-xs text-emerald-600 mb-2 font-medium">Send confirmation to the host:</p>
      <div class="flex flex-wrap gap-2">
        <a
          href={confirmWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-all"
        >
          <MessageCircle size={14} />
          WhatsApp
        </a>
        {#if hostEmail}
          <a
            href={confirmEmailUrl()}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all"
          >
            <Mail size={14} />
            Email
          </a>
        {/if}
      </div>
    </div>
  {/if}

  <div class="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-slate-50/50 border-b border-slate-100">
          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Host Time</th>
          <th class="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Your Local Time</th>
          <th class="px-6 py-4"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-50">
        {#each slots as timestamp}
          <tr class="transition-colors {acceptedSlot === timestamp ? 'bg-emerald-50/50' : acceptedSlot ? 'opacity-40' : 'hover:bg-slate-50/50'} group">
            <td class="px-6 py-5">
              <div class="flex items-center gap-2">
                {#if acceptedSlot === timestamp}
                  <Check size={16} class="text-emerald-600" />
                {/if}
                <span class="text-slate-700 font-bold">{formatDate(timestamp)}</span>
              </div>
            </td>
            <td class="px-6 py-5">
              <div class="flex flex-col">
                <span class="text-slate-600 font-medium">{formatTime(timestamp, hostTimezone)}</span>
                <span class="text-slate-400 text-xs">{formatDate(timestamp, hostTimezone)}</span>
              </div>
            </td>
            <td class="px-6 py-5">
              <div class="flex flex-col">
                <span class="text-indigo-600 font-extrabold text-lg leading-none">{formatTime(timestamp)}</span>
                <span class="text-slate-400 text-xs font-medium">{formatDate(timestamp)}</span>
              </div>
            </td>
            <td class="px-6 py-5 text-right">
              {#if acceptedSlot === timestamp}
                <span class="text-xs font-semibold text-emerald-600">Accepted</span>
              {:else if !acceptedSlot}
                {#if expandedSlot === timestamp}
                  <!-- Expanded accept options -->
                  <div class="flex flex-col gap-1.5 items-end">
                    {#if guestGoogleConnected || isSignedIn()}
                      <button
                        type="button"
                        disabled={accepting}
                        onclick={() => acceptWithGoogle(timestamp)}
                        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all disabled:opacity-50 w-full justify-center"
                      >
                        <CalendarCheck size={14} />
                        {accepting ? 'Creating...' : 'Google Calendar + Meet'}
                      </button>
                    {/if}
                    <a
                      href={googleCalendarUrl(timestamp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onclick={() => { acceptedSlot = timestamp; }}
                      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all w-full justify-center"
                    >
                      <ExternalLink size={14} />
                      Open in Google Calendar
                    </a>
                    <button
                      type="button"
                      onclick={() => addToCalendar(timestamp)}
                      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all w-full justify-center"
                    >
                      <Download size={14} />
                      Download .ics
                    </button>
                    <button
                      type="button"
                      onclick={() => expandedSlot = null}
                      class="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                    >Cancel</button>
                  </div>
                {:else}
                  <Button variant="primary" size="md" onClick={() => expandedSlot = timestamp}>
                    <Check size={16} />
                    Accept
                  </Button>
                {/if}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <Divider className="my-8" />

  <div class="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
    <Calendar size={20} class="text-amber-600 shrink-0 mt-0.5" />
    <p class="text-sm text-amber-800 leading-relaxed font-medium">
      Click <strong>Accept</strong> to choose a time slot. You can add it to Google Calendar (with Meet link), open it in Google Calendar, or download an .ics file.
    </p>
  </div>
</Card>
