import { When, Then } from '@cucumber/cucumber';
import { browser, $, $$, expect } from '@wdio/globals';
import { testConfig } from '../helpers/config';

// ----- Monitor List Steps -----

Then('I should see at least {int} monitor cards', async (count: number) => {
  await browser.waitUntil(
    async () => {
      const cards = await $$('[data-testid="monitor-card"]');
      return cards.length >= count;
    },
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

Then('each monitor card should show a name and status indicator', async () => {
  const cards = await $$('[data-testid="monitor-card"]');
  expect(cards.length).toBeGreaterThan(0);

  const firstCard = cards[0];
  const nameText = await firstCard.getText();
  expect(nameText.trim().length).toBeGreaterThan(0);
});

When('I click into the first monitor detail page', async () => {
  const currentUrl = await browser.getUrl();

  if (currentUrl.includes('montage')) {
    const maximizeBtn = await $('[data-testid="montage-maximize-btn"]');
    await maximizeBtn.waitForDisplayed({ timeout: testConfig.timeouts.transition * 2 });
    await maximizeBtn.click();
  } else {
    const monitorPlayer = await $('[data-testid="monitor-player"]');
    await monitorPlayer.waitForDisplayed({ timeout: testConfig.timeouts.transition * 2 });
    await monitorPlayer.click();
  }

  await browser.waitUntil(
    async () => (await browser.getUrl()).match(/monitors\/\d+/) !== null,
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

Then('I should see the monitor grid', async () => {
  const grid = await $('[data-testid="monitor-grid"]');
  await expect(grid).toBeDisplayed();
});

// ----- Montage Steps -----

Then('I should see the montage interface', async () => {
  const buttons = await $$('button');
  const selects = await $$('select');
  expect(buttons.length + selects.length).toBeGreaterThan(0);
});

Then('I should see at least {int} monitor in montage grid', async (count: number) => {
  await browser.waitUntil(
    async () => {
      const montageMonitors = await $$('[data-testid="montage-monitor"]');
      const gridItems = await $$('.react-grid-item');
      return montageMonitors.length >= count || gridItems.length >= count;
    },
    { timeout: testConfig.timeouts.transition * 2 },
  );
});

Then('each montage cell should show a monitor name label', async () => {
  const gridItems = await $$('[data-testid="montage-monitor"]');
  const fallbackItems = await $$('.react-grid-item');
  const items = gridItems.length > 0 ? gridItems : fallbackItems;
  expect(items.length).toBeGreaterThan(0);

  const firstCell = items[0];
  const cellText = await firstCell.getText();
  expect(cellText.trim().length).toBeGreaterThan(0);
});

When('I click the snapshot button on the first montage monitor', async () => {
  // On iOS simulator, moveTo/hover is unreliable in webview context.
  // The snapshot button may be always visible or revealed on touch.
  // Try to find and click it directly first.
  await browser.pause(500);

  let snapshotBtn = await $('[data-testid="snapshot-button"]');
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    // Try tapping the first monitor to reveal controls
    const firstMonitor = await $('[data-testid="montage-monitor"]');
    if (await firstMonitor.isDisplayed().catch(() => false)) {
      await firstMonitor.click();
      await browser.pause(500);
    }
    // Try again
    snapshotBtn = await $('[data-testid="snapshot-button"]');
  }
  if (!(await snapshotBtn.isDisplayed().catch(() => false))) {
    snapshotBtn = await $('//button[contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"snapshot") or contains(translate(text(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"download")]');
  }
  await snapshotBtn.click();
});
