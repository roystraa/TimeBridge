<script lang="ts">
  let { tone = 'neutral', children } = $props();

  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-600',
    brand: 'bg-indigo-50 text-indigo-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
  };
</script>

<span class={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${tones[tone] ?? tones.neutral}`}>
  {@render children?.()}
</span>

