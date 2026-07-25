import { onMounted, onUnmounted } from "vue";

// iOS home-screen "standalone" web apps have no pull-to-refresh and no browser
// chrome, and Safari suspends the WKWebView across backgrounding rather than
// reloading it - so data fetched once on mount goes stale until the user
// force-quits and relaunches. This re-runs a view's own load function whenever
// the app is foregrounded again, so reopening the app from the background has
// the same effect as a fresh launch without a jarring full reload.
export function useForegroundRefresh(callback: () => void | Promise<void>) {
  let refreshing = false;

  async function trigger() {
    if (refreshing) return;
    refreshing = true;
    try {
      await callback();
    } finally {
      refreshing = false;
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "visible") {
      trigger();
    }
  }

  // Safari can restore a page from the back-forward cache without firing
  // visibilitychange - pageshow with persisted:true covers that case.
  function onPageShow(event: PageTransitionEvent) {
    if (event.persisted) {
      trigger();
    }
  }

  onMounted(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pageshow", onPageShow);
  });
}
