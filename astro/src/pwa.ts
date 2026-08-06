// Service worker registration, deliberately outside the client:only AppRoot
// island.
//
// This used to live in StatusBar.svelte, which only runs once the island
// hydrates. That created a deadlock: a stale worker serving an index.html
// whose asset hashes no longer exist stops the island from hydrating, so the
// registration that would have updated that worker never runs, and every
// reload lands on the same blank page. Registering here means the update path
// survives a broken app bundle.
import { registerSW } from "virtual:pwa-register";

const NEED_REFRESH_EVENT = "pwa:need-refresh";
const APPLY_UPDATE_EVENT = "pwa:apply-update";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // The island usually mounts after this fires, so latch it on the document
    // as well: StatusBar reads the flag on mount and would otherwise miss the
    // event entirely.
    document.documentElement.dataset.pwaNeedRefresh = "true";
    window.dispatchEvent(new Event(NEED_REFRESH_EVENT));
  },
});

// The refresh button lives in the app UI, which cannot reach this module
// directly.
window.addEventListener(APPLY_UPDATE_EVENT, () => {
  void updateSW(true);
});
