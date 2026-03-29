<script lang="ts">
  import { Calendar, Globe, Download, ExternalLink } from 'lucide-svelte';
  import { formatInTimeZone } from 'date-fns-tz';
  import { toasts } from '../lib/toast';
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
</script>

<Card tone="elevated">
  <div class="mb-8">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-2xl font-bold text-slate-800">{title || 'Proposed Meeting Times'}</h2>
      <div class="flex gap-2 flex-wrap justify-end">
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
          <tr class="hover:bg-slate-50/50 transition-colors group">
            <td class="px-6 py-5">
              <span class="text-slate-700 font-bold">{formatDate(timestamp)}</span>
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
              <div class="flex items-center gap-2 justify-end">
                <a
                  href={googleCalendarUrl(timestamp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all"
                >
                  <ExternalLink size={14} />
                  Google
                </a>
                <Button variant="outline" size="md" onClick={() => addToCalendar(timestamp)}>
                  <Download size={14} />
                  .ics
                </Button>
              </div>
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
      <strong>Google</strong> opens Google Calendar directly. <strong>.ics</strong> downloads a file for Outlook, Apple Calendar, or any other calendar app.
    </p>
  </div>
</Card>
