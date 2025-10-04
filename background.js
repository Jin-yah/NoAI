// Set default values on installation
chrome.runtime.onInstalled.addListener(() => {
  // Blocker level is device-specific
  chrome.storage.local.set({ blockerLevel: "Hidden" });
  // Synced count starts at 0
  chrome.storage.sync.set({ blockedCount: 0 });
  // Local count also starts at 0
  chrome.storage.local.set({ localBlockedCount: 0 });
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

// Function to sync the local count to the synced count
function syncBlockedCount() {
  chrome.storage.local.get({ localBlockedCount: 0 }, (localData) => {
    if (localData.localBlockedCount > 0) {
      chrome.storage.sync.get({ blockedCount: 0 }, (syncData) => {
        const newTotal =
          (syncData.blockedCount || 0) + (localData.localBlockedCount || 0);
        chrome.storage.sync.set({ blockedCount: newTotal }, () => {
          // After successful sync, reset the local count
          chrome.storage.local.set({ localBlockedCount: 0 });
        });
      });
    }
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

// Helper: increment localBlockedCount in storage by 1
function incrementLocalBlockCount() {
  chrome.storage.local.get({ localBlockedCount: 0 }, (data) => {
    const next = Number(data.localBlockedCount || 0) + 1;
    chrome.storage.local.set({ localBlockedCount: next });
  });
}
