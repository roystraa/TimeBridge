<script lang="ts">
  import { onMount } from 'svelte';
  import { Clock, Plus, Trash2, Send, Settings, ChevronDown, ChevronUp, CalendarCheck, UserPlus, X, AlertTriangle } from 'lucide-svelte';
  import { toasts } from '../lib/toast';
  import { loadPreferences, savePreferences, loadRecentGuests, saveRecentGuest, removeRecentGuest, type SavedGuest } from '../lib/storage';
  import { isGisLoaded, isSignedIn, isTokenExpired, requestAccessToken, revokeToken, restoreToken, fetchCalendarEvents } from '../lib/google';
  import Input from './ui/Input.svelte';
  import Button from './ui/Button.svelte';
  import Card from './ui/Card.svelte';
  import Tag from './ui/Tag.svelte';
  import Divider from './ui/Divider.svelte';
  import Select from './ui/Select.svelte';
  import OverlapFinder from './OverlapFinder.svelte';
  import { buildTimezoneOptions } from '../lib/timezones';

  let { slots = $bindable([]), onShare } = $props<{
    slots: number[];
    onShare?: (meta: { title: string; description: string; hostEmail: string; duration: number }) => void;
  }>();

  let selectedDate = $state("");
  let manualTime = $state("");
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let localTimezone = $state(detectedTimezone);

  // Guest timezone & office hours
  let guestTimezone = $state("");
  let hostStart = $state(9);
  let hostEnd = $state(17);
  let guestStart = $state(9);
  let guestEnd = $state(17);
  let showSettings = $state(false);
  let showCustomTime = $state(false);
  let noOverlap = $state(false);
  let timeFormat = $state<'24h' | '12h'>('24h');
  let slotInterval = $state<60 | 30 | 15>(60);
  let meetingDuration = $state(60);
  let hostEmail = $state('');
  let meetingTitle = $state('');
  let meetingDescription = $state('');

  // Recent guests
  let recentGuests = $state<SavedGuest[]>([]);
  let guestName = $state('');

  // Load saved preferences + restore Google token on mount
  onMount(() => {
    const prefs = loadPreferences();
    if (prefs.timezone) localTimezone = prefs.timezone;
    if (prefs.hostEmail) hostEmail = prefs.hostEmail;
    timeFormat = prefs.timeFormat;
    meetingDuration = prefs.meetingDuration;
    slotInterval = prefs.slotInterval;
    hostStart = prefs.hostStart;
    hostEnd = prefs.hostEnd;
    calDetailLevel = prefs.calDetailLevel;
    recentGuests = loadRecentGuests();
    if (restoreToken()) {
      calConnected = true;
    }
  });

  // Auto-save preferences when they change
  $effect(() => {
    savePreferences({
      timezone: localTimezone,
      hostEmail,
      timeFormat,
      meetingDuration,
      slotInterval,
      hostStart,
      hostEnd,
      calDetailLevel,
    });
  });

  function selectRecentGuest(guest: SavedGuest) {
    guestTimezone = guest.timezone;
    guestName = guest.name;
    guestStart = guest.officeStart;
    guestEnd = guest.officeEnd;
    toasts.success(`Loaded settings for ${guest.name || guest.timezone.split('/').pop()?.replace(/_/g, ' ')}`);
  }

  function saveCurrentGuest() {
    if (!guestTimezone) return;
    const name = guestName || guestTimezone.split('/').pop()?.replace(/_/g, ' ') || guestTimezone;
    saveRecentGuest({
      name,
      timezone: guestTimezone,
      email: '',
      officeStart: guestStart,
      officeEnd: guestEnd,
    });
    recentGuests = loadRecentGuests();
    toasts.success(`Saved ${name} to recent guests`);
  }

  function deleteRecentGuest(id: string) {
    removeRecentGuest(id);
    recentGuests = loadRecentGuests();
  }

  // Google Calendar integration
  let calConnected = $state(false);
  let calLoading = $state(false);
  let calExpired = $state(false);
  let calDetailLevel = $state<'busy' | 'title' | 'full'>('title');

  type CalEvent = { title: string; startHour: number; endHour: number };
  let calendarEvents = $state<CalEvent[]>([]);
  let calFetching = $state(false);

  // Note: Google token restored in the preferences onMount below

  // Fetch real calendar events when date or connection changes
  $effect(() => {
    if (calConnected && selectedDate && !isTokenExpired()) {
      calFetching = true;
      calExpired = false;
      fetchCalendarEvents(selectedDate, localTimezone)
        .then(events => {
          calendarEvents = events;
          calFetching = false;
        })
        .catch(err => {
          calFetching = false;
          if (err.message === 'TOKEN_EXPIRED') {
            calExpired = true;
            calConnected = false;
            calendarEvents = [];
            toasts.error('Google sessie verlopen. Verbind opnieuw.');
          } else {
            toasts.error('Kon agenda niet laden.');
          }
        });
    } else if (!calConnected) {
      calendarEvents = [];
    }
  });

  // Apply detail level filter for display
  const displayEvents = $derived<CalEvent[]>(
    calendarEvents.map(ev => ({
      ...ev,
      title: calDetailLevel === 'busy' ? 'Busy' : ev.title,
    }))
  );

  async function connectCalendar() {
    if (!isGisLoaded()) {
      toasts.error('Google login wordt geladen, probeer het opnieuw.');
      return;
    }
    calLoading = true;
    try {
      await requestAccessToken();
      calConnected = true;
      calExpired = false;
      toasts.success('Google Calendar verbonden');
    } catch {
      toasts.error('Kon niet verbinden met Google.');
    }
    calLoading = false;
  }

  function disconnectCalendar() {
    revokeToken();
    calConnected = false;
    calExpired = false;
    calendarEvents = [];
    toasts.info('Calendar losgekoppeld');
  }

  const tzOptions = buildTimezoneOptions();

  let weekOffset = $state(0);
  let showCalendar = $state(false);

  const visibleDays = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + weekOffset * 7 + i);
      const value = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      return { value, weekday, day, month };
    })
  );

  // Calendar month data
  const calendarMonth = $derived.by(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const days: { value: string; day: number; past: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const value = date.toISOString().split('T')[0];
      days.push({ value, day: d, past: value < today });
    }
    return { monthLabel, firstDay, days };
  });

  function addSlotFromOverlap(ts: number) {
    if (slots.includes(ts)) {
      toasts.info('That slot is already added.');
      return;
    }
    slots = [...slots, ts].sort((a, b) => a - b);
    toasts.success('Slot added.');
  }

  function addManualSlot() {
    if (!selectedDate || !manualTime) return;

    const dt = new Date(`${selectedDate}T${manualTime}`);
    const ts = dt.getTime();

    if (!Number.isFinite(ts)) {
      toasts.error('Invalid date/time.');
      return;
    }

    if (slots.includes(ts)) {
      toasts.info('That slot is already added.');
      return;
    }

    slots = [...slots, ts].sort((a, b) => a - b);
    manualTime = "";
    toasts.success('Slot added.');
  }

  function removeSlot(index: number) {
    slots = slots.filter((_: number, i: number) => i !== index);
    toasts.info('Slot removed.');
  }

  function formatLocal(timestamp: number) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }
