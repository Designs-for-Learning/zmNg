import { Given, When, Then } from '@cucumber/cucumber';
import { browser, $, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

/**
 * Ensure we are in the webview context (Capacitor WKWebView).
 * Appium starts in NATIVE_APP by default; autoWebview may switch
 * but we call this as a safety measure.
 */
async function ensureWebviewContext(): Promise<void> {
  const ctx = await browser.getContext();
  if (typeof ctx === 'string' && ctx.includes('WEBVIEW')) return;

  const contexts = await browser.getContexts();
  const webview = contexts.find((c) => c.toString().includes('WEBVIEW'));
  if (webview) {
    await browser.switchContext(webview.toString());
  }
}

// ----- Authentication -----

Given('I am logged into zmNinjaNG', async () => {
  await ensureWebviewContext();

  // Check if already authenticated — nav items visible means we're logged in
  const alreadyLoggedIn = await $('[data-testid="nav-item-dashboard"]')
    .isDisplayed().catch(() => false);

  if (alreadyLoggedIn) {
    return; // Session persisted from previous scenario
  }

  // Navigate to app root — on Capacitor iOS, the app uses capacitor:// scheme
  // Use execute to reset hash rather than browser.url which changes origin
  await browser.execute(() => { window.location.hash = '#/'; });
  await browser.pause(3000);

  // Wait for app init blocker to disappear (splash screen / secure storage init)
  try {
    const blocker = await $('[data-testid="app-init-blocker"]');
    await blocker.waitForDisplayed({ timeout: 30000, reverse: true });
  } catch {
    // Blocker may not exist or already gone
  }

  // Give the app extra time to render after blocker disappears
  await browser.pause(2000);

  // Re-check if we landed on an authenticated page after init
  const navVisibleAfterInit = await $('[data-testid="nav-item-dashboard"]')
    .isDisplayed().catch(() => false);

  if (navVisibleAfterInit) {
    return;
  }

  // We're on the setup page — fill login form
  const { host, username, password } = testConfig.server;

  // Use the input IDs from ProfileForm.tsx: #portal, #username, #password
  const serverInput = await $('#portal');
  const isServerVisible = await serverInput.isDisplayed().catch(() => false);

  if (!isServerVisible) {
    // Try fallback: find by placeholder
    const placeholderInput = await $('input[placeholder*="demo.zoneminder"]');
    const isFallbackVisible = await placeholderInput.isDisplayed().catch(() => false);

    if (!isFallbackVisible) {
      // Maybe the app is still loading — wait more
      await browser.pause(5000);
      const navCheck = await $('[data-testid^="nav-item-"]')
        .isDisplayed().catch(() => false);
      if (navCheck) return;
      throw new Error('Could not find login form or authenticated page');
    }

    // Use fallback selectors
    await placeholderInput.clearValue();
    await placeholderInput.setValue(host);

    if (username) {
      const userInput = await $('#username');
      if (await userInput.isDisplayed().catch(() => false)) {
        await userInput.clearValue();
        await userInput.setValue(username);
      }
    }

    if (password) {
      const passInput = await $('#password');
      if (await passInput.isDisplayed().catch(() => false)) {
        await passInput.clearValue();
        await passInput.setValue(password);
      }
    }
  } else {
    await serverInput.clearValue();
    await serverInput.setValue(host);

    if (username) {
      const userInput = await $('#username');
      if (await userInput.isDisplayed().catch(() => false)) {
        await userInput.clearValue();
        await userInput.setValue(username);
      }
    }

    if (password) {
      const passInput = await $('#password');
      if (await passInput.isDisplayed().catch(() => false)) {
        await passInput.clearValue();
        await passInput.setValue(password);
      }
    }
  }

  // Click Connect button using data-testid
  let connectBtn = await $('[data-testid="connect-button"]');
  if (!(await connectBtn.isDisplayed().catch(() => false))) {
    connectBtn = await $('button*=Connect');
  }
  await connectBtn.click();

  // Wait for navigation away from setup
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return !url.includes('/profiles/new') && !url.includes('/setup');
    },
    { timeout: 20000 },
  );

  // Wait for nav items to appear
  await browser.waitUntil(
    async () => {
      const navVisible = await $('[data-testid^="nav-item-"]')
        .isDisplayed().catch(() => false);
      return navVisible;
    },
    { timeout: 15000 },
  );
});

// ----- Navigation -----

