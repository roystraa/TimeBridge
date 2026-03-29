<script lang="ts">
  let { variant = 'primary', size = 'md', disabled = false, type = 'button' as 'button' | 'submit' | 'reset', children, onClick = undefined as ((e: MouseEvent) => any) | undefined } = $props();
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3',
  };
  const variants: Record<string, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/80 focus-visible:ring-indigo-500',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 focus-visible:ring-slate-400',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white focus-visible:ring-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500',
  };
</script>

<button class={`${base} ${sizes[size]} ${variants[variant]}`} {type} {disabled} onclick={onClick}>
  {@render children?.()}
</button>
