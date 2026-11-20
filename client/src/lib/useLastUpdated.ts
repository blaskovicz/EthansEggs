import { computed, onMounted, onUnmounted, ref } from "vue";

// Polling and foreground-refresh happen silently in the background, so a kid
// staring at an open iPad has no way to tell the page is actually alive
// versus stuck. This ticks a "time since last refresh" label every second so
// that's visible at a glance - call markUpdated() after each successful load.
export function useLastUpdated() {
  const lastUpdated = ref<number | null>(null);
  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;

  function markUpdated() {
    lastUpdated.value = Date.now();
    now.value = lastUpdated.value;
  }

  const label = computed(() => {
    if (lastUpdated.value === null) return "";
    const seconds = Math.max(0, Math.floor((now.value - lastUpdated.value) / 1000));
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Updated ${minutes}m ${seconds % 60}s ago`;
  });

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { label, markUpdated };
}
