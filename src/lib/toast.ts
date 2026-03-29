import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);
  let nextId = 1;

  function dismiss(id: number) {
    update((all) => all.filter((t) => t.id !== id));
  }

  function add(message: string, type: ToastType = 'info', duration = 3000) {
    const id = nextId++;
    update((all) => [{ id, message, type }, ...all]);
    if (duration > 0) window.setTimeout(() => dismiss(id), duration);
  }

  return {
    subscribe,
    add,
    dismiss,
    success: (m: string, duration?: number) => add(m, 'success', duration),
    error: (m: string, duration?: number) => add(m, 'error', duration),
    info: (m: string, duration?: number) => add(m, 'info', duration),
  };
}

export const toasts = createToastStore();

