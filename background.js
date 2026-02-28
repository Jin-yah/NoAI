// Set default values on first install; migrate key on updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Blocker level is device-specific
    chrome.storage.local.set({ blockerLevel: "Hidden" });
    // Pull any existing cloud count down (e.g. re-install on a known device)
    syncBlockedCount();
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // Migrate old split-key design: localBlockedCount (local delta) + blockedCount (sync total)
    // Collapse any unsync'd local delta into the new unified local key, then sync.
    chrome.storage.local.get({ localBlockedCount: 0, blockedCount: 0 }, (localData) => {
      const migrated =
        (Number(localData.blockedCount) || 0) +
        (Number(localData.localBlockedCount) || 0);
      chrome.storage.local.set({ blockedCount: migrated, localBlockedCount: 0 }, () => {
        syncBlockedCount();
      });
    });
  }
});

// On browser startup pull the cloud count so a new/re-logged-in device is up to date
chrome.runtime.onStartup.addListener(() => {
  syncBlockedCount();
});

// Create a periodic alarm for syncing the blocked count
chrome.alarms.create("syncBlockedCount", {
  periodInMinutes: 1,
});

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncBlockedCount") {
    syncBlockedCount();
  }
});

// Sync strategy: both local and cloud store the full running total.
// Whichever side is higher wins; both are updated to the max.
function syncBlockedCount() {
  chrome.storage.local.get({ blockedCount: 0 }, (localData) => {
    chrome.storage.sync.get({ blockedCount: 0 }, (syncData) => {
      const localCount = Number(localData.blockedCount) || 0;
      const syncCount = Number(syncData.blockedCount) || 0;
      const merged = Math.max(localCount, syncCount);
      if (merged !== syncCount) {
        chrome.storage.sync.set({ blockedCount: merged });
      }
      if (merged !== localCount) {
        chrome.storage.local.set({ blockedCount: merged });
      }
    });
  });
}

// Listen for web navigation events
chrome.webNavigation.onCompleted.addListener(
  (details) => {
    // Check if the navigation is in the main frame and not an iframe
    if (details.frameId === 0) {
      chrome.storage.local.get("blockerLevel", (data) => {
        if (data.blockerLevel == "Blocked") {
          // Increment the count for any navigation to a Google search page
          incrementLocalBlockCount();
        }
      });
    }
  },
  {
    // Filter for Google search pages
    url: [{ hostContains: ".google.", pathPrefix: "/search" }],
  }
);

// Helper: increment local blockedCount in storage by 1
function incrementLocalBlockCount() {
  chrome.storage.local.get({ blockedCount: 0 }, (data) => {
    const next = Number(data.blockedCount || 0) + 1;
    chrome.storage.local.set({ blockedCount: next });
  });
}
