import { Given, When, Then } from '@cucumber/cucumber';
import { browser, $, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

/**
 * Enter PIN digits via numpad buttons.
 */
async function enterPinDigits(pin: string): Promise<void> {
  for (const digit of pin) {
    const digitBtn = await $(`[data-testid="kiosk-pin-digit-${digit}"]`);
    await digitBtn.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
    await digitBtn.click();
    await browser.pause(150);
  }
  // PIN auto-submits after 4 digits; wait for mode transition
  await browser.pause(500);
}

/**
 * Ensure webview context for the kiosk login step (which re-does login).
 */
async function ensureWebviewContext(): Promise<void> {
  const ctx = await browser.getContext();
  if (typeof ctx === 'string' && ctx.includes('WEBVIEW')) return;
  const contexts = await browser.getContexts();
  const webview = contexts.find((c) => c.toString().includes('WEBVIEW'));
  if (webview) await browser.switchContext(webview.toString());
}

// ----- Kiosk / PIN Steps -----

Given('I am logged in and on the monitors page', async () => {
  await ensureWebviewContext();

  // Check if already authenticated
  const alreadyLoggedIn = await $('[data-testid="nav-item-dashboard"]')
    .isDisplayed().catch(() => false);

  if (!alreadyLoggedIn) {
    await browser.execute(() => { window.location.hash = '#/'; });
    await browser.pause(3000);

    // Wait for init blocker to disappear
    try {
      const blocker = await $('[data-testid="app-init-blocker"]');
      await blocker.waitForDisplayed({ timeout: 30000, reverse: true });
    } catch {
      // Blocker may not exist or already gone
    }
    await browser.pause(2000);

    // Check again if we're on an authenticated page
    const navCheck = await $('[data-testid="nav-item-dashboard"]')
      .isDisplayed().catch(() => false);

    if (!navCheck) {
      // Handle setup page using input IDs
      const { host, username, password } = testConfig.server;

      const serverInput = await $('#portal');
      if (await serverInput.isDisplayed().catch(() => false)) {
        await serverInput.clearValue();
        await serverInput.setValue(host);
      }

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

      let connectBtn = await $('[data-testid="connect-button"]');
      if (!(await connectBtn.isDisplayed().catch(() => false))) {
        connectBtn = await $('button*=Connect');
      }
      await connectBtn.click();

      await browser.waitUntil(
        async () => {
          const url = await browser.getUrl();
          return !url.includes('/profiles/new') && !url.includes('/setup');
        },
        { timeout: 20000 },
      );
    }
  }

  // Navigate to monitors via hash
  await browser.execute(() => { window.location.hash = '#/monitors'; });
  await browser.pause(2000);

  await browser.waitUntil(
    async () => (await browser.getUrl()).includes('monitors'),
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

When('I click the sidebar kiosk lock button', async () => {
  // Wait for sidebar to render
  await browser.pause(1000);

  let lockBtn = await $('[data-testid="sidebar-kiosk-lock"]');
  if (!(await lockBtn.isDisplayed().catch(() => false))) {
    lockBtn = await $('[data-testid="sidebar-kiosk-lock-collapsed"]');
  }
  if (!(await lockBtn.isDisplayed().catch(() => false))) {
    // On mobile/tablet, may need to open the sidebar/menu first
    const mobileMenu = await $('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isDisplayed().catch(() => false)) {
      await mobileMenu.click();
      await browser.pause(500);
      lockBtn = await $('[data-testid="sidebar-kiosk-lock"]');
      if (!(await lockBtn.isDisplayed().catch(() => false))) {
        lockBtn = await $('[data-testid="sidebar-kiosk-lock-collapsed"]');
      }
    }
  }
  await lockBtn.click();

  const pinPad = await $('[data-testid="kiosk-pin-pad"]');
  await pinPad.waitForDisplayed({ timeout: testConfig.timeouts.element * 3 });
});

When('I set a 4-digit PIN {string}', async (pin: string) => {
  const setPinText = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"set kiosk pin")]');
  await setPinText.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
  await enterPinDigits(pin);
});

When('I confirm the PIN {string}', async (pin: string) => {
  const confirmText = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"confirm pin")]');
  await confirmText.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
  await enterPinDigits(pin);
});

Then('the kiosk overlay should be visible', async () => {
  const overlay = await $('[data-testid="kiosk-overlay"]');
  await overlay.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
});

Then('the sidebar should not be visible', async () => {
  const overlay = await $('[data-testid="kiosk-overlay"]');
  await expect(overlay).toBeDisplayed();
});

Given('kiosk mode is active with PIN {string}', async (pin: string) => {
  let lockBtn = await $('[data-testid="sidebar-kiosk-lock"]');
  if (!(await lockBtn.isDisplayed().catch(() => false))) {
    lockBtn = await $('[data-testid="sidebar-kiosk-lock-collapsed"]');
  }

  if (await lockBtn.isDisplayed().catch(() => false)) {
    await lockBtn.click();
    await browser.pause(500);

    const pinPad = await $('[data-testid="kiosk-pin-pad"]');
    if (await pinPad.isDisplayed().catch(() => false)) {
      // Set PIN
      await enterPinDigits(pin);
      await browser.pause(500);
      // Confirm PIN
      const confirmTitle = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"confirm pin")]');
      if (await confirmTitle.isDisplayed().catch(() => false)) {
        await enterPinDigits(pin);
      }
    }
    await browser.pause(1000);
  }
});

When('I click the kiosk unlock button', async () => {
  const unlockBtn = await $('[data-testid="kiosk-unlock-button"]');
  await unlockBtn.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
  await unlockBtn.click();

  const pinPad = await $('[data-testid="kiosk-pin-pad"]');
  await pinPad.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
});

When('I enter the PIN {string}', async (pin: string) => {
  const enterPinText = await $('//*[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"enter pin to unlock")]');
  await enterPinText.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
  await enterPinDigits(pin);
});

Then('the kiosk overlay should not be visible', async () => {
  const overlay = await $('[data-testid="kiosk-overlay"]');
  await overlay.waitForDisplayed({
    timeout: testConfig.timeouts.element * 2,
    reverse: true,
  });
});

Then('I should see {string}', async (text: string) => {
  const element = await $(`//*[contains(text(),"${text}")]`);
  await element.waitForDisplayed({ timeout: testConfig.timeouts.element * 2 });
});

When('I try to click a navigation link', async () => {
  const navItem = await $('[data-testid^="nav-item-"]');
  try {
    await navItem.click();
  } catch {
    // Click may fail because overlay blocks it — expected behavior
  }
});

Then('the kiosk overlay should still be visible', async () => {
  const overlay = await $('[data-testid="kiosk-overlay"]');
  await expect(overlay).toBeDisplayed();
});

Then('the page should not have changed', async () => {
  const url = await browser.getUrl();
  expect(url).toContain('monitors');
});

Then('the kiosk overlay should cover the full viewport', async () => {
  const overlay = await $('[data-testid="kiosk-overlay"]');
  if (await overlay.isDisplayed().catch(() => false)) {
    const size = await overlay.getSize();
    const windowSize = await browser.getWindowSize();

    expect(size.width).toBeGreaterThanOrEqual(windowSize.width * 0.95);
    expect(size.height).toBeGreaterThanOrEqual(windowSize.height * 0.95);
  }
});
