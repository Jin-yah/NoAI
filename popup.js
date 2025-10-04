const slider = document.getElementById("levelSlider");
const currentMode = document.getElementById("current-mode");
const modeDesc = document.getElementById("mode-desc");
const blockedCountEl = document.getElementById("blocked-count");

const levels = ["Off", "Hidden", "Blocked"];

const descriptions = {
  Off: "Extension is disabled.",
  Hidden: "Hides automatic AI responses from Google results.",
  Blocked:
    "Blocks AI responses by appending '-noai' to searches; search results may be slightly affected.",
};

function setModeUI(level) {
  currentMode.textContent = level;
  modeDesc.textContent = descriptions[level] || "";
}

function updateSliderFill() {
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  const value = parseInt(slider.value);
  const fillPercent = ((value - min) / (max - min)) * 100;
  slider.style.setProperty("--fill-percent", fillPercent + "%");
}

function updateTotalBlockedCount() {
  chrome.storage.sync.get({ blockedCount: 0 }, (syncData) => {
    chrome.storage.local.get({ localBlockedCount: 0 }, (localData) => {
      const total = (syncData.blockedCount || 0) + (localData.localBlockedCount || 0);
      blockedCountEl.textContent = total;
    });
  });
}

// Load saved settings and update the UI
function loadSettings() {
  chrome.storage.local.get({ blockerLevel: "Hidden" }, (data) => {
    const level = data.blockerLevel;
    slider.value = Math.max(0, levels.indexOf(level));
    setModeUI(level || "Hidden");
    updateSliderFill();
  });
  updateTotalBlockedCount();
}

// Update UI and save setting when the slider value changes
slider.addEventListener("input", function () {
  const level = levels[slider.value];
  setModeUI(level);
  chrome.storage.local.set({ blockerLevel: level });
  updateSliderFill();
});

// Listen for updates to the blocked count in both sync and local storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.blockedCount || changes.localBlockedCount) {
    updateTotalBlockedCount();
  }
});

// Initial load
loadSettings();