</script>

<Card tone="elevated">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-xl font-bold text-slate-800">1. Select Meeting Slots</h2>
    <div class="flex items-center gap-2">
      {#if calConnected}
        <Tag tone="brand">
          <CalendarCheck size={12} />
          Calendar
        </Tag>
      {/if}
      <Tag tone="neutral">{localTimezone}</Tag>
      <button
        type="button"
        onclick={() => showSettings = !showSettings}
        class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
        aria-label="Office hours settings"
      >
        <Settings size={16} />
      </button>
    </div>
  </div>

  <!-- Office hours settings (collapsible) -->
  {#if showSettings}
    <div class="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
      <!-- Google Calendar -->
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Calendar</p>
        {#if calConnected}
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
              <CalendarCheck size={13} />
              Google Calendar verbonden
              {#if calFetching}<span class="animate-spin text-[10px]">⏳</span>{/if}
            </span>
            <button
              type="button"
              onclick={disconnectCalendar}
              class="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
            >Disconnect</button>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-slate-400 mr-1">Detail:</span>
            {#each [['busy', 'Bezet/Vrij'], ['title', 'Titel'], ['full', 'Alles']] as [val, label]}
              <button type="button" onclick={() => calDetailLevel = val as 'busy' | 'title' | 'full'}
                class="px-2 py-0.5 text-[10px] rounded border transition-all {calDetailLevel === val ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}">{label}</button>
            {/each}
          </div>
        {:else}
          <button
            type="button"
            disabled={calLoading}
            onclick={connectCalendar}
            class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-50"
          >
            {#if calLoading}
              <span class="animate-spin text-sm">⏳</span> Verbinden…
            {:else}
              <CalendarCheck size={13} />
              Connect Google Calendar
            {/if}
          </button>
        {/if}
      </div>

      <Divider />

      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Host Timezone</p>
        <Select
          options={tzOptions}
          bind:value={localTimezone}
          placeholder="Search city or country…"
        />
        {#if localTimezone !== detectedTimezone}
          <button
            type="button"
            onclick={() => localTimezone = detectedTimezone}
            class="mt-1 text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors"
          >Reset to detected ({detectedTimezone.split('/').pop()?.replace(/_/g, ' ')})</button>
        {/if}
      </div>

      <Divider />

      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Office Hours</p>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <p class="text-xs text-slate-600 font-medium">Host</p>
          <div class="flex items-center gap-2">
            <input type="number" min="0" max="23" bind:value={hostStart}
              class="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center" />
            <span class="text-slate-400 text-sm">to</span>
            <input type="number" min="0" max="23" bind:value={hostEnd}
              class="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center" />
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-slate-600 font-medium">Guest</p>
          <div class="flex items-center gap-2">
            <input type="number" min="0" max="23" bind:value={guestStart}
              class="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center" />
            <span class="text-slate-400 text-sm">to</span>
            <input type="number" min="0" max="23" bind:value={guestEnd}
              class="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-center" />
          </div>
        </div>
      </div>

      <Divider />

      <div class="space-y-1">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Host Email</p>
        <input
          type="email"
          bind:value={hostEmail}
          placeholder="your@email.com"
          class="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all"
        />
        <p class="text-[10px] text-slate-400">Added as organizer in the calendar invite</p>
      </div>

      <Divider />

      <div class="grid grid-cols-3 gap-3">
        <div class="space-y-1">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Time Format</p>
          <div class="flex gap-1">
            <button type="button" onclick={() => timeFormat = '24h'}
              class="px-2.5 py-1 text-xs rounded-md border transition-all {timeFormat === '24h' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}">24h</button>
            <button type="button" onclick={() => timeFormat = '12h'}
              class="px-2.5 py-1 text-xs rounded-md border transition-all {timeFormat === '12h' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}">AM/PM</button>
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Duration</p>
          <div class="flex gap-1 flex-wrap">
            {#each [30, 45, 60, 90] as dur}
              <button type="button" onclick={() => meetingDuration = dur}
                class="px-2 py-1 text-xs rounded-md border transition-all {meetingDuration === dur ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}">{dur}m</button>
            {/each}
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Interval</p>
          <div class="flex gap-1">
            {#each [60, 30, 15] as interval}
              <button type="button" onclick={() => slotInterval = interval as 60 | 30 | 15}
                class="px-2.5 py-1 text-xs rounded-md border transition-all {slotInterval === interval ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}">{interval}m</button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Token expiry banner -->
  {#if calExpired}
    <div class="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle size={14} class="text-amber-600 shrink-0" />
      <span class="text-xs text-amber-700 flex-1">Google sessie verlopen</span>
      <button
        type="button"
        onclick={connectCalendar}
        class="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
      >Opnieuw verbinden</button>
    </div>
  {/if}

  <!-- Recent guests -->
  {#if recentGuests.length > 0}
    <div class="mb-3">
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">Recent Guests</p>
      <div class="flex flex-wrap gap-2">
        {#each recentGuests as guest}
          <div class="group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
            <button
              type="button"
              onclick={() => selectRecentGuest(guest)}
              class="flex items-center gap-1.5"
            >
              <span class="text-slate-700">{guest.name}</span>
              <span class="text-slate-400">({guest.officeStart}–{guest.officeEnd}h)</span>
            </button>
            <button
              type="button"
              onclick={() => deleteRecentGuest(guest.id)}
              class="p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Remove guest"
            >
              <X size={12} />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Guest timezone + date on one row -->
  <div class="mb-4 flex flex-wrap gap-3 items-end">
    <div class="flex-1 min-w-[200px]">
      <Select
        options={tzOptions}
        bind:value={guestTimezone}
        label="Guest's Timezone"
        placeholder="Search city or country…"
      />
    </div>
    {#if guestTimezone}
      <div class="flex items-center gap-1.5">
        <input
          type="text"
          bind:value={guestName}
          placeholder="Guest name"
          class="w-28 px-2.5 py-2 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all"
        />
        <button
          type="button"
          onclick={saveCurrentGuest}
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all"
          title="Save guest for quick access"
        >
          <UserPlus size={14} />
          Save
        </button>
      </div>
    {/if}
  </div>

  <!-- Day picker (shown after timezone selected) -->
  {#if guestTimezone}
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-sm font-semibold text-slate-600 ml-1">Date</p>
        <button
          type="button"
          onclick={() => showCalendar = !showCalendar}
          class="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
        >
          {showCalendar ? 'Week view' : 'Month view'}
        </button>
      </div>

      {#if showCalendar}
        <!-- Monthly calendar -->
        <div class="bg-white border border-slate-200 rounded-xl p-3">
          <div class="flex items-center justify-between mb-2">
            <button type="button" onclick={() => weekOffset = Math.max(0, weekOffset - 4)} class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">&larr;</button>
            <span class="text-xs font-semibold text-slate-600">{calendarMonth.monthLabel}</span>
            <button type="button" onclick={() => weekOffset += 4} class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">&rarr;</button>
          </div>
          <div class="grid grid-cols-7 gap-0.5 text-center">
            {#each ['Su','Mo','Tu','We','Th','Fr','Sa'] as wd}
              <span class="text-[9px] font-medium text-slate-400 py-1">{wd}</span>
            {/each}
            {#each Array(calendarMonth.firstDay) as _}
              <span></span>
            {/each}
            {#each calendarMonth.days as d}
              <button
                type="button"
                disabled={d.past}
                onclick={() => { selectedDate = d.value; showCalendar = false; }}
                class="py-1 text-xs rounded-md transition-all {d.past ? 'text-slate-200 cursor-not-allowed' : selectedDate === d.value ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:bg-indigo-50'}"
              >{d.day}</button>
            {/each}
          </div>
        </div>
      {:else}
        <!-- Week strip -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            disabled={weekOffset === 0}
            onclick={() => weekOffset--}
            class="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition-colors"
          >&lsaquo;</button>
          <div class="flex gap-1.5 flex-1 justify-between">
            {#each visibleDays as day}
              <button
                type="button"
                data-day={day.value}
                onclick={() => selectedDate = day.value}
                class="flex-1 flex flex-col items-center py-1.5 rounded-lg text-center transition-all {selectedDate === day.value ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}"
              >
                <span class="text-[9px] font-medium uppercase {selectedDate === day.value ? 'text-indigo-200' : 'text-slate-400'}">{day.weekday}</span>
                <span class="text-sm font-bold leading-tight">{day.day}</span>
                <span class="text-[9px] {selectedDate === day.value ? 'text-indigo-200' : 'text-slate-400'}">{day.month}</span>
              </button>
            {/each}
          </div>
          <button
            type="button"
            onclick={() => weekOffset++}
            class="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >&rsaquo;</button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Overlap + available slots -->
  {#if guestTimezone && selectedDate}
    <div class="mb-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
      <OverlapFinder
        {selectedDate}
        hostTimezone={localTimezone}
        {guestTimezone}
        {hostStart}
        {hostEnd}
        {guestStart}
        {guestEnd}
        calendarEvents={displayEvents}
        {timeFormat}
        {slotInterval}
        {meetingDuration}
        onOverlapChange={(has) => noOverlap = !has}
        onAddSlot={addSlotFromOverlap}
      />

      <!-- Manual time picker -->
      <div class="mt-3">
        {#if showCustomTime || noOverlap}
          <p class="text-xs font-semibold text-slate-500 mb-2">Pick a time (host timezone)</p>
          <div class="grid grid-cols-6 gap-1">
            {#each Array.from({ length: Math.floor((16 * 60) / slotInterval) }, (_, i) => {
              const totalMin = 7 * 60 + i * slotInterval;
              const h = Math.floor(totalMin / 60);
              const m = totalMin % 60;
              const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              if (timeFormat === '12h') {
                const period = h >= 12 ? 'PM' : 'AM';
                const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                return { value: time24, display: `${h12}:${String(m).padStart(2, '0')} ${period}` };
              }
              return { value: time24, display: time24 };
            }) as time}
              <button
                type="button"
                onclick={() => { manualTime = time.value; addManualSlot(); }}
                class="px-1 py-1.5 text-[11px] rounded-md border transition-all
                  border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
              >{time.display}</button>
            {/each}
          </div>
        {:else}
          <div class="flex justify-end">
            <button
              type="button"
              onclick={() => showCustomTime = true}
              class="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Clock size={13} />
              Custom time
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Selected slots -->
  {#if slots.length > 0}
    <div class="space-y-1.5 mb-4">
      {#each slots as timestamp, i}
        <div class="flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 inline-flex items-center justify-center text-[10px] font-bold">
              {i + 1}
            </div>
            <span class="text-slate-700 font-medium text-sm">
              {formatLocal(timestamp)}
            </span>
          </div>
          <button
            onclick={() => removeSlot(i)}
            class="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"
            aria-label="Remove slot"
          >
            <Trash2 size={18} />
          </button>
        </div>
      {/each}
    </div>

    <Divider className="mb-3" />

    <div class="space-y-2 mb-3">
      <input
        type="text"
        bind:value={meetingTitle}
        placeholder="Meeting title (e.g. Project Kickoff)"
        class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all"
      />
      <textarea
        bind:value={meetingDescription}
        placeholder="Description or agenda (optional)"
        rows="2"
        class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all resize-none"
      ></textarea>
    </div>

    <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
      <p class="text-xs text-slate-400 font-medium">
        {slots.length} {slots.length === 1 ? 'slot' : 'slots'} selected
      </p>
      <Button variant="primary" size="lg" onClick={() => { toasts.info('Generating share link…'); onShare?.({ title: meetingTitle, description: meetingDescription, hostEmail, duration: meetingDuration }); }}>
        <Send size={20} />
        Generate Share Link
      </Button>
    </div>
  {:else if !guestTimezone}
    <div class="text-center py-8 px-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
      <Clock size={20} class="mx-auto text-slate-300 mb-2" />
      <p class="text-slate-400 text-sm">Select a guest timezone and date to find available slots.</p>
    </div>
  {/if}
</Card>
