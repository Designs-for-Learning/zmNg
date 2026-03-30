/**
 * Background service worker for zmNinjaNG Kiosk Config extension.
 *
 * Reads chrome.storage.managed (set by Google Admin) and responds
 * to config requests from the content script.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_MANAGED_CONFIG') {
    chrome.storage.managed.get(null, (items) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, config: items || {} });
      }
    });
    return true; // async sendResponse
  }
});

// Notify content scripts when admin pushes config changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'managed') return;

  const updated = {};
  for (const [key, change] of Object.entries(changes)) {
    updated[key] = change.newValue;
  }

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'MANAGED_CONFIG_CHANGED',
          config: updated,
        }).catch(() => {});
      }
    }
  });
});
