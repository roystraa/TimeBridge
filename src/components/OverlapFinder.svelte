<script lang="ts">
  import { formatInTimeZone } from 'date-fns-tz';
  import { Plus } from 'lucide-svelte';

  type CalEvent = { title: string; startHour: number; endHour: number };

  let {
    selectedDate,
    hostTimezone,
    guestTimezone,
    hostStart = 9,
    hostEnd = 17,
    guestStart = 9,
    guestEnd = 17,
    calendarEvents = [],
    timeFormat = '24h',
    slotInterval = 60,
    meetingDuration = 60,
    onAddSlot,
    onOverlapChange,
  } = $props<{
    selectedDate: string;
    hostTimezone: string;
    guestTimezone: string;
    hostStart: number;
    hostEnd: number;
    guestStart: number;
    guestEnd: number;
    calendarEvents?: CalEvent[];
    timeFormat?: '24h' | '12h';
    slotInterval?: number;
    meetingDuration?: number;
    onAddSlot: (ts: number) => void;
    onOverlapChange?: (hasOverlap: boolean) => void;
  }>();

  function tzHourToUTC(hour: number, tz: string): number {
    const pad = (n: number) => String(n).padStart(2, '0');
    const localStr = `${selectedDate}T${pad(hour)}:00:00`;
    const utcGuess = new Date(`${localStr}Z`);
    const formatted = formatInTimeZone(utcGuess, tz, 'yyyy-MM-dd HH:mm:ss');
    const diff = utcGuess.getTime() - new Date(`${formatted.replace(' ', 'T')}Z`).getTime();
    return new Date(`${localStr}Z`).getTime() + diff;
  }

  const dayStartUTC = $derived(tzHourToUTC(0, hostTimezone));

  const hostStartUTC = $derived(tzHourToUTC(hostStart, hostTimezone));
  const hostEndUTC = $derived(tzHourToUTC(hostEnd, hostTimezone));
  const guestStartUTC = $derived(tzHourToUTC(guestStart, guestTimezone));
  const guestEndUTC = $derived(tzHourToUTC(guestEnd, guestTimezone));

  const overlapStartUTC = $derived(Math.max(hostStartUTC, guestStartUTC));
  const overlapEndUTC = $derived(Math.min(hostEndUTC, guestEndUTC));
  const hasOverlap = $derived(overlapEndUTC - overlapStartUTC >= meetingDuration * 60 * 1000);

  $effect(() => {
    onOverlapChange?.(hasOverlap);
  });

  function toPercent(utcTs: number): number {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.min(100, ((utcTs - dayStartUTC) / dayMs) * 100));
  }

  // Convert calendar events to UTC ranges
  const calEventRanges = $derived(
    calendarEvents.map((ev: CalEvent) => ({
      title: ev.title,
      startUTC: tzHourToUTC(ev.startHour, hostTimezone),
      endUTC: tzHourToUTC(ev.endHour, hostTimezone),
    }))
  );

  function slotConflictsWithCal(slotStart: number, slotEnd: number): boolean {
    return calEventRanges.some((ev: { startUTC: number; endUTC: number }) => slotStart < ev.endUTC && slotEnd > ev.startUTC);
  }

  const suggestedSlots = $derived.by(() => {
    if (!hasOverlap) return [];
    const slots: number[] = [];
    const stepMs = Math.min(slotInterval, meetingDuration) * 60 * 1000;
    const durationMs = meetingDuration * 60 * 1000;
    let cursor = overlapStartUTC;
    while (cursor + durationMs <= overlapEndUTC) {
      if (!slotConflictsWithCal(cursor, cursor + durationMs)) {
        slots.push(cursor);
      }
      cursor += stepMs;
    }
    return slots;
  });

  function formatSlotTime(ts: number, tz: string): string {
    const fmt = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
    return formatInTimeZone(new Date(ts), tz, fmt);
  }

  type NearestSlot = { utcTs: number; hostTime: string; guestTime: string; note: string };

  const nearestSlots = $derived.by((): NearestSlot[] => {
    if (hasOverlap) return [];
    const stepMin = Math.min(slotInterval, meetingDuration);
    const stepMs = stepMin * 60 * 1000;
    const slots: NearestSlot[] = [];

    // Two gap directions: host ends before guest starts, or guest ends before host starts
    const gapA = guestStartUTC - hostEndUTC;
    const gapB = hostStartUTC - guestEndUTC;

    // Normalize gaps (they wrap around 24h if negative)
    const dayMs = 24 * 60 * 60 * 1000;
    const gapANorm = gapA >= 0 ? gapA : gapA + dayMs;
    const gapBNorm = gapB >= 0 ? gapB : gapB + dayMs;

    // Pick the smaller gap — that's the "nearest" edge
    const useGapA = gapANorm <= gapBNorm;
    const baseTs = useGapA ? hostEndUTC : guestEndUTC;

    const count = meetingDuration <= 30 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const ts = baseTs + i * stepMs;
      const offset = i * stepMin;
      slots.push({
        utcTs: ts,
        hostTime: formatSlotTime(ts, hostTimezone),
        guestTime: formatSlotTime(ts, guestTimezone),
        note: i === 0 ? 'Closest' : `+${offset}m`,
      });
    }

    return slots;
  });

  // Guest hour for a given host-local hour
  function hostHourToGuestHour(h: number): string {
    const utc = tzHourToUTC(h, hostTimezone);
    return formatInTimeZone(new Date(utc), guestTimezone, 'H');
  }

  const hours = Array.from({ length: 25 }, (_, i) => i);

  function cityName(tz: string): string {
    return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  }
