<script lang="ts">
  let { padding = 'lg', tone = 'default', className = '', children } = $props();

  const paddings: Record<string, string> = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const tones: Record<string, string> = {
    default: 'bg-white border border-slate-200 shadow-sm',
    elevated: 'bg-white border border-slate-100 shadow-xl shadow-slate-200/60',
    soft: 'bg-white/90 border border-white shadow-lg shadow-indigo-100/40 backdrop-blur',
  };
</script>

<section class={`rounded-2xl ${paddings[padding] ?? paddings.lg} ${tones[tone] ?? tones.default} ${className}`}>
  {@render children?.()}
</section>