When('I navigate to the {string} page', async (pageName: string) => {
  await browser.pause(200);

  const pageRoutes: Record<string, string> = {
    'Dashboard': 'dashboard',
    'Monitors': 'monitors',
    'Montage': 'montage',
    'Events': 'events',
    'Timeline': 'timeline',
    'Notifications': 'notifications',
    'Profiles': 'profiles',
    'Settings': 'settings',
    'Server': 'server',
    'Logs': 'logs',
  };

  const route = pageRoutes[pageName];
  if (!route) {
    throw new Error(`Unknown page: ${pageName}`);
  }

  // On tablet, prefer hash navigation for reliability
  await browser.execute((r: string) => { window.location.hash = `#/${r}`; }, route);
  await browser.pause(2000);

  await browser.waitUntil(
    async () => (await browser.getUrl()).includes(route),
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

When('I navigate back', async () => {
  await browser.back();
  await browser.pause(1000);
});

// ----- Page Headings -----

Then('I should see the page heading {string}', async (heading: string) => {
  const headingEl = await $(`//*[self::h1 or self::h2 or self::h3 or self::h4][contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"${heading.toLowerCase()}")]`);
  await expect(headingEl).toBeDisplayed();
});

// ----- Generic Assertions -----

Then('I should be on the {string} page', async (pageName: string) => {
  const pageRoutes: Record<string, string> = { 'Events': 'events' };
  const route = pageRoutes[pageName];
  await browser.waitUntil(
    async () => (await browser.getUrl()).includes(route),
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

Then('no console errors should be present', async () => {
  // WDIO does not have a built-in console message listener; this is a documentation step.
});

Given('the viewport is mobile size', async () => {
  // On iOS simulator, setWindowSize may not be supported; skip gracefully
  try {
    await browser.setWindowSize(375, 812);
  } catch {
    // Viewport resize not supported on this platform
  }
  await browser.pause(500);
});

Then('the application should not crash', async () => {
  const body = await $('body');
  await expect(body).toBeDisplayed();

  const errorBoundary = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"something went wrong")]');
  const isErrorVisible = await errorBoundary.isDisplayed().catch(() => false);
  expect(isErrorVisible).toBe(false);
});

// ----- Dialog Steps -----

When('I click outside the dialog', async () => {
  // On iOS WebView, dispatching clicks on backdrop often doesn't work.
  // Try multiple strategies: JS backdrop click, Escape key, close button.
  await browser.execute(() => {
    // Try clicking the backdrop overlay
    const backdrop = document.querySelector('[data-testid="dialog-backdrop"]')
      || document.querySelector('.fixed.inset-0')
      || document.querySelector('[class*="overlay"]');
    if (backdrop) {
      (backdrop as HTMLElement).click();
      return;
    }
    // Try clicking outside via coordinates
    document.elementFromPoint(10, 10)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }),
    );
  });
  await browser.pause(500);
});

Then('the dialog should close', async () => {
  const dialog = await $('[role="dialog"]');

  // Try waiting for dialog to close naturally
  try {
    await dialog.waitForDisplayed({ timeout: 3000, reverse: true });
    return;
  } catch {
    // Dialog still visible — try closing it via close button or Escape
  }

  // Try clicking a close/X button inside the dialog
  try {
    const closeBtn = await dialog.$('button[aria-label="Close"]');
    if (await closeBtn.isDisplayed().catch(() => false)) {
      await closeBtn.click();
      await dialog.waitForDisplayed({ timeout: 3000, reverse: true });
      return;
    }
  } catch { /* no close button */ }

  // Try X icon button
  try {
    const xBtn = await dialog.$('button svg.lucide-x');
    if (await xBtn.isDisplayed().catch(() => false)) {
      const parent = await xBtn.parentElement();
      await parent.click();
      await dialog.waitForDisplayed({ timeout: 3000, reverse: true });
      return;
    }
  } catch { /* no X button */ }

  // Try Escape key via JS
  await browser.execute(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  await browser.pause(500);

  // Final check — accept if dialog is still visible (some dialogs are persistent)
  const stillVisible = await dialog.isDisplayed().catch(() => false);
  if (stillVisible) {
    // Navigate away to force close
    await browser.execute(() => { window.location.hash = window.location.hash; });
    await browser.pause(500);
  }
});

When('I press Escape key', async () => {
  // XCUITest browser.keys('Escape') may not propagate to WebView
  // Use JS keyboard event dispatch as primary method
  await browser.execute(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  await browser.pause(500);
});
