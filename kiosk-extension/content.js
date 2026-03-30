/**
 * Content script for zmNinjaNG Kiosk Config extension.
 *
 * Runs at document_start on all pages. Requests managed config from
 * the background service worker and relays it to the web app via
 * localStorage and a CustomEvent.
 */

const STORAGE_KEY = 'zmng-managed-config';

function deliverConfig(config) {
  if (!config || Object.keys(config).length === 0) return;

  // Write to localStorage so the app can read it on init
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    // localStorage may be unavailable
  }

  // Dispatch event for the app to pick up (if already loaded)
  window.dispatchEvent(
    new CustomEvent('zmng-managed-config', { detail: config })
  );
}

// Request config from background service worker
chrome.runtime.sendMessage({ type: 'GET_MANAGED_CONFIG' }, (response) => {
  if (chrome.runtime.lastError) return;
  if (response?.success) {
    deliverConfig(response.config);
  }
});

// Listen for live config updates pushed by admin
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'MANAGED_CONFIG_CHANGED') {
    deliverConfig(message.config);
  }
});
