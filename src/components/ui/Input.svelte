<script lang="ts">
  let { id = '', type = 'text', value = $bindable(''), label = '', placeholder = '', required = false, error = '', children = undefined } = $props();
  const inputClass = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-500 outline-none transition-all shadow-sm';
</script>

<div class="w-full">
  {#if label}
    <label for={id} class="block text-sm font-semibold text-slate-600 mb-1.5 ml-1">
      {label}{#if required}<span class="text-red-500">*</span>{/if}
    </label>
  {/if}
  <input
    {id}
    {type}
    bind:value
    class={inputClass}
    {placeholder}
    aria-invalid={error ? 'true' : 'false'}
    aria-describedby={error ? `${id}-error` : undefined}
  />
  {#if error}
    <p id={`${id}-error`} class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
  {@render children?.()}
  </div>
