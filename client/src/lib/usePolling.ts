import { onMounted, onUnmounted } from "vue";

// useForegroundRefresh only fires on a hidden->visible transition, so a view
// that's been sitting open and foregrounded the whole time (Ethan's iPad,
// left on the dashboard) never picks up a change someone else made elsewhere
// (a parent recording a credit, a sibling marking eggs). This polls on an
// interval while the tab/app stays visible, so an already-open session
// doesn't go stale indefinitely.
export function usePolling(callback: () => void | Promise<void>, intervalMs = 60000) {
  let refreshing = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function tick() {
    if (refreshing || document.visibilityState !== "visible") return;
    refreshing = true;
    try {
      await callback();
    } catch (e) {
      // Don't let one failed poll (a dropped LAN request) poison future ticks.
      console.error("usePolling: refresh failed", e);
    } finally {
      refreshing = false;
    }
  }

  onMounted(() => {
    timer = setInterval(tick, intervalMs);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });
}
