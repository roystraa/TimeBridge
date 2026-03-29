<script lang="ts">
  let { open = $bindable(false), title = '', children } = $props();
  function close() { open = false; }
  function onKey(e: KeyboardEvent) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') close(); }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40" role="button" tabindex="0" aria-label="Close dialog" onclick={close} onkeydown={onKey}></div>
    <div class="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6" role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
      {#if title}
        <h3 class="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      {/if}
      {@render children?.()}
    </div>
  </div>
{/if}
