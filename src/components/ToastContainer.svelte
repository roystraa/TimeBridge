<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade, fly } from 'svelte/transition';
  import { CheckCircle, AlertCircle, Info, X } from 'lucide-svelte';
  import type { ToastType } from '../lib/toast';
  import { toasts } from '../lib/toast';

  const icons: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  };

  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    error: 'bg-red-50 text-red-800 border-red-100',
    info: 'bg-blue-50 text-blue-800 border-blue-100'
  };

  const iconColors: Record<ToastType, string> = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    info: 'text-blue-500'
  };
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
  {#each $toasts as toast (toast.id)}
    <div
      animate:flip={{ duration: 250 }}
      in:fly={{ y: 16, duration: 220 }}
      out:fade={{ duration: 150 }}
      class="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg {colors[toast.type]}"
    >
      <div class="shrink-0 mt-0.5 {iconColors[toast.type]}">
        <svelte:component this={icons[toast.type]} size={20} />
      </div>

      <p class="flex-1 text-sm font-semibold leading-tight">
        {toast.message}
      </p>

      <button
        type="button"
        onclick={() => toasts.dismiss(toast.id)}
        class="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  {/each}
</div>

