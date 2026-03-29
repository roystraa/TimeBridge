<script lang="ts">
  import { onMount } from 'svelte';
  import SlotPicker from './components/SlotPicker.svelte';
  import GuestView from './components/GuestView.svelte';
  import ToastContainer from './components/ToastContainer.svelte';
  import Button from './components/ui/Button.svelte';
  import Card from './components/ui/Card.svelte';
  import Tag from './components/ui/Tag.svelte';
  import Divider from './components/ui/Divider.svelte';
  import { toasts } from './lib/toast';
  import { loadPreferences } from './lib/storage';
  import { QrCode } from 'qrcode-svelte';
  import { Clock, Share2, ArrowLeft, Sparkles, Copy, Mail, MessageCircle, Send, Share, Link } from 'lucide-svelte';

  let slots = $state<number[]>([]);
  let isGuest = $state(false);
  let hostTimezone = $state("");
  let shareUrl = $state("");
  let showQr = $state(false);
  let meetingMeta = $state<{ title: string; description: string; hostEmail: string; duration: number }>({ title: '', description: '', hostEmail: '', duration: 60 });

  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  onMount(() => {
    // Load saved host email preference
    const prefs = loadPreferences();
    if (prefs.hostEmail) {
      meetingMeta.hostEmail = prefs.hostEmail;
    }
    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    if (data) {
      try {
        const decoded = JSON.parse(atob(data));
        if (Array.isArray(decoded)) {
          // Legacy format: plain array of timestamps
          const parsed = decoded.filter((x: unknown): x is number => typeof x === 'number' && Number.isFinite(x));
          slots = parsed;
          hostTimezone = 'UTC';
          isGuest = true;
        } else if (decoded && typeof decoded === 'object' && Array.isArray(decoded.slots)) {
          // New format: { tz, slots, title?, desc?, email?, dur? }
          const parsed = decoded.slots.filter((x: unknown): x is number => typeof x === 'number' && Number.isFinite(x));
          slots = parsed;
          hostTimezone = typeof decoded.tz === 'string' ? decoded.tz : 'UTC';
          meetingMeta = {
            title: typeof decoded.title === 'string' ? decoded.title : '',
            description: typeof decoded.desc === 'string' ? decoded.desc : '',
            hostEmail: typeof decoded.email === 'string' ? decoded.email : '',
            duration: typeof decoded.dur === 'number' ? decoded.dur : 60,
          };
          isGuest = true;
        } else {
          toasts.error('Invalid link data.');
        }
      } catch {
        toasts.error('Invalid link data.');
      }
    }
  });

  async function handleShare(meta: { title: string; description: string; hostEmail: string; duration: number }) {
    if (slots.length === 0) {
      toasts.info('Add at least one slot first.');
      return;
    }
    meetingMeta = meta;
    const payload: Record<string, unknown> = { tz: localTimezone, slots };
    if (meta.title) payload.title = meta.title;
    if (meta.description) payload.desc = meta.description;
    if (meta.hostEmail) payload.email = meta.hostEmail;
    if (meta.duration !== 60) payload.dur = meta.duration;
    const data = btoa(JSON.stringify(payload));
    const url = `${window.location.origin}${window.location.pathname}?data=${data}`;
    shareUrl = url;
    showQr = true;
    try {
      await navigator.clipboard.writeText(url);
      toasts.success('Link copied to clipboard.');
    } catch {
      toasts.error('Could not copy link. You can still share it manually.');
    }
  }

  function reset() {
    window.history.replaceState({}, '', window.location.pathname);
    isGuest = false;
    slots = [];
  }
</script>

<main class="relative min-h-screen overflow-hidden bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
  <div class="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl"></div>

  <div class="relative max-w-4xl mx-auto">
    <div class="text-center mb-6">
      <div class="inline-flex items-center gap-3 mb-1">
        <div class="inline-flex items-center justify-center p-2 bg-indigo-100 rounded-xl text-indigo-600">
          <Clock size={24} strokeWidth={2.5} />
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">TimeBridge</h1>
      </div>
      <p class="text-sm text-slate-500">Cross-timezone meetings made simple.</p>
    </div>

    {#if isGuest}
      <div class="mb-6 flex justify-start">
        <Button variant="ghost" size="md" onClick={reset}>
          <ArrowLeft size={18} />
          Create your own meeting
        </Button>
      </div>
      <GuestView {slots} {hostTimezone} title={meetingMeta.title} description={meetingMeta.description} hostEmail={meetingMeta.hostEmail} duration={meetingMeta.duration} />
    {:else}
      <SlotPicker bind:slots onShare={handleShare} />
    {/if}

    {#if showQr && !isGuest}
      <Card tone="soft" className="mt-8 text-center">
        <h3 class="text-lg font-semibold mb-4 text-slate-800 flex items-center justify-center gap-2">
          <Share2 size={20} class="text-indigo-600" />
          Share with your guest
        </h3>

        <div class="flex justify-center mb-5">
          <div class="p-4 bg-white border-4 border-slate-50 rounded-2xl shadow-inner">
            <QrCode value={shareUrl} svgClass="w-40 h-40" />
          </div>
        </div>

        <p class="text-xs text-slate-400 mb-4 break-all max-w-md mx-auto font-mono">
          {shareUrl}
        </p>

        <!-- Share buttons -->
        <div class="flex flex-wrap justify-center gap-3 mb-5">
          <button
            onclick={async () => {
              try { await navigator.clipboard.writeText(shareUrl); toasts.success('Link copied!'); } catch { toasts.error('Could not copy.'); }
            }}
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
          >
            <Copy size={16} />
            Copy link
          </button>
          <a
            href="https://wa.me/?text={encodeURIComponent((meetingMeta.title ? meetingMeta.title + ' — ' : '') + 'Check out these meeting times: ' + shareUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-all"
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
          <a
            href="https://t.me/share/url?url={encodeURIComponent(shareUrl)}&text={encodeURIComponent((meetingMeta.title ? meetingMeta.title + ' — ' : '') + 'Pick a meeting time')}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-all"
          >
            <Send size={16} />
            Telegram
          </a>
          <a
            href="mailto:?subject={encodeURIComponent(meetingMeta.title || 'Meeting Time Options')}&body={encodeURIComponent('Hi,\n\n' + (meetingMeta.title ? 'Re: ' + meetingMeta.title + '\n\n' : '') + 'Please check the proposed meeting times and pick one that works for you:\n\n' + shareUrl + '\n\nSent via TimeBridge')}"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all"
          >
            <Mail size={16} />
            Email
          </a>
          {#if typeof navigator !== 'undefined' && 'share' in navigator}
            <button
              onclick={async () => {
                try {
                  await navigator.share({
                    title: meetingMeta.title || 'Meeting Time Options',
                    text: (meetingMeta.title ? meetingMeta.title + ' — ' : '') + 'Pick a meeting time that works for you',
                    url: shareUrl,
                  });
                } catch (e) {
                  if ((e as Error).name !== 'AbortError') toasts.error('Could not share.');
                }
              }}
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all"
            >
              <Share size={16} />
              More...
            </button>
          {/if}
        </div>

        <Divider className="mb-4" />
        <Button variant="secondary" size="md" onClick={() => showQr = false}>
          Close
        </Button>
      </Card>
    {/if}
    <ToastContainer />
  </div>
</main>
