<script lang="ts">
  type Option = { label: string; value: string; keywords?: string[] };
  type FilteredOption = Option & { matchedKeyword?: string };

  let { options = [], value = $bindable(''), placeholder = 'Search…', label = '' } = $props<{
    options: Option[];
    value: string;
    placeholder?: string;
    label?: string;
  }>();

  const initialLabel = value ? options.find((o: Option) => o.value === value)?.label ?? '' : '';
  let query = $state(initialLabel);
  let open = $state(false);

  function findMatch(opt: Option, q: string): FilteredOption | null {
    const lower = q.toLowerCase();
    if (opt.label.toLowerCase().includes(lower)) return opt;
    const hit = opt.keywords?.find((k: string) => k.toLowerCase().includes(lower));
    if (hit) return { ...opt, matchedKeyword: hit };
    return null;
  }

  const filtered = $derived<FilteredOption[]>(
    query
      ? options.reduce((acc: FilteredOption[], o: Option) => {
          if (acc.length >= 8) return acc;
          const m = findMatch(o, query);
          if (m) acc.push(m);
          return acc;
        }, [])
      : options.slice(0, 8)
  );

  function select(opt: Option) {
    value = opt.value;
    query = opt.label;
    open = false;
  }

  function handleInput() {
    open = true;
    if (!query) value = '';
  }

  function handleFocus() {
    open = true;
  }

  function handleBlur() {
    setTimeout(() => { open = false; }, 150);
  }
</script>

<div class="w-full relative">
  {#if label}
    <label class="block text-sm font-semibold text-slate-600 mb-1.5 ml-1">{label}</label>
  {/if}
  <input
    type="text"
    bind:value={query}
    {placeholder}
    oninput={handleInput}
    onfocus={handleFocus}
    onblur={handleBlur}
    class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-500 outline-none transition-all shadow-sm"
  />
  {#if open && filtered.length > 0}
    <ul class="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
      {#each filtered as opt}
        <li>
          <button
            type="button"
            class="w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors {opt.value === value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'}"
            onmousedown={() => select(opt)}
            onclick={() => select(opt)}
          >
            {opt.label}{#if opt.matchedKeyword} <span class="text-slate-400">({opt.matchedKeyword})</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
