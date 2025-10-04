window.addEventListener("pageshow", function (event) {
  // When a page is restored from bfcache, its visibility might be hidden
  if (event.persisted) {
    document.documentElement.style.visibility = "visible";
  }
});

function initializeNoAI() {
  chrome.storage.local.get({ blockerLevel: "Hidden" }, function (data) {
    const level = data.blockerLevel;

    switch (level) {
      case "Off":
        // Do nothing
        break;
      case "Hidden":
        // Hide AI results via CSS injection
        hideAIResults();
        break;
      case "Blocked":
        // Append '-noai' via redirect
        modifySearchQuery("-noai");
        hideAIResults();
        break;
    }
  });
}

// This function was largely adapted from zbarnz "Google_AI_Overviews_Blocker" (https://github.com/zbarnz/Google_AI_Overviews_Blocker) extension
function hideAIResults() {
  const patterns = [
    /übersicht mit ki/i, // de
    /ai overview/i, // en
    /prezentare generală generată de ai/i, // ro
    /AI による概要/, // ja
    /Обзор от ИИ/, // ru
    /AI 摘要/, // zh-TW
    /AI-overzicht/i, // nl
    /Vista creada con IA/i, // es
    /Přehled od AI/i, // cz
  ];

  const observer = new MutationObserver(() => {
    // each time there's a mutation in the document see if there's an ai overview to hide
    const mainBody = document.querySelector("div#rcnt");
    const aiText = [...(mainBody?.querySelectorAll("h1, h2") || [])].find((e) =>
      patterns.some((pattern) => pattern.test(e.innerText))
    );

    var aiOverview = aiText?.closest("div#rso > div"); // AI overview as a search result
    if (!aiOverview) aiOverview = aiText?.closest("div#rcnt > div"); // AI overview above search results

    // Hide AI overview
    if (aiOverview && aiOverview.style.display !== "none") {
      aiOverview.style.display = "none";
      incrementLocalBlockCount();
      console.log("NoAI: Hid AI overview");
    }

    // Restore padding after header tabs
    const headerTabs = document.querySelector("div#hdtb-sc > div");
    if (headerTabs) headerTabs.style.paddingBottom = "12px";

    // For debugging
    // console.log([...mainBody?.querySelectorAll('h1, h2')].map(e => { return { text: e.innerText, obj: e }}));
    const mainElement = document.querySelector('[role="main"]');
    if (mainElement) {
      mainElement.style.marginTop = "24px";
    }

    // Remove entries in "People also ask" section if it contains "AI overview"
    const peopleAlsoAskAll = [
      ...document.querySelectorAll("div.related-question-pair"),
    ];

    const peopleAlsoAskAiOverviews = peopleAlsoAskAll.filter((el) =>
      patterns.some((pattern) => pattern.test(el.innerHTML))
    );

    let blockedCount = 0;

    peopleAlsoAskAiOverviews.forEach((el) => {
      const aiOverview = el.parentElement.parentElement;
      if (aiOverview.style.display !== "none") {
        aiOverview.style.display = "none";
        blockedCount++;
        console.log("NoAI: Hid People also ask AI overview");
      }
    });

    incrementLocalBlockCount(blockedCount);

    if (
      peopleAlsoAskAiOverviews.length == peopleAlsoAskAll.length &&
      peopleAlsoAskAll.length > 0
    ) {
      const sectionWrapper = peopleAlsoAskAll[0].closest(".MjjYud");
      if (sectionWrapper && sectionWrapper.style.display !== "none") {
        sectionWrapper.style.display = "none";
        console.log("NoAI: Hid entire People also ask section");
      }
    }
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });
}

// Helper: increment localBlockedCount in storage by a given amount
function incrementLocalBlockCount(amount = 1) {
  if (amount === 0) return;
  chrome.storage.local.get({ localBlockedCount: 0 }, (data) => {
    const next = Number(data.localBlockedCount || 0) + amount;
    chrome.storage.local.set({ localBlockedCount: next });
  });
}

function modifySearchQuery(suffix) {
  // Hide the page immediately to prevent flicker
  document.documentElement.style.visibility = "hidden";

  const url = new URL(window.location.href);
  const q = url.searchParams.get("q");

  const spacedSuffix = " " + suffix;

  if (q && !q.includes(suffix)) {
    // If the query is clean, append the suffix and reload
    url.searchParams.set("q", q + spacedSuffix);
    window.location.replace(url.toString());
  } else {
    // Not redirecting, so make the page visible.
    document.documentElement.style.visibility = "visible";
    if (q && q.includes(suffix)) {
      // If the query has the suffix, clean the UI
      document.addEventListener("DOMContentLoaded", () =>
        cleanUI(q, spacedSuffix)
      );
    }
  }
}

function cleanUI(originalQuery, spacedSuffix) {
  // 1. Clean the address bar
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.set("q", originalQuery.replace(spacedSuffix, ""));
  history.replaceState({}, "", cleanUrl.toString());

  // 2. Clean the document title
  if (document.title.includes(spacedSuffix)) {
    document.title = document.title.replace(spacedSuffix, "");
  }

  // 3. Clean the search box
  const cleanSearchBox = () => {
    let searchBox = document.querySelector(
      'textarea[name="q"], input[name="q"]'
    );
    if (searchBox && searchBox.value.includes(spacedSuffix)) {
      searchBox.value = searchBox.value.replace(spacedSuffix, "");
    }
  };

  // 4. Clean suggestion dropdown items (omnibox-like suggestions rendered on the page)
  // Google renders suggestions in a listbox; items are often divs or li elements.
  // We'll target common container role/name attributes and textContent.
  const suggestionSelectors = [
    'div[role="listbox"]',
    'ul[role="listbox"]',
    'div[jsname="erkvQe"]', // common suggestion container
  ];

  const cleanSuggestions = () => {
    suggestionSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((container) => {
        // Remove suffix from any text nodes inside suggestion items
        const items = container.querySelectorAll("*");
        items.forEach((node) => {
          if (
            node.childElementCount === 0 &&
            node.textContent &&
            node.textContent.includes(spacedSuffix)
          ) {
            node.textContent = node.textContent.replaceAll(spacedSuffix, "");
          }
          // Also check attributes like aria-label which may be used by screen readers
          if (
            node.getAttribute &&
            node.getAttribute("aria-label") &&
            node.getAttribute("aria-label").includes(spacedSuffix)
          ) {
            node.setAttribute(
              "aria-label",
              node.getAttribute("aria-label").replaceAll(spacedSuffix, "")
            );
          }
        });
      });
    });
  };

  // Run clean function and observe for dynamic changes (suggestions update as user types)
  cleanSearchBox();
  cleanSuggestions();
  new MutationObserver(() => {
    cleanSearchBox();
    cleanSuggestions();
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Run clean function and observe for dynamic changes
  cleanSearchBox();
  new MutationObserver(cleanSearchBox).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

initializeNoAI();