</script>

<div class="space-y-3">
  <!-- Outlook-style schedule grid -->
  <div class="rounded-xl border border-slate-200 overflow-hidden">
    <!-- Hour header -->
    <div class="flex">
      <div class="w-16 shrink-0"></div>
      <div class="flex-1 relative h-5 bg-slate-50 border-b border-slate-200">
        {#each hours as h}
          <div
            class="absolute top-0 h-full border-l {h % 6 === 0 ? 'border-slate-300' : 'border-slate-200/60'}"
            style="left: {(h / 24) * 100}%"
          ></div>
          {#if h % 2 === 0 && h < 24}
            <span
              class="absolute top-1 text-[9px] font-medium text-slate-400 -translate-x-1/2"
              style="left: {(h / 24) * 100}%"
            >{timeFormat === '12h' ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h-12}p`) : `${h}:00`}</span>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Host row -->
    <div class="flex border-b border-slate-100">
      <div class="w-16 shrink-0 px-1.5 py-1.5 bg-slate-50/50 border-r border-slate-200 flex flex-col justify-center">
        <span class="text-[9px] font-bold text-blue-600 uppercase tracking-wider leading-tight">Host</span>
        <span class="text-[8px] text-slate-400 leading-tight truncate">{cityName(hostTimezone)}</span>
      </div>
      <div class="flex-1 relative h-8 bg-white">
        {#each hours as h}
          <div
            class="absolute top-0 h-full border-l {h % 6 === 0 ? 'border-slate-200' : 'border-slate-100/60'}"
            style="left: {(h / 24) * 100}%"
          ></div>
        {/each}
        <div
          class="absolute top-1 bottom-1 rounded bg-blue-200 border border-blue-300/60"
          style="left: {toPercent(hostStartUTC)}%; width: {toPercent(hostEndUTC) - toPercent(hostStartUTC)}%"
        ></div>
        {#each calEventRanges as ev}
          <div
            class="absolute top-1 bottom-1 rounded bg-red-300/80 border border-red-400/60 flex items-center justify-center overflow-hidden"
            style="left: {toPercent(ev.startUTC)}%; width: {toPercent(ev.endUTC) - toPercent(ev.startUTC)}%"
            title={ev.title}
          >
            <span class="text-[7px] font-bold text-red-900 truncate px-0.5">{ev.title}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Guest row -->
    <div class="flex border-b border-slate-100">
      <div class="w-16 shrink-0 px-1.5 py-1.5 bg-slate-50/50 border-r border-slate-200 flex flex-col justify-center">
        <span class="text-[9px] font-bold text-amber-600 uppercase tracking-wider leading-tight">Guest</span>
        <span class="text-[8px] text-slate-400 leading-tight truncate">{cityName(guestTimezone)}</span>
      </div>
      <div class="flex-1 relative h-8 bg-white">
        {#each hours as h}
          <div
            class="absolute top-0 h-full border-l {h % 6 === 0 ? 'border-slate-200' : 'border-slate-100/60'}"
            style="left: {(h / 24) * 100}%"
          ></div>
        {/each}
        <div
          class="absolute top-1 bottom-1 rounded bg-amber-200 border border-amber-300/60"
          style="left: {toPercent(guestStartUTC)}%; width: {toPercent(guestEndUTC) - toPercent(guestStartUTC)}%"
        ></div>
      </div>
    </div>

    <!-- Overlap row -->
    <div class="flex">
      <div class="w-16 shrink-0 px-1.5 py-1.5 bg-slate-50/50 border-r border-slate-200 flex flex-col justify-center">
        <span class="text-[9px] font-bold text-emerald-600 uppercase tracking-wider leading-tight">Overlap</span>
      </div>
      <div class="flex-1 relative h-8 bg-white">
        {#each hours as h}
          <div
            class="absolute top-0 h-full border-l {h % 6 === 0 ? 'border-slate-200' : 'border-slate-100/60'}"
            style="left: {(h / 24) * 100}%"
          ></div>
        {/each}
        {#if hasOverlap}
          <div
            class="absolute top-1 bottom-1 rounded bg-emerald-300 border border-emerald-400/60"
            style="left: {toPercent(overlapStartUTC)}%; width: {toPercent(overlapEndUTC) - toPercent(overlapStartUTC)}%"
          ></div>
        {:else}
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-[10px] text-red-400 font-medium">No overlap</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Guest timezone hour reference -->
    <div class="flex border-t border-slate-200">
      <div class="w-16 shrink-0 px-1.5 py-0.5 bg-slate-50/50 border-r border-slate-200">
        <span class="text-[8px] text-slate-400">Guest hrs</span>
      </div>
      <div class="flex-1 relative h-4 bg-slate-50/50">
        {#each hours as h}
          <div
            class="absolute top-0 h-full border-l {h % 6 === 0 ? 'border-slate-300' : 'border-slate-200/60'}"
            style="left: {(h / 24) * 100}%"
          ></div>
          {#if h % 2 === 0 && h < 24}
            <span
              class="absolute top-0.5 text-[9px] font-medium text-amber-500 -translate-x-1/2"
              style="left: {(h / 24) * 100}%"
            >{hostHourToGuestHour(h)}</span>
          {/if}
        {/each}
      </div>
    </div>
  </div>

  <!-- Suggested slots -->
  {#if hasOverlap}
    <div>
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Available {meetingDuration}min slots ({suggestedSlots.length})
      </p>
      <div class="flex flex-wrap gap-2">
        {#each suggestedSlots as ts}
          <button
            type="button"
            onclick={() => onAddSlot(ts)}
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all active:scale-[0.97]"
          >
            <Plus size={14} />
            {formatSlotTime(ts, hostTimezone)}
            <span class="text-emerald-500/70">→</span>
            <span class="text-amber-700">{formatSlotTime(ts, guestTimezone)}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div>
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Nearest available times
      </p>
      <p class="text-[10px] text-slate-400 mb-2">No office hours overlap — these are the closest slots where you could still meet:</p>
      <div class="flex flex-wrap gap-2">
        {#each nearestSlots as slot}
          <button
            type="button"
            onclick={() => onAddSlot(slot.utcTs)}
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-[0.97]"
          >
            <Plus size={14} />
            {slot.hostTime}
            <span class="text-amber-400">→</span>
            <span class="text-blue-600">{slot.guestTime}</span>
            <span class="text-[9px] text-amber-400 font-normal">({slot.note})</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
